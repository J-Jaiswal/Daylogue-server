import Groq from "groq-sdk";

let groqClient;

export const getGroqClient = () => {
  if (!process.env.GROQ_API_KEY) {
    const err = new Error("GROQ_API_KEY is missing");
    err.statusCode = 503;
    err.service = "groq";
    throw err;
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  return groqClient;
};
