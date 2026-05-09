module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  var body = req.body || {};
  var name = (body.name || '').trim();
  var email = (body.email || '').trim();
  var phone = (body.phone || '').trim();
  var message = (body.message || '').trim();
  var source = body.source || 'website';
  if (!email && !phone) return res.status(400).json({ error: 'Укажите email или телефон' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Storage not configured' });
  try {
    var r = await fetch(process.env.SUPABASE_URL + '/rest/v1/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ name, email, phone, message, source, created_at: new Date().toISOString() })
    });
    if (!r.ok) throw new Error('DB error ' + r.status);
    return res.status(200).json({ ok: true });
  } catch(e) { return res.status(500).json({ error: e.message }); }
};
