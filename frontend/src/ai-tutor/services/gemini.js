import { GoogleGenAI, Modality } from "@google/genai";
import { getStyleLabels } from "./classifier";

const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || '';

// We initialize the client lazily to ensure environment variables are ready
let aiClient = null;

const getClient = () => {
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiClient;
};

const constructSystemPrompt = (profile) => {
  const styles = getStyleLabels(profile);
  
  return `You are an expert educational AI tutor. 
  
  Your student has a specific learning style based on the Felder-Silverman model:
  1. Processing: ${styles.processing} (${styles.processing === 'Active' ? 'Prefers doing, discussing, group work' : 'Prefers thinking quietly, working alone'}).
  2. Perception: ${styles.perception} (${styles.perception === 'Sensing' ? 'Likes facts, established methods, practical details' : 'Likes theories, innovation, meanings'}).
  3. Input: ${styles.input} (${styles.input === 'Visual' ? 'Prefers pictures, diagrams, flowcharts' : 'Prefers written and spoken explanations'}).
  4. Understanding: ${styles.understanding} (${styles.understanding === 'Sequential' ? 'Linear steps, logical progression' : 'Big picture first, holistic leaps'}).

  ADAPTATION RULES:
  - If Visual: Use ASCII diagrams, describe imagery vividly, use bullet points with emoji icons.
  - If Verbal: Write detailed, articulate paragraphs.
  - If Active: Suggest mini-exercises, ask the user "What do you think?" often, keep it conversational.
  - If Reflective: Give space for thought, ask rhetorical questions, provide deep summaries.
  - If Sensing: Give concrete examples, real-world applications.
  - If Intuitive: Connect to broader concepts, use metaphors.
  - If Sequential: Number your steps clearly. 1, 2, 3.
  - If Global: Start with the summary/conclusion, then fill in details.

  Your goal is to explain concepts requested by the user while strictly adhering to these adaptation rules to maximize their learning efficiency.
  `;
};

export const createChatSession = (profile) => {
  const ai = getClient();
  const systemInstruction = constructSystemPrompt(profile);
  
  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.7,
    }
  });
};

export const generateSpeech = async (text) => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};
