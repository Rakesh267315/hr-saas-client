// ── Voice Notification Utility (Web Speech API — 100% free) ──────────────────

let _voice: SpeechSynthesisVoice | null = null;

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

// Pre-load voices at module load time
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const load = () => { _voice = pickVoice(window.speechSynthesis.getVoices()); };
  const v = window.speechSynthesis.getVoices();
  if (v.length > 0) load();
  else window.speechSynthesis.onvoiceschanged = load;

  // ── Chrome Bug Fix: speechSynthesis auto-pauses after ~15s ──────────────
  // Resume every 10s to keep it alive
  setInterval(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 10000);
}

// ── Core speak ────────────────────────────────────────────────────────────────
export function speak(message: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const synth = window.speechSynthesis;

  // Force-resume if Chrome paused it
  if (synth.paused) synth.resume();
  synth.cancel();

  const u  = new SpeechSynthesisUtterance(message);
  u.lang   = 'en-IN';
  u.rate   = 0.88;
  u.pitch  = 1;
  u.volume = 1;
  if (_voice) u.voice = _voice;

  synth.speak(u);
}

// ── Pre-built messages ────────────────────────────────────────────────────────

export function voiceCheckIn(name: string, time: string, lateMinutes?: number) {
  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  if (lateMinutes && lateMinutes > 0) {
    if (lateMinutes >= 60) {
      speak(`${name}! You are ${lateMinutes} minutes late! This is completely unacceptable. You checked in at ${time}. Please be on time tomorrow, otherwise strict action will be taken!`);
    } else if (lateMinutes >= 30) {
      speak(`${name}, you are ${lateMinutes} minutes late again! Checked in at ${time}. This is not good. Please improve your punctuality immediately!`);
    } else {
      speak(`${name}, you are ${lateMinutes} minutes late today. Check-in time was ${time}. Please try to be on time. Every minute counts!`);
    }
  } else {
    speak(`${greeting} ${name}! You have checked in at ${time}. You are right on time! Have a productive day!`);
  }
}

export function voiceCheckOut(name: string, time: string, workHours?: number) {
  const hoursMsg = workHours && workHours > 0 ? ` You worked for ${workHours} hours today.` : '';
  speak(`Goodbye ${name}! You have checked out at ${time}.${hoursMsg} See you tomorrow, take care!`);
}

export function voiceBreakStart(name: string) {
  speak(`Enjoy your break ${name}! Come back refreshed!`);
}

export function voiceBreakEnd(name: string) {
  speak(`Welcome back ${name}! Lets get back to work. You are doing great!`);
}
