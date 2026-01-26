const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const { n_int, title, message } = req.body;

  try {
    // 1. Procuramos TODOS os registos do utilizador (repara que tirei o .single())
    const { data: subs, error } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('n_int', parseInt(n_int));

    if (error || !subs || subs.length === 0) {
      return res.status(404).json({ error: "Nenhum dispositivo encontrado." });
    }

    // 2. Criamos uma lista de envios para todos os dispositivos encontrados
    const envios = subs.map(dispositivo => {
      const config = {
        endpoint: dispositivo.endpoint,
        keys: { auth: dispositivo.auth, p256dh: dispositivo.p256dh }
      };

      return webpush.sendNotification(config, JSON.stringify({ title, message }))
        .catch(err => {
          // Se o token expirou (ex: utilizador desinstalou), podias apagar da DB aqui
          console.error("Falha num dispositivo específico:", err.endpoint);
        });
    });

    // 3. Executa todos os envios ao mesmo tempo
    await Promise.all(envios);

    return res.status(200).json({ 
      success: true, 
      mensagem: `Enviado para ${subs.length} dispositivos.` 
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
