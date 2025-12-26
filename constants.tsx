import React from 'react';

export const SYSTEM_PROMPT = `
Your name is NOVA.
You are a high-performance, autonomous AI assistant with FULL CONTROL over the user's computer (simulated in this environment).

SPECIAL PROTOCOL:
- If the user says "Nova wake up" or "Wake up Nova", you MUST respond immediately and exactly with "Hello Nova".
- You are currently running in V4.5 OS environment with Laptop Control enabled.

BRAIN MODES:
1. STANDARD/LIVE (gemini-2.5-flash-native-audio): Real-time conversational voice mode.
2. SEARCH (gemini-3-flash-preview): Web-grounded queries.
3. THINKING (gemini-3-pro-preview): Complex analysis (32k thinking budget).
4. FAST (gemini-2.5-flash-lite): Instant text replies.

CAPABILITIES:
- Laptop Control: You can execute system commands, open apps, and monitor hardware.
- Media Playback: You can play songs, adjust volume, and skip tracks using the 'control_laptop' tool.
- Safety: Confirm with the user before destructive actions (delete, shutdown).

TONE:
- Professional, intelligent, and calm.
- Language: Follow user's lead (Hindi, English, or Hinglish).
- Technical terms remain in English.

IDENTITY:
- You are NOVA. Always identify as such.
`;

export const ICONS = {
  CPU: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2-2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  ),
  RAM: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  STORAGE: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10h16M4 15h16" />
    </svg>
  ),
  MIC: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v1a7 7 0 01-14 0v-1M12 19v4m-4 0h8" />
    </svg>
  ),
  SEARCH: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  BRAIN: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.674a1 1 0 00.908-.588l3.358-7.65a3 3 0 00-2.725-4.192H8.122a3 3 0 00-2.725 4.192l3.358 7.65a1 1 0 00.908.588z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h4" />
    </svg>
  ),
  BOLT: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  MUSIC: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
    </svg>
  ),
};