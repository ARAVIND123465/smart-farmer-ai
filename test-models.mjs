import { readFileSync } from 'fs';
import { join } from 'path';

async function listModels() {
  const envContent = readFileSync('.env.local', 'utf-8');
  const apiKey = envContent.match(/GEMINI_API_KEY=([^\n]+)/)?.[1];
  
  if (!apiKey) {
    console.error('API Key not found in .env.local');
    return;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error fetching models:', error);
  }
}

listModels();
