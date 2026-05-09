// api/company.js — Проверка компании по ИНН через DaData (агрегатор ФНС)
// Требует: DADATA_API_KEY в переменных Vercel

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var inn = (req.body && req.body.inn || '').trim().replace(/\D/g, '');
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 (юрлицо) или 12 (ИП) цифр' });
  }

  var key = process.env.DADATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'DaData API key not configured' });

  try {
    var r = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Token ' + key,
        'X-Secret': process.env.DADATA_SECRET_KEY || ''
      },
      body: JSON.stringify({ query: inn, count: 1 })
    });

    if (!r.ok) throw new Error('DaData error: ' + r.status);
    var data = await r.json();

    if (!data.suggestions || !data.suggestions.length) {
      return res.json({ found: false, inn });
    }

    var s = data.suggestions[0];
    var d = s.data;

    // ОКВЭД → отрасль LegalScan
    var okved = (d.okved || '').substring(0, 2);
    var okvedNum = parseInt(okved);
    var industry = 'other';
    if (okvedNum >= 47 || okvedNum === 45 || okvedNum === 46) industry = 'ecommerce';
    else if (okvedNum >= 85 && okvedNum <= 88) industry = 'education';
    else if (okvedNum >= 86 && okvedNum <= 87) industry = 'medicine';
    else if (okvedNum >= 64 && okvedNum <= 66) industry = 'finance';
    else if (okvedNum === 68) industry = 'realestate';
    else if (okvedNum >= 62 && okvedNum <= 63) industry = 'it';
    else if (okvedNum === 79) industry = 'tourism';
    else if (okvedNum >= 59 && okvedNum <= 60) industry = 'media';

    var status = d.state && d.state.status;
    var isActive = status === 'ACTIVE';

    return res.json({
      found: true,
      inn: d.inn,
      kpp: d.kpp || null,
      ogrn: d.ogrn || null,
      name_full: d.name && d.name.full_with_opf || s.value,
      name_short: d.name && d.name.short_with_opf || s.value,
      legal_form: d.opf && d.opf.short || '',
      address: d.address && d.address.value || '',
      director: d.management && d.management.name || null,
      director_post: d.management && d.management.post || null,
      okved: d.okved || '',
      okved_name: d.okved_type || '',
      industry_suggested: industry,
      status: isActive ? 'active' : (status || 'unknown'),
      status_label: isActive ? 'Действующая' : status === 'LIQUIDATING' ? 'В процессе ликвидации' : status === 'LIQUIDATED' ? 'Ликвидирована' : 'Неизвестно',
      reg_date: d.state && d.state.registration_date ? new Date(d.state.registration_date).toLocaleDateString('ru-RU') : null,
      employees: d.employee_count || null,
      taxes: d.finance && d.finance.tax_system || null
    });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
