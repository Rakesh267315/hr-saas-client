// ── Voice Notification Utility (Web Speech API — 100% free, no API key) ───────

export function speak(message: string) {
  if (typeof window === 'undefined') return;
  if (!window.speechSynthesis) return;

  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang   = 'en-IN';  // Indian English accent
  utterance.rate   = 0.92;     // Slightly slower — clear & natural
  utterance.pitch  = 1.05;
  utterance.volume = 1;

  // Pick best available voice (prefer Indian/English female)
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v =>
    v.lang === 'en-IN' ||
    v.name.toLowerCase().includes('india') ||
    v.name.toLowerCase().includes('heera') ||
    v.name.toLowerCase().includes('ravi')
  ) || voices.find(v => v.lang.startsWith('en')) || null;

  if (preferred) utterance.voice = preferred;

  window.speechSynthesis.speak(utterance);
}

// ── Pre-built messages ─────────────────────────────────────────────────────────

export function voiceCheckIn(name: string, time: string, lateMinutes?: number) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const lateMsg  = lateMinutes && lateMinutes > 0
    ? ` You are ${lateMinutes} minutes late today.`
    : ' You are right on time!';
  speak(`${greeting} ${name}! You have checked in at ${time}.${lateMsg} Have a productive day!`);
}

export function voiceCheckOut(name: string, time: string, workHours?: number) {
  const hoursMsg = workHours && workHours > 0
    ? ` You worked for ${workHours} hours today.`
    : '';
  speak(`Goodbye ${name}! You have checked out at ${time}.${hoursMsg} See you tomorrow, take care!`);
}

export function voiceBreakStart(name: string) {
  speak(`Enjoy your break ${name}! You deserve it. Come back refreshed!`);
}

export function voiceBreakEnd(name: string) {
  speak(`Welcome back ${name}! Break time is over. Let's get back to work. You are doing great!`);
}
