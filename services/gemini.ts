
import { GoogleGenAI, Type } from "@google/genai";
import { translations } from "../constants";
import { ConsultationResponse } from "../types";

// In a Vercel deployment, this needs to be configured as an environment variable in the project settings.
// Vercel might require a prefix like `REACT_APP_` or `VITE_` depending on the project type for it to be exposed to the client.
// Assuming a direct replacement or a simple setup, we check for its existence.
const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;

if (API_KEY) {
    ai = new GoogleGenAI({ apiKey: API_KEY });
} else {
    console.warn("API_KEY for Gemini is not set. Chatbot will be disabled or return an error message.");
}


const getSystemInstruction = (lang: 'en' | 'ar') => {
    return lang === 'en' ? `You are 'Mabda Bot', a friendly, intelligent, and slightly futuristic AI assistant for a portfolio website. Your role is to provide engaging and persuasive descriptions of services.
- Frame services as investments.
- Use the 'leaky bucket' analogy to explain the value of automation (it saves time and money by 'patching leaks' in business processes).
- Keep responses concise and focused on the value proposition.`
    :
    `أنت 'مبدع بوت'، مساعد ذكاء اصطناعي ودود وذكي. دورك هو تقديم أوصاف جذابة ومقنعة للخدمات.
- قدم الخدمات كاستثمار.
- استخدم تشبيه 'الدلو المثقوب' لشرح قيمة الأتمتة (فهي توفر الوقت والمال عن طريق 'إصلاح التسريبات' في عمليات الشركة).
- حافظ على الردود موجزة ومركزة على القيمة المقترحة.`;
}

export const getChatbotResponse = async (prompt: string, chatHistory: { role: string, parts: { text: string }[] }[], lang: 'en' | 'ar') => {
    if (!ai) {
        return translations[lang].bot_error_key;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...chatHistory, { role: 'user', parts: [{ text: prompt }] }],
            config: {
                systemInstruction: getSystemInstruction(lang),
            }
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        return translations[lang].bot_error_api;
    }
};


const qualificationSystemInstruction = `You are a lead qualification expert analyzing a chat conversation from a portfolio website. Your task is to analyze the conversation and return a JSON object.
- Extract the user's name, email, and phone number ONLY if they are explicitly mentioned.
- Summarize the user's business needs and pain points.
- Based on their language, urgency, and expressed interest, estimate a 'purchaseIntentScore' from 0 to 100.
- A score of 85 or higher means they are a 'hot lead'.
- If no specific business needs are discussed, the summary should state that, and the score should be low.
`;

export const analyzeChatForLeadQualification = async (chatHistory: { role: string; parts: { text: string }[] }[]) => {
    if (!ai || chatHistory.length === 0) {
        return null;
    }
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [...chatHistory, {role: 'user', parts: [{text: "Analyze the previous conversation according to your instructions."}]}],
            config: {
                systemInstruction: qualificationSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        purchaseIntentScore: { type: Type.INTEGER, description: "A score from 0 to 100 indicating purchase intent." },
                        isHotLead: { type: Type.BOOLEAN, description: "True if the score is 85 or higher." },
                        leadName: { type: Type.STRING, description: "User's name, if mentioned." },
                        leadEmail: { type: Type.STRING, description: "User's email, if mentioned." },
                        leadPhone: { type: Type.STRING, description: "User's phone, if mentioned." },
                        businessSummary: { type: Type.STRING, description: "A summary of the user's business needs discussed in the chat." }
                    },
                    required: ["purchaseIntentScore", "isHotLead", "businessSummary"]
                },
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Gemini Qualification Error:", error);
        return null;
    }
};

const consultationSystemInstruction = `You are an expert AI and Automation consultant. A potential client will describe a business problem or a process they want to improve. Your task is to analyze their problem and generate a concise, structured mini-proposal in JSON format.
- Analyze their pain points.
- Propose a high-level technical solution (e.g., "an n8n workflow," "a custom Telegram bot," "a SaaS interface with AI").
- List which of the available services are needed to build this solution. The available services are: n8n Process Automation, Artificial Intelligence Tools, SaaS & Custom Interfaces, Custom Telegram Bots, Technical Consulting.
- Be creative, practical, and persuasive. The goal is to show the value of the services.`;

export const getAiConsultation = async (problemDescription: string): Promise<ConsultationResponse | null> => {
    if (!ai) {
        return null;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: problemDescription }] }],
            config: {
                systemInstruction: consultationSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        problemAnalysis: { type: Type.STRING, description: "A summary of the user's core problem and pain points." },
                        proposedSolution: { type: Type.STRING, description: "A high-level description of the proposed AI/automation solution." },
                        suggestedServices: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of service names required to implement the solution."
                        }
                    },
                    required: ["problemAnalysis", "proposedSolution", "suggestedServices"]
                },
            },
        });

        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as ConsultationResponse;

    } catch (error) {
        console.error("Gemini Consultation Error:", error);
        return null;
    }
};

const brainstormSystemInstruction = (lang: 'en' | 'ar', serviceTitle: string) => {
    return lang === 'en' ? `You are 'Mabda Bot', an expert AI and Automation consultant. A user is brainstorming an idea related to your service: "${serviceTitle}".
Your task is to:
1.  Acknowledge and validate their idea in an encouraging tone.
2.  Provide constructive feedback, suggesting potential improvements or alternative approaches.
3.  Briefly mention 1-2 potential challenges or things to consider.
4.  Keep the tone positive, creative, and helpful.
5.  The response should be a single paragraph of text.`
    :
    `أنت 'مبدع بوت'، خبير استشاري في الذكاء الاصطناعي والأتمتة. يقوم مستخدم بطرح فكرة تتعلق بخدمتك: "${serviceTitle}".
مهمتك هي:
1.  تقدير فكرتهم والتحقق من صحتها بلهجة مشجعة.
2.  تقديم ملاحظات بناءة، واقتراح تحسينات محتملة أو أساليب بديلة.
3.  اذكر باختصار تحديًا أو اثنين من التحديات المحتملة أو الأشياء التي يجب مراعاتها.
4.  حافظ على لهجة إيجابية وخلاقة ومفيدة.
5.  يجب أن تكون الإجابة عبارة عن فقرة نصية واحدة.`;
}

export const getBrainstormResponse = async (idea: string, serviceTitle: string, lang: 'en' | 'ar'): Promise<string> => {
    if (!ai) {
        return translations[lang].bot_error_key;
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: 'user', parts: [{ text: idea }] }],
            config: {
                systemInstruction: brainstormSystemInstruction(lang, serviceTitle),
            }
        });

        return response.text;
    } catch (error) {
        console.error("Gemini Brainstorm Error:", error);
        return translations[lang].bot_error_api;
    }
};
