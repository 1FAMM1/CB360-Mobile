const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  const { n_int, title, message } = req.body;

  // Procura o token do utilizador 205
  const { data: subs } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .eq('n_int', n_int)
    .single();

  if (!subs) return res.status(404).json({ error: "Utilizador não encontrado" });

  const pushConfig = {
    endpoint: subs.endpoint,
    keys: { auth: subs.auth, p256dh: subs.p256dh }
  };

  try {
    await webpush.sendNotification(pushConfig, JSON.stringify({ title, message }));
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json(err);
  }
}
