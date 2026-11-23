const stage = document.querySelector(".invitation-stage");
const resetButton = document.querySelector(".reset-button");
const statusMessage = document.querySelector(".status-message");
const musicPlayer = document.querySelector(".music-player");
const musicToggle = document.querySelector(".music-toggle");
const muteToggle = document.querySelector(".mute-toggle");
const volumeSlider = document.querySelector(".volume-slider");
const musicStatus = document.querySelector(".music-status");

let isOpen = false;
let resetTimer;
let audioContext;
let masterGain;
let musicTimer;
let suspendTimer;
let isMusicPlaying = false;
let isMuted = false;
let hasStartedMusic = false;
let volume = Number(volumeSlider.value);
const activeVoices = new Set();

const tempo = 78;
const beat = 60 / tempo;
const chordProgression = [
  [48, 55, 60, 64],
  [43, 50, 55, 59],
  [45, 52, 57, 60],
  [41, 48, 53, 57],
  [48, 55, 60, 64],
  [41, 48, 53, 57],
  [43, 50, 55, 59],
  [48, 55, 60, 64],
];

const melody = [
  [0, 67, 1.5], [1.5, 69, 0.5], [2, 72, 1],
  [3, 71, 1], [4, 67, 1], [5, 64, 1],
  [6, 69, 1.5], [7.5, 67, 0.5], [8, 64, 1],
  [9, 65, 1], [10, 69, 1], [11, 72, 1],
  [12, 67, 1], [13, 72, 1], [14, 76, 1],
  [15, 74, 1], [16, 72, 1], [17, 69, 1],
  [18, 71, 1], [19, 74, 1], [20, 77, 1],
  [21, 76, 1.5], [22.5, 74, 0.5], [23, 72, 1],
];

function midiToFrequency(note) {
  return 440 * 2 ** ((note - 69) / 12);
}

function ensureAudio() {
  if (audioContext) return true;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    musicStatus.textContent = "Audio unavailable";
    musicToggle.disabled = true;
    return false;
  }

  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = volume;
  masterGain.connect(audioContext.destination);
  return true;
}

function createVoice({ frequency, start, duration, gain, type = "sine", detune = 0 }) {
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.detune.setValueAtTime(detune, start);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(type === "sine" ? 2600 : 1500, start);
  filter.Q.value = 0.55;

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(0.09, duration * 0.18));
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain * 0.68), start + duration * 0.58);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  oscillator.connect(filter);
  filter.connect(envelope);
  envelope.connect(masterGain);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);

  activeVoices.add(oscillator);
  oscillator.addEventListener("ended", () => activeVoices.delete(oscillator), { once: true });
}

function scheduleWaltz() {
  if (!isMusicPlaying || !audioContext) return;

  const startTime = audioContext.currentTime + 0.08;
  const loopBeats = chordProgression.length * 3;

  chordProgression.forEach((chord, barIndex) => {
    const barStart = startTime + barIndex * 3 * beat;

    chord.slice(1).forEach((note, voiceIndex) => {
      createVoice({
        frequency: midiToFrequency(note),
        start: barStart,
        duration: 3 * beat * 0.96,
        gain: 0.025,
        type: "triangle",
        detune: voiceIndex === 1 ? 2 : voiceIndex === 2 ? -2 : 0,
      });
    });

    for (let pulse = 0; pulse < 3; pulse += 1) {
      createVoice({
        frequency: midiToFrequency(chord[0] + (pulse === 0 ? 0 : 12)),
        start: barStart + pulse * beat,
        duration: beat * (pulse === 0 ? 0.72 : 0.42),
        gain: pulse === 0 ? 0.052 : 0.026,
        type: "sine",
      });
    }
  });

  melody.forEach(([beatOffset, note, noteLength]) => {
    createVoice({
      frequency: midiToFrequency(note),
      start: startTime + beatOffset * beat,
      duration: noteLength * beat * 0.82,
      gain: 0.055,
      type: "sine",
    });
    createVoice({
      frequency: midiToFrequency(note + 12),
      start: startTime + beatOffset * beat,
      duration: noteLength * beat * 0.48,
      gain: 0.012,
      type: "triangle",
      detune: 3,
    });
  });

  musicTimer = window.setTimeout(scheduleWaltz, (loopBeats * beat - 0.08) * 1000);
}

function updateMusicUi() {
  musicPlayer.classList.toggle("is-playing", isMusicPlaying);
  musicPlayer.classList.toggle("is-muted", isMuted || volume === 0);
  musicToggle.setAttribute("aria-pressed", String(isMusicPlaying));
  musicToggle.setAttribute("aria-label", isMusicPlaying ? "Pause wedding music" : "Play wedding music");
  muteToggle.setAttribute("aria-pressed", String(isMuted));
  muteToggle.setAttribute("aria-label", isMuted ? "Unmute wedding music" : "Mute wedding music");

  if (isMuted || volume === 0) musicStatus.textContent = "Muted";
  else if (isMusicPlaying) musicStatus.textContent = "Now playing";
  else musicStatus.textContent = hasStartedMusic ? "Paused" : "Ready to play";
}

async function playMusic() {
  if (!ensureAudio()) return;

  window.clearTimeout(musicTimer);
  window.clearTimeout(suspendTimer);
  await audioContext.resume();

  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(isMuted ? 0.0001 : Math.max(0.0001, volume), audioContext.currentTime, 0.08);
  isMusicPlaying = true;
  hasStartedMusic = true;
  updateMusicUi();
  scheduleWaltz();
}

function pauseMusic() {
  if (!audioContext || !isMusicPlaying) return;

  isMusicPlaying = false;
  window.clearTimeout(musicTimer);
  activeVoices.forEach((voice) => {
    try {
      voice.stop();
    } catch {
      // A voice may already have ended between frames.
    }
  });
  activeVoices.clear();

  masterGain.gain.cancelScheduledValues(audioContext.currentTime);
  masterGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.04);
  suspendTimer = window.setTimeout(() => audioContext.suspend(), 120);
  updateMusicUi();
}

function setMute(nextMuted) {
  isMuted = nextMuted;
  if (audioContext && masterGain) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(isMuted ? 0.0001 : Math.max(0.0001, volume), audioContext.currentTime, 0.05);
  }
  updateMusicUi();
}

function openInvitation() {
  if (isOpen) return;
  window.clearTimeout(resetTimer);
  document.body.classList.remove("is-resetting");
  isOpen = true;
  document.body.classList.add("is-open");
  stage.setAttribute("aria-label", "Opened wedding invitation");
  statusMessage.textContent = "The vellum wrap and lace bow lifted away. The invitation is open.";
  if (!hasStartedMusic) playMusic();
}

function wrapInvitation(event) {
  event.stopPropagation();
  if (!isOpen) return;
  isOpen = false;
  document.body.classList.add("is-resetting");
  document.body.classList.remove("is-open");
  stage.setAttribute("aria-label", "Wrapped wedding invitation. Tap or press Enter to open.");
  statusMessage.textContent = "The invitation is wrapped again.";
  stage.focus({ preventScroll: true });
  resetTimer = window.setTimeout(() => {
    document.body.classList.remove("is-resetting");
  }, 980);
}

stage.addEventListener("click", openInvitation);
stage.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openInvitation();
  }
});

resetButton.addEventListener("click", wrapInvitation);

musicToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  if (isMusicPlaying) pauseMusic();
  else playMusic();
});

muteToggle.addEventListener("click", (event) => {
  event.stopPropagation();
  setMute(!isMuted);
});

volumeSlider.addEventListener("input", (event) => {
  volume = Number(event.target.value);
  if (volume > 0 && isMuted) isMuted = false;
  if (audioContext && masterGain) {
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(volume === 0 ? 0.0001 : volume, audioContext.currentTime, 0.04);
  }
  updateMusicUi();
});

volumeSlider.addEventListener("click", (event) => event.stopPropagation());

document.addEventListener("click", (event) => {
  if (!isOpen && !resetButton.contains(event.target) && !musicPlayer.contains(event.target)) {
    openInvitation();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && isMusicPlaying) pauseMusic();
});

updateMusicUi();
