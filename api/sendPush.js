const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  // Log para depuração (ver no Vercel Logs)
  console.log("Corpo recebido:", req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Apenas POST permitido" });
  }

  // Configuração VAPID
  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // Garantir que n_int é tratado corretamente
  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { n_int, title, message } = payload;

  try {
    const { data: subs, error } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('n_int', parseInt(n_int))
      .single();

    if (error || !subs) {
      console.error("Erro Supabase:", error);
      return res.status(404).json({ error: "Utilizador 205 não encontrado na base de dados" });
    }

    const pushConfig = {
      endpoint: subs.endpoint,
      keys: { auth: subs.auth, p256dh: subs.p256dh }
    };

    await webpush.sendNotification(pushConfig, JSON.stringify({ title, message }));
    
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Erro Final:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
