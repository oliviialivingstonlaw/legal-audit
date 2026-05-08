var BASE_LAWS = `152-ФЗ (персональные данные), ФЗ-266, ФЗ-406, КоАП ст.13.11,
ФЗ-38 (реклама, ERID, ОРД, ЕРИР), ФЗ-149 (информация),
ГК РФ гл.28 (оферта, акцепт, договор), ЗоЗПП (защита прав потребителей),
ФЗ-436 (возрастная маркировка), КоАП — административная ответственность`;

var INDUSTRY_LAWS = {
  ecommerce: `ДОПОЛНИТЕЛЬНО ДЛЯ E-COMMERCE:
- ФЗ-54 (онлайн-касса, фискальные чеки)
- ПП РФ №612 (дистанционная торговля — обязательные разделы сайта, возврат)
- ЗоЗПП ст.26.1 (возврат 7 дней без объяснения причин)
- 353-ФЗ (потребительский кредит, рассрочка)
- ФЗ-161 (эквайринг, платёжные системы)
- Обязательно: раздел "Оплата и доставка", реквизиты, политика возврата`,

  education: `ДОПОЛНИТЕЛЬНО ДЛЯ ОБРАЗОВАНИЯ:
- ФЗ-273 (образование — лицензия, аккредитация, документы)
- ФЗ-99 (лицензирование образовательной деятельности)
- Приказ Рособрнадзора — раскрытие информации
- Запрет: "магистратура", "докторантура" без аккредитации
- Договор об образовании — обязательные условия по ФЗ-273 ст.54`,

  medicine: `ДОПОЛНИТЕЛЬНО ДЛЯ МЕДИЦИНЫ:
- ФЗ-323 (охрана здоровья — информированное согласие)
- ФЗ-99 ст.12 (лицензирование медицинской деятельности)
- ФЗ-38 ст.24 (реклама медуслуг — обязательные предупреждения)
- ФЗ-38 ст.25 (реклама лекарств — ограничения)
- Запрет: гарантии результата лечения, сравнение с конкурентами
- Обязательно: лицензия, прайс, врачи и их квалификация`,

  finance: `ДОПОЛНИТЕЛЬНО ДЛЯ ФИНАНСОВ:
- ФЗ-395-1 (банковская деятельность — лицензия ЦБ РФ)
- ФЗ-161 (национальная платёжная система)
- ФЗ-115 (ПОД/ФТ — идентификация клиентов)
- ФЗ-353 (потребительский кредит — ПСК, раскрытие условий)
- Запрет: обещания доходности без оговорок, нелицензированная деятельность`,

  realestate: `ДОПОЛНИТЕЛЬНО ДЛЯ НЕДВИЖИМОСТИ:
- ФЗ-214 (долевое строительство — эскроу, проектная декларация)
- ФЗ-218 (государственная регистрация)
- ФЗ-135 (оценочная деятельность)
- ФЗ-102 (ипотека)
- Обязательно: разрешение на строительство, проектная декларация`,

  it: `ДОПОЛНИТЕЛЬНО ДЛЯ IT / SAAS:
- ФЗ-149 (информтехнологии — хранение данных в РФ, уведомление РКН)
- ГК РФ ч.4 (авторское право, лицензионные договоры)
- ФЗ-98 (коммерческая тайна, NDA)
- EULA и лицензионные соглашения — соответствие ГК РФ ст.1286
- Политика возврата подписки, SLA`,

  tourism: `ДОПОЛНИТЕЛЬНО ДЛЯ ТУРИЗМА:
- ФЗ-132 (туристская деятельность — туроператор vs турагент)
- Реестр туроператоров — обязательное членство
- Финансовые гарантии (страховка или банковская гарантия)
- ФЗ-132 ст.10 (существенные условия договора)
- ЗоЗПП ст.32 — возврат средств при отказе`,

  media: `ДОПОЛНИТЕЛЬНО ДЛЯ МЕДИА / РЕКЛАМЫ:
- ФЗ-2124-1 (СМИ — регистрация)
- ФЗ-38 расширенно (ERID, ОРД/ЕРИР — маркировка всей рекламы)
- Закон об иностранных агентах (если применимо)
- ГК РФ ч.4 — использование чужих материалов, авторские права`,

  other: `Определи отрасль самостоятельно по содержанию сайта и применяй все релевантные нормы из всех отраслей.`
};

function buildSystemPrompt(industry) {
  var extra = INDUSTRY_LAWS[industry] || INDUSTRY_LAWS['other'];
  return `Ты эксперт по юридическому аудиту сайтов РФ (2026).

БАЗОВЫЕ НОРМЫ (применять всегда): ${BASE_LAWS}

${extra}

Верни ТОЛЬКО валидный JSON. Первый символ — {. Последний — }. Никакого текста.

JSON: {"site_name":"...","url":"...","audit_date":"DD.MM.YYYY","industry":"...","compliance_score":45,"overall_risk":"высокий|средний|низкий","summary":"2-3 предложения","total_risks":12,"critical_count":5,"warning_count":5,"info_count":2,"max_fine":"до X руб.","min_fine":"от X руб.","block_risk":1,"license_risk":0,"blocks":[{"code":"A","name":"Персональные данные","count":3,"level":"critical"},{"code":"B","name":"Реклама / ERID","count":2,"level":"warning"},{"code":"C","name":"Защита потребителей","count":2,"level":"warning"},{"code":"F","name":"Лицензирование","count":1,"level":"critical"},{"code":"H","name":"E-commerce / Оферта","count":2,"level":"warning"},{"code":"M","name":"Технические требования","count":1,"level":"info"},{"code":"G","name":"Налоги / Финансы","count":1,"level":"info"}],"risks":[{"id":"PD-001","category_code":"A","category":"A — Персональные данные","name":"...","description":"...","norm":"...","fine_label":"...","fine_max":700000,"probability":3,"impact":3,"score":9,"priority":"critical","action":"...","responsible":"ИТ+ЮР","deadline":"7 дней","deadline_days":7,"block_risk":false,"license_risk":false,"status":"Новый"}],"quick_wins":[{"id":"TXT-001","name":"...","time":"5 мин","responsible":"Разработчик"}]}

ПРАВИЛА: вероятность(1-3) × влияние(1-3) = балл. 7-9=critical, 3-6=warning, 1-2=info. Выяви 10-14 рисков релевантных для данной отрасли. 3-5 быстрых побед.`;
}

var STATUS_MSGS = {
  ecommerce:  ['Проверяем торговые правила...','Анализируем оферту...','Проверяем ФЗ-54...','Оцениваем ЗоЗПП...','Формируем реестр рисков...'],
  education:  ['Проверяем лицензию...','Анализируем ФЗ-273...','Проверяем документы...','Оцениваем рекламу...','Формируем реестр рисков...'],
  medicine:   ['Проверяем медлицензию...','Анализируем ФЗ-323...','Проверяем рекламу услуг...','Оцениваем согласия...','Формируем реестр рисков...'],
  finance:    ['Проверяем лицензию ЦБ...','Анализируем ФЗ-115...','Проверяем условия...','Оцениваем ПОД/ФТ...','Формируем реестр рисков...'],
  realestate: ['Проверяем документы...','Анализируем ФЗ-214...','Проверяем договор...','Оцениваем раскрытие...','Формируем реестр рисков...'],
  it:         ['Проверяем лицензии...','Анализируем авторские права...','Проверяем данные...','Оцениваем EULA...','Формируем реестр рисков...'],
  tourism:    ['Проверяем реестр...','Анализируем ФЗ-132...','Проверяем договор...','Оцениваем гарантии...','Формируем реестр рисков...'],
  media:      ['Проверяем статус СМИ...','Анализируем ERID...','Проверяем авторские права...','Оцениваем материалы...','Формируем реестр рисков...'],
  other:      ['Анализируем сайт...','Проверяем 152-ФЗ...','Проверяем рекламу...','Оцениваем ЗоЗПП...','Формируем реестр рисков...']
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var body = req.body || {};
  var url = body.url;
  var legalText = body.legalText;
  var userId = body.userId;
  var industry = body.industry || 'other';

  if (!url) return res.status(400).json({ error: 'URL required' });

  var today = new Date().toLocaleDateString('ru-RU');
  var hint = industry !== 'other' ? ' Отрасль: ' + industry + '.' : '';
  var msg = (legalText && legalText.trim())
    ? 'Аудит: ' + url + '\nДата: ' + today + hint + '\nДокументы:\n' + legalText + '\nВЕРНИ ТОЛЬКО JSON.'
    : 'Аудит: ' + url + '\nДата: ' + today + hint + '\nВЕРНИ ТОЛЬКО JSON.';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  var send = function(data) { res.write('data: ' + JSON.stringify(data) + '\n\n'); };

  try {
    var msgs = STATUS_MSGS[industry] || STATUS_MSGS['other'];
    var msgIdx = 0;
    send({ type: 'status', message: msgs[0] });

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
        system: buildSystemPrompt(industry),
        messages: [{ role: 'user', content: msg }]
      })
    });

    if (!response.ok) {
      var ed = await response.json();
      send({ type: 'error', message: (ed.error && ed.error.message) || 'API error' });
      res.end(); return;
    }

    var fullText = '';
    var lastT = Date.now();
    var reader = response.body.getReader();
    var decoder = new TextDecoder();

    while (true) {
      var chunk = await reader.read();
      if (chunk.done) break;
      var lines = decoder.decode(chunk.value, { stream: true }).split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data:')) continue;
        var js = line.slice(5).trim();
        if (js === '[DONE]') continue;
        try {
          var ev = JSON.parse(js);
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.text) {
            fullText += ev.delta.text;
            if (Date.now() - lastT > 3000 && msgIdx + 1 < msgs.length) {
              msgIdx++; send({ type: 'status', message: msgs[msgIdx] }); lastT = Date.now();
            }
          }
        } catch(e) {}
      }
    }

    var s = fullText.indexOf('{'), e = fullText.lastIndexOf('}');
    if (s === -1 || e === -1) { send({ type: 'error', message: 'Не получили JSON' }); res.end(); return; }
    var parsed = JSON.parse(fullText.slice(s, e + 1));

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
            user_id: userId, url: parsed.url || url, site_name: parsed.site_name || '',
            audit_date: parsed.audit_date || today, overall_risk: parsed.overall_risk || '',
            summary: parsed.summary || '', critical_count: parsed.critical_count || 0,
            warning_count: parsed.warning_count || 0, info_count: parsed.info_count || 0,
            max_fine: parsed.max_fine || '', risks: parsed
          })
        });
      } catch(err) { console.error('Supabase:', err.message); }
    }

    send({ type: 'done', data: parsed });
    res.end();

  } catch(err) {
    send({ type: 'error', message: err.message || 'Unknown error' });
    res.end();
  }
};
