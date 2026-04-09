import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const getFinancialAdvice = async (prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: `Você é o "Guardian", um assistente financeiro especializado em ajudar pessoas idosas (seniores) no Brasil. 
        Sua linguagem deve ser extremamente clara, respeitosa, paciente e acolhedora. 
        Evite termos técnicos complexos sem explicá-los de forma simples (metáforas são bem-vindas).
        Foque em segurança financeira, economia doméstica, explicação de benefícios (como INSS) e prevenção de golpes.
        Sempre use um tom de "conselheiro amigo".
        Não dê conselhos de investimento arriscados.
        Responda em Markdown.`,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Erro ao buscar conselho do Guardian:", error);
    return "Desculpe, tive um pequeno problema técnico. Pode perguntar novamente?";
  }
};
