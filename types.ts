
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

export type AssistantState = 'IDLE' | 'LISTENING' | 'SPEAKING' | 'THINKING' | 'ERROR' | 'WAKING';

export type AppView = 'LOGIN' | 'PLANS' | 'DASHBOARD' | 'UPGRADE_REQUIRED';

export type SubscriptionPlan = 'FREE' | 'PRO' | 'NEURAL' | 'LEGACY';

export interface PlanConfig {
  id: SubscriptionPlan;
  name: string;
  price: string;
  features: string[];
  queryLimit: number;
  thinkingLimit: number;
}

export const PLAN_DETAILS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    id: 'FREE',
    name: 'Lite Core',
    price: '$0',
    features: ['Basic Logic', 'Standard Speed', '5 Queries / Session'],
    queryLimit: 5,
    thinkingLimit: 0
  },
  PRO: {
    id: 'PRO',
    name: 'High Performance',
    price: '$19/mo',
    features: ['Infinite Basic', '50 Thinking Tasks', 'Search Grounding'],
    queryLimit: Infinity,
    thinkingLimit: 50
  },
  NEURAL: {
    id: 'NEURAL',
    name: 'Neural Direct',
    price: '$49/mo',
    features: ['Everything Unlimited', 'Priority Bandwidth', 'Deep Reasoning'],
    queryLimit: Infinity,
    thinkingLimit: Infinity
  },
  LEGACY: {
    id: 'LEGACY',
    name: 'Legacy Node',
    price: 'Free',
    features: ['Legacy Protocol', 'Minimal Speed', 'Shared Resources'],
    queryLimit: 3,
    thinkingLimit: 0
  }
};
