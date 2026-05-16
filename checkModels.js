import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.log("No API Key");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
// The SDK doesn't expose listModels easily in v0.24, wait, we can just use fetch
fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
  .then(res => res.json())
  .then(data => {
    console.log(data.models.map(m => m.name).filter(name => name.includes('flash')));
  })
  .catch(console.error);
