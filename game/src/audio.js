// Synthesised sound effects: plain WebAudio bleeps, no audio files. The context
// is created lazily on the first user gesture, so a silent page load stays silent
// and a browser that blocks audio never breaks the game.

let context = null;

export function ensureAudio() {
  try {
    if (context === null) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
  } catch {
    context = null;
  }
}

function tone(freq, seconds, type, gainValue, delay) {
  if (context === null) return;
  try {
    const start = context.currentTime + (delay || 0);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type || 'sine';
    oscillator.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(gainValue || 0.12, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + seconds);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  } catch {
    // Sound is garnish: never let it break a frame.
  }
}

export const sfx = {
  pickup() { tone(520, 0.08, 'triangle', 0.1); },
  chop() { tone(180, 0.05, 'square', 0.06); },
  done() { tone(660, 0.1, 'sine', 0.12); tone(880, 0.12, 'sine', 0.12, 0.08); },
  plate() { tone(440, 0.07, 'triangle', 0.1); tone(587, 0.09, 'triangle', 0.1, 0.06); },
  serve() { tone(523, 0.1, 'sine', 0.14); tone(659, 0.1, 'sine', 0.14, 0.09); tone(784, 0.16, 'sine', 0.14, 0.18); },
  burnt() { tone(140, 0.3, 'sawtooth', 0.1); },
  expired() { tone(220, 0.25, 'sawtooth', 0.09); tone(165, 0.3, 'sawtooth', 0.09, 0.15); },
  over() { tone(392, 0.2, 'sine', 0.12); tone(311, 0.2, 'sine', 0.12, 0.18); tone(233, 0.4, 'sine', 0.12, 0.36); },
};
