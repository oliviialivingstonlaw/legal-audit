// api/profile.js — сохранение данных профиля при регистрации
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  var body = req.body || {};
  var { user_id, email, name, phone, company_name, inn, marketing_consent } = body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY)
    return res.status(500).json({ error: 'Storage not configured' });
  try {
    var r = await fetch(process.env.SUPABASE_URL + '/rest/v1/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
        'Prefer': 'return=minimal,resolution=merge-duplicates'
      },
      body: JSON.stringify({ user_id, email, name, phone, company_name, inn, marketing_consent: !!marketing_consent, created_at: new Date().toISOString() })
    });
    if (!r.ok) { var t = await r.text(); throw new Error('DB error: ' + t); }
    return res.status(200).json({ ok: true });
  } catch(e) { return res.status(500).json({ error: e.message }); }
};
