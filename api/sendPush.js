const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // Configuração das chaves VAPID
  webpush.setVapidDetails(
    'mailto:fmartins.ahbfaro@gmail.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
  
  // Extraímos os dados enviados pelo Frontend
  const { recipient_nint, corp_nr, sender_name, message_text, sender_nint } = req.body;

  try {
    let query = supabase.from('user_push_subscriptions').select('*');

    if (recipient_nint === 'geral') {
      // --- LÓGICA GERAL ---
      query = query
        .eq('corp_oper_nr', corp_nr) 
        .neq('n_int', sender_nint);
    } else {
      // --- LÓGICA PRIVADA ---
      // Dica: Usei recipient_nint direto caso o teu banco guarde como string
      query = query.eq('n_int', recipient_nint);
    }

    const { data: subs, error } = await query;

    if (error || !subs || subs.length === 0) {
      return res.status(200).json({ success: true, info: "Nenhum dispositivo encontrado." });
    }

    // --- CONFIGURAÇÃO VISUAL DA NOTIFICAÇÃO ---
    const badgeCaminhaoBranco = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAACXBIWXMAAAsTAAALEwEAmpwYAAABtElEQVR4nO2YvUoDQRRGZ7MYU8RGsRPyCOIDCH6AnZVN9m0S7K0S06RIYp0itgnYpUonpAsWFoogIkSMv83AwpCw6p6Z3Z07H7gxO3u+7M7unAnEGGOMMcYYY4wZp06SByS7SBaR9JH0Xv6vInmS3CAnmXWSe0lX8pD8ID+SL8m9f8I6A6yRE0y6T04y6768S96T3X8D7CAnmHSTnGTW/SAnmHSdnGTW9ZAsS76RfCH5Yp6zLflpXv9j5ASTbpKz5CH5Yd69fSR9Y69D5AST7pKTzLo+klW9663IHSY9JCeZdV0kvfX8D7CAnGDSTXKSWddHsqp3vRW5w6SH5CSzrostyYp8IflC8sk8YVvy07y6H8mS5AvJF/OcbclP8+p2khY5waS75CSzrodkWfKF5AvJF/OcbclP8+p+5P8X/v9H8oPkG8kX85xtye/S/66S8+Qp+WHevX0kfWOfQ+QEky6S7pITTLpLTjLrOklmneRe0pU8JD/Ij+RLcu8vFcaY9fUPmXf3R0pA0pMAAAAASUVORK5CYII=';

    const payload = JSON.stringify({
      title: recipient_nint === 'geral' ? `Geral: ${sender_name}` : sender_name,
      body: message_text, // MUDAR DE 'message' PARA 'body'
      icon: 'https://rjkbodfqsvckvnhjwmhg.supabase.co/storage/v1/object/public/cb_files/logo_app.png',
      badge: badgeCaminhaoBranco,
      vibrate: [200, 100, 200],
      data: {
        url: '/',
        sender_nint: sender_nint
      }
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
          console.error("Token possivelmente inválido:", dispositivo.n_int);
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
