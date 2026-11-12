import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import { randomUUID } from 'crypto';

/* Valida o token do utilizador no próprio Supabase (assinatura, validade e
   token revogado) e devolve os claims: { corp_oper_nr, n_int, ... } */
async function whoami(token) {
  if (!token) return null;
  try {
    const r = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/cb360_whoami`, {
      method: 'POST',
      headers: {
        apikey: process.env.SUPABASE_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    if (!r.ok) return null;
    const c = await r.json();
    return c && c.role === 'authenticated' && c.corp_oper_nr && c.n_int ? c : null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('Falta a variável SUPABASE_SERVICE_KEY no Vercel');
    return res.status(500).json({ error: 'Configuração em falta' });
  }

  /* 1) Quem envia: vem do token, não do corpo do pedido */
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const claims = await whoami(token);
  if (!claims) return res.status(401).json({ error: 'Sessão inválida' });
  const corp = String(claims.corp_oper_nr);
  const senderNint = String(claims.n_int);

  /* 2) Validar o pedido */
  const body = req.body || {};
  const recipient = String(body.recipient_nint ?? '').trim();
  const senderName = String(body.sender_name ?? '').slice(0, 80);
  const messageText = String(body.message_text ?? '').slice(0, 500);
  if (!recipient || !messageText) return res.status(400).json({ error: 'Pedido inválido' });
  if (recipient !== 'geral' && !/^\d{1,6}$/.test(recipient)) return res.status(400).json({ error: 'Destinatário inválido' });

  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  /* chave de serviço só para esta API (variável própria no Vercel; nunca vai para o browser) */
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    realtime: { transport: ws }
  });

  try {
    /* 3) Destinatários: SEMPRE só da corporação de quem envia */
    let query = supabase
      .from('user_push_subscriptions')
      .select('endpoint, auth, p256dh')
      .eq('corp_oper_nr', corp);
    query = recipient === 'geral'
      ? query.neq('n_int', parseInt(senderNint, 10))
      : query.eq('n_int', parseInt(recipient, 10));

    const { data: subs, error } = await query;
    if (error) throw error;
    if (!subs || subs.length === 0) {
      return res.status(200).json({ success: true, info: 'Nenhum dispositivo encontrado.' });
    }

    /* tipo "aviso" (escalas, eventos, trocas…): não é do chat -> ao tocar abre só a app.
       Sem tipo (chat): geral -> chat geral; privada -> conversa com quem enviou */
    const aviso = String(body.tipo || '') === 'aviso';
    /* página a abrir ao tocar (só nomes simples, ex.: 'Swaps', 'SolVacat', 'Events') */
    const pagina = /^[A-Za-z0-9_]{1,40}$/.test(String(body.pagina || '')) ? String(body.pagina) : '';
    const chatNint = aviso ? '' : (recipient === 'geral' ? 'geral' : senderNint);
    /* id deste envio: o telemóvel junta as 2 cópias numa só notificação */
    const nid = randomUUID().replace(/-/g, '');
    const payload = JSON.stringify(aviso
      ? { nid, title: senderName || 'CB360 Mobile', message: messageText, pagina, url: pagina ? `/?abrir=${pagina}` : '/' }
      : { nid,
          title: recipient === 'geral' ? `Geral: ${senderName}` : senderName,
          message: messageText,
          chatId: chatNint,
          chatNint: chatNint,
          url: `/?openChat=${encodeURIComponent(chatNint)}`
        });

    let enviados = 0;
    const gone = new Set();
    const sendAll = (count) => Promise.all(subs.filter(d => !gone.has(d.endpoint)).map(d =>
      webpush.sendNotification(
        { endpoint: d.endpoint, keys: { auth: d.auth, p256dh: d.p256dh } },
        payload,
        { TTL: 60 * 60 * 24, urgency: 'high' }   /* guarda até 24 h; entrega mesmo com o telemóvel em repouso */
      )
        .then(() => { if (count) enviados++; })
        .catch(async err => {
          /* subscrição que já não existe (app desinstalada / permissão retirada): apagar */
          if (err && (err.statusCode === 404 || err.statusCode === 410)) {
            gone.add(d.endpoint);
            await supabase.from('user_push_subscriptions').delete().eq('endpoint', d.endpoint);
          } else {
            console.error('Falha ao enviar para um dispositivo:', err && err.statusCode);
          }
        })
    ));
    /* 1.ª cópia; 2.ª cópia 4 s depois: em telemóveis que adormecem o Chrome (ex.: Xiaomi)
       a 1.ª acorda-o e pode perder-se; a 2.ª chega e substitui a 1.ª em silêncio se esta tiver chegado */
    await sendAll(true);
    await new Promise(r => setTimeout(r, 4000));
    await sendAll(false);

    return res.status(200).json({ success: true, total_enviados: enviados });
  } catch (err) {
    console.error('Erro na API de Push:', err);
    return res.status(500).json({ error: 'Erro ao enviar notificação' });
  }
}
