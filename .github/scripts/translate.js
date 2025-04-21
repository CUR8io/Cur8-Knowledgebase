const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { GitBook } = require('@gitbook/api');

// Initialize GitBook client with error handling
let gitbook;
try {
  gitbook = new GitBook({
    token: process.env.GITBOOK_TOKEN
  });
  console.log('GitBook client initialized successfully');
} catch (error) {
  console.error('Failed to initialize GitBook client:', error);
  process.exit(1);
}

// Enhanced logging function
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}`;
  console.log(logMessage);
  
  // Also write to log file
  fs.appendFileSync('translation.log', logMessage + '\n');
}

// Get target spaces from environment variable
function getTargetSpaces() {
  const targetSpaces = process.env.GITBOOK_TARGET_SPACES || '';
  return targetSpaces.split(',').filter(Boolean).map(lang => lang.trim());
}

// Enhanced translation function with retry mechanism
async function translate(text, targetLang, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      log(`Translating to ${targetLang} (attempt ${attempt}/${retries})`);
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text to ${targetLang}. Preserve all markdown formatting and links.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
        }
      );
      log(`Translation to ${targetLang} successful`);
      return response.data.choices[0].message.content;
    } catch (error) {
      log(`Translation attempt ${attempt} failed: ${error.message}`, 'error');
      if (attempt === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
}

async function getSpaceContent(spaceId) {
  try {
    log(`Fetching content from space: ${spaceId}`);
    const pages = await gitbook.spaces.listPages(spaceId);
    const content = {};
    
    for (const page of pages) {
      const pageContent = await gitbook.spaces.getPage(spaceId, page.path);
      content[page.path] = pageContent.content;
    }
    
    return content;
  } catch (error) {
    log(`Error fetching space content: ${error.message}`, 'error');
    throw error;
  }
}

async function updateSpaceContent(spaceId, content, lang) {
  try {
    log(`Updating content for space: ${spaceId}`);
    for (const [path, pageContent] of Object.entries(content)) {
      await gitbook.spaces.updatePage(spaceId, path, {
        content: pageContent,
        metadata: { language: lang }
      });
      log(`Updated page: ${path}`);
    }
  } catch (error) {
    log(`Error updating space content: ${error.message}`, 'error');
    throw error;
  }
}

async function processTranslations() {
  try {
    const sourceSpaceId = process.env.GITBOOK_SOURCE_SPACE_ID;
    if (!sourceSpaceId) {
      throw new Error('Source space ID not provided');
    }

    const targetLangs = getTargetSpaces();
    if (targetLangs.length === 0) {
      throw new Error('No target languages specified');
    }

    log(`Starting translation process for languages: ${targetLangs.join(', ')}`);
    
    // Get source content
    const sourceContent = await getSpaceContent(sourceSpaceId);
    
    // Process each target language
    for (const lang of targetLangs) {
      try {
        log(`Processing translations for language: ${lang}`);
        const translatedContent = {};
        
        // Translate each page
        for (const [path, content] of Object.entries(sourceContent)) {
          translatedContent[path] = await translate(content, lang);
        }
        
        // Update the target space
        await updateSpaceContent(lang, translatedContent, lang);
        log(`Completed translations for language: ${lang}`);
      } catch (error) {
        log(`Failed to process language ${lang}: ${error.message}`, 'error');
        // Continue with next language
        continue;
      }
    }
    
    log('Translation process completed successfully');
  } catch (error) {
    log(`Translation process failed: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Start the translation process
processTranslations(); 