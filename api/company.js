module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var inn = ((req.body && req.body.inn) || '').toString().trim().replace(/\D/g, '');
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
  }

  var key = process.env.DADATA_API_KEY;
  if (!key) return res.status(500).json({ error: 'DADATA_API_KEY не настроен в Vercel' });

  function detectIndustry(okved) {
    if (!okved) return 'other';
    var n = parseInt((okved || '').substring(0, 2));
    if (n === 45 || n === 46 || n === 47) return 'ecommerce';
    if (n >= 85 && n <= 88) return 'education';
    if (n >= 86 && n <= 88) return 'medicine';
    if (n >= 64 && n <= 66) return 'finance';
    if (n === 68) return 'realestate';
    if (n >= 62 && n <= 63) return 'it';
    if (n === 79) return 'tourism';
    if (n >= 59 && n <= 60) return 'media';
    return 'other';
  }

  var INDUSTRY_LABELS = {
    ecommerce:'E-commerce', education:'Образование', medicine:'Медицина',
    finance:'Финансы', realestate:'Недвижимость', it:'IT / SaaS',
    tourism:'Туризм', media:'Медиа', other:'Другое'
  };

  try {
    var r = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Token ' + key
      },
      body: JSON.stringify({ query: inn, count: 1 })
    });

    var text = await r.text();

    if (!r.ok) {
      return res.status(500).json({ error: 'DaData HTTP ' + r.status + ': ' + text.substring(0, 200) });
    }

    var data;
    try { data = JSON.parse(text); } catch(e) {
      return res.status(500).json({ error: 'DaData вернул не JSON: ' + text.substring(0, 200) });
    }

    if (!data.suggestions || !data.suggestions.length) {
      return res.json({ found: false, inn, debug: 'DaData вернул 0 результатов' });
    }

    var s = data.suggestions[0], d = s.data;
    var okved = d.okved || '';
    var industry = detectIndustry(okved);
    var isActive = d.state && d.state.status === 'ACTIVE';

    return res.json({
      found: true,
      inn: d.inn, kpp: d.kpp || null, ogrn: d.ogrn || null,
      name_full: (d.name && d.name.full_with_opf) || s.value,
      name_short: (d.name && d.name.short_with_opf) || s.value,
      legal_form: (d.opf && d.opf.short) || '',
      address: (d.address && d.address.value) || '',
      director: (d.management && d.management.name) || null,
      okved, industry_suggested: industry,
      industry_label: INDUSTRY_LABELS[industry],
      status: isActive ? 'active' : 'inactive',
      status_label: isActive ? 'Действующая' : 'Недействующая',
      reg_date: d.state && d.state.registration_date
        ? new Date(d.state.registration_date).toLocaleDateString('ru-RU') : null
    });

  } catch(e) {
    return res.status(500).json({ error: 'Сетевая ошибка: ' + e.message });
  }
};
