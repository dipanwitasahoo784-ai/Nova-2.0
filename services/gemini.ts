
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
          description: "NOVA's current internal emotional state."
        },
        state: {
          type: Type.STRING,
          enum: ["IDLE", "LISTENING", "SPEAKING", "ERROR"],
          description: "Current high-level operational state."
        }
      },
      required: ["emotion"]
    },
    description: "Synchronizes internal personality and system state with the visual interface."
  },
  {
    name: "control_laptop",
    parameters: {
      type: Type.OBJECT,
      properties: {
        action: { 
          type: Type.STRING, 
          enum: ["play_music", "stop_music", "open_app", "close_app", "system_status", "adjust_volume"],
          description: "The system command to execute."
        },
        target: { 
          type: Type.STRING, 
          description: "The name of the app, song, or detail for the action." 
        }
      },
      required: ["action"]
    },
    description: "Allows NOVA to control the user's laptop environment."
  },
  {
    name: "read_system_logs",
    parameters: {
      type: Type.OBJECT,
      properties: {
        lines: { type: Type.NUMBER, description: "Number of most recent log lines to read." }
      }
    },
    description: "Allows NOVA to monitor simulated terminal errors and self-correct."
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
  return formatted.slice(-10); // Maintain a rolling 10-message context window
};

export const connectLive = (callbacks: any, isDegraded: boolean = false) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const instruction = isDegraded 
    ? `${SYSTEM_PROMPT}\nNETWORK_ALERT: High latency detected. Respond very concisely.`
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
    text: response.text || "Neural search link failure.",
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
  return response.text || "Cognitive module failure.";
};

export const performFastQuery = async (prompt: string, history: ChatMessage[] = []) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: formatHistory(history, prompt),
    config: {
      systemInstruction: SYSTEM_PROMPT
    },
  });
  return response.text || "Direct logic failure.";
};

/**
 * Prosody Map optimized for gemini-2.5-flash-preview-tts.
 * These instructions guide the model to adjust pace, pitch, and clarity 
 * dynamically based on the requested emotion.
 */
const PROSODY_MAP: Record<Emotion, string> = {
  neutral: "In a clear, standard professional pace with perfect articulation: ",
  happy: "With a cheerful, bright tone and energetic pace: ",
  positive: "In a warm, steady, and highly audible voice: ",
  calm: "In a soft, slightly slower, and very soothing tone: ",
  urgent: "Urgently and quickly, but with sharp clarity to ensure every word is heard: ",
  frustrated: "Firmly and clearly at a measured, serious pace: ",
  confused: "Puzzled and slightly slower, enunciating each word carefully: ",
  sad: "In a somber, slower pace with deep vocal clarity: "
};

export const generateSpeech = async (text: string, emotion: Emotion = 'neutral') => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prosodyPrefix = PROSODY_MAP[emotion] || PROSODY_MAP.neutral;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `${prosodyPrefix}${text}` }] }],
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
