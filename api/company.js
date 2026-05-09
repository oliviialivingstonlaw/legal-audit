// api/company.js — Проверка компании по ИНН
// Использует DaData если есть ключ, иначе открытый API ФНС (egrul.nalog.ru)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  var inn = ((req.body && req.body.inn) || '').toString().trim().replace(/\D/g, '');
  if (!inn || (inn.length !== 10 && inn.length !== 12)) {
    return res.status(400).json({ error: 'ИНН должен содержать 10 или 12 цифр' });
  }

  // Определяем тип: ЮЛ или ИП
  var isIP = inn.length === 12;

  // INDUSTRY по первым 2 цифрам ОКВЭД — определяем ниже после получения данных
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

  // Пробуем DaData если есть ключ
  var dadataKey = process.env.DADATA_API_KEY;
  if (dadataKey) {
    try {
      var r = await fetch('https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token ' + dadataKey,
          'X-Secret': process.env.DADATA_SECRET_KEY || ''
        },
        body: JSON.stringify({ query: inn, count: 1 })
      });
      if (r.ok) {
        var data = await r.json();
        if (data.suggestions && data.suggestions.length) {
          var s = data.suggestions[0], d = s.data;
          var okved = d.okved || '';
          var industry = detectIndustry(okved);
          return res.json({
            found: true, source: 'dadata',
            inn: d.inn, kpp: d.kpp || null, ogrn: d.ogrn || null,
            name_full: (d.name && d.name.full_with_opf) || s.value,
            name_short: (d.name && d.name.short_with_opf) || s.value,
            legal_form: (d.opf && d.opf.short) || '',
            address: (d.address && d.address.value) || '',
            director: (d.management && d.management.name) || null,
            director_post: (d.management && d.management.post) || null,
            okved, okved_name: d.okved_type || '',
            industry_suggested: industry,
            industry_label: INDUSTRY_LABELS[industry],
            status: d.state && d.state.status === 'ACTIVE' ? 'active' : 'inactive',
            status_label: d.state && d.state.status === 'ACTIVE' ? 'Действующая' : 'Недействующая',
            reg_date: d.state && d.state.registration_date
              ? new Date(d.state.registration_date).toLocaleDateString('ru-RU') : null
          });
        }
        return res.json({ found: false, inn });
      }
    } catch(e) { /* fallback to nalog */ }
  }

  // Fallback: открытый API nalog.ru (ЕГРЮЛ/ЕГРИП)
  try {
    var url = isIP
      ? 'https://egrul.nalog.ru/search-result/' + inn
      : 'https://egrul.nalog.ru/search-result/' + inn;

    // Используем публичный поиск nalog.ru
    var searchR = await fetch('https://egrul.nalog.ru/search-result/' + inn, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
    });

    if (searchR.ok) {
      var text = await searchR.text();
      try {
        var json = JSON.parse(text);
        if (json.rows && json.rows.length) {
          var row = json.rows[0];
          var industry2 = detectIndustry(row.k || '');
          return res.json({
            found: true, source: 'nalog',
            inn: row.i || inn,
            kpp: row.p || null,
            ogrn: row.o || null,
            name_full: row.n || '',
            name_short: row.c || row.n || '',
            legal_form: isIP ? 'ИП' : 'Юридическое лицо',
            address: row.a || '',
            director: null, director_post: null,
            okved: row.k || '',
            okved_name: '',
            industry_suggested: industry2,
            industry_label: INDUSTRY_LABELS[industry2],
            status: row.e ? 'inactive' : 'active',
            status_label: row.e ? 'Ликвидирована' : 'Действующая',
            reg_date: null
          });
        }
      } catch(pe) {}
    }

    // Если ничего не нашли
    return res.json({ found: false, inn });

  } catch(e) {
    return res.status(500).json({ error: 'Ошибка запроса к реестру: ' + e.message });
  }
};
