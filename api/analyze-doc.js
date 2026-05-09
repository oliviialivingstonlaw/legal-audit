var DOC_SYSTEM = `Ты эксперт по юридическому анализу договоров и правовых документов РФ (2026 год).

Тебе предоставлен текст юридического документа (оферта, договор, политика ПДн, пользовательское соглашение и т.д.).

Проведи детальный юридический анализ:

1. ИДЕНТИФИКАЦИЯ: определи тип документа, стороны, предмет
2. КРИТИЧЕСКИЕ ОШИБКИ: положения, нарушающие законодательство или ничтожные
3. НЕДОСТАЮЩИЕ УСЛОВИЯ: обязательные по закону пункты, которых нет
4. СЛАБЫЕ МЕСТА: условия, которые могут быть оспорены или привести к потерям
5. РЕКОМЕНДАЦИИ: конкретные правки с указанием статей законов
6. УРОВЕНЬ ЗАЩИТЫ: насколько документ защищает заказчика

Применяй: ГК РФ (ч.I, II, IV), ЗоЗПП, 152-ФЗ, 38-ФЗ, 54-ФЗ, 149-ФЗ, КоАП, НК РФ и отраслевые законы по содержанию документа.

ВЕРНИ ТОЛЬКО валидный JSON. Первый символ {. Последний }. Без текста вне JSON.

{"doc_type":"Тип документа (Оферта/Политика ПДн/Договор/и т.д.)","doc_quality":"плохой|удовлетворительный|хороший","protection_score":35,"summary":"Общая оценка документа в 2-3 предложениях","parties":{"customer":"кто покупатель/пользователь","provider":"кто продавец/исполнитель"},"critical_issues":[{"id":"CI-001","title":"Название критической ошибки","description":"Подробное описание с цитатой из документа (если применимо)","norm":"ГК РФ ст.421 ч.4","consequence":"Последствие: ничтожность условия / штраф / риск иска","recommendation":"Конкретная правка: заменить на...","severity":"critical"}],"missing_clauses":[{"id":"MC-001","title":"Отсутствующий обязательный пункт","description":"Что должно быть по закону","norm":"ЗоЗПП ст.10","recommendation":"Добавить пункт: ..."}],"weak_points":[{"id":"WP-001","title":"Слабое место","description":"Описание риска","recommendation":"Как усилить"}],"positive_aspects":["Что сделано правильно"],"action_plan":[{"priority":1,"action":"Первоочередное действие","norm":"...","effort":"1 час"}]}`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var body    = req.body || {};
  var docText = body.docText;
  var docName = body.docName || 'документ';

  if (!docText || docText.trim().length < 100) return res.status(400).json({ error: 'Текст документа слишком короткий или пустой' });

  var truncated = docText.substring(0, 12000);
  var msg = 'Проанализируй юридический документ "' + docName + '":\n\n' + truncated + '\n\nВЕРНИ ТОЛЬКО JSON.';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  var send = function(data) { res.write('data: ' + JSON.stringify(data) + '\n\n'); };

  var statusMsgs = ['Определяю тип документа...','Проверяю обязательные условия (ГК РФ)...','Анализирую защиту потребителей (ЗоЗПП)...','Проверяю персональные данные (152-ФЗ)...','Оцениваю риски и слабые места...','Формирую план правок...'];

  try {
    var msgIdx = 0;
    send({ type: 'status', message: statusMsgs[0] });

    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 6000, stream: true, system: DOC_SYSTEM, messages: [{ role: 'user', content: msg }] })
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
            if (Date.now() - lastT > 4000 && msgIdx + 1 < statusMsgs.length) { msgIdx++; send({ type: 'status', message: statusMsgs[msgIdx] }); lastT = Date.now(); }
          }
        } catch(e) {}
      }
    }

    var s = fullText.indexOf('{'), e2 = fullText.lastIndexOf('}');
    if (s === -1 || e2 === -1) { send({ type: 'error', message: 'Ошибка анализа документа' }); res.end(); return; }
    var jsonStr = fullText.slice(s, e2 + 1).replace(/[\x00-\x1F\x7F]/g, function(c) {
      if (c === '\n') return '\\n';
      if (c === '\r') return '\\r';
      if (c === '\t') return '\\t';
      return '';
    });
    send({ type: 'done', data: JSON.parse(jsonStr) });
    res.end();
  } catch(err) { send({ type: 'error', message: err.message || 'Unknown error' }); res.end(); }
};
