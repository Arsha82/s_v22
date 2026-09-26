/* ═══════════════════════════════════════════════════════
   VELVET SPIN — app.js  (clean rewrite)
═══════════════════════════════════════════════════════ */

/* ── DOM refs ──────────────────────────────────────────── */
const platterZone   = document.getElementById("platter-zone");
const activeVinyl   = document.getElementById("active-vinyl");
const activeLabel   = document.getElementById("active-label");
const dropHint      = document.getElementById("drop-hint");
const tonearm       = document.getElementById("tonearm");
const nowDot        = document.getElementById("now-playing-dot");
const npTitle       = document.getElementById("np-title");
const npArtist      = document.getElementById("np-artist");
const progressCont  = document.getElementById("progress-container");
const progressFill  = document.getElementById("progress-fill");
const progressThumb = document.getElementById("progress-thumb");
const progressBar   = document.getElementById("progress-bar");
const timeCurrent   = document.getElementById("time-current");
const timeTotal     = document.getElementById("time-total");
const btnPlay       = document.getElementById("btn-play");
const btnRewind     = document.getElementById("btn-rewind");
const btnNext       = document.getElementById("btn-next");
const btnLift       = document.getElementById("btn-lift");
const iconPlay      = document.getElementById("icon-play");
const iconPause     = document.getElementById("icon-pause");
const speedSlider   = document.getElementById("speed-slider");
const speedVal      = document.getElementById("speed-val");
const volSlider     = document.getElementById("vol-slider");
const volVal        = document.getElementById("vol-val");
const loopToggle    = document.getElementById("loop-toggle");
const vizCanvas     = document.getElementById("viz-canvas");
const particleCanvas= document.getElementById("particle-canvas");

/* ── State ─────────────────────────────────────────────── */
let audio        = null;
let playing      = false;
let audioCtx     = null;
let analyser     = null;
let activeCard   = null;
let enterCount   = 0;      // drag-enter counter

/* ═══════════════════════════════════════════════════════
   PARTICLES
═══════════════════════════════════════════════════════ */
const pCtx = particleCanvas.getContext("2d");

function resizeCanvas() {
  particleCanvas.width  = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const HUES = [330, 280, 45, 310];
const particles = Array.from({ length: 70 }, () => makeParticle(true));

function makeParticle(init) {
  return {
    x:     Math.random() * particleCanvas.width,
    y:     init ? Math.random() * particleCanvas.height : particleCanvas.height + 5,
    r:     Math.random() * 2 + 0.4,
    vx:    (Math.random() - 0.5) * 0.25,
    vy:    -(Math.random() * 0.35 + 0.1),
    alpha: Math.random() * 0.4 + 0.1,
    hue:   HUES[Math.floor(Math.random() * HUES.length)],
  };
}

function tickParticles() {
  pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 0.0004;
    if (p.y < -5 || p.alpha <= 0) Object.assign(p, makeParticle(false));
    pCtx.globalAlpha = p.alpha;
    pCtx.beginPath();
    pCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    pCtx.fillStyle = "hsl(" + p.hue + ",80%,80%)";
    pCtx.fill();
  }
  pCtx.globalAlpha = 1;
  requestAnimationFrame(tickParticles);
}
tickParticles();

/* ═══════════════════════════════════════════════════════
   VISUALIZER
═══════════════════════════════════════════════════════ */
const vCtx = vizCanvas.getContext("2d");

function initAudioCtx(el) {
  /* On file:// protocol, Web Audio API MediaElementSource causes Chrome to mute audio
     due to CORS security policies. Only connect Web Audio if on HTTP/HTTPS. */
  if (window.location.protocol === 'file:') {
    analyser = null;
    return;
  }
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    const src = audioCtx.createMediaElementSource(el);
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
  } catch (e) {
    analyser = null;
  }
}

(function vizLoop() {
  const W = vizCanvas.width, H = vizCanvas.height;
  vCtx.clearRect(0, 0, W, H);

  let data;
  if (analyser && playing) {
    data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
  }

  const bars   = data ? analyser.frequencyBinCount : 16;
  const barW   = (W / bars) - 1;

  for (let i = 0; i < bars; i++) {
    const val  = data ? data[i] / 255 : (Math.sin(Date.now() / 900 + i * 0.6) * 0.5 + 0.5) * 0.28;
    const barH = Math.max(3, val * H * 0.85);
    const hue  = 300 + (i / bars) * 80;
    const g    = vCtx.createLinearGradient(0, H - barH, 0, H);
    g.addColorStop(0, "hsla(" + hue + ",80%,75%," + (data ? 0.9 : 0.22) + ")");
    g.addColorStop(1, "hsla(" + hue + ",60%,40%,0.1)");
    vCtx.fillStyle = g;
    vCtx.beginPath();
    if (vCtx.roundRect) vCtx.roundRect(i * (barW + 1), H - barH, barW, barH, [2, 2, 0, 0]);
    else vCtx.rect(i * (barW + 1), H - barH, barW, barH);
    vCtx.fill();
  }
  requestAnimationFrame(vizLoop);
}());

/* ═══════════════════════════════════════════════════════
   DRAG & DROP  +  CLICK TO LOAD
═══════════════════════════════════════════════════════ */
document.querySelectorAll(".record-card").forEach(card => {
  /* drag */
  card.addEventListener("dragstart", e => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", card.id);
    card.classList.add("dragging");
  });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));

  /* click to load (reliable fallback) */
  card.addEventListener("click", () => loadRecord(card));

  /* keyboard */
  card.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); loadRecord(card); }
  });
});

/* Drop zone — use enter-counter to ignore false dragleave from children */
platterZone.addEventListener("dragenter", e => {
  e.preventDefault();
  enterCount++;
  platterZone.classList.add("drag-over");
});
platterZone.addEventListener("dragover", e => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
});
platterZone.addEventListener("dragleave", () => {
  enterCount--;
  if (enterCount <= 0) { enterCount = 0; platterZone.classList.remove("drag-over"); }
});
platterZone.addEventListener("drop", e => {
  e.preventDefault();
  enterCount = 0;
  platterZone.classList.remove("drag-over");
  const id   = e.dataTransfer.getData("text/plain");
  const card = document.getElementById(id);
  if (card) loadRecord(card);
});

/* ═══════════════════════════════════════════════════════
   LOAD A RECORD
═══════════════════════════════════════════════════════ */
function loadRecord(card) {
  stopAll();
  activeCard = card;

  /* clone the SVG label from the card onto the platter */
  const svg = card.querySelector(".vinyl-label .label-svg");
  activeLabel.innerHTML = "";
  if (svg) {
    const clone = svg.cloneNode(true);
    stampIds(clone, "pl");           /* avoid duplicate SVG id collisions */
    activeLabel.appendChild(clone);
  }

  dropHint.classList.add("hidden");
  activeVinyl.classList.add("visible");

  npTitle.textContent  = card.dataset.title;
  npArtist.textContent = card.dataset.artist;

  /* Create & play audio SYNCHRONOUSLY within the gesture handler so
     Chrome's autoplay policy is satisfied. */
  const src = encodeURI(card.dataset.src);
  audio               = new Audio(src);
  audio.volume        = parseFloat(volSlider.value);
  audio.playbackRate  = parseFloat(speedSlider.value);
  audio.loop          = loopToggle.checked;

  initAudioCtx(audio);

  audio.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = fmt(audio.duration);
    progressCont.classList.add("active");
  });
  audio.addEventListener("timeupdate", updateProgress);
  audio.addEventListener("ended", () => {
    if (loopToggle.checked) {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      playNextRecord();
    }
  });

  audio.play()
    .then(() => setPlaying(true))
    .catch((err) => {
      console.error("Playback error:", err);
      setPlaying(false);
    });

  /* Defer only the tonearm swing animation */
  setTimeout(() => tonearm.classList.add("playing"), 100);
}

function stampIds(el, prefix) {
  el.querySelectorAll("[id]").forEach(node => {
    const old = node.id;
    node.id = prefix + "-" + old;
    ["fill","filter","stroke"].forEach(attr => {
      el.querySelectorAll("[" + attr + "='url(#" + old + ")']")
        .forEach(ref => ref.setAttribute(attr, "url(#" + node.id + ")"));
    });
  });
}

/* ═══════════════════════════════════════════════════════
   PLAYBACK STATE
═══════════════════════════════════════════════════════ */
function setPlaying(on) {
  playing = on;
  activeVinyl.classList.toggle("spinning", on);
  nowDot.classList.toggle("active", on);
  iconPlay.style.display  = on ? "none"  : "block";
  iconPause.style.display = on ? "block" : "none";

  if (on && !tonearm.classList.contains("playing")) {
    tonearm.classList.add("playing");
  }
}

function stopAll() {
  if (audio) { audio.pause(); audio.src = ""; audio = null; }
  setPlaying(false);
  tonearm.classList.remove("playing");
  activeVinyl.classList.remove("visible", "spinning");
  activeLabel.innerHTML = "";
  dropHint.classList.remove("hidden");
  progressFill.style.width  = "0%";
  progressThumb.style.left  = "0%";
  timeCurrent.textContent   = "0:00";
  timeTotal.textContent     = "0:00";
  progressCont.classList.remove("active");
  npTitle.textContent  = "\u2014";
  npArtist.textContent = "drag or click a record";
  nowDot.classList.remove("active");
  activeCard = null;
}

/* ═══════════════════════════════════════════════════════
   TRANSPORT BUTTONS
═══════════════════════════════════════════════════════ */
btnPlay.addEventListener("click", () => {
  if (!audio) return;
  if (playing) {
    audio.pause();
    setPlaying(false);
  } else {
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    audio.play().then(() => setPlaying(true)).catch(() => {});
  }
});

btnRewind.addEventListener("click", () => {
  playPrevRecord();
});

btnNext.addEventListener("click", () => {
  playNextRecord();
});

function playNextRecord() {
  const cards = Array.from(document.querySelectorAll(".record-card"));
  if (cards.length === 0) return;
  let nextIndex = 0;
  if (activeCard) {
    const currentIndex = cards.indexOf(activeCard);
    if (currentIndex !== -1) {
      nextIndex = (currentIndex + 1) % cards.length;
    }
  }
  stopAll();
  loadRecord(cards[nextIndex]);
}

function playPrevRecord() {
  const cards = Array.from(document.querySelectorAll(".record-card"));
  if (cards.length === 0) return;
  if (audio && audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }
  let prevIndex = 0;
  if (activeCard) {
    const currentIndex = cards.indexOf(activeCard);
    if (currentIndex !== -1) {
      prevIndex = (currentIndex - 1 + cards.length) % cards.length;
    }
  }
  stopAll();
  loadRecord(cards[prevIndex]);
}

btnLift.addEventListener("click", () => {
  if (activeCard) {
    activeCard.classList.add("ejecting");
    setTimeout(() => activeCard && activeCard.classList.remove("ejecting"), 700);
  }
  stopAll();
});

/* ── Progress scrub ────────────────────────────────────── */
let scrubbing = false;
progressBar.addEventListener("mousedown", e => { if (!audio) return; scrubbing = true; scrub(e); });
document.addEventListener("mousemove",    e => { if (scrubbing) scrub(e); });
document.addEventListener("mouseup",      ()  => { scrubbing = false; });

function scrub(e) {
  const r = progressBar.getBoundingClientRect();
  const p = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  if (audio && isFinite(audio.duration)) audio.currentTime = p * audio.duration;
}

function updateProgress() {
  if (!audio || !isFinite(audio.duration)) return;
  const p = audio.currentTime / audio.duration * 100;
  progressFill.style.width = p + "%";
  progressThumb.style.left = p + "%";
  timeCurrent.textContent  = fmt(audio.currentTime);
}

function fmt(s) {
  if (!isFinite(s)) return "0:00";
  return Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
}

/* ── Speed ─────────────────────────────────────────────── */
speedSlider.addEventListener("input", () => {
  const r = parseFloat(speedSlider.value);
  if (audio) audio.playbackRate = r;
  const labels = [[0.5,"16"],[0.75,"16\u2153"],[1,"33\u2153"],[1.2,"45"],[1.5,"78"]];
  const best   = labels.reduce((a, b) => Math.abs(b[0]-r) < Math.abs(a[0]-r) ? b : a);
  speedVal.textContent = best[1];
});

/* ── Volume ────────────────────────────────────────────── */
volSlider.addEventListener("input", () => {
  const v = parseFloat(volSlider.value);
  if (audio) audio.volume = v;
  volVal.textContent = Math.round(v * 100) + "%";
});

/* ── Loop ──────────────────────────────────────────────── */
loopToggle.addEventListener("change", () => { if (audio) audio.loop = loopToggle.checked; });

/* ═══════════════════════════════════════════════════════
   VIBE TAGS
═══════════════════════════════════════════════════════ */
const vibeQuotes = {
  dreamy:    "\"soft as silk, sharp as a blade \u2726\"",
  electric:  "\"voltage in her veins, lightning in her gaze \u26a1\"",
  melancholy:"\"the moon only shines for those who dare to ache \uD83C\uDF19\"",
  euphoric:  "\"glitter in her bloodstream, magic on her tongue \u2728\"",
  moody:     "\"too tender to be tamed, too fierce to be forgotten \uD83D\uDDA4\"",
};

document.querySelectorAll(".vibe-tag").forEach(tag => {
  tag.addEventListener("click", () => {
    document.querySelectorAll(".vibe-tag").forEach(t => t.classList.remove("active"));
    tag.classList.add("active");
    document.getElementById("vibe-quote").innerHTML = "<em>" + vibeQuotes[tag.dataset.vibe] + "</em>";
  });
});

/* ═══════════════════════════════════════════════════════
   MOOD PALETTE — direct CSS-var + orb repaint
═══════════════════════════════════════════════════════ */
const moods = {
  pink: {
    accent:       "#f4a0bf",
    glow:         "rgba(244, 160, 191, 0.4)",
    baseBg:       "#180c24",
    panelBg:      "rgba(42, 20, 56, 0.65)",
    turntableBg:  "linear-gradient(160deg, rgba(48, 22, 66, 0.9) 0%, rgba(28, 12, 44, 0.95) 100%)",
    borderGlass:  "rgba(244, 160, 191, 0.2)",
    orbs:         ["#f4a0bf", "#5c1d42", "#fce4ec", "#9b3b68"]
  },
  purple: {
    accent:       "#c4a7e7",
    glow:         "rgba(196, 167, 231, 0.4)",
    baseBg:       "#110b24",
    panelBg:      "rgba(30, 18, 58, 0.65)",
    turntableBg:  "linear-gradient(160deg, rgba(38, 22, 72, 0.9) 0%, rgba(20, 10, 48, 0.95) 100%)",
    borderGlass:  "rgba(196, 167, 231, 0.2)",
    orbs:         ["#c4a7e7", "#3a1c6a", "#e8dcf8", "#6e44b8"]
  },
  gold: {
    accent:       "#e5be7a",
    glow:         "rgba(229, 190, 122, 0.4)",
    baseBg:       "#19120a",
    panelBg:      "rgba(46, 32, 18, 0.65)",
    turntableBg:  "linear-gradient(160deg, rgba(54, 38, 22, 0.9) 0%, rgba(28, 18, 10, 0.95) 100%)",
    borderGlass:  "rgba(229, 190, 122, 0.2)",
    orbs:         ["#e5be7a", "#5c3d18", "#f7e8c8", "#9c6d28"]
  },
  midnight: {
    accent:       "#8ea2ff",
    glow:         "rgba(142, 162, 255, 0.4)",
    baseBg:       "#0a0d1e",
    panelBg:      "rgba(18, 24, 54, 0.65)",
    turntableBg:  "linear-gradient(160deg, rgba(22, 32, 68, 0.9) 0%, rgba(10, 14, 40, 0.95) 100%)",
    borderGlass:  "rgba(142, 162, 255, 0.2)",
    orbs:         ["#8ea2ff", "#1b2354", "#d0d8ff", "#4756b3"]
  },
  cherry: {
    accent:       "#e65c7b",
    glow:         "rgba(230, 92, 123, 0.4)",
    baseBg:       "#1d0a14",
    panelBg:      "rgba(48, 16, 32, 0.65)",
    turntableBg:  "linear-gradient(160deg, rgba(58, 20, 40, 0.9) 0%, rgba(30, 10, 22, 0.95) 100%)",
    borderGlass:  "rgba(230, 92, 123, 0.2)",
    orbs:         ["#e65c7b", "#541224", "#ffd0dc", "#9c2444"]
  }
};

const orbEls = [
  document.querySelector(".orb-1"),
  document.querySelector(".orb-2"),
  document.querySelector(".orb-3"),
  document.querySelector(".orb-4"),
];

function applyMood(key) {
  const m = moods[key] || moods.pink;
  const root = document.documentElement;
  root.style.setProperty("--accent",       m.accent);
  root.style.setProperty("--accent-glow",  m.glow);
  root.style.setProperty("--bg-base",      m.baseBg);
  root.style.setProperty("--bg-panel",     m.panelBg);
  root.style.setProperty("--bg-turntable", m.turntableBg);
  root.style.setProperty("--border-glass", m.borderGlass);
  document.body.style.background = m.baseBg;

  orbEls.forEach((o, i) => {
    if (o && m.orbs && m.orbs[i]) {
      o.style.background = "radial-gradient(circle, " + m.orbs[i] + ", transparent 70%)";
    }
  });
}

document.querySelectorAll(".swatch").forEach(sw => {
  sw.addEventListener("click", () => {
    document.querySelectorAll(".swatch").forEach(s => s.classList.remove("active"));
    sw.classList.add("active");
    applyMood(sw.dataset.mood);
  });
});
