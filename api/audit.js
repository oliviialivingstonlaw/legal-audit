const SYSTEM = `Ты эксперт по юридическому аудиту сайтов РФ (2026). Применяешь все актуальные законы: 152-ФЗ, ФЗ-266, ФЗ-406, ЗоЗПП, ФЗ-38 (ERID/ОРД/ЕРИР), ГК РФ (оферта), ФЗ-273 (образование), ФЗ-54 (ККТ), ФЗ-149, ФЗ-436, ФЗ-421, ФЗ-99, КоАП РФ.

Верни ТОЛЬКО валидный JSON. Первый символ — {. Последний — }. Никакого текста до или после.

Структура: {"site_name":"...","url":"...","audit_date":"DD.MM.YYYY","industry":"EdTech|E-commerce|Медицина|Финансы|Другое","compliance_score":45,"overall_risk":"высокий|средний|низкий","summary":"2-3 предложения","total_risks":12,"critical_count":5,"warning_count":5,"info_count":2,"max_fine":"до X руб.","min_fine":"от X руб.","block_risk":1,"license_risk":0,"blocks":[{"code":"A","name":"Персональные данные","count":3,"level":"critical"},{"code":"B","name":"Реклама / ERID","count":2,"level":"warning"},{"code":"C","name":"Защита потребителей","count":2,"level":"warning"},{"code":"F","name":"Лицензирование","count":1,"level":"critical"},{"code":"H","name":"E-commerce / Оферта","count":2,"level":"warning"},{"code":"M","name":"Технические требования","count":1,"level":"info"},{"code":"G","name":"Налоги / Финансы","count":1,"level":"info"}],"risks":[{"id":"PD-001","category_code":"A","category":"A — Персональные данные","name":"Краткое название","description":"Описание до 80 символов","norm":"152-ФЗ ст.9","fine_label":"до 700 000 руб.","fine_max":700000,"probability":3,"impact":3,"score":9,"priority":"critical","action":"Краткие шаги","responsible":"ИТ+ЮР","deadline":"7 дней","deadline_days":7,"block_risk":false,"license_risk":false,"status":"Новый"}],"quick_wins":[{"id":"TXT-001","name":"Краткое описание","time":"5 мин","responsible":"Разработчик"}]}

ПРАВИЛА: вероятность(1-3)×влияние(1-3)=балл. 7-9=critical, 3-6=warning, 1-2=info. Выяви 10-12 рисков, 3-4 быстрых победы. Описания краткие.`;

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
    ? 'Аудит: ' + url + '\nДата: ' + today + '\nДокументы:\n' + legalText + '\nВЕРНИ ТОЛЬКО JSON.'
    : 'Аудит: ' + url + '\nДата: ' + today + '\nВЕРНИ ТОЛЬКО JSON.';

  // Устанавливаем заголовки для SSE (Server-Sent Events)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  var send = function(data) {
    res.write('data: ' + JSON.stringify(data) + '\n\n');
  };

  try {
    send({ type: 'status', message: 'Анализирую структуру сайта...' });

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
        stream: true,
        system: SYSTEM,
        messages: [{ role: 'user', content: msg }]
      })
    });

    if (!response.ok) {
      var errData = await response.json();
      send({ type: 'error', message: (errData.error && errData.error.message) || 'API error' });
      res.end();
      return;
    }

    var fullText = '';
    var statusMessages = [
      'Проверяю требования 152-ФЗ...',
      'Анализирую рекламные требования...',
      'Оцениваю соответствие ЗоЗПП...',
      'Проверяю лицензирование...',
      'Формирую реестр рисков...'
    ];
    var statusIdx = 0;
    var lastStatusTime = Date.now();

    // Читаем стрим
    var reader = response.body.getReader();
    var decoder = new TextDecoder();

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;

      var text = decoder.decode(chunk.value, { stream: true });
      var lines = text.split('\n');

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data:')) continue;
        var jsonStr = line.slice(5).trim();
        if (jsonStr === '[DONE]') continue;

        try {
          var event = JSON.parse(jsonStr);
          if (event.type === 'content_block_delta' && event.delta && event.delta.text) {
            fullText += event.delta.text;

            // Отправляем статус каждые 3 секунды
            if (Date.now() - lastStatusTime > 3000 && statusIdx < statusMessages.length) {
              send({ type: 'status', message: statusMessages[statusIdx++] });
              lastStatusTime = Date.now();
            }
          }
        } catch (e) {
          // Пропускаем невалидные строки
        }
      }
    }

    // Извлекаем JSON из ответа
    var jsonStart = fullText.indexOf('{');
    var jsonEnd = fullText.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) {
      send({ type: 'error', message: 'Не удалось получить JSON от модели' });
      res.end();
      return;
    }

    var clean = fullText.slice(jsonStart, jsonEnd + 1);
    var parsed = JSON.parse(clean);

    // Сохранить в Supabase
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

    send({ type: 'done', data: parsed });
    res.end();

  } catch (err) {
    send({ type: 'error', message: err.message || 'Unknown error' });
    res.end();
  }
};
