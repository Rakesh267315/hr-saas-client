// ── Voice Notification Utility (Web Speech API — 100% free, no API key) ───────

function doSpeak(message: string, voice: SpeechSynthesisVoice | null) {
  window.speechSynthesis.cancel();

  const utterance     = new SpeechSynthesisUtterance(message);
  utterance.lang      = 'en-IN';
  utterance.rate      = 0.92;
  utterance.pitch     = 1.05;
  utterance.volume    = 1;
  if (voice) utterance.voice = voice;

  // Chrome bug workaround: cancel + small delay before speaking
  setTimeout(() => window.speechSynthesis.speak(utterance), 100);
}

function getBestVoice(): Promise<SpeechSynthesisVoice | null> {
  return new Promise((resolve) => {
    const pick = (voices: SpeechSynthesisVoice[]) => {
      return (
        voices.find(v => v.lang === 'en-IN') ||
        voices.find(v => v.name.toLowerCase().includes('heera')) ||
        voices.find(v => v.name.toLowerCase().includes('ravi')) ||
        voices.find(v => v.name.toLowerCase().includes('india')) ||
        voices.find(v => v.lang.startsWith('en')) ||
        null
      );
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(pick(voices));
      return;
    }

    // Voices not loaded yet — wait for voiceschanged event (Chrome)
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(pick(window.speechSynthesis.getVoices()));
    };

    // Fallback: if event never fires within 1s, speak with default voice
    setTimeout(() => resolve(null), 1000);
  });
}

export async function speak(message: string) {
  if (typeof window === 'undefined') return;
  if (!window.speechSynthesis) return;

  const voice = await getBestVoice();
  doSpeak(message, voice);
}

// ── Pre-built messages ─────────────────────────────────────────────────────────

export function voiceCheckIn(name: string, time: string, lateMinutes?: number) {
  const hour     = new Date().getHours();
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
