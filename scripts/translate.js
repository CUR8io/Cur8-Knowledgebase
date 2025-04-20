const fs = require('fs');
const path = require('path');
const axios = require('axios');

const sourceLang = 'en';
const targetLangs = ['fr'];
const docsDir = 'docs';

async function translate(text, targetLang) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-4',
      messages: [
        { role: 'system', content: `Translate this from English to ${targetLang}.` },
        { role: 'user', content: text },
      ]
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
    }
  );
  return response.data.choices[0].message.content;
}

(async () => {
  const sourceFiles = fs.readdirSync(path.join(docsDir, sourceLang)).filter(file => file.endsWith('.md'));

  for (const lang of targetLangs) {
    const targetPath = path.join(docsDir, lang);
    if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath, { recursive: true });

    for (const file of sourceFiles) {
      const content = fs.readFileSync(path.join(docsDir, sourceLang, file), 'utf8');
      const translated = await translate(content, lang);
      fs.writeFileSync(path.join(targetPath, file), translated);
    }
  }
})(); 