// ══════════════════════════════════════════════════════
// PIPE FORMAT PARSER — конвертирует текст в JSON
// ══════════════════════════════════════════════════════
function parsePipeFormat(text) {
  var lines = text.split('\n').map(function(l){ return l.trim(); }).filter(Boolean);
  var section = '';
  var result = {
    blocks: [], risks: [], quick_wins: [],
    site_name:'', url:'', audit_date:'', industry:'', audit_type:'surface',
    compliance_score:50, overall_risk:'средний', summary:'',
    total_risks:0, critical_count:0, warning_count:0, info_count:0,
    max_fine:'', min_fine:'', block_risk:0, license_risk:0
  };

  lines.forEach(function(line) {
    if (line === 'SITE_INFO' || line === 'BLOCKS' || line === 'RISKS' || line === 'QUICKWINS') {
      section = line; return;
    }
    var p = line.split('|');

    if (section === 'SITE_INFO' && p.length >= 14) {
      result.site_name = p[0]; result.url = p[1]; result.audit_date = p[2];
      result.industry = p[3]; result.audit_type = p[4];
      result.compliance_score = parseInt(p[5])||50;
      result.overall_risk = p[6]; result.summary = p[7];
      result.total_risks = parseInt(p[8])||0;
      result.critical_count = parseInt(p[9])||0;
      result.warning_count = parseInt(p[10])||0;
      result.info_count = parseInt(p[11])||0;
      result.max_fine = p[12]; result.min_fine = p[13];
    }
    else if (section === 'BLOCKS' && p.length >= 4) {
      result.blocks.push({ code:p[0], name:p[1], count:parseInt(p[2])||0, level:p[3] });
    }
    else if (section === 'RISKS' && p.length >= 14) {
      result.risks.push({
        id:p[0], category_code:p[1], name:p[2], description:p[3],
        norm:p[4], fine_label:p[5], fine_max:parseInt(p[6])||0, fine_min:parseInt(p[7])||0,
        probability:parseInt(p[8])||1, impact:parseInt(p[9])||1, score:parseInt(p[10])||1,
        priority:p[11], action:p[12], responsible:p[13],
        deadline:p[14]||'30 дней', deadline_days:parseInt(p[15])||30,
        status:'Новый'
      });
    }
    else if (section === 'QUICKWINS' && p.length >= 4) {
      result.quick_wins.push({ id:p[0], name:p[1], time:p[2], responsible:p[3], norm:p[4]||'' });
    }
  });

  if (!result.total_risks) result.total_risks = result.risks.length;
  if (!result.critical_count) result.critical_count = result.risks.filter(function(r){return r.priority==='critical';}).length;
  if (!result.warning_count) result.warning_count = result.risks.filter(function(r){return r.priority==='warning';}).length;
  if (!result.info_count) result.info_count = result.risks.filter(function(r){return r.priority==='info';}).length;

  if (!result.site_name && !result.risks.length) throw new Error('Не удалось разобрать ответ. Повторите попытку.');
  return result;
}

// ══════════════════════════════════════════════════════
// БАЗОВЫЕ НОРМЫ
// ══════════════════════════════════════════════════════
var BASE_NPA = 'ГК РФ ч.I (оферта ст.435-438, условия ст.450-453), ГК РФ ч.II (услуги ст.779-783), ГК РФ ч.IV (ИС, товарные знаки), ЗоЗПП №2300-1, ФЗ-152 (ПДн), ФЗ-242 (локализация ПДн), ФЗ-149 (информация), ФЗ-38 (реклама, ERID, ОРД), ФЗ-135 (конкуренция), ФЗ-436 (возрастная маркировка), ФЗ-54 (ККТ), ФЗ-161 (платежи), КоАП РФ, НК РФ, ФЗ-99 (лицензирование)';

var INDUSTRY_EXTRA = {
  ecommerce:  'ПП РФ №2463 (дистанционная торговля, возврат 7 дней), ЗоЗПП ст.26.1, ФЗ-381 (торговля), ФЗ-488/Честный знак (маркировка), ФЗ-353 (рассрочка/кредит), ФЗ-103 (платежные агенты)',
  education:  'ФЗ-273 (образование, лицензия, сведения об организации), ФЗ-99 (лицензирование), ЗоЗПП (возвраты за курсы), ФЗ-38 (запрет гарантий трудоустройства)',
  medicine:   'ФЗ-323 (охрана здоровья, согласие пациента, телемедицина), ФЗ-99 (медлицензия), ФЗ-38 ст.24-25 (реклама медуслуг, дисклеймеры), ФЗ-152 (спецкатегории ПДн)',
  finance:    'ФЗ-395-1 (банковская лицензия), ФЗ-115 (ПОД/ФТ), ФЗ-353 (потребкредит, ПСК), ФЗ-39 (ценные бумаги), ФЗ-259 (ЦФА), ФЗ-38 (реклама финуслуг)',
  realestate: 'ФЗ-214 (долевое строительство, эскроу, проектная декларация), ФЗ-218 (регистрация), ФЗ-102 (ипотека), ФЗ-135 (оценка), ФЗ-38 (реклама ЖК)',
  it:         'ГК РФ ч.IV ст.1286 (лицензия на ПО), ФЗ-149 (уведомление РКН), ФЗ-63 (ЭП в ЛК), ФЗ-187 (КИИ), ФЗ-98 (коммерческая тайна)',
  tourism:    'ФЗ-132 (туроператор/агент, реестр, фингарантии), ЗоЗПП ст.32 (возврат), ФЗ-132 ст.10 (существенные условия договора)',
  media:      'ФЗ-2124-1 (СМИ, регистрация), ФЗ-38 (ERID на всей интернет-рекламе, ОРД/ЕРИР), закон об иноагентах, ГК РФ ч.IV (авторские права)',
  other:      'Определи отрасль самостоятельно по URL. Применяй все релевантные нормы.'
};

function buildPrompt(type, industry) {
  var extra = INDUSTRY_EXTRA[industry] || INDUSTRY_EXTRA['other'];
  var riskCount = type === 'deep' ? '15-20' : '7-9';
  var qwCount   = type === 'deep' ? '4'     : '3';
  var detail    = type === 'deep'
    ? 'Глубокий аудит: точная статья закона (напр. 152-ФЗ ст.9 ч.2), конкретный штраф, описание нарушения до 80 символов, шаги устранения до 120 символов.'
    : 'Базовый аудит: краткие описания до 60 символов, основные штрафы.';

  return `Ты эксперт по юридическому аудиту сайтов РФ (2026). ${detail}

БАЗОВЫЕ НОРМЫ: ${BASE_NPA}
ОТРАСЛЕВЫЕ НОРМЫ: ${extra}

ВЕРНИ ОТВЕТ СТРОГО В СЛЕДУЮЩЕМ ФОРМАТЕ (ничего кроме этого формата, никакого JSON):

SITE_INFO
название_сайта|URL|DD.MM.YYYY|отрасль|${type}|compliance_score_0-100|высокий/средний/низкий|краткий вывод до 120 символов|total_risks|critical_count|warning_count|info_count|до X руб.|от Y руб.

BLOCKS
A|Идентификация владельца|count|critical/warning/info
B|Документы сайта|count|critical/warning/info
C|Персональные данные|count|critical/warning/info
D|Реклама и маркетинг|count|critical/warning/info
E|Оплата и возвраты|count|critical/warning/info
F|Контент и ИС|count|critical/warning/info
G|Лицензирование|count|critical/warning/info

RISKS
id|category_code|название до 50 символов|описание до 80 символов|НПА ст.X|до N руб.|fine_max_число|fine_min_число|probability_1-3|impact_1-3|score_1-9|critical/warning/info|действие до 100 символов|ЮР/ИТ/ФИН|срок текстом|срок_дней_число

QUICKWINS
QW-001|название до 50 символов|10 мин|Разработчик|НПА

ПРАВИЛА:
- Ровно ${riskCount} рисков, ${qwCount} быстрые победы
- Символ | (пайп) нельзя использовать внутри полей - заменяй на тире
- Никаких кавычек, никакого JSON, только указанный формат
- probability x impact = score (1-3 x 1-3 = 1-9)`;
}

var SURFACE_MSGS = ['Анализирую структуру сайта...','Проверяю ключевые нормы...','Оцениваю основные риски...','Формирую отчёт...'];
var DEEP_MSGS = {
  ecommerce:  ['Проверяю идентификацию владельца...','Анализирую документы (оферта, ПДн)...','Проверяю ФЗ-54 и оплату...','Анализирую рекламу (38-ФЗ, ERID)...','Проверяю ПП №2463 и возвраты...','Формирую реестр рисков...'],
  education:  ['Проверяю лицензию (ФЗ-273)...','Анализирую документы сайта...','Проверяю рекламные обещания...','Анализирую ПДн (152-ФЗ)...','Оцениваю договор об образовании...','Формирую реестр рисков...'],
  medicine:   ['Проверяю медлицензию (323-ФЗ)...','Анализирую рекламу (38-ФЗ ст.24)...','Проверяю согласия пациентов...','Анализирую спецкатегории ПДн...','Оцениваю телемедицину...','Формирую реестр рисков...'],
  finance:    ['Проверяю лицензию ЦБ РФ...','Анализирую ФЗ-115 (ПОД/ФТ)...','Проверяю раскрытие условий...','Анализирую рекламу финуслуг...','Оцениваю инвестиционные риски...','Формирую реестр рисков...'],
  realestate: ['Проверяю документы застройщика...','Анализирую ФЗ-214...','Проверяю проектную декларацию...','Анализирую рекламу недвижимости...','Оцениваю договор...','Формирую реестр рисков...'],
  it:         ['Проверяю EULA и лицензию на ПО...','Анализирую авторские права...','Проверяю хранение данных (149-ФЗ)...','Анализирую ЭП в ЛК (63-ФЗ)...','Оцениваю SaaS-риски...','Формирую реестр рисков...'],
  tourism:    ['Проверяю реестр туроператоров...','Анализирую ФЗ-132...','Проверяю финансовые гарантии...','Анализирую договор...','Оцениваю возвраты (ЗоЗПП)...','Формирую реестр рисков...'],
  media:      ['Проверяю статус СМИ...','Анализирую ERID-маркировку...','Проверяю авторские права...','Анализирую иностранные материалы...','Оцениваю нативную рекламу...','Формирую реестр рисков...'],
  other:      ['Анализирую сайт...','Проверяю 152-ФЗ...','Проверяю рекламу (38-ФЗ)...','Оцениваю ЗоЗПП...','Проверяю оферту и ГК РФ...','Формирую реестр рисков...']
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var body = req.body || {};
  var url = body.url, userId = body.userId;
  var industry = body.industry || 'other';
  var auditType = body.auditType || 'surface';
  if (!url) return res.status(400).json({ error: 'URL required' });

  var today = new Date().toLocaleDateString('ru-RU');
  var hint  = industry !== 'other' ? ' Отрасль: ' + industry + '.' : '';
  var msg   = 'Аудит сайта: ' + url + '\nДата: ' + today + hint + '\nФормат: ' + (auditType === 'deep' ? 'ГЛУБОКИЙ' : 'БАЗОВЫЙ');

  var model    = auditType === 'deep' ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';
  var maxTok   = auditType === 'deep' ? 6000 : 3000;
  var statusMs = auditType === 'deep' ? (DEEP_MSGS[industry] || DEEP_MSGS['other']) : SURFACE_MSGS;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  var send = function(data) { res.write('data: ' + JSON.stringify(data) + '\n\n'); };

  try {
    var msgIdx = 0;
    send({ type: 'status', message: statusMs[0] });

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: model, max_tokens: maxTok, stream: true,
        system: buildPrompt(auditType, industry),
        messages: [{ role: 'user', content: msg }]
      })
    });

    if (!response.ok) { var ed = await response.json(); send({ type: 'error', message: (ed.error && ed.error.message) || 'API error' }); res.end(); return; }

    var fullText = '', lastT = Date.now(), reader = response.body.getReader(), decoder = new TextDecoder();
    while (true) {
      var chunk = await reader.read(); if (chunk.done) break;
      var lines = decoder.decode(chunk.value, { stream: true }).split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim(); if (!line.startsWith('data:')) continue;
        var js = line.slice(5).trim(); if (js === '[DONE]') continue;
        try {
          var ev = JSON.parse(js);
          if (ev.type === 'content_block_delta' && ev.delta && ev.delta.text) {
            fullText += ev.delta.text;
            if (Date.now() - lastT > 3500 && msgIdx + 1 < statusMs.length) {
              msgIdx++; send({ type: 'status', message: statusMs[msgIdx] }); lastT = Date.now();
            }
          }
        } catch(e) {}
      }
    }

    var parsed = parsePipeFormat(fullText);

    if (userId && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      try {
        await fetch(process.env.SUPABASE_URL + '/rest/v1/audits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': process.env.SUPABASE_SERVICE_KEY, 'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_KEY, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ user_id: userId, url: parsed.url || url, site_name: parsed.site_name || '', audit_date: parsed.audit_date || today, overall_risk: parsed.overall_risk || '', summary: parsed.summary || '', critical_count: parsed.critical_count || 0, warning_count: parsed.warning_count || 0, info_count: parsed.info_count || 0, max_fine: parsed.max_fine || '', risks: parsed })
        });
      } catch(err) { console.error('Supabase:', err.message); }
    }

    send({ type: 'done', data: parsed });
    res.end();
  } catch(err) { send({ type: 'error', message: err.message || 'Unknown error' }); res.end(); }
};
