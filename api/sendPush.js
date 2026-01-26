const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
 
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { n_int, title, message } = req.body;

    // Verificar se as chaves existem
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      throw new Error("Chaves VAPID não configuradas no Vercel");
    }

    webpush.setVapidDetails(
      'mailto:fmartins.ahbfaro@gmail.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

    // Procurar o 205
    const { data: subs, error: subError } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('n_int', parseInt(n_int))
      .single();

    if (subError || !subs) {
      return res.status(404).json({ error: "Utilizador não encontrado no Supabase" });
    }

    const pushConfig = {
      endpoint: subs.endpoint,
      keys: {
        auth: subs.auth,
        p256dh: subs.p256dh
      }
    };

    await webpush.sendNotification(pushConfig, JSON.stringify({ title, message }));

    return res.status(200).json({ success: true, message: "Push enviado!" });

  } catch (err) {
    console.error("Erro na API:", err.message);
    return res.status(500).json({ 
      error: "Erro Interno", 
      details: err.message 
    });
  }
}
