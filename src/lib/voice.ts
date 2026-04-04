// ── HRFlow Voice Utility ──────────────────────────────────────────────────────
// Strategy:
//   1. Web Speech API plays IMMEDIATELY (in-sync with user gesture, no delay)
//   2. Kokoro TTS loads in background (free, human-like) and replaces on next use
//   First Kokoro use: ~80 MB model downloads once, then cached forever.

// ── Kokoro state ─────────────────────────────────────────────────────────────
let _kokoro:  any     = null;
let _loading: boolean = false;
let _failed:  boolean = false;

async function loadKokoro() {
  if (_kokoro || _failed || _loading) return;
  _loading = true;
  try {
    const { KokoroTTS } = await import('kokoro-js');
    _kokoro = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0', {
      dtype: 'q8',
    });
    console.log('[Voice] Kokoro loaded ✅ — human-like voice active');
  } catch (e) {
    _failed = true;
    console.info('[Voice] Kokoro unavailable — using Web Speech API');
  } finally {
    _loading = false;
  }
}

// ── Web Speech API (instant, synchronous) ────────────────────────────────────
function webSpeak(text: string) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  if (synth.paused) synth.resume();
  synth.cancel();

  const u  = new SpeechSynthesisUtterance(text);
  u.lang   = 'en-IN';
  u.rate   = 0.88;
  u.pitch  = 1.05;
  u.volume = 1;

  // Pick best available English voice
  const voices = synth.getVoices();
  const best   =
    voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.lang.startsWith('en-')) ||
    null;
  if (best) u.voice = best;

  synth.speak(u);
}

// ── Kokoro TTS (async, human-like — replaces Web Speech) ─────────────────────
async function kokoroSpeak(text: string) {
  if (_failed || typeof window === 'undefined') return;
  try {
    if (!_kokoro) await loadKokoro();
    if (!_kokoro) return;
    // Cancel Web Speech before Kokoro plays
    window.speechSynthesis?.cancel();
    const audio = await _kokoro.generate(text, { voice: 'af_heart' });
    audio.play();
  } catch {
    // Kokoro failed mid-play — Web Speech already played, so no fallback needed
  }
}

// ── Main speak() — dual-track ─────────────────────────────────────────────────
// Called directly from user gesture handlers (check-in, break, etc.)
export function speak(text: string) {
  if (typeof window === 'undefined') return;

  // 1. Play Web Speech IMMEDIATELY (works in-sync with user gesture)
  webSpeak(text);

  // 2. Try Kokoro in background (will cancel & replace Web Speech if loaded)
  kokoroSpeak(text);
}

// Pre-load Kokoro in the background as soon as module loads in browser
if (typeof window !== 'undefined') {
  // Small delay so it doesn't compete with initial page render
  setTimeout(() => loadKokoro(), 3000);
}

// ── Pre-built messages ────────────────────────────────────────────────────────

export function voiceCheckIn(name: string, time: string, lateMinutes = 0) {
  const h        = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  if (lateMinutes >= 60) {
    speak(
      `${name}! You are ${lateMinutes} minutes late! This is completely unacceptable. ` +
      `You checked in at ${time}. Please be on time tomorrow — otherwise strict action will be taken!`
    );
  } else if (lateMinutes >= 30) {
    speak(
      `${name}, you are ${lateMinutes} minutes late again! Checked in at ${time}. ` +
      `This is not acceptable. Please improve your punctuality immediately!`
    );
  } else if (lateMinutes > 0) {
    speak(
      `${name}, you are ${lateMinutes} minutes late today. Check-in at ${time}. ` +
      `Please try to be on time. Every minute counts!`
    );
  } else {
    speak(
      `${greeting} ${name}! You checked in at ${time}. You are right on time! Have a great and productive day!`
    );
  }
}

export function voiceCheckOut(name: string, time: string, workHours = 0) {
  const hoursMsg = workHours > 0 ? ` You worked for ${workHours} hours today. Well done!` : '';
  speak(`Goodbye ${name}! You checked out at ${time}.${hoursMsg} See you tomorrow, take care!`);
}

export function voiceBreakStart(name: string) {
  speak(`Enjoy your break ${name}! Come back refreshed and energised!`);
}

export function voiceBreakEnd(name: string) {
  speak(`Welcome back ${name}! Let us get back to work. You are doing great!`);
}
