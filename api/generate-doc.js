// api/generate-doc.js — Автогенерация юридических документов под конкретный сайт

var DOC_PROMPTS = {

  offer: function(data) {
    return `Ты юрист-эксперт по российскому праву (2026). Составь публичную оферту для сайта.

ДАННЫЕ КОМПАНИИ:
- Наименование: ${data.company_name}
- ИНН: ${data.inn}
- ОГРН: ${data.ogrn || '[ОГРН]'}
- Адрес: ${data.address || '[Юридический адрес]'}
- Email: ${data.email || '[Email]'}
- Телефон: ${data.phone || '[Телефон]'}
- Сайт: ${data.url}
- Отрасль/деятельность: ${data.industry_label}
- Описание услуг: ${data.services || 'Услуги через сайт'}

ТРЕБОВАНИЯ:
- Соответствие ГК РФ ст.435-438, ст.779-783, ст.450-453
- Учитывать ЗоЗПП для B2C
- Включить: предмет договора, стоимость и порядок оплаты, порядок оказания услуг, права и обязанности сторон, ответственность, порядок расторжения, возвраты, обработка ПДн, применимое право
- Для отрасли "${data.industry_label}" добавить специфичные условия
- Ограничение ответственности исполнителя
- Указать что акцептом является оплата или регистрация

Верни ТОЛЬКО текст оферты в формате HTML (без DOCTYPE, html, head, body тегов).
Используй теги: h2, h3, p, ul, li, strong.
Нумеруй разделы. Язык — русский, юридический стиль.`;
  },

  privacy: function(data) {
    return `Ты юрист-эксперт по российскому праву (2026). Составь политику обработки персональных данных.

ДАННЫЕ КОМПАНИИ:
- Наименование: ${data.company_name}
- ИНН: ${data.inn}
- Адрес: ${data.address || '[Юридический адрес]'}
- Email: ${data.email || '[Email]'}
- Сайт: ${data.url}
- Отрасль: ${data.industry_label}

СОБИРАЕМЫЕ ДАННЫЕ (на основе типичного сайта отрасли "${data.industry_label}"):
- Стандартные: ФИО, email, телефон, IP-адрес, cookies
${data.collects_payment ? '- Платёжные данные (без хранения карт)' : ''}
${data.industry === 'medicine' ? '- Медицинские данные (специальная категория)' : ''}
${data.industry === 'education' ? '- Данные несовершеннолетних (при наличии)' : ''}

ТРЕБОВАНИЯ:
- Строгое соответствие 152-ФЗ, ФЗ-266, ФЗ-406
- Включить: оператор, цели обработки, правовые основания, состав данных, сроки хранения, права субъекта, трансграничная передача (Supabase/США если применимо), cookies, безопасность, контакты для обращений
- Уведомление РКН
- Механизм отзыва согласия
- Актуальные требования 2026 года

Верни ТОЛЬКО текст политики в формате HTML (без DOCTYPE, html, head, body тегов).
Используй теги: h2, h3, p, ul, li, strong. Нумеруй разделы.`;
  },

  cookies: function(data) {
    return `Составь политику использования cookies для сайта ${data.url} (${data.company_name}, ИНН ${data.inn}).

Включи: что такое cookies, типы (строго необходимые, аналитические, маркетинговые), конкретные сервисы (Яндекс.Метрика, Google Analytics — если применимо), сроки хранения, управление cookies, согласие.
Соответствие 152-ФЗ, ФЗ-149.

Верни ТОЛЬКО HTML (без DOCTYPE/html/head/body). Теги: h2, h3, p, ul, li, strong.`;
  },

  terms: function(data) {
    return `Составь пользовательское соглашение для сайта ${data.url}.

Компания: ${data.company_name}, ИНН ${data.inn}, отрасль: ${data.industry_label}.

Включи: предмет, порядок использования сервиса, запрещённые действия, интеллектуальная собственность, ответственность, изменение условий, применимое право. Учти специфику отрасли.

Верни ТОЛЬКО HTML (без DOCTYPE/html/head/body). Теги: h2, h3, p, ul, li, strong.`;
  }
};

var INDUSTRY_LABELS = {
  ecommerce: 'E-commerce / Интернет-торговля',
  education: 'Образование / EdTech',
  medicine: 'Медицина / Здравоохранение',
  finance: 'Финансы / Fintech',
  realestate: 'Недвижимость',
  it: 'IT / SaaS',
  tourism: 'Туризм',
  media: 'Медиа / Реклама',
  other: 'Прочее'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var body = req.body || {};
  var docType   = body.docType;   // offer | privacy | cookies | terms
  var url       = body.url;
  var inn       = body.inn;
  var companyName = body.company_name;
  var industry  = body.industry || 'other';
  var email     = body.email;
  var phone     = body.phone;
  var address   = body.address;
  var ogrn      = body.ogrn;
  var services  = body.services;

  if (!docType || !url || !companyName) {
    return res.status(400).json({ error: 'docType, url и company_name обязательны' });
  }

  var promptFn = DOC_PROMPTS[docType];
  if (!promptFn) return res.status(400).json({ error: 'Неизвестный тип документа: ' + docType });

  var data = {
    url, inn, company_name: companyName, ogrn, address, email, phone,
    industry, industry_label: INDUSTRY_LABELS[industry] || 'Прочее',
    services, collects_payment: ['ecommerce','finance','it'].includes(industry)
  };

  var prompt = promptFn(data);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  var send = function(d) { res.write('data: ' + JSON.stringify(d) + '\n\n'); };

  var STATUS = {
    offer:   ['Анализирую деятельность компании...', 'Составляю предмет договора...', 'Прописываю права и обязанности...', 'Добавляю условия возврата...', 'Финализирую оферту...'],
    privacy: ['Определяю состав персональных данных...', 'Прописываю цели обработки...', 'Добавляю права субъектов...', 'Проверяю соответствие 152-ФЗ...', 'Финализирую политику...'],
    cookies: ['Анализирую используемые сервисы...', 'Составляю описание cookies...', 'Добавляю права пользователей...', 'Финализирую политику...'],
    terms:   ['Анализирую специфику сервиса...', 'Составляю правила использования...', 'Прописываю ограничения...', 'Финализирую соглашение...']
  };

  try {
    var statusMsgs = STATUS[docType] || STATUS['offer'];
    var msgIdx = 0;
    send({ type: 'status', message: statusMsgs[0] });

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        stream: true,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      var ed = await response.json();
      send({ type: 'error', message: (ed.error && ed.error.message) || 'API error' });
      res.end(); return;
    }

    var fullText = '', lastT = Date.now();
    var reader = response.body.getReader(), decoder = new TextDecoder();

    while (true) {
      var chunk = await reader.read(); if (chunk.done) break;
      var lines = decoder.decode(chunk.value, { stream: true }).split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data:')) continue;
        var js = line.slice(5).trim(); if (js === '[DONE]') continue;
        try {
          var ev = JSON.parse(js);
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.text) {
            fullText += ev.delta.text;
            if (Date.now() - lastT > 4000 && msgIdx + 1 < statusMsgs.length) {
              msgIdx++; send({ type: 'status', message: statusMsgs[msgIdx] }); lastT = Date.now();
            }
          }
        } catch(e) {}
      }
    }

    if (!fullText) { send({ type: 'error', message: 'Модель вернула пустой ответ' }); res.end(); return; }

    send({ type: 'done', data: { html: fullText, docType, company_name: companyName, url, generated_at: new Date().toLocaleDateString('ru-RU') } });
    res.end();

  } catch(e) {
    send({ type: 'error', message: e.message || 'Unknown error' });
    res.end();
  }
};
