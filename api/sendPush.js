const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  // 1. Verificar Variáveis de Ambiente
  const { SUPABASE_URL, SUPABASE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
  
  if (!VAPID_PRIVATE_KEY) {
    return res.status(500).json({ error: "Variável VAPID_PRIVATE_KEY não encontrada no Vercel" });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );

  const { n_int, title, message } = req.body;

  try {
    // 2. Procurar subscrição
    const { data: userSub, error } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('n_int', n_int)
      .single();

    if (error || !userSub) {
      return res.status(404).json({ error: 'Utilizador não encontrado no Supabase' });
    }

    // 3. Enviar
    const pushSubscription = {
      endpoint: userSub.endpoint,
      keys: { auth: userSub.auth, p256dh: userSub.p256dh }
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify({ title, message }));
    return res.status(200).json({ success: true });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
