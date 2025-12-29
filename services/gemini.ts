
import { GoogleGenAI, Type, Modality, FunctionDeclaration } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { Emotion, ChatMessage, MessageRole } from "../types";

const tools: FunctionDeclaration[] = [
  {
    name: "update_ui_state",
    parameters: {
      type: Type.OBJECT,
      properties: {
        emotion: { 
          type: Type.STRING, 
          enum: ["neutral", "positive", "calm", "urgent", "confused", "sad", "happy", "frustrated"],
          description: "Internal emotional state of AGNI."
        },
        state: {
          type: Type.STRING,
          enum: ["IDLE", "LISTENING", "SPEAKING", "ERROR"],
          description: "Current high-level operational state."
        }
      },
      required: ["emotion"]
    },
    description: "Synchronizes personality and system state with the visual interface."
  }
];

const formatHistory = (history: ChatMessage[], currentPrompt: string) => {
  const formatted = history.map(msg => ({
    role: msg.role === MessageRole.USER ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));
  formatted.push({
    role: 'user',
    parts: [{ text: currentPrompt }]
  });
  return formatted.slice(-12); // Rolling context
};

export const connectLive = (callbacks: any, isDegraded: boolean = false) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const instruction = isDegraded 
    ? `${SYSTEM_PROMPT}\nNETWORK_ALERT: Response limit active. Be brief.`
    : SYSTEM_PROMPT;

  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: instruction,
      tools: [{ functionDeclarations: tools }],
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    },
  });
};

export const performSearchQuery = async (prompt: string, history: ChatMessage[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: formatHistory(history, prompt),
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: SYSTEM_PROMPT
    },
  });
  return {
    text: response.text || "Neural search timeout.",
    grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const performThinkingQuery = async (prompt: string, history: ChatMessage[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: formatHistory(history, prompt),
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      systemInstruction: SYSTEM_PROMPT
    },
  });
  return response.text || "Cognitive module timeout.";
};

export const performFastQuery = async (prompt: string, history: ChatMessage[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: formatHistory(history, prompt),
    config: {
      systemInstruction: SYSTEM_PROMPT
    },
  });
  return response.text || "Sequence link failure.";
};

export const performOllamaQuery = async (prompt: string, history: ChatMessage[] = [], model: string = "llama3.1") => {
  try {
    const chatContext = history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const fullPrompt = `${SYSTEM_PROMPT}\n\nCONVERSATION_HISTORY:\n${chatContext}\n\nUSER: ${prompt}\nAGNI:`;
    
    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        prompt: fullPrompt,
        stream: false,
        options: { temperature: 0.7, num_predict: 500 }
      })
    });

    if (!response.ok) throw new Error("Ollama link severed.");
    const data = await response.json();
    return data.response;
  } catch (err) {
    throw new Error("Local engine failure. Ensure Ollama is active on port 11434.");
  }
};

const PROSODY_MAP: Record<Emotion, string> = {
  neutral: "Radha Radha. With absolute clarity: ",
  happy: "Radha Radha! With immense joy: ",
  positive: "Radha Radha. In a warm, steady voice: ",
  calm: "Radha Radha. In a soothing, peaceful pace: ",
  urgent: "Radha Radha! Alert! Immediately: ",
  frustrated: "Radha Radha. Firmly: ",
  confused: "Radha Radha... Puzzled: ",
  sad: "Radha Radha. Somberly: "
};

export const generateSpeech = async (text: string, emotion: Emotion = 'neutral') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prosodyPrefix = PROSODY_MAP[emotion] || PROSODY_MAP.neutral;
  
  // Clean text of existing Radha Radha prefixes to avoid double greeting
  const cleanText = text.replace(/Radha Radha[.,! ]*/gi, "");
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `${prosodyPrefix}${cleanText}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
