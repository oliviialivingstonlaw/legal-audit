module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var id = req.query.id;
  var userId = req.query.userId;
  if (!id || !userId) return res.status(400).json({ error: 'id and userId required' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    var response = await fetch(
      process.env.SUPABASE_URL + '/rest/v1/audits?id=eq.' + id + '&user_id=eq.' + userId + '&limit=1',
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
        }
      }
    );
    var data = await response.json();
    if (!data || data.length === 0) return res.status(404).json({ error: 'Not found' });
    return res.status(200).json(data[0]);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
