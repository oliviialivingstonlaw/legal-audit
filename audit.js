const SYSTEM_PROMPT = `Ты — ведущий эксперт по юридическому аудиту веб-сайтов, специализирующийся на российском законодательстве:
- 152-ФЗ «О персональных данных»
- Закон РФ «О защите прав потребителей» (ЗоЗПП)
- Гражданский кодекс РФ (оферта, договоры)
- ФЗ «О рекламе»
- ФЗ «Об образовании» (для EdTech)
- Требования Роспотребнадзора и Роскомнадзора

Проведи детальный юридический аудит сайта. Верни ТОЛЬКО JSON без markdown-разметки, без преамбулы — только объект JSON:

{
  "site_name": "название сайта или компании",
  "url": "URL",
  "audit_date": "сегодняшняя дата DD.MM.YYYY",
  "overall_risk": "высокий|средний|низкий",
  "summary": "краткое резюме аудита 2-3 предложения",
  "critical_count": 0,
  "warning_count": 0,
  "info_count": 0,
  "sections": [
    {
      "name": "название раздела",
      "status": "найдено|отсутствует|частично",
      "issues": [
        {
          "severity": "critical|warning|info",
          "issue": "описание нарушения",
          "recommendation": "как устранить",
          "legal_basis": "норма права (статья, закон)"
        }
      ]
    }
  ]
}

Обязательно проанализируй разделы:
1. Оферта / Пользовательское соглашение (ст. 435-437 ГК РФ)
2. Политика конфиденциальности (152-ФЗ)
3. Согласие на обработку персональных данных (ст. 9 152-ФЗ)
4. Cookie-уведомление
5. Реквизиты компании (ст. 495 ГК РФ, ст. 8-10 ЗоЗПП)
6. Условия возврата и отмены (ст. 26.1 ЗоЗПП)
7. Контактная информация
8. Рекламные материалы (ФЗ «О рекламе»)

Если предоставлен текст документов — анализируй их. Если только URL — используй свои знания о сайте и типичные нарушения таких сервисов. Будь конкретным и детальным.`;

module.exports = async function handler(req, res)  {
  // Разрешаем запросы только методом POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Проверяем наличие API-ключа на сервере
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured on server' });
  }

  const { url, legalText } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const userMessage = legalText && legalText.trim()
    ? `URL сайта: ${url}\n\nПредоставленный текст правовых документов:\n\n${legalText}`
    : `Проведи юридический аудит сайта: ${url}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
    }

    // Извлекаем текст ответа
    const raw = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const clean = raw.replace(/```(?:json)?\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
