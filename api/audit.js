const SYSTEM = `Ты эксперт по юридическому аудиту сайтов РФ (2026). Законы: 152-ФЗ, ФЗ-266, ФЗ-406, ЗоЗПП, ФЗ-38 (ERID/ОРД), ГК РФ (оферта), ФЗ-273 (образование), ФЗ-54 (ККТ), ФЗ-149, ФЗ-436, ФЗ-99, КоАП. Оценивай риск: вероятность (1-3) × влияние (1-3) = балл. Балл 7-9 = critical, 3-6 = warning, 1-2 = info. Верни ТОЛЬКО JSON без markdown: {"site_name":"...","url":"...","audit_date":"DD.MM.YYYY","overall_risk":"высокий|средний|низкий","summary":"2-3 предложения","critical_count":0,"warning_count":0,"info_count":0,"max_fine":"до X руб.","risks":[{"id":"PD-001","category":"A — Персональные данные","name":"...","description":"...","norm":"152-ФЗ ст.9","fine_label":"до 700 000 руб.","fine_max":700000,"probability":3,"impact":3,"score":9,"priority":"critical","action":"...","deadline":"7 дней"}]} Категории: PD, ADV, CONS, FAS, RKN, LIC, FIN, IP, TECH. Выяви 10-15 рисков.`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  var body = req.body || {};
  var url = body.url;
  var legalText = body.legalText;
  if (!url) {
    return res.status(400).json({ error: 'URL required' });
  }
  var systemPrompt = 'ВАЖНО: Твой ответ должен начинаться с символа { и заканчиваться символом }. Никакого текста до или после JSON. ' + SYSTEM;
  var msg = (legalText && legalText.trim())
    ? 'Аудит: ' + url + '\nДокументы:\n' + legalText
    : 'Юридический аудит сайта: ' + url;
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
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: 'user', content: msg }]
      })
    });
    var data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: (data.error && data.error.message) || 'API error' });
    }
    var raw = '';
    for (var i = 0; i < data.content.length; i++) {
      if (data.content[i].type === 'text') raw += data.content[i].text;
    }
    var clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    var parsed = JSON.parse(clean);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
};
