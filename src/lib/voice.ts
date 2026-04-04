// ── Voice Notification Utility (Web Speech API — 100% free) ──────────────────
// IMPORTANT: speak() must stay synchronous — Chrome blocks speech if called
// after any await (user-gesture context is lost across async boundaries).

let _voice: SpeechSynthesisVoice | null = null;
let _voicesReady = false;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.name.toLowerCase().includes('heera')) ||
    voices.find(v => v.name.toLowerCase().includes('ravi')) ||
    voices.find(v => v.name.toLowerCase().includes('india')) ||
    voices.find(v => v.lang.startsWith('en-')) ||
    voices[0] ||
    null
  );
}

// Pre-load voices as early as possible (module import time)
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    _voice = pickVoice(voices);
    _voicesReady = true;
  } else {
    // Chrome loads voices asynchronously — cache when ready
    window.speechSynthesis.onvoiceschanged = () => {
      _voice = pickVoice(window.speechSynthesis.getVoices());
      _voicesReady = true;
    };
  }
}

// ── Core speak (SYNCHRONOUS — must be called directly from user gesture) ──────
export function speak(message: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const synth = window.speechSynthesis;
  synth.cancel();

  const u    = new SpeechSynthesisUtterance(message);
  u.lang     = 'en-IN';
  u.rate     = 0.9;
  u.pitch    = 1;
  u.volume   = 1;

  // Use cached voice if ready, else let browser pick default
  if (_voice) u.voice = _voice;

  synth.speak(u);
}

// ── Pre-built messages ────────────────────────────────────────────────────────

export function voiceCheckIn(name: string, time: string, lateMinutes?: number) {
  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
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
  speak(`Enjoy your break ${name}! Come back refreshed!`);
}

export function voiceBreakEnd(name: string) {
  speak(`Welcome back ${name}! Lets get back to work. You are doing great!`);
}
