var LABELS = { ecommerce:'E-commerce', education:'Образование', medicine:'Медицина', finance:'Финансы', realestate:'Недвижимость', it:'IT / SaaS', tourism:'Туризм', media:'Медиа', other:'Прочее' };

function buildPrompt(docType, d) {
  var base = 'Компания: ' + d.company_name + ', ИНН ' + d.inn + (d.ogrn ? ', ОГРН ' + d.ogrn : '') + '. Адрес: ' + (d.address||'[адрес]') + '. Email: ' + (d.email||'[email]') + '. Тел: ' + (d.phone||'[тел]') + '. Сайт: ' + d.url + '. Отрасль: ' + d.industry_label + '.';
  var prompts = {
    offer:   'Ты юрист РФ 2026. Составь публичную оферту. ' + base + ' Услуги: ' + (d.services||'услуги через сайт') + '. Требования: ГК РФ ст.435-438, ст.779-783, ЗоЗПП. Включи: предмет, стоимость, оплата, права/обязанности, ответственность, расторжение, возвраты, ПДн, применимое право, реквизиты. Верни ТОЛЬКО HTML (h2,h3,p,ul,li,strong без DOCTYPE/html/head/body).',
    privacy: 'Ты юрист РФ 2026. Составь политику обработки персональных данных. ' + base + ' Требования: 152-ФЗ, ФЗ-266, ФЗ-406. Включи: оператор, цели, правовые основания, состав данных, сроки хранения, права субъекта, трансграничная передача, cookies, безопасность, контакты. Верни ТОЛЬКО HTML (h2,h3,p,ul,li,strong без DOCTYPE/html/head/body).',
    cookies: 'Составь политику cookies для ' + d.url + ' (' + d.company_name + ', ИНН ' + d.inn + '). 152-ФЗ, 149-ФЗ. Включи: что такое cookies, типы (необходимые/аналитические/маркетинговые), сроки, управление, согласие. Верни ТОЛЬКО HTML (h2,h3,p,ul,li,strong без DOCTYPE/html/head/body).',
    terms:   'Составь пользовательское соглашение для ' + d.url + ' (' + d.company_name + ', ИНН ' + d.inn + ', отрасль: ' + d.industry_label + '). ГК РФ, 149-ФЗ. Включи: предмет, правила использования, запреты, ИС, ответственность, изменение условий, применимое право. Верни ТОЛЬКО HTML (h2,h3,p,ul,li,strong без DOCTYPE/html/head/body).'
  };
  return prompts[docType] || prompts['offer'];
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'API key not configured' });

  var body = req.body || {};
  if (!body.docType || !body.url || !body.company_name) return res.status(400).json({ error: 'docType, url, company_name обязательны' });

  var d = {
    url: body.url, inn: body.inn||'', company_name: body.company_name,
    ogrn: body.ogrn||'', address: body.address||'',
    email: body.email||'', phone: body.phone||'',
    industry: body.industry||'other',
    industry_label: LABELS[body.industry||'other']||'Прочее',
    services: body.services||''
  };

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, messages: [{ role: 'user', content: buildPrompt(body.docType, d) }] })
    });

    if (!response.ok) { var ed = await response.json(); return res.status(500).json({ error: (ed.error && ed.error.message) || 'API error ' + response.status }); }

    var result = await response.json();
    var html = (result.content && result.content[0] && result.content[0].text) || '';

    return res.json({
      ok: true,
      html: html,
      docType: body.docType,
      company_name: d.company_name,
      url: d.url,
      generated_at: new Date().toLocaleDateString('ru-RU')
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
