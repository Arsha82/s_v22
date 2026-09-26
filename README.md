# 🎵 Interactive Vinyl Turntable Website — Project Blueprint

> A magnificently simple, visually stunning turntable experience where vinyl records play real music.

---

## 🎯 The Core Idea

A single-page web app that looks and feels like a real vinyl setup. Users drag records onto the turntable platter — the needle drops, the record spins, the music plays. That's it. No menus, no playlists, no clutter. Just pure tactile music magic in the browser.

---

## 🗂️ Project File Structure

```
turntable/
│
├── index.html              ← Main HTML page
├── style.css               ← All visual styling & animations
├── app.js                  ← Turntable logic, drag-drop, audio engine
│
├── records/
│   ├── record1.mp3         ← Your first downloaded MP3
│   └── record2.mp3         ← Your second downloaded MP3
│
└── assets/
    ├── vinyl-texture.svg   ← Grooved record surface (SVG or CSS)
    └── needle.svg          ← Tonearm/needle graphic (optional)
```

---

## 🏗️ Architecture Overview

The app has **three layers** that work independently and connect cleanly:

```
[ Visual Layer ]  ←→  [ Interaction Layer ]  ←→  [ Audio Layer ]
  CSS + SVG             Drag & Drop JS            Web Audio API
  Animations            Click handlers            play/pause/stop
```

### Layer 1 — Visual (CSS + SVG)
- Turntable platter rendered in pure CSS (concentric circles, grooves)
- Spinning animation: `@keyframes spin { transform: rotate(360deg) }` on loop
- Tonearm that pivots from rest position → playing position
- Record crate/shelf area where unplayed records sit

### Layer 2 — Interaction (Vanilla JS)
- Drag-and-drop: records dragged from shelf → dropped onto platter
- Click to lift record off platter (stops music, returns record to shelf)
- Visual feedback during drag (record lifts, glows)

### Layer 3 — Audio (Web Audio API)
- `new Audio(src)` for simple playback
- Play on drop, pause/stop on lift
- Optional: visualizer bars synced to music using `AnalyserNode`

---

## 🎨 Visual Design Direction

**Aesthetic: Warm Retro-Futurism** — think a high-end 1970s hi-fi catalog rendered in a modern browser.

| Element | Design Choice |
|---|---|
| Background | Deep walnut wood texture or very dark teal (#0d1f2d) |
| Turntable platter | Matte black with subtle groove rings, silver spindle |
| Record label | Each record has a unique colored center label (coral, mint, gold) |
| Tonearm | Brushed silver, pivots with CSS `transform-origin` |
| Record shelf | Warm amber-lit display rack below the turntable |
| Typography | Vintage serif (e.g., Google Fonts: "Playfair Display" or "DM Serif Display") |
| Animations | Smooth, physics-y — easing: `cubic-bezier(0.23, 1, 0.32, 1)` |

---

## 🧩 Step-by-Step Build Guide

### Step 1 — Static HTML Skeleton (30 min)

```html
<div class="scene">
  <div class="turntable">
    <div class="platter" id="platter">
      <div class="spindle"></div>
      <!-- record drops here dynamically -->
    </div>
    <div class="tonearm" id="tonearm"></div>
  </div>

  <div class="record-shelf">
    <div class="record" draggable="true" data-src="records/record1.mp3" data-label="coral">
      <div class="label"></div>
    </div>
    <div class="record" draggable="true" data-src="records/record2.mp3" data-label="mint">
      <div class="label"></div>
    </div>
  </div>
</div>
```

### Step 2 — CSS Turntable Platter (45 min)

Build the platter with pure CSS circles:

```css
.platter {
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, #1a1a1a 0%, #0a0a0a 100%);
  /* Groove rings */
  box-shadow:
    0 0 0 8px #111,
    0 0 0 12px #1c1c1c,
    0 0 0 20px #111,
    0 0 0 24px #1c1c1c,
    /* ... repeat for vinyl groove effect */
    0 10px 40px rgba(0,0,0,0.8);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.platter.playing {
  animation: spin 1.8s linear infinite;
}
```

### Step 3 — Tonearm Pivot Animation (30 min)

```css
.tonearm {
  position: absolute;
  top: 20px; right: 20px;
  width: 120px; height: 8px;
  background: linear-gradient(to right, #c0c0c0, #e8e8e8);
  transform-origin: right center;
  transform: rotate(-30deg); /* resting position */
  transition: transform 1.2s cubic-bezier(0.23, 1, 0.32, 1);
  border-radius: 4px;
}

.tonearm.playing {
  transform: rotate(0deg); /* needle on record */
}
```

### Step 4 — Drag & Drop Logic (45 min)

```javascript
const records = document.querySelectorAll('.record');
const platter = document.getElementById('platter');
let currentAudio = null;

records.forEach(record => {
  record.addEventListener('dragstart', e => {
    e.dataTransfer.setData('src', record.dataset.src);
    e.dataTransfer.setData('label', record.dataset.label);
    record.classList.add('lifting');
  });
});

platter.addEventListener('dragover', e => e.preventDefault());

platter.addEventListener('drop', e => {
  const src   = e.dataTransfer.getData('src');
  const label = e.dataTransfer.getData('label');
  dropRecord(src, label);
});

function dropRecord(src, label) {
  // Stop existing audio
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }

  // Place record visually on platter
  platter.classList.add('has-record');
  document.getElementById('tonearm').classList.add('playing');
  platter.classList.add('playing');

  // Play audio
  currentAudio = new Audio(src);
  currentAudio.loop = true;
  currentAudio.play();
}
```

### Step 5 — Polish & Delight Details (1 hour)

These are the things that make it *magnificent*:

1. **Needle drop sound** — a short 0.2s vinyl crackle SFX plays the moment the record is dropped
2. **Speed ramp** — the spin animation starts slow and accelerates using `animation-timing-function`
3. **Record hover glow** — records on the shelf glow warm amber on hover
4. **Lift animation** — when a record is clicked off the platter, it rises with a `translateY` + scale before disappearing
5. **Label art** — each record's center label has the song name in a vintage serif font
6. **Ambient crackle** — a very subtle vinyl noise loop plays underneath (optional, easily toggled)
7. **Speed slider** — a pitch/speed control that uses `audio.playbackRate` — looks like a real hi-fi fader

---

## 🔊 Audio Engine (Simple Version)

```javascript
// Everything you need — no libraries required
const audio = new Audio('records/record1.mp3');
audio.loop = true;

audio.play();         // Start
audio.pause();        // Pause (remembers position)
audio.currentTime = 0; // Rewind
audio.playbackRate = 1.5; // Speed up (like a fast spin)
```

**No Web Audio API needed for the core experience.** Add it only if you want the visualizer bars.

---

## ✨ Optional Upgrades (Phase 2)

| Feature | How |
|---|---|
| **Audio visualizer** | `AnalyserNode` → canvas `requestAnimationFrame` bars around platter |
| **Record flip animation** | 3D CSS `rotateY(180deg)` on hover to reveal B-side |
| **More records** | Just add more `.mp3` files + `.record` divs in HTML |
| **Speed control** | `<input type="range">` linked to `audio.playbackRate` |
| **Vinyl crackle overlay** | Short crackle `.mp3` looped at low volume |
| **Mobile touch support** | Replace `dragstart/drop` with `touchstart/touchend` |
| **LocalStorage queue** | Remember which record was last playing |

---

## 🚀 How to Run It

No build tools, no npm, no framework needed.

```bash
# Option 1: Python (simplest)
python3 -m http.server 8080
# Open: http://localhost:8080

# Option 2: Node.js
npx serve .
# Open: http://localhost:3000

# Option 3: VS Code
# Install "Live Server" extension → Right-click index.html → "Open with Live Server"
```

> ⚠️ Must be served via HTTP (not file://) for audio to work due to browser security.

---

## 📋 Build Order Checklist

- [ ] Create folder structure, place MP3 files in `records/`
- [ ] Write `index.html` with platter, tonearm, record shelf divs
- [ ] Style platter with CSS radial gradient + groove rings
- [ ] Add `@keyframes spin` and `.playing` class toggle
- [ ] Style tonearm with `transform-origin` pivot
- [ ] Style records on shelf (circle, colored label, hover effect)
- [ ] Add drag-and-drop JS (dragstart, dragover, drop)
- [ ] Wire up `new Audio()` playback on drop
- [ ] Add tonearm pivot transition on play/stop
- [ ] Polish: hover glows, lift animation, label typography
- [ ] Test in browser with both MP3 files
- [ ] (Optional) Add speed slider, crackle SFX, visualizer

---

## 🎛️ Tech Stack Summary

| Concern | Tool | Why |
|---|---|---|
| Structure | HTML5 | Semantic, clean |
| Styling | CSS3 (no framework) | Full animation control |
| Interaction | Vanilla JS | Zero dependencies |
| Audio | HTML5 Audio API | Built into every browser |
| Fonts | Google Fonts | Free vintage serifs |
| Hosting | Any static host | No server needed |

**Total estimated build time: 3–5 hours for a beautiful, working turntable.**

---

*"The best interface is one that disappears — leaving only the music."*
