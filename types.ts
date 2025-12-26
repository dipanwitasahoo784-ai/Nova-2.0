
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system'
}

export interface ChatMessage {
  role: MessageRole;
  content: string;
  timestamp: number;
  grounding?: any[];
}

export interface SystemStats {
  cpu: number;
  ram: number;
  storage: number;
  uptime: string;
  latency?: number;
  networkStatus?: 'optimal' | 'degraded' | 'critical';
}

export type Emotion = 'neutral' | 'happy' | 'positive' | 'calm' | 'urgent' | 'frustrated' | 'confused' | 'sad';

export type AssistantState = 'IDLE' | 'LISTENING' | 'SPEAKING' | 'ERROR';

export interface MediaState {
  isPlaying: boolean;
  title: string;
  artist: string;
}

export interface VirtualFile {
  name: string;
  type: 'file' | 'folder';
  size?: string;
  modified: string;
}
