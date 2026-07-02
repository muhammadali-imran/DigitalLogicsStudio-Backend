const Groq = require("groq-sdk");

let groqClient = null;

function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

const GROQ_DEFAULTS = {
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  maxTokens: parseInt(process.env.GROQ_MAX_TOKENS, 10) || 1024,
  temperature:
    process.env.GROQ_TEMPERATURE !== undefined
      ? parseFloat(process.env.GROQ_TEMPERATURE)
      : 0.5,
};

module.exports = { getGroqClient, GROQ_DEFAULTS };
