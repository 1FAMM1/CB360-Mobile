const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  // Configura as chaves a partir do ambiente do Vercel
  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  const { n_int, title, message } = req.body;

  try {
    const { data: subs, error } = await supabase
      .from('user_push_subscriptions')
      .select('*')
      .eq('n_int', n_int)
      .single();

    if (error || !subs) return res.status(404).json({ error: "Utilizador não registado" });

    await webpush.sendNotification(
      { endpoint: subs.endpoint, keys: { auth: subs.auth, p256dh: subs.p256dh } },
      JSON.stringify({ title, message })
    );

    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
