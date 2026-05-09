// api/crm.js — CRM управление заявками и клиентами
// Защита: только пользователь с email === ADMIN_EMAIL

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  var sb  = process.env.SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;
  var headers = { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': 'Bearer ' + key };

  // GET /api/crm?type=leads|audits|stats|clients
  if (req.method === 'GET') {
    var type = q.type || 'leads';

    if (type === 'stats') {
      var [leadsR, auditsR] = await Promise.all([
        fetch(sb + '/rest/v1/leads?select=id,status,created_at&order=created_at.desc', { headers }),
        fetch(sb + '/rest/v1/audits?select=id,overall_risk,created_at&order=created_at.desc&limit=1000', { headers })
      ]);
      var leads = await leadsR.json(), audits = await auditsR.json();
      var today = new Date().toISOString().split('T')[0];
      return res.json({
        leads_total: leads.length,
        leads_today: leads.filter(function(l){ return l.created_at && l.created_at.startsWith(today); }).length,
        leads_new: leads.filter(function(l){ return !l.status || l.status === 'new'; }).length,
        leads_active: leads.filter(function(l){ return l.status === 'active'; }).length,
        leads_closed: leads.filter(function(l){ return l.status === 'closed'; }).length,
        audits_total: audits.length,
        audits_today: audits.filter(function(a){ return a.created_at && a.created_at.startsWith(today); }).length,
        high_risk: audits.filter(function(a){ return a.overall_risk === 'высокий'; }).length,
        conversion: leads.length > 0 ? Math.round(leads.filter(function(l){ return l.status === 'closed'; }).length / leads.length * 100) : 0
      });
    }

    if (type === 'profiles') {
      var r = await fetch(sb + '/rest/v1/profiles?select=*&order=created_at.desc&limit=500', { headers });
      return res.json(await r.json());
    }
      var status = q.status ? '&status=eq.' + q.status : '';
      var r = await fetch(sb + '/rest/v1/leads?select=*&order=created_at.desc&limit=200' + status, { headers });
      return res.json(await r.json());
    }

    if (type === 'audits') {
      var r = await fetch(sb + '/rest/v1/audits?select=id,user_id,url,site_name,audit_date,overall_risk,critical_count,warning_count,max_fine,created_at&order=created_at.desc&limit=200', { headers });
      return res.json(await r.json());
    }
  }

  // PATCH /api/crm — обновить статус/заметки лида
  if (req.method === 'PATCH') {
    var id = q.id;
    if (!id) return res.status(400).json({ error: 'id required' });
    var body = req.body || {};
    var allowed = {};
    if (body.status !== undefined) allowed.status = body.status;
    if (body.notes !== undefined) allowed.notes = body.notes;
    if (body.name !== undefined) allowed.name = body.name;
    if (body.email !== undefined) allowed.email = body.email;
    if (body.phone !== undefined) allowed.phone = body.phone;
    var r = await fetch(sb + '/rest/v1/leads?id=eq.' + id, {
      method: 'PATCH',
      headers: Object.assign({}, headers, { 'Prefer': 'return=representation' }),
      body: JSON.stringify(allowed)
    });
    return res.json(await r.json());
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
