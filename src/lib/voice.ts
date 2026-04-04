// ── HRFlow Voice Utility — Web Speech API ────────────────────────────────────
// Picks the best available voice in the user's browser:
//   Chrome Mac/Win  → "Google US English" (neural-quality)
//   Edge            → Microsoft neural voices (very natural)
//   Safari Mac      → Samantha / Alex (decent)
// Voice must be unlocked once via a user-click (call enableVoice() first).

let _voiceReady = false; // true once voices loaded & unlocked

// ── Voice selection ───────────────────────────────────────────────────────────
function getBestVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Priority list — first match wins
  const PRIORITY = [
    // Google neural voices (Chrome)
    (v: SpeechSynthesisVoice) => v.name === 'Google US English',
    (v: SpeechSynthesisVoice) => v.name.startsWith('Google') && v.lang.startsWith('en'),
    // Microsoft neural voices (Edge)
    (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.name.includes('Neural') && v.lang.startsWith('en'),
    (v: SpeechSynthesisVoice) => v.name.includes('Microsoft') && v.lang.startsWith('en'),
    // Apple
    (v: SpeechSynthesisVoice) => v.name === 'Samantha',
    (v: SpeechSynthesisVoice) => v.name === 'Alex',
    // Any English
    (v: SpeechSynthesisVoice) => v.lang === 'en-IN',
    (v: SpeechSynthesisVoice) => v.lang === 'en-US',
    (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
  ];

  for (const test of PRIORITY) {
    const found = voices.find(test);
    if (found) return found;
  }
  return null;
}

// ── Core speak function ───────────────────────────────────────────────────────
export function speak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;

  // Resume if Chrome auto-paused it (happens after tab switch)
  if (synth.paused) synth.resume();
  synth.cancel();

  const u  = new SpeechSynthesisUtterance(text);
  u.volume = 1;
  u.rate   = 0.9;   // slightly slower = clearer
  u.pitch  = 1.05;

  const voice = getBestVoice();
  if (voice) {
    u.voice = voice;
    u.lang  = voice.lang;
  } else {
    u.lang = 'en-US';
  }

  synth.speak(u);
}

// ── Voice unlock (call from a user click handler) ─────────────────────────────
// Chrome and Safari require the first .speak() to come from a direct user event.
// After that first call, subsequent calls work fine even from async code.
export function unlockAndSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve(); return; }
    const synth = window.speechSynthesis;
    if (synth.paused) synth.resume();
    synth.cancel();

    const trySpeak = () => {
      const u = new SpeechSynthesisUtterance(text);
      u.volume = 1; u.rate = 0.9; u.pitch = 1.05;
      const voice = getBestVoice();
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-US'; }
      u.onend = () => { _voiceReady = true; resolve(); };
      u.onerror = () => { _voiceReady = true; resolve(); };
      synth.speak(u);
    };

    const voices = synth.getVoices();
    if (voices.length > 0) {
      trySpeak();
    } else {
      // Chrome loads voices asynchronously — wait for voiceschanged event
      synth.addEventListener('voiceschanged', trySpeak, { once: true });
      // Fallback timeout in case voiceschanged never fires
      setTimeout(() => { if (!_voiceReady) trySpeak(); }, 1500);
    }
  });
}

// ── Pre-built messages ────────────────────────────────────────────────────────

export function voiceCheckIn(name: string, time: string, lateMinutes = 0) {
  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  if (lateMinutes >= 60) {
    speak(
      `${name}! You are ${lateMinutes} minutes late! This is completely unacceptable. ` +
      `You checked in at ${time}. Please be on time tomorrow, otherwise strict action will be taken!`
    );
  } else if (lateMinutes >= 30) {
    speak(
      `${name}, you are ${lateMinutes} minutes late again! You checked in at ${time}. ` +
      `This is not acceptable. Please improve your punctuality immediately!`
    );
  } else if (lateMinutes > 0) {
    speak(
      `${name}, you are ${lateMinutes} minutes late today. You checked in at ${time}. ` +
      `Please try to be on time. Every minute counts!`
    );
  } else {
    speak(
      `${greeting} ${name}! You checked in at ${time}. ` +
      `You are right on time! Have a great and productive day!`
    );
  }
}

export function voiceCheckOut(name: string, time: string, workHours = 0) {
  const hoursMsg = workHours > 0 ? ` You worked ${workHours} hours today. Well done!` : '';
  speak(`Goodbye ${name}! You checked out at ${time}.${hoursMsg} See you tomorrow, take care!`);
}

export function voiceBreakStart(name: string) {
  speak(`Enjoy your break ${name}! Come back refreshed!`);
}

export function voiceBreakEnd(name: string) {
  speak(`Welcome back ${name}! Time to get back to work. You are doing great!`);
}
