module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  var userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    var response = await fetch(
      process.env.SUPABASE_URL + '/rest/v1/audits?user_id=eq.' + userId + '&order=created_at.desc&select=id,url,site_name,audit_date,overall_risk,critical_count,warning_count,info_count,max_fine,created_at',
      {
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_KEY,
          'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY
        }
      }
    );
    var data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
