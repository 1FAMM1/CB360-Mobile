const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  // ✨ ADICIONAR CORS - permite requisições de cb360-online
  res.setHeader('Access-Control-Allow-Origin', '*'); // Aceita de qualquer origem
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Se for preflight request (OPTIONS), responde imediatamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  res.setHeader('Content-Type', 'application/json');
  
  // Configuração das chaves VAPID
  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // Extraímos os dados enviados pelo MessageSender.send
  const { recipient_nint, corp_nr, sender_name, message_text, sender_nint } = req.body;
  
  try {
    let query = supabase.from('user_push_subscriptions').select('*');
    
    if (recipient_nint === 'geral') {
      // --- LÓGICA GERAL ---
      // Busca todos da empresa (corp_oper_nr) MAS exclui o remetente (sender_nint)
      query = query
        .eq('corp_oper_nr', corp_nr) 
        .neq('n_int', sender_nint);
    } else {
      // --- LÓGICA PRIVADA ---
      // Busca apenas os dispositivos do destinatário específico
      query = query.eq('n_int', parseInt(recipient_nint));
    }
    
    const { data: subs, error } = await query;
    
    // Se não houver ninguém para notificar, saímos pacificamente
    if (error || !subs || subs.length === 0) {
      return res.status(200).json({ success: true, info: "Nenhum dispositivo encontrado." });
    }
    
    // Preparamos o conteúdo da notificação
    const payload = JSON.stringify({
      title: recipient_nint === 'geral' ? `Geral: ${sender_name}` : sender_name,
      message: message_text
    });
    
    // Disparamos para todos os dispositivos em paralelo
    const envios = subs.map(dispositivo => {
      const config = {
        endpoint: dispositivo.endpoint,
        keys: { 
          auth: dispositivo.auth, 
          p256dh: dispositivo.p256dh 
        }
      };
      return webpush.sendNotification(config, payload)
        .catch(err => {
          // Se o token estiver expirado (404 ou 410), podias apagar da DB aqui
          console.error("Falha ao enviar para um dispositivo:", dispositivo.endpoint);
        });
    });
    
    await Promise.all(envios);
    
    return res.status(200).json({ 
      success: true, 
      total_enviados: subs.length 
    });
  } catch (err) {
    console.error("Erro na API de Push:", err);
    return res.status(500).json({ error: err.message });
  }
}
