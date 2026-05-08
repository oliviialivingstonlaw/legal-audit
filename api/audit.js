const SYSTEM = `Ты эксперт по юридическому аудиту сайтов РФ (2026). Применяешь все актуальные законы: 152-ФЗ, ФЗ-266, ФЗ-406, ЗоЗПП, ФЗ-38 (ERID/ОРД/ЕРИР), ГК РФ (оферта), ФЗ-273 (образование), ФЗ-54 (ККТ), ФЗ-149, ФЗ-436, ФЗ-421, ФЗ-99, КоАП РФ.

Верни ТОЛЬКО валидный JSON. Первый символ ответа — {. Последний символ — }. Никакого текста до или после.

Структура JSON:
{"site_name":"...","url":"...","audit_date":"DD.MM.YYYY","industry":"EdTech|E-commerce|Медицина|Финансы|Другое","compliance_score":45,"overall_risk":"высокий|средний|низкий","summary":"2-3 предложения","total_risks":20,"critical_count":7,"warning_count":9,"info_count":4,"max_fine":"до 48 000 000 руб.","min_fine":"от 2 000 000 руб.","block_risk":2,"license_risk":1,"blocks":[{"code":"A","name":"Персональные данные","count":5,"level":"critical"},{"code":"B","name":"Реклама / ERID","count":3,"level":"warning"},{"code":"C","name":"Защита потребителей","count":2,"level":"warning"},{"code":"F","name":"Лицензирование","count":2,"level":"critical"},{"code":"H","name":"E-commerce / Оферта","count":3,"level":"warning"},{"code":"M","name":"Технические требования","count":2,"level":"warning"},{"code":"G","name":"Налоги / Финансы","count":2,"level":"info"},{"code":"I","name":"Интеллектуальная собственность","count":1,"level":"info"}],"risks":[{"id":"PD-001","category_code":"A","category":"A — Персональные данные","name":"...","description":"...","norm":"...","fine_label":"...","fine_max":700000,"probability":3,"impact":3,"score":9,"priority":"critical","action":"...","responsible":"ИТ+ЮР","deadline":"7 дней","deadline_days":7,"block_risk":true,"license_risk":false,"status":"Новый"}],"quick_wins":[{"id":"TXT-001","name":"...","time":"5 мин","responsible":"Разработчик"}]}

ПРАВИЛА: вероятность(1-3) × влияние(1-3) = балл. 7-9=critical, 3-6=warning, 1-2=info. compliance_score 0-100. Выяви 15-20 рисков, 4-6 быстрых побед.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var body = req.body || {};
  var url = body.url;
  var legalText = body.legalText;
  var userId = body.userId;

  if (!url) return res.status(400).json({ error: 'URL required' });

  var today = new Date().toLocaleDateString('ru-RU');
  var msg = (legalText && legalText.trim())
    ? 'Проведи юридический аудит сайта: ' + url + '\nДата: ' + today + '\nДокументы:\n' + legalText + '\nВЕРНИ ТОЛЬКО JSON БЕЗ ТЕКСТА.'
    : 'Проведи юридический аудит сайта: ' + url + '\nДата: ' + today + '\nВЕРНИ ТОЛЬКО JSON БЕЗ ТЕКСТА.';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 16000,
        system: SYSTEM,
        messages: [{ role: 'user', content: msg }]
      })
    });

    var data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: (data.error && data.error.message) || 'API error' });

    var raw = '';
    for (var i = 0; i < data.content.length; i++) {
      if (data.content[i].type === 'text') raw += data.content[i].text;
    }

    // Извлечь JSON даже если модель добавила текст
    var jsonStart = raw.indexOf('{');
    var jsonEnd = raw.lastIndexOf('}');
    var clean = (jsonStart !== -1 && jsonEnd !== -1) ? raw.slice(jsonStart, jsonEnd + 1) : raw;
    var parsed = JSON.parse(clean);

    if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        await fetch(process.env.SUPABASE_URL + '/rest/v1/audits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_KEY,
            'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY,
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            user_id: userId,
            url: parsed.url || url,
            site_name: parsed.site_name || '',
            audit_date: parsed.audit_date || today,
            overall_risk: parsed.overall_risk || '',
            summary: parsed.summary || '',
            critical_count: parsed.critical_count || 0,
            warning_count: parsed.warning_count || 0,
            info_count: parsed.info_count || 0,
            max_fine: parsed.max_fine || '',
            risks: parsed
          })
        });
      } catch (e) {
        console.error('Supabase save error:', e.message);
      }
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
