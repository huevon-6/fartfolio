// app.js — small-print wall placement + auto-fitting ascii frames + click-to-zoom

// lightbox
const cards = document.querySelectorAll(".card");
const lb = document.getElementById("lightbox");
const lbImg = document.getElementById("lb-img");
const lbCap = document.getElementById("lb-cap");
const lbClose = document.getElementById("lb-close");

function openLightbox(src, caption) {
  lbImg.src = src;
  lbImg.alt = caption || "art";
  lbCap.textContent = caption || "";
  lb.classList.add("open");
  lb.setAttribute("aria-hidden", "false");
}
function closeLightbox() {
  lb.classList.remove("open");
  lb.setAttribute("aria-hidden", "true");
  lbImg.src = "";
}

cards.forEach(card => {
  card.addEventListener("click", () => {
    openLightbox(card.getAttribute("data-full"), card.getAttribute("data-caption"));
  });
});

lbClose?.addEventListener("click", closeLightbox);
lb?.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });

// --- terminal-style fish background (browser) ---
(() => {
  const term = document.getElementById("fishterm");
  if (!term) return;

  // grid size based on viewport + your css font metrics
  const cellW = 8;   // approx monospace char width at 14px
  const cellH = 16;  // must match line-height in css
  let w = 80;
  let h = 24;

  const fishes = [];
  const bubbles = [];

  const frames = [
    "<><((('>",
    "<><((('>>",
    "<><((('>>>",
    "<><((('>>",
  ];

  const bubbleChars = ["o", "°", "·", "○"];

  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function resize() {
    w = Math.max(40, Math.floor(window.innerWidth / cellW));
    h = Math.max(14, Math.floor(window.innerHeight / cellH));
  }
  window.addEventListener("resize", resize, { passive: true });
  resize();

  function addFish() {
    const dir = Math.random() < 0.5 ? 1 : -1;
    fishes.push({
      x: dir === 1 ? -12 : w + 12,
      y: (rand(2, h - 3) | 0),
      dir,
      speed: rand(8, 18),          // chars/sec
      frame: (Math.random() * frames.length) | 0,
      wiggle: rand(2, 6),          // frames/sec-ish
      drift: rand(0.02, 0.08),     // vertical drift chance
    });
  }

  function addBubble() {
    const source = fishes.length && Math.random() < 0.55 ? pick(fishes) : null;
    bubbles.push({
      x: source ? (source.x + rand(2, 10) | 0) : (rand(0, w - 1) | 0),
      y: source ? (source.y | 0) : (h - 1),
      vy: rand(6, 16), // chars/sec up
      ch: pick(bubbleChars),
      life: rand(0.9, 2.2),
      age: 0,
    });
  }

  // initial population
  fishes.length = 0;
  for (let i = 0; i < 7; i++) addFish();

  let last = performance.now();

  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    // occasional bubbles
    if (Math.random() < 0.22) addBubble();

    // update fish
    for (const f of fishes) {
      f.x += f.dir * f.speed * dt;

      // wrap
      if (f.dir === 1 && f.x > w + 14) f.x = -14;
      if (f.dir === -1 && f.x < -14) f.x = w + 14;

      // wiggle animation
      if (Math.random() < dt * f.wiggle) {
        f.frame = (f.frame + 1) % frames.length;
      }

      // subtle vertical drift
      if (Math.random() < f.drift) {
        f.y = clamp(f.y + (Math.random() < 0.5 ? -1 : 1), 1, h - 3);
      }
    }

    // update bubbles
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.age += dt;
      b.y -= b.vy * dt;
      if (b.y < 0 || b.age > b.life) bubbles.splice(i, 1);
    }

    // draw grid
    const grid = Array.from({ length: h }, () => Array(w).fill(" "));

    // bubbles
    for (const b of bubbles) {
      const x = b.x | 0, y = b.y | 0;
      if (y >= 0 && y < h && x >= 0 && x < w) grid[y][x] = b.ch;
    }

    // fishes
    for (const f of fishes) {
      const art = frames[f.frame];
      const x0 = f.x | 0;
      const y0 = f.y | 0;

      // reverse string to face left
      const s = f.dir === 1 ? art : art.split("").reverse().join("");

      for (let i = 0; i < s.length; i++) {
        const x = x0 + i;
        if (y0 >= 0 && y0 < h && x >= 0 && x < w) grid[y0][x] = s[i];
      }
    }

    term.textContent = grid.map(r => r.join("")).join("\n");
    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();


// helpers
function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }


// ascii frame generator (fits to size)
function makeAsciiFrame(cols, rows) {
  cols = Math.max(8, cols);
  rows = Math.max(6, rows);

  const top = "+" + "-".repeat(cols - 2) + "+";
  const mid = "|" + " ".repeat(cols - 2) + "|";
  const bot = "+" + "-".repeat(cols - 2) + "+";

  let out = top + "\n";
  for (let r = 0; r < rows - 2; r++) out += mid + "\n";
  out += bot;
  return out;
}

function frameize() {
  document.querySelectorAll(".ascii-frame").forEach((pre) => {
    const box = pre.getBoundingClientRect();
    const charH = 12;
    const charW = 7.2;

    const cols = Math.floor((box.width - 8) / charW);
    const rows = Math.floor((box.height - 8) / charH);

    pre.textContent = makeAsciiFrame(cols, rows);
  });
}


// place small prints like a wall (packed columns with jitter)
async function wallizePrints() {
  const wall = document.getElementById("wall");
  if (!wall) return;

  // wait until images have natural sizes
  const imgs = [...wall.querySelectorAll("img")];
  await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(res => {
    img.addEventListener("load", res, { once:true });
    img.addEventListener("error", res, { once:true });
  })));

  const wallW = wall.clientWidth;

  // small print widths (tune these)
  const widths = [120, 140, 160, 180, 200];

  const gutter = 18;
  const colW = 220; // approx max print width + padding
  const cols = Math.max(2, Math.floor((wallW + gutter) / (colW + gutter)));

  const colX = Array.from({ length: cols }, (_, i) => Math.floor(i * (wallW / cols)));
  const colY = Array.from({ length: cols }, () => 0);

  let maxY = 0;

  [...wall.querySelectorAll(".card")].forEach((card, i) => {
    const w = pick(widths);

    // shortest column
    let c = 0;
    for (let j = 1; j < cols; j++) if (colY[j] < colY[c]) c = j;

    const img = card.querySelector("img");
    const ratio = (img && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.75;

    // estimate card height (img height + padding/border)
    const frameExtra = (7 * 2) + 2; // padding + border
    const h = Math.round((w * ratio) + frameExtra + 10);

    const x = Math.round(colX[c] + rand(-10, 10));
    const y = Math.round(colY[c] + rand(0, 10));

    card.style.width = `${w}px`;
    card.style.left = `${x}px`;
    card.style.top = `${y}px`;
    card.style.setProperty("--rot", `${rand(-2.2, 2.2).toFixed(2)}deg`);

    colY[c] = y + h + gutter;
    maxY = Math.max(maxY, colY[c]);
  });

  wall.style.height = `${maxY + 20}px`;

  requestAnimationFrame(() => frameize());
}

function boot() {
  wallizePrints();
}

window.addEventListener("load", boot);
window.addEventListener("resize", () => {
  wallizePrints();
});
