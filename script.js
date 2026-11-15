/* AUREX 2.0: all page behavior and the 3D game. Data comes from /data.js (served by server.py). */
function findMissions(target, query) {
  const q = query.toLowerCase().trim();
  return MISSIONS.filter(m =>
    (!target || m.target === target) &&
    (!q || [m.name, m.summary, String(m.year), m.id].join(" ").toLowerCase().includes(q)));
}
/* Typo-tolerant search: prefix, substring and edit-distance matching */
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, "");
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
function score(m, q) {
  const nq = norm(q);
  if (!nq) return 0;
  const cands = [norm(m.name), norm(m.id)].concat(m.name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
  let best = 0;
  cands.forEach(c => {
    if (c.startsWith(nq)) best = Math.max(best, 1);
    else if (nq.length > 2 && c.includes(nq)) best = Math.max(best, 0.9);
    else {
      const whole = 1 - lev(nq, c) / Math.max(nq.length, c.length);
      const start = 0.95 * (1 - lev(nq, c.slice(0, nq.length)) / nq.length);
      best = Math.max(best, whole, start);
    }
  });
  if (nq.length > 3 && norm(m.summary).includes(nq)) best = Math.max(best, 0.65);
  if (/^\d+$/.test(nq) && String(m.year) === nq) best = Math.max(best, 0.85);
  return best;
}
const suggest = q => MISSIONS.map(m => [m, score(m, q)]).filter(x => x[1] >= 0.6).sort((a, b) => b[1] - a[1]).map(x => x[0]);
/* ---------- Study helpers: Aurex 2.0 assistant (retrieval) and quiz generator ---------- */
const PASS_POINTS = 80;
const STATUS_LABEL = { active: "Active", completed: "Completed", inactive: "Inactive", crashed: "Crashed", left: "Intentionally left", uncertain: "Uncertain" };
const shuf = a => a.slice().sort(() => Math.random() - 0.5);
const first = s => s.split(/(?<=[.!?])\s/)[0];
const ageAt = (b, e) => { const s = new Date(b), t = e ? new Date(e) : new Date(); let a = t.getFullYear() - s.getFullYear(); if (t < new Date(t.getFullYear(), s.getMonth(), s.getDate())) a--; return a; };
const STOP = new Set("the a an of to is was were what why how who when where did do does it its in on for and about with at by this that me tell can you i are be mission nasa spacecraft".split(" "));
const toks = s => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter(w => !STOP.has(w)).map(w => w.replace(/(ing|ed|es|s)$/, ""));
const BOOST = [[/why|purpose|reason|made|point/, "why"], [/who|built|company|team|engineer|scientist|designed|created/, "team"], [/who|astronaut|crew|person|people/, "people"],
  [/when|date|year|launch|land|long|many|weigh|size|heavy|big/, "stats"], [/discover|want|goal|aim|plan/, "want"], [/expect|hope|predict/, "expect"],
  [/instrument|measure|camera|sensor|detect|tool|equipment|carry|carried/, "inst"], [/learn|found|find|result|discover/, "learned"], [/matter|important|humanity|benefit/, "matter"],
  [/later|influence|legacy|future|inspire|impact|artemis|next/, "legacy"], [/status|still|active|working|operational|alive|left|crash|stopped|today|now|control|surface|orbit|where|happen/, "status"],
  [/fact|interest|fun|cool|surpris/, "facts"], [/what is|what was|about|describe|overview|explain/, "summary"]];
function fateList(m) {
  const act = m.ops;
  return [
    ["Was the hardware deliberately left on the celestial body?", (m.left ? "Yes. " : "Not deliberately. ") + m.where],
    ["Did it land or crash, and was it lost?", m.st === "crashed" ? "It crashed, but it was not lost: NASA tracked it to the end and knows where it struck. " + m.now : (act ? "No. It is still flying or working and NASA knows exactly where it is." : "No. NASA tracked it to its final position, so it was not lost. ") + (act ? "" : m.where)],["Did it complete its mission or does it remain unfinished?", act ? "Its mission is still going, and it keeps returning new science." : "It finished its work. " + m.now],["Has the hardware stopped functioning?", act ? "No. It is still working today." : "Yes. " + m.now],["Is it still operational and controllable?", act ? "Yes. NASA engineers can still send it commands and receive its data." : "No. NASA can no longer control it or receive new data from it."],["Does it remain in space or sit on a planetary surface?", m.where]
  ];
}
function questionsOf(m) {
  const w = a => { let s = a; for (const x of [m.summary, m.why, m.outcome, m.matter]) { if (s.split(/\s+/).length >= 35) break; if (!s.includes(x)) s += " " + x; } return s; }, world = m.target === "moon" ? "the Moon" : "Mars";
  const all = [["Why was " + m.name + " made?", w(m.why + " " + m.summary), "why"],
    ["What did NASA want to discover?", w("NASA wanted to find out: " + m.asked.join(" ") + " " + m.why), "want"],
    ["What did scientists expect to find?", w("Before launch, scientists expected " + m.name + " to help answer: " + m.asked.join(" ") + " Its instruments were chosen to test exactly this."), "expect"],["What scientific instruments were used in this mission?", w(m.inst + " Together these tools let the team study " + world + " in several different ways."), "inst"],["What did the instruments actually measure?", w("In practice the instruments recorded the following. " + m.answered.join(" ") + " " + m.outcome), "inst"],["What did scientists learn from it?", w(m.answered.join(" ") + " " + (m.facts || []).join(" ")), "learned"],["Why did the discovery matter to humanity?", w(m.matter + " " + m.summary), "matter"],["Who built " + m.name + "?", w(m.team), "team"],["What happened to the spacecraft after the mission?", w("Status: " + STATUS_LABEL[m.st] + ". " + m.where + " " + m.now), "status"],["How did the mission influence later missions and humanity?", w(m.legacy + " " + m.matter), "legacy"]];
  if ((m.facts || []).length) all.push(["What are the most interesting facts about " + m.name + "?", w(m.facts.join(" ")), "facts"]);
  return all;
}
function passages(m) {
  const P = questionsOf(m).map(q => [q[2], q[0], q[1]]);
  fateList(m).forEach(([q, a]) => P.push(["status", q, a]));
  (PEOPLE_OF[m.id] || []).forEach(id => P.push(["people", PEOPLE[id].name, PEOPLE[id].bio]));
  P.push(["stats", "launch date year size numbers", (m.stats || []).map(s => s[0] + ": " + s[1]).join(". ") + "."], ["summary", "what is " + m.name, m.summary + " " + m.why]);
  return P;
}
function answer(m, text) {
  const q = toks(text), low = text.toLowerCase(), boosts = {};
  BOOST.forEach(([re, k]) => { if (re.test(low)) boosts[k] = (boosts[k] || 0) + 3; });
  const scored = passages(m).map(([k, qq, a]) => {
    const pt = toks(qq + " " + a), hit = q.filter(w => pt.some(p => p === w || (w.length > 4 && lev(p, w) <= 1))).length;return { a, s: hit * 2 + (boosts[k] || 0) };
  }).sort((u, v) => v.s - u.s);
  if (scored[0].s < 3) return "I can tell you everything about " + m.name + ": why it was made, what it measured, who built it, what it found, and where it is now. " + m.summary + " Try asking about any of these.";
  const out = [scored[0].a], words = t => t.join(" ").split(/\s+/).length;
  for (const p of scored.slice(1)) { if (out.length >= 3 || words(out) >= 90) break; if (p.s >= scored[0].s * 0.5 && !out.includes(p.a)) out.push(p.a); }
  if (words(out) < 60 && !out.join(" ").includes(m.summary)) out.push(m.summary);
  const lead = ["", "In more detail: ", "Also worth knowing: ", "In short: "];
  return out.map((t, i) => lead[i] + t).join("\\n\\n");
}
function makeQuiz(m) {
  const others = MISSIONS.filter(o => o.id !== m.id), names = others.map(o => o.name), tw = o => (o.target === "moon" ? "the Moon" : "Mars");
  const byName = {}, ownerOf = {};
  MISSIONS.forEach(o => { byName[o.name] = o; });
  const desc = s => byName[s] ? byName[s].name + " (" + tw(byName[s]) + ", " + byName[s].year + "): " + byName[s].summary + " " : (ownerOf[s] ? "This describes " + ownerOf[s] + ", not " + m.name + ". " : "");
  const pool = fn => others.map(o => { const s = fn(o); if (s) ownerOf[s] = o.name; return s; }).filter(Boolean);
  const mc = (q, right, wrong, base) => {
    const o = shuf(Array.from(new Set(wrong)).filter(v => v !== right).slice(0, 3).concat(right));
    return { q, options: o, answer: o.indexOf(right), ex: o.map(v => v === right ? "Correct! " + base : "Not correct. " + desc(v) + "The right answer is \u201C" + right + "\u201D. " + base) };
  };
  const L1 = [];
  L1.push(mc("What is " + m.name + "?", m.summary, shuf(pool(o => o.summary)), "That is the best description of " + m.name + "."));
  L1.push(mc("Why was " + m.name + " made?", first(m.why), shuf(pool(o => first(o.why))), m.name + " was made for this reason: " + m.why));
  L1.push(mc(m.name + " was sent to which world?", tw(m), ["Venus", "Jupiter", m.target === "moon" ? "Mars" : "the Moon"], m.name + " was sent to " + tw(m) + ". " + m.summary));
  L1.push(mc("In which year did " + m.name + " begin its mission?", String(m.year), shuf(others.map(o => String(o.year))), m.name + " began its mission in " + m.year + "."));
  L1.push(mc("What is the status of " + m.name + " today?", STATUS_LABEL[m.st], shuf(Object.values(STATUS_LABEL)), m.now));
  (m.stats || []).forEach(([k, v]) => {
    const same = others.flatMap(o => (o.stats || []).filter(s => s[0] === k).map(s => s[1]));
    L1.push(mc(m.name + ": what is its \u201C" + k + "\u201D?", v, shuf(same).concat(shuf(others.flatMap(o => (o.stats || []).map(s => s[1])))), "For " + m.name + ", \u201C" + k + "\u201D is " + v + "."));
  });
  others.forEach(o => {
    const t = shuf(others.filter(x => x !== o)).slice(0, 2).concat(o, m), yrs = t.map(x => x.year).sort((a, b) => a - b);if (yrs[0] !== yrs[1]) { const win = t.find(x => x.year === yrs[0]); L1.push(mc("Which of these missions started first?", win.name, t.map(x => x.name), win.name + " started in " + win.year + ", earlier than the others.")); }if (yrs[3] !== yrs[2]) { const late = t.find(x => x.year === yrs[3]); L1.push(mc("Which of these missions started last?", late.name, t.map(x => x.name), late.name + " started in " + late.year + ", later than the others.")); }if (o.target === m.target) L1.push(mc("Which of these also went to " + tw(m) + "?", o.name, shuf(others.filter(x => x.target !== m.target).map(x => x.name)), o.name + " also went to " + tw(m) + "."));
  });
  const L2 = [], who = " is the correct mission. ";
  [["Which mission is this? ", m.summary], ["Which mission was made for this reason? ", first(m.why)], ["Which mission ended this way? ", first(m.outcome)], ["Which mission was built by this team? ", m.team],
   ["Which mission carried these instruments? ", m.inst], ["Which mission had this lasting effect? ", m.legacy], ["Which mission is described here? ", m.now]].concat((m.facts || []).map(f => ["Which mission has this fact? ", f]), m.asked.map(a => ["Which mission tried to answer this question? ", a]), m.answered.map(a => ["Which mission found this out? ", a])).forEach(([pre, t]) => L2.push(mc(pre + "\u201C" + t + "\u201D", m.name, shuf(names), m.name + who + m.summary)));
  [["Which statement about " + m.name + " is true?", m.matter, o => o.matter], ["Which statement about " + m.name + " is true?", m.legacy, o => o.legacy], ["Which statement about " + m.name + " is true?", first(m.now), o => first(o.now)],
   ["Which instruments did " + m.name + " carry?", m.inst, o => o.inst], ["Where is the hardware of " + m.name + " today?", m.where, o => o.where]].forEach(([q, right, fn]) => L2.push(mc(q, right, shuf(pool(fn)), m.name + ": " + right)));
  others.forEach(o => {
    const d = Math.abs(o.year - m.year);
    if (d) L2.push(mc("About how many years apart were " + m.name + " (" + m.year + ") and " + o.name + " (" + o.year + ")?", d + " years", shuf([d + 1, d + 2, Math.max(d - 1, 0), d + 5]).map(n => n + " years"), m.name + " began in " + m.year + " and " + o.name + " in " + o.year + ", so they are " + d + " years apart."));
  });
  return { 1: shuf(L1).slice(0, 25), 2: shuf(L2).slice(0, 25) };
}
/* ===== PAGE LOGIC ===== */
"use strict";
const $ = s => document.querySelector(s);
const app = $("#app");
const imgCache = {};
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};
const getJSON = async url => {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.json();
};
/* ---------- Space background: procedural nebula, galaxy, Sun, planets ---------- */
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
const lerp = (a, b, t) => a + (b - a) * t;
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf), H = hash3;
  return lerp(lerp(lerp(H(xi, yi, zi), H(xi + 1, yi, zi), u), lerp(H(xi, yi + 1, zi), H(xi + 1, yi + 1, zi), u), v),
              lerp(lerp(H(xi, yi, zi + 1), H(xi + 1, yi, zi + 1), u), lerp(H(xi, yi + 1, zi + 1), H(xi + 1, yi + 1, zi + 1), u), v), w);
}
const fbm = (x, y, z, o = 5) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f, z * f); a *= 0.5; f *= 2; } return s; };
const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const clamp01 = v => Math.min(1, Math.max(0, v));
function sphere(size, shade) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), im = g.createImageData(size, size), R = size / 2, L = [-0.6, -0.35, 0.72];
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const nx = (px + 0.5 - R) / R, ny = (py + 0.5 - R) / R, d2 = nx * nx + ny * ny;
    if (d2 > 1) continue;
    const nz = Math.sqrt(1 - d2), col = shade(nx, ny, nz), lit = 0.05 + 0.95 * Math.pow(Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), 0.8), i = (py * size + px) * 4;im.data[i] = col[0] * lit; im.data[i + 1] = col[1] * lit; im.data[i + 2] = col[2] * lit; im.data[i + 3] = 255 * Math.min(1, (1 - Math.sqrt(d2)) * R / 1.5);
  }
  g.putImageData(im, 0, 0);
  return c;
}
const CRATERS = Array.from({ length: 130 }, () => { const a = Math.random() * 6.283, z = Math.random() * 2 - 1, r = Math.sqrt(1 - z * z); return [r * Math.cos(a), z, r * Math.sin(a), 0.03 + Math.random() * Math.random() * 0.22]; });
function crater(nx, ny, nz) {
  let k = 1;
  for (const c of CRATERS) { const dot = nx * c[0] + ny * c[1] + nz * c[2]; if (dot < 0.96) continue; const t = Math.acos(Math.min(1, dot)) / c[3]; if (t < 1) k *= t > 0.82 ? 1.22 : 0.78 + 0.22 * t; }
  return k;
}
const shades = {
  moon(nx, ny, nz) { let v = 168 + 60 * (fbm(nx * 5 + 3, ny * 5, nz * 5) - 0.5); v *= (1 - 0.42 * clamp01((0.5 - fbm(nx * 1.6 + 9, ny * 1.6 + 2, nz * 1.6)) * 7)) * crater(nx, ny, nz); return [v, v * 0.99, v * 0.95]; },
  mars(nx, ny, nz) {
    const f = fbm(nx * 4 + 1, ny * 4, nz * 4) - 0.5, dk = clamp01((0.5 - fbm(nx * 2 + 7, ny * 2 + 3, nz * 2)) * 6);
    return mix(mix(mix([214, 118, 66], [168, 84, 48], 0.5 + f * 1.4), [92, 48, 36], dk * 0.7), [236, 224, 214], clamp01((Math.abs(ny) - 0.88) * 12));
  },
  mercury(nx, ny, nz) { const v = (120 + 50 * fbm(nx * 6, ny * 6, nz * 6)) * crater(nx, ny, nz); return [v, v * 0.95, v * 0.9]; },
  venus(nx, ny, nz) { return mix([205, 160, 90], [240, 214, 150], fbm(nx * 2 + 2, ny * 3, nz * 2)); },
  earth(nx, ny, nz) {
    const land = fbm(nx * 2.2 + 5, ny * 2.2, nz * 2.2), cloud = fbm(nx * 3 + 1, ny * 6, nz * 3 + 4);
    let c = land > 0.52 ? mix([60, 120, 55], [150, 125, 80], clamp01((land - 0.52) * 5)) : mix([10, 40, 120], [25, 85, 180], land * 1.6);c = mix(c, [245, 245, 250], clamp01((cloud - 0.5) * 4) * 0.85);return mix(c, [250, 250, 255], clamp01((Math.abs(ny) - 0.86) * 12));
  },
  jupiter(nx, ny, nz) { return mix([170, 118, 82], [228, 200, 160], Math.sin(ny * 16 + fbm(nx * 3, ny * 8, nz * 3) * 4) * 0.5 + 0.5); },
  saturn(nx, ny, nz) { return mix([196, 170, 118], [232, 214, 164], Math.sin(ny * 11 + fbm(nx * 2, ny * 6, nz * 2) * 2) * 0.5 + 0.5); },
  uranus(nx, ny, nz) { return mix([120, 200, 210], [170, 230, 235], 0.5 + 0.5 * Math.sin(ny * 6)); },
  neptune(nx, ny, nz) { return mix([40, 70, 200], [80, 120, 235], fbm(nx * 2, ny * 5, nz * 2)); }
};
const sprites = {};
const sprite = name => sprites[name] || (sprites[name] = sphere(name === "moon" || name === "mars" ? 384 : 224, shades[name]));
document.querySelectorAll("canvas.orb").forEach(c => c.getContext("2d").drawImage(sprite(c.dataset.orb), 0, 0));
const SOLAR = [["Mercury", 0.38], ["Venus", 0.95], ["Earth", 1], ["Mars", 0.53], ["Jupiter", 11.2], ["Saturn", 9.45], ["Uranus", 4], ["Neptune", 3.88]];
(function () {
  const c = $("#stars"), x = c.getContext("2d"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rnd = (a, b) => a + Math.random() * (b - a), TEMPS = [[155, 176, 255], [202, 215, 255], [255, 255, 255], [255, 244, 234], [255, 210, 161], [255, 204, 111]];
  let W, H, layers, galaxy, neb, mws, shoot = null, t = 0, timer;
  function nebula() {
    const w = Math.ceil(W / 5), h = Math.ceil(H / 5), n = document.createElement("canvas");
    n.width = w; n.height = h;
    const g = n.getContext("2d"), im = g.createImageData(w, h), cs = Math.cos(0.55), sn = Math.sin(0.55);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const u = i / w, v = j / h, along = (u - 0.5) * cs * (w / h) + (v - 0.5) * sn, b = (v - 0.5) * cs - (u - 0.5) * sn * (w / h);  const bb = b + (fbm(u * 3, v * 3, 8, 3) - 0.5) * 0.12, cl = fbm(u * 7, v * 7 * (h / w), 2.5, 6);  const bulge = Math.exp(-(along * along) / 0.05), width = 0.012 + 0.03 * bulge;  const lane = 1 - Math.abs(2 * fbm(u * 12 + 4, v * 12, 7, 5) - 1), dark = Math.exp(-bb * bb / 0.0015) * clamp01((lane - 0.55) * 3.2) * 0.85;  const wi = Math.exp(-bb * bb / width) * (0.35 + cl * 0.9) * (0.5 + 0.9 * bulge) * (1 - dark);  const we = clamp01((fbm(u * 3 + 11, v * 3, 5) - 0.58) * 5) * 0.25 * Math.exp(-bb * bb / 0.06), tot = wi + we, p = (j * w + i) * 4;  if (tot < 0.001) continue;  const c1 = mix([150, 165, 255], [255, 214, 165], clamp01(bulge * 1.2 + cl * 0.2));  im.data[p] = (c1[0] * wi + 235 * we) / tot; im.data[p + 1] = (c1[1] * wi + 100 * we) / tot; im.data[p + 2] = (c1[2] * wi + 160 * we) / tot; im.data[p + 3] = clamp01(0.75 * tot) * 255;}g.putImageData(im, 0, 0);return n;
  }
  function bandStars() {
    const n = document.createElement("canvas"); n.width = W; n.height = H;
    const g = n.getContext("2d"), cs = Math.cos(0.55), sn = Math.sin(0.55), D = Math.hypot(W, H);
    for (let k = 0; k < 5200; k++) {
      const a = rnd(-0.5, 0.5) * D, off = (rnd(-1, 1) + rnd(-1, 1) + rnd(-1, 1)) * H * 0.07;
      g.fillStyle = "rgba(" + (200 + Math.random() * 55) + "," + (200 + Math.random() * 55) + ",255," + rnd(0.15, 0.75) + ")";  g.fillRect(W / 2 + a * cs - off * sn, H / 2 + a * sn + off * cs, 1, 1);}return n;
  }
  function init() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    layers = [[0.12, 170, 1], [0.35, 90, 1.6], [0.8, 36, 2.4]].map(([speed, n, rmax]) => ({ speed, pts: Array.from({ length: n }, () => ({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.3, rmax), p: rnd(0, 6.28), s: rnd(0.004, 0.03), col: TEMPS[Math.floor(Math.random() * TEMPS.length)] })) }));galaxy = Array.from({ length: 2600 }, () => { const d = Math.pow(Math.random(), 0.6); return { d, a: d * 8 + Math.floor(Math.random() * 2) * Math.PI + rnd(-0.35, 0.35) * (0.4 + d), r: rnd(0.4, 1.3), k: rnd(0.35, 1) }; });neb = nebula(); mws = bandStars();
  }
  function ring(cx, cy, r, back) {
    x.strokeStyle = "rgba(222,202,150,0.7)"; x.lineWidth = r * 0.28; x.beginPath();
    x.ellipse(cx, cy, r * 1.9, r * 0.5, -0.35, back ? Math.PI : 0, back ? 2 * Math.PI : Math.PI); x.stroke();
  }
  function solar() {
    const m = Math.min(W, H), sc = scrollY * 0.35, sx = -m * 0.1, sy = H * 0.1 - sc * 0.5, sr = m * 0.36;
    const cg = x.createRadialGradient(sx, sy, sr * 0.2, sx, sy, sr * 2.4);
    cg.addColorStop(0, "rgba(255,250,225,1)"); cg.addColorStop(0.2, "rgba(255,205,100,0.95)"); cg.addColorStop(0.45, "rgba(255,140,40,0.28)"); cg.addColorStop(1, "rgba(255,90,0,0)");x.fillStyle = cg; x.fillRect(0, 0, W, H);x.save(); x.translate(sx, sy); x.rotate(t * 0.6);for (let i = 0; i < 14; i++) {  x.rotate(6.283 / 14);  const g = x.createLinearGradient(sr, 0, sr * 2.8, 0); g.addColorStop(0, "rgba(255,220,140,0.22)"); g.addColorStop(1, "rgba(255,220,140,0)");  x.fillStyle = g; x.beginPath(); x.moveTo(sr, -sr * 0.05); x.lineTo(sr * 2.8, 0); x.lineTo(sr, sr * 0.05); x.fill();}x.restore();SOLAR.forEach(([name, rr], i) => {  const r = Math.max(4, Math.sqrt(rr) * m * 0.034), cx = W * (i % 2 ? 0.9 : 0.8), cy = H * 0.25 + i * H * 0.55 - sc;  x.strokeStyle = "rgba(150,170,255,0.1)"; x.lineWidth = 1; x.beginPath(); x.arc(sx, sy, Math.hypot(cx - sx, cy - sy), 0, 6.283); x.stroke();  if (cy < -r * 3 || cy > H + r * 3) return;  if (name === "Earth") { const gl = x.createRadialGradient(cx, cy, r, cx, cy, r * 1.5); gl.addColorStop(0, "rgba(90,160,255,0.45)"); gl.addColorStop(1, "rgba(90,160,255,0)"); x.fillStyle = gl; x.fillRect(cx - r * 2, cy - r * 2, r * 4, r * 4); }  if (name === "Saturn") ring(cx, cy, r, true);  x.drawImage(sprite(name.toLowerCase()), cx - r, cy - r, r * 2, r * 2);  if (name === "Saturn") ring(cx, cy, r, false);  if (name === "Earth") x.drawImage(sprite("moon"), cx - r * 2.6, cy - r * 1.6, r * 0.55, r * 0.55);  x.fillStyle = "rgba(180,200,255,0.55)"; x.font = "12px system-ui,sans-serif"; x.fillText(name, cx - r - 14 - name.length * 6, cy + 4);});
  }
  function draw() {
    t += 0.002;
    x.clearRect(0, 0, W, H);
    x.drawImage(neb, 0, 0, W, H);
    x.drawImage(mws, 0, 0, W, H);
    const gx = W * 0.8, gy = H * 0.22 - scrollY * 0.03, S = Math.min(W, H) * 0.32, ct = Math.cos(-0.5), st = Math.sin(-0.5);const core = x.createRadialGradient(gx, gy, 0, gx, gy, S * 0.35); core.addColorStop(0, "rgba(255,235,200,0.55)"); core.addColorStop(1, "rgba(255,200,150,0)");x.fillStyle = core; x.fillRect(gx - S, gy - S, S * 2, S * 2);galaxy.forEach(p => {  const a = p.a + t * (1.1 - p.d), ux = Math.cos(a) * p.d * S, uy = Math.sin(a) * p.d * S * 0.4;  x.fillStyle = "hsla(" + (38 + p.d * 210) + ",85%," + (90 - p.d * 38) + "%," + p.k * 0.85 + ")";  x.fillRect(gx + ux * ct - uy * st, gy + ux * st + uy * ct, p.r * 1.5, p.r * 1.5);});layers.forEach(L => L.pts.forEach(s => {  s.p += s.s;  const yy = (((s.y - scrollY * L.speed * 0.3) % H) + H) % H, a = 0.4 + 0.6 * Math.pow(Math.sin(s.p), 2);  x.fillStyle = "rgba(" + s.col[0] + "," + s.col[1] + "," + s.col[2] + "," + a + ")";  x.beginPath(); x.arc(s.x, yy, s.r, 0, 6.283); x.fill();  if (s.r > 1.7) { x.strokeStyle = "rgba(" + s.col[0] + "," + s.col[1] + "," + s.col[2] + "," + a * 0.5 + ")"; x.lineWidth = 0.6; x.beginPath(); x.moveTo(s.x - s.r * 5, yy); x.lineTo(s.x + s.r * 5, yy); x.moveTo(s.x, yy - s.r * 5); x.lineTo(s.x, yy + s.r * 5); x.stroke(); }}));solar();if (!shoot && !reduce && Math.random() < 0.004) shoot = { x: rnd(W * 0.3, W), y: rnd(0, H * 0.4), life: 1 };if (shoot) {  x.strokeStyle = "rgba(200,220,255," + shoot.life + ")"; x.lineWidth = 1.5;  x.beginPath(); x.moveTo(shoot.x, shoot.y); x.lineTo(shoot.x + 70, shoot.y - 32); x.stroke();  shoot.x -= 12; shoot.y += 5.5; shoot.life -= 0.02;  if (shoot.life <= 0) shoot = null;}if (!reduce) requestAnimationFrame(draw);
  }
  addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(() => { init(); if (reduce) draw(); }, 250); });
  init(); draw();
})();
/* ---------- Official NASA photos: NASA Image and Video Library (images.nasa.gov) ---------- */
const IMG_KEYS = {
  "ranger-7": ["ranger 7", "ranger vii"], "surveyor-1": ["surveyor 1", "surveyor i", "surveyor"],
  "lunar-orbiter-1": ["lunar orbiter"], "apollo-11": ["apollo 11"], "apollo-17": ["apollo 17"],
  "lro": ["lro", "lunar reconnaissance"], "artemis-1": ["artemis"], "mariner-4": ["mariner 4", "mariner iv"],
  "viking-1": ["viking"], "sojourner": ["pathfinder", "sojourner"],
  "spirit-opportunity": ["spirit", "opportunity", "mars exploration rover"],
  "curiosity": ["curiosity"], "perseverance": ["perseverance", "ingenuity"]
};
const galleries = {};
const plain = s => new DOMParser().parseFromString(s || "", "text/html").body.textContent.trim();
const clip = (s, n) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, "") + "\u2026" : s);
const fmtDate = s => { const d = new Date(s); return isNaN(d) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); };
/* Try the sharpest version first and fall back step by step */
function setSrc(img, p, order) {
  let k = 0;
  img.onerror = () => { k++; if (k < order.length) img.src = p[order[k]]; else img.onerror = null; };
  img.src = p[order[0]];
}
function toPhoto(i, m) {
  if (!i.links || !i.links[0] || !i.data || !i.data[0]) return null;
  const x = i.data[0], thumb = i.links[0].href;
  return {
    id: x.nasa_id, title: x.title || m.name, desc: plain(x.description), date: x.date_created || "",
    by: x.photographer || x.secondary_creator || "", center: x.center || "", loc: x.location || "", kw: x.keywords || [],thumb, med: thumb.replace("~thumb.", "~medium."), large: thumb.replace("~thumb.", "~large.")
  };
}
const EXTRA_Q = { "surveyor-1": ["Surveyor I", "Surveyor lunar lander", "Surveyor spacecraft Moon"] };
function getGallery(m) {
  if (!galleries[m.id]) {
    const qs = Array.from(new Set([m.image_query, m.name, m.name + " NASA"].concat(EXTRA_Q[m.id] || []))), keys = IMG_KEYS[m.id] || [m.name.toLowerCase()];galleries[m.id] = Promise.all(qs.map(q => getJSON("https://images-api.nasa.gov/search?media_type=image&page_size=100&q=" + encodeURIComponent(q)).then(d => d.collection.items).catch(() => []))).then(lists => {  const seen = new Set(), rel = [], other = [];  lists.flat().forEach(i => {    const p = toPhoto(i, m);    if (!p || seen.has(p.id)) return;    seen.add(p.id);    (keys.some(k => (p.title + " " + p.desc).toLowerCase().includes(k)) ? rel : other).push(p);  });  return (rel.length >= 3 ? rel : rel.concat(other.slice(0, 12))).slice(0, 96);});
  }
  return galleries[m.id];
}
function loadInto(box, m, big) {
  getGallery(m).then(g => {
    const p = g[0];
    if (!p) return;
    const i = new Image();
    i.alt = p.title;
    i.onload = () => { box.textContent = ""; box.append(i); };
    setSrc(i, p, big ? ["large", "med", "thumb"] : ["med", "thumb"]);
  });
}
/* ---------- Lightbox ---------- */
const lb = el("div", "lightbox");
lb.hidden = true;
const lbImg = el("img"), lbCap = el("p", "lbcap"), lbSrc = el("a", "lbsrc", "View on the NASA website");
lbSrc.target = "_blank"; lbSrc.rel = "noopener";
let lbList = [], lbIdx = 0;
const lbShow = () => {
  const p = lbList[lbIdx];
  lb.classList.remove("zoomed");
  lbImg.alt = p.title;
  setSrc(lbImg, p, ["large", "med", "thumb"]);
  lbCap.textContent = p.title;
  lbSrc.href = "https://images.nasa.gov/details/" + encodeURIComponent(p.id);
};
const lbStep = d => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbShow(); };
const lbClose = () => { lb.hidden = true; };
const lbBtn = (cls, txt, fn) => { const b = el("button", "lbbtn " + cls, txt); b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
lb.append(lbBtn("lbclose", "\u2715", lbClose), lbBtn("lbprev", "\u2039", () => lbStep(-1)), lbImg,
          lbBtn("lbnext", "\u203A", () => lbStep(1)), lbCap, lbSrc);
lb.onclick = lbClose;
lbSrc.onclick = e => e.stopPropagation();
lbImg.onclick = e => { e.stopPropagation(); lb.classList.toggle("zoomed"); };
document.body.append(lb);
function openLightbox(list, i) { lbList = list; lbIdx = i; lbShow(); lb.hidden = false; }
addEventListener("keydown", e => {
  if (lb.hidden) return;
  if (e.key === "Escape") lbClose();
  if (e.key === "ArrowRight") lbStep(1);
  if (e.key === "ArrowLeft") lbStep(-1);
});
/* ---------- Detail-page panels ---------- */
function statsPanel(m) {
  const g = el("div", "stats");
  (m.stats || []).forEach(([k, v]) => {
    const d = el("div", "stat");
    d.append(el("span", "sk", k), el("strong", "", v));
    g.append(d);
  });
  return g;
}
function photoCard(m, p) {
  const b = el("button", "pcard"), box = el("div", "pimg"), body = el("div", "pbody"), i = new Image();
  i.loading = "lazy"; i.alt = p.title; setSrc(i, p, ["med", "thumb"]);
  box.append(i);
  body.append(el("strong", "", p.title), el("span", "pdef", clip(p.desc, 110) || "Official NASA photograph."));
  b.append(box, body);
  b.onclick = () => go("photo/" + m.id + "/" + encodeURIComponent(p.id));
  return b;
}
function galleryPanel(m) {
  const s = el("section", "panel"), grid = el("div", "gallery"), more = el("button", "btn", "Show more photos");
  const note = el("p", "muted small", "Loading official NASA photos...");
  s.append(el("h2", "", "Photo gallery"), note, grid);
  getGallery(m).then(g => {
    if (!g.length) { note.textContent = "Photos could not be loaded. Please check your internet connection."; return; }
    note.textContent = g.length + " official NASA photos. Tap one to open it with its full details.";
    let shown = 0;
    const next = () => { g.slice(shown, shown + 12).forEach(p => grid.append(photoCard(m, p))); shown += 12; more.hidden = shown >= g.length; };more.onclick = next;next();s.append(more);
  });
  return s;
}
async function photoPage(mid, pid) {
  const m = MISSIONS.find(x => x.id === mid);
  if (!m) throw new Error("unknown mission");
  const g = await getGallery(m);
  let k = g.findIndex(p => p.id === pid), p = g[k];
  if (!p) {
    const d = await getJSON("https://images-api.nasa.gov/search?nasa_id=" + encodeURIComponent(pid));
    p = toPhoto(d.collection.items[0], m);
    k = -1;
  }
  const back = el("button", "back", "\u2190 Back to the photo gallery");
  back.onclick = () => go("gallery/" + m.id);
  const fig = el("figure", "pfig"), img = new Image();
  img.alt = p.title; setSrc(img, p, ["large", "med", "thumb"]);
  img.onclick = () => openLightbox(k >= 0 ? g : [p], Math.max(k, 0));
  fig.append(img);
  const nav = el("div", "pnav");
  if (k >= 0 && g.length > 1) {
    const step = d => () => go("photo/" + m.id + "/" + encodeURIComponent(g[(k + d + g.length) % g.length].id));
    const pv = el("button", "btn", "\u2039 Previous photo"), nx = el("button", "btn", "Next photo \u203A");
    pv.onclick = step(-1); nx.onclick = step(1);
    nav.append(pv, nx);
  }
  const info = el("section", "panel"), dl = el("dl", "meta"), tags = el("div", "tags");
  [["Date (NASA record)", fmtDate(p.date)], ["Photographer", p.by], ["NASA center", p.center], ["Location", p.loc], ["Mission", m.name], ["NASA ID", p.id]].filter(r => r[1]).forEach(([a, v]) => dl.append(el("dt", "", a), el("dd", "", v)));
  p.kw.slice(0, 12).forEach(t => tags.append(el("span", "tag", t)));
  const about = el("p", "desc", p.desc || "NASA has not published a longer description for this photo.");
  const link = el("a", "btn lnk", "Open the original on the NASA website");
  link.href = "https://images.nasa.gov/details/" + encodeURIComponent(p.id); link.target = "_blank"; link.rel = "noopener";
  info.append(el("h2", "", p.title), about, el("h2", "", "Photo details"), dl, tags, link);
  app.replaceChildren(back, fig, nav, info);
  scrollTo(0, 0);
}
/* ---------- Views ---------- */
function card(m) {
  const c = el("article", "card");
  c.tabIndex = 0;
  const head = el("div", "card-head");
  const txt = el("div");
  txt.append(el("h3", "", m.name), el("span", "tag", m.target.toUpperCase() + " \u00B7 " + m.year));
  const thumb = el("div", "thumb", m.name.charAt(0));
  head.append(txt, thumb);
  c.append(head, el("p", "", m.summary));
  loadInto(thumb, m, false);
  const open = () => go(m.id);
  c.onclick = open;
  c.onkeydown = e => { if (e.key === "Enter") open(); };
  return c;
}
function list(title, missions, shuffle) {
  const items = missions.slice();
  if (shuffle) items.sort(() => Math.random() - 0.5);
  app.replaceChildren(el("h2", "", title));
  if (!items.length) { app.append(el("p", "muted", "Nothing found. Try another name.")); return; }
  const grid = el("div", "grid");
  items.forEach(m => grid.append(card(m)));
  app.append(grid);
}
function section(title, content) {
  const s = el("section", "panel");
  s.append(el("h2", "", title));
  if (Array.isArray(content)) {
    const ul = el("ul");
    content.forEach(t => ul.append(el("li", "", t)));
    s.append(ul);
  } else s.append(el("p", "", content));
  return s;
}
const panel = (title, ...nodes) => { const s = el("section", "panel"); s.append(el("h2", "", title), ...nodes); return s; };
const para = texts => { const d = el("div", "about"); texts.forEach(t => d.append(el("p", "", t))); return d; };
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = k => { try { localStorage.setItem(k, "1"); } catch (e) { /* storage unavailable */ } };
const unlocked = new Set();
function statusPills(m) {
  const d = el("div"), mk = (cls, txt) => { const b = el("button", "status " + cls, "Status: " + txt); b.onclick = () => go("status/" + m.id); d.append(b); };
  mk("s-" + m.st, STATUS_LABEL[m.st]);
  if (m.left && m.st === "completed") mk("s-left", STATUS_LABEL.left);
  return d;
}
function fateBlock(m) {
  const d = el("div", "about");
  fateList(m).forEach(([q, a]) => d.append(el("p", "fq", q), el("p", "", a)));
  return d;
}
function questionList(m) {
  const g = el("div", "qlist");
  questionsOf(m).forEach(([q, a], i) => {
    const b = el("button", "qitem");
    b.append(el("strong", "", q), el("p", "qans", a), el("span", "qmore", "Tap to open the full explanation \u203A"));
    b.onclick = () => go("q/" + m.id + "/" + i);
    g.append(b);
  });
  return g;
}
function askPanel(m) {
  const log = el("div", "chat"), chips = el("div", "chips"), row = el("div", "ask"), inp = el("input"), btn = el("button", "btn", "Ask");
  inp.placeholder = "Ask Aurex 2.0 about " + m.name + "..."; inp.setAttribute("aria-label", "Ask a question about " + m.name);
  const say = (t, who) => { log.append(el("div", "bub " + who, t)); log.scrollTop = log.scrollHeight; };
  const send = text => { const t = text.trim(); if (!t) return; say(t, "me"); inp.value = ""; setTimeout(() => say(answer(m, t), "ai"), 350); };
  ["Why was it made?", "Who built it?", "What instruments did it carry?", "What did it learn?", "Is it still working?"].forEach(c => {const b = el("button", "chip", c); b.onclick = () => send(c); chips.append(b);
  });
  btn.onclick = () => send(inp.value);
  inp.addEventListener("keydown", e => { if (e.key === "Enter") send(inp.value); });
  row.append(inp, btn);
  say("Hi, I am Aurex 2.0. What would you like to know about " + m.name + "? I can tell you everything about this mission.", "ai");
  return panel("Aurex 2.0: ask anything about " + m.name, chips, log, row);
}
function quizCard(m) {
  const b = el("button", "qarea"), t = el("span");
  t.append(el("strong", "", "Quiz Area"), el("span", "", "Test what you learned about " + m.name + ". Two levels: easy first, then hard."));
  b.append(el("span", "qi", "\uD83E\uDDE0"), t);
  b.onclick = () => go("quiz/" + m.id);
  return b;
}
const iconBtn = (cls, icon, title, sub, hash) => {
  const b = el("button", "action " + cls), t = el("span");
  t.append(el("strong", "", title), el("small", "", sub));
  b.append(el("span", "aico", icon), t);
  b.onclick = () => go(hash);
  return b;
};
async function detail(id) {
  const m = MISSIONS.find(x => x.id === id);
  if (!m) throw new Error("not found");
  const back = el("button", "back", "\u2190 Back");
  back.onclick = () => go(m.target);
  const head = el("div", "dhead"), left = el("div"), hero = el("div", "hero", m.name.charAt(0));
  left.append(el("h1", "", m.name), el("span", "tag", m.target.toUpperCase() + " \u00B7 " + m.year), statusPills(m),
    iconBtn("a-game", "\uD83C\uDFAE", "Play the 3D game of this mission", "Explore the hardware as an astronaut", "game/" + m.id),iconBtn("a-gal", "\uD83D\uDDBC\uFE0F", "Photo gallery", "Browse official NASA photographs", "gallery/" + m.id));
  head.append(left, hero);
  loadInto(hero, m, true);
  app.replaceChildren(back, head, statsPanel(m),
    panel("Detailed explanation of " + m.name, para([m.summary, m.why, m.outcome]), el("h3", "", "What happened to the hardware?"), fateBlock(m),  el("h3", "", "Tap a question to explore it"), questionList(m)),askPanel(m), quizCard(m));
  scrollTo(0, 0);
}
function questionPage(mid, i) {
  const m = MISSIONS.find(x => x.id === mid), qa = m && questionsOf(m)[i];
  if (!qa) throw new Error("question");
  const back = el("button", "back", "\u2190 Back to " + m.name);
  back.onclick = () => go(m.id);
  const people = el("div", "chips"), link = el("a", "btn lnk", "Search official NASA records for " + m.name);
  link.href = "https://images.nasa.gov/search?q=" + encodeURIComponent(m.name); link.target = "_blank"; link.rel = "noopener";
  (PEOPLE_OF[m.id] || []).forEach(pid => { const b = el("button", "chip", PEOPLE[pid].name); b.onclick = () => go("person/" + pid); people.append(b); });
  const parts = [back, panel(qa[0], para([qa[1]]), statusPills(m)), statsPanel(m)];
  if ((m.facts || []).length) parts.push(panel("Related facts", para(m.facts)));
  if (people.children.length) parts.push(panel("People behind it (tap a name)", people));
  parts.push(panel("More questions about " + m.name, questionList(m)), panel("Official sources", link), askPanel(m));
  app.replaceChildren(...parts);
  scrollTo(0, 0);
}
function statusPage(mid) {
  const m = MISSIONS.find(x => x.id === mid);
  if (!m) throw new Error("status");
  const heads = { active: "What it is doing for humanity now", completed: "Its last report and plan", inactive: "Why it stopped and when", crashed: "What happened", left: "Why it was left", uncertain: "What is uncertain" };
  const intro = { active: "Active: it is still working and NASA can still control it.", completed: "Completed: it finished its planned mission.", inactive: "Inactive: it no longer works or sends data.", crashed: "Crashed: it ended in an impact.", left: "Intentionally left: it was left behind on purpose.", uncertain: "Uncertain: NASA is not sure of its condition." };
  const back = el("button", "back", "\u2190 Back to " + m.name);
  back.onclick = () => go(m.id);
  app.replaceChildren(back,
    panel("Status of " + m.name + ": " + STATUS_LABEL[m.st], el("p", "", intro[m.st]), el("h3", "", heads[m.st]), el("p", "", m.now), el("h3", "", "Where it is now"), el("p", "", m.where)),panel("Hardware fate: your questions answered", fateBlock(m)));
  scrollTo(0, 0);
}
function personPage(pid) {
  const p = PEOPLE[pid];
  if (!p) throw new Error("person");
  const back = el("button", "back", "\u2190 Back");
  back.onclick = () => history.back();
  const fmt = s => fmtDate(s + "T12:00:00"), dl = el("dl", "meta"), rel = el("div", "chips");
  [["Role", p.role], ["Born", fmt(p.born)], ["Died", p.died ? fmt(p.died) : ""], [p.died ? "Age at death" : "Age today", ageAt(p.born, p.died) + " years"]].filter(r => r[1]).forEach(([a, v]) => dl.append(el("dt", "", a), el("dd", "", v)));
  Object.keys(PEOPLE_OF).filter(k => PEOPLE_OF[k].includes(pid)).forEach(k => {
    const b = el("button", "chip", MISSIONS.find(x => x.id === k).name); b.onclick = () => go(k); rel.append(b);
  });
  app.replaceChildren(back, panel(p.name, el("p", "", p.bio), dl), panel("Related missions", rel));
  scrollTo(0, 0);
}
function quizPage(mid) {
  const m = MISSIONS.find(x => x.id === mid);
  if (!m) throw new Error("quiz");
  const qz = makeQuiz(m), key = "aurex-l1-" + m.id, box = el("section", "panel"), isOpen = () => unlocked.has(key) || lsGet(key);
  const back = el("button", "back", "\u2190 Back to " + m.name);
  back.onclick = () => go(m.id);
  const menu = () => {
    const b1 = el("button", "btn", "Start Level 1: Easy (" + qz[1].length + " questions)");
    const b2 = el("button", "btn", isOpen() ? "Start Level 2: Hard (" + qz[2].length + " questions)" : "Level 2: Hard (locked: score " + PASS_POINTS + " points in Level 1)");b2.disabled = !isOpen();b1.onclick = () => run(1); b2.onclick = () => run(2);box.replaceChildren(el("h2", "", "Quiz Area: " + m.name), el("p", "", "Each correct answer gives 10 points. Score at least " + PASS_POINTS + " points in Level 1 to unlock Level 2, which has completely different, tougher questions."), b1, b2);
  };
  const run = lv => {
    const list = shuf(qz[lv]); let i = 0, right = 0;
    const done = () => {
      const pts = right * 10, ok = pts >= PASS_POINTS;
      if (ok && lv === 1) { unlocked.add(key); lsSet(key); }
      const nxt = el("button", "btn", ok && lv === 1 ? "Move to Level 2" : "Try again"), mn = el("button", "btn", "Back to quiz menu");  nxt.onclick = () => run(ok && lv === 1 ? 2 : lv); mn.onclick = menu;  box.replaceChildren(el("h2", "", ok ? (lv === 1 ? "Level 1 passed!" : "Level 2 passed. You are a mission expert!") : "Not quite yet"),    el("p", "", "You scored " + pts + " points (" + right + " of " + list.length + " correct). " + (ok ? (lv === 1 ? "That is above the " + PASS_POINTS + " points needed, so you are now eligible for Level 2." : "") : "You need " + PASS_POINTS + " points to pass this level.")), nxt, mn);};const step = () => {  if (i >= list.length) return done();  const q = list[i];  box.replaceChildren(el("p", "score", "Level " + lv + " \u00B7 Question " + (i + 1) + " of " + list.length + " \u00B7 Points: " + right * 10), el("h3", "", q.q));  q.options.forEach((o, k) => {    const b = el("button", "opt", o);    b.onclick = () => {      const all = box.querySelectorAll(".opt");      all.forEach((z, j) => { z.disabled = true; z.classList.add(j === q.answer ? "ok" : "bad"); z.append(el("span", "ex", q.ex[j])); });      b.classList.add("picked");      if (k === q.answer) right++;      const nx = el("button", "btn", i + 1 < list.length ? "Next question" : "See result");      nx.onclick = () => { i++; step(); };      box.append(nx);    };    box.append(b);  });};step();
  };
  menu();
  app.replaceChildren(back, box);
  scrollTo(0, 0);
}
/* ---------- Photo gallery page ---------- */
function galleryPage(mid) {
  const m = MISSIONS.find(x => x.id === mid);
  if (!m) throw new Error("gallery");
  const back = el("button", "back", "\u2190 Back to " + m.name);
  back.onclick = () => go(m.id);
  app.replaceChildren(back, el("h2", "", "Photo gallery: " + m.name), galleryPanel(m));
  scrollTo(0, 0);
}
/* ---------- 3D exploration game (Three.js, loaded on demand) ---------- */
let gameStop = null;
const loadThree = () => window.THREE ? Promise.resolve() : new Promise((ok, no) => {
  const s = document.createElement("script");
  s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"; s.onload = ok; s.onerror = no; document.head.append(s);
});
const VACUUM = ["ranger-7", "lunar-orbiter-1", "lro", "mariner-4", "artemis-1"];
const WORLDS = {
  moon: { g: 1.62, ground: [138, 138, 144], sky: 0x000000, fog: 0, haze: 0, sun: 0xffffff, sunI: 2.6, hemi: [0x8890a8, 0x1c1c20, 0.35], crat: 1 },
  mars: { g: 3.71, ground: [181, 89, 58], sky: 0x120805, fog: 0.012, haze: 0x2a140c, sun: 0xffe0bd, sunI: 2.0, hemi: [0xd89070, 0x3a1810, 0.55], crat: 0.35 }
};
function buildCraft(id) {
  const T = THREE, g = new T.Group();
  let tgt = g;
  const M = (c, mt, r) => new T.MeshStandardMaterial({ color: c, metalness: mt, roughness: r });
  const foil = M(0xd9a441, 0.9, 0.35), white = M(0xe9e9ee, 0.2, 0.6), grey = M(0x808590, 0.7, 0.4), dark = M(0x161b2b, 0.3, 0.5), blue = M(0x1c2f78, 0.6, 0.3), tire = M(0x2a2a2e, 0.1, 0.9), red = M(0xb22234, 0.1, 0.8);
  const B = (w, h, d) => new T.BoxGeometry(w, h, d), C = (a, b, h, s = 20) => new T.CylinderGeometry(a, b, h, s);
  const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const o = new T.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = o.receiveShadow = true; tgt.add(o); return o; };
  const leg = (a, r0, r1, h, rad) => {
    const L = Math.hypot(r1 - r0, h), t = Math.atan2(r1 - r0, h), rc = (r0 + r1) / 2;
    add(C(rad, rad, L, 8), grey, Math.cos(a) * rc, h / 2, Math.sin(a) * rc, -Math.sin(a) * t, 0, Math.cos(a) * t);
    add(C(0.38, 0.38, 0.07, 20), foil, Math.cos(a) * r1, 0.04, Math.sin(a) * r1);
  };
  const rover = (s, arm, ox, oz) => {
    const old = tgt; tgt = new T.Group(); tgt.position.set(ox, 0, oz); old.add(tgt);
    add(B(1.6 * s, 0.5 * s, 2.4 * s), white, 0, 1.0 * s, 0); add(B(1.5 * s, 0.1 * s, 1.2 * s), blue, 0, 1.3 * s, -0.3 * s);add(C(0.06 * s, 0.06 * s, 1.8 * s, 8), grey, 0.5 * s, 2.0 * s, 0.8 * s); add(B(0.5 * s, 0.3 * s, 0.3 * s), dark, 0.5 * s, 2.95 * s, 0.8 * s);for (const x of [-1, 1]) for (const z of [-1, 0, 1]) add(C(0.35 * s, 0.35 * s, 0.3 * s, 18), tire, x * 0.95 * s, 0.35 * s, z * 0.9 * s, 0, 0, Math.PI / 2);if (arm) add(C(0.05 * s, 0.05 * s, 1.4 * s, 8), grey, -0.4 * s, 1.0 * s, 1.7 * s, Math.PI / 2.4, 0, 0);tgt = old;
  };
  const probe = (s, panels) => {
    add(C(0.7 * s, 0.7 * s, 0.5 * s, 8), grey, 0, 1.5, 0); add(C(0.9 * s, 0.1 * s, 0.25 * s, 32), white, 0, 1.5 + 0.45 * s, 0); add(C(0.05 * s, 0.05 * s, 0.6 * s, 8), grey, 0, 1.5 + 0.2 * s, 0);for (let i = 0; i < panels; i++) { const a = (i / panels) * 6.283 + (panels === 2 ? 1.5708 : 0.785); add(B(1.9 * s, 0.04 * s, 0.8 * s), blue, Math.cos(a) * 1.55 * s, 1.5, Math.sin(a) * 1.55 * s, 0, -a, 0); }
  };
  const lm = () => {
    add(C(1.5, 1.5, 0.9, 8), foil, 0, 1.75, 0); add(B(1.8, 1.4, 1.8), grey, 0, 2.9, 0); add(C(0.55, 0.55, 0.9, 12), white, 0, 3.9, 0.2); add(B(0.5, 0.6, 0.04), dark, 0, 3.0, 0.92);for (let i = 0; i < 4; i++) leg(i * 1.5708 + 0.785, 1.1, 2.4, 1.8, 0.05);add(B(0.45, 1.5, 0.05), grey, 0, 0.95, 1.25, 0.25, 0, 0);
  };
  const lander = (body, s) => { for (let i = 0; i < 3; i++) leg(i * 2.094, 0.5 * s, 1.5 * s, 1.3, 0.04); add(body, foil, 0, 1.6, 0); add(C(0.04, 0.04, 1.4, 8), grey, 0, 2.7, 0); add(B(1.1, 0.04, 0.8), blue, 0, 3.4, 0, 0.35, 0, 0); };
  const flag = (x, z) => { add(C(0.02, 0.02, 2.2, 8), grey, x, 1.1, z); add(B(1.1, 0.7, 0.02), red, x + 0.55, 1.8, z); };
  const build = {
    "ranger-7": () => probe(1, 2), "lunar-orbiter-1": () => probe(1.1, 4), "mariner-4": () => probe(1, 4),
    "lro": () => { probe(1.2, 2); add(C(0.15, 0.15, 2.2, 12), dark, 0, 1.5, 1.1, 1.5708, 0, 0); },
    "artemis-1": () => { add(C(0.6, 2.4, 1.8, 32), white, 0, 3.4, 0); add(C(2.4, 2.4, 2.2, 32), grey, 0, 1.4, 0); for (let i = 0; i < 4; i++) { const a = i * 1.5708 + 0.785; add(B(4.4, 0.05, 1.0), blue, Math.cos(a) * 3.6, 1.4, Math.sin(a) * 3.6, 0, -a, 0); } },"surveyor-1": () => lander(C(0.7, 0.7, 0.9, 6), 1),"viking-1": () => { lander(C(1.3, 1.3, 0.7, 6), 1.8); add(C(0.5, 0.05, 0.15, 24), white, 0.9, 2.2, -0.6, 0.5, 0, 0); },"apollo-11": () => { lm(); flag(5, 3); }, "apollo-17": () => { lm(); rover(1, false, 6, 2); },"sojourner": () => { add(C(0.9, 0.9, 0.5, 3), foil, 0, 0.3, 0); for (let i = 0; i < 3; i++) { const a = i * 2.094; add(B(1.5, 0.05, 1.2), white, Math.cos(a) * 1.2, 0.1, Math.sin(a) * 1.2, 0, -a, 0); } add(C(0.03, 0.03, 1.2, 8), grey, 0, 1.2, 0); rover(0.35, false, 3, 0); },"spirit-opportunity": () => rover(1, false, 0, 0), "curiosity": () => rover(1.7, true, 0, 0),"perseverance": () => { rover(1.9, true, 0, 0); add(B(0.25, 0.3, 0.25), white, 4, 1.0, 3); add(C(0.7, 0.7, 0.02, 24), dark, 4, 1.25, 3); }
  };
  (build[id] || build["spirit-opportunity"])();
  return g;
}
function startGame(box, m) {
  const T = THREE, isVac = VACUUM.includes(m.id), touch = navigator.maxTouchPoints > 0 || innerWidth < 700;
  let worldKey = m.target, quality = touch ? 0 : 2, running = true, viewer = false, yaw = 0, pitch = 0.35, dist = 6, vd = 9, phase = 0, vy = 0, onGround = true, raf, drag = null, clock = 0, last = performance.now(), wg = new T.Group();
  const canvas = el("canvas"), keys = {}, joy = { x: 0, y: 0 }, pos = new T.Vector3(0, 0, 8), craftT = new T.Vector3(0, isVac ? 1.6 : 1.8, 0);
  const renderer = new T.WebGLRenderer({ canvas, antialias: !touch });
  renderer.outputEncoding = T.sRGBEncoding; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.shadowMap.type = T.PCFSoftShadowMap;
  const scene = new T.Scene(), cam = new T.PerspectiveCamera(55, 1, 0.1, 1500), hemi = new T.HemisphereLight(0xffffff, 0x222222, 0.5), sun = new T.DirectionalLight(0xffffff, 2);
  sun.castShadow = true; sun.shadow.camera.left = sun.shadow.camera.bottom = -26; sun.shadow.camera.right = sun.shadow.camera.top = 26; sun.shadow.camera.far = 120; sun.shadow.bias = -0.0005;
  scene.add(hemi, sun, sun.target, wg);
  const sp = new Float32Array(2400);
  for (let i = 0; i < 800; i++) { const a = Math.random() * 6.283, z = Math.random() * 2 - 1, r = Math.sqrt(1 - z * z); sp.set([r * Math.cos(a) * 700, (isVac ? z : Math.abs(z)) * 700, r * Math.sin(a) * 700], i * 3); }
  const sg = new T.BufferGeometry(); sg.setAttribute("position", new T.BufferAttribute(sp, 3));
  scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffffff, size: 1.8, sizeAttenuation: false, fog: false })));
  const craters = [[-5, 4, 3.4, 0.8], [6, -5, 2.6, 0.55], [-4, -7, 2, 0.4], [7, 6, 3, 0.65]];
  const gh = (x, z) => {
    if (isVac) return 0;
    const r = Math.max(Math.abs(x), Math.abs(z)), W = WORLDS[worldKey];
    let h = (fbm(x * 0.15 + 20, 1, z * 0.15) - 0.5) * 0.6;
    craters.forEach(([cx, cz, R, d]) => { const t = Math.hypot(x - cx, z - cz) / R; if (t < 1.25) h += W.crat * d * (t < 1 ? -(1 - t * t) : 0.25 * (1 - (t - 1) * 4)); });return h + Math.min(5, 0.05 * Math.pow(Math.max(0, r - 10), 1.3));
  };
  const craft = buildCraft(m.id); craft.position.y = gh(0, 0); scene.add(craft);
  const label = m.name + " (procedural 3D model)";
  const astro = new T.Group(), L = [], A = [];
  (function () {
    const Mt = (c, mt, r) => new T.MeshStandardMaterial({ color: c, metalness: mt, roughness: r }), suit = Mt(0xf2f2f4, 0.1, 0.7), gold = Mt(0xd8a640, 1, 0.12), gm = Mt(0x777b84, 0.5, 0.5), org = Mt(0xe8651a, 0.2, 0.7);const part = (geo, mat, x, y, z, par) => { const o = new T.Mesh(geo, mat); o.position.set(x, y, z); o.castShadow = true; (par || astro).add(o); return o; };part(new T.BoxGeometry(0.56, 0.68, 0.34), suit, 0, 1.18, 0); part(new T.BoxGeometry(0.46, 0.6, 0.22), gm, 0, 1.2, -0.27); part(new T.BoxGeometry(0.2, 0.16, 0.04), org, 0, 1.3, 0.18);part(new T.SphereGeometry(0.27, 24, 16), suit, 0, 1.68, 0); part(new T.SphereGeometry(0.22, 24, 16), gold, 0, 1.68, 0.1).scale.set(1.1, 0.85, 0.9);[-1, 1].forEach(s => {  const arm = new T.Group(); arm.position.set(s * 0.38, 1.45, 0); astro.add(arm);  part(new T.CylinderGeometry(0.1, 0.09, 0.62, 12), suit, 0, -0.28, 0, arm); part(new T.SphereGeometry(0.1, 12, 8), gm, 0, -0.62, 0, arm); A.push(arm);  const lg = new T.Group(); lg.position.set(s * 0.15, 0.85, 0); astro.add(lg);  part(new T.CylinderGeometry(0.13, 0.11, 0.7, 12), suit, 0, -0.35, 0, lg); part(new T.BoxGeometry(0.2, 0.12, 0.34), gm, 0, -0.78, 0.05, lg); L.push(lg);});
  })();
  astro.scale.setScalar(0.93); astro.rotation.y = Math.PI; scene.add(astro);
  function build() {
    scene.remove(wg); wg.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    wg = new T.Group(); scene.add(wg);
    const W = WORLDS[worldKey], seg = [70, 120, 180][quality], bodyCol = worldKey === "moon" ? 0x9a9aa0 : 0xc4623f;
    scene.background = new T.Color(W.sky); scene.fog = W.fog ? new T.FogExp2(W.haze, W.fog) : null;
    hemi.color.setHex(W.hemi[0]); hemi.groundColor.setHex(W.hemi[1]); hemi.intensity = W.hemi[2]; sun.color.setHex(W.sun); sun.intensity = W.sunI;if (isVac) {  const grid = new T.GridHelper(20, 20, 0x3a4a8a, 0x1c2548); grid.position.y = 0.01; wg.add(grid);  [[-10, -10], [10, -10], [-10, 10], [10, 10]].forEach(([x, z]) => { const b = new T.Mesh(new T.SphereGeometry(0.15, 12, 8), new T.MeshBasicMaterial({ color: 0x66aaff })); b.position.set(x, 0.3, z); wg.add(b); });  const p = new T.Mesh(new T.SphereGeometry(90, 48, 32), new T.MeshStandardMaterial({ color: bodyCol, roughness: 1 })); p.position.set(-70, -95, -220); wg.add(p);  return;}const geo = new T.PlaneGeometry(260, 260, seg, seg); geo.rotateX(-Math.PI / 2);const ps = geo.attributes.position, col = new Float32Array(ps.count * 3);for (let i = 0; i < ps.count; i++) { const x = ps.getX(i), z = ps.getZ(i), n = 0.78 + 0.35 * fbm(x * 0.4, 2, z * 0.4); ps.setY(i, gh(x, z)); col[i * 3] = W.ground[0] / 255 * n; col[i * 3 + 1] = W.ground[1] / 255 * n; col[i * 3 + 2] = W.ground[2] / 255 * n; }geo.setAttribute("color", new T.BufferAttribute(col, 3)); geo.computeVertexNormals();const ground = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 })); ground.receiveShadow = true; wg.add(ground);const ring = new T.Mesh(new T.RingGeometry(130, 800, 48), new T.MeshStandardMaterial({ color: new T.Color(W.ground[0] / 330, W.ground[1] / 330, W.ground[2] / 330), roughness: 1 })); ring.rotation.x = -Math.PI / 2; ring.position.y = 4.95; wg.add(ring);for (let i = 0; i < 80; i++) {  const x = (Math.random() - 0.5) * 70, z = (Math.random() - 0.5) * 70; if (Math.hypot(x, z) < 4.8) continue;  const s = 0.15 + Math.random() * Math.random() * 1.1, r = new T.Mesh(new T.DodecahedronGeometry(s, 0), new T.MeshStandardMaterial({ color: new T.Color(W.ground[0] / 400, W.ground[1] / 400, W.ground[2] / 400), roughness: 1, flatShading: true }));  r.position.set(x, gh(x, z) + s * 0.3, z); r.rotation.set(Math.random() * 3, Math.random() * 3, 0); r.scale.y = 0.6 + Math.random() * 0.4; r.castShadow = r.receiveShadow = true; wg.add(r);}for (let i = 0; i < 16; i++) {  const a = i / 16 * 6.283 + Math.random() * 0.3, d = 150 + Math.random() * 70, h = 18 + Math.random() * 38;  const mt = new T.Mesh(new T.ConeGeometry(h * 1.4, h, 6 + (i % 3)), new T.MeshStandardMaterial({ color: new T.Color(bodyCol).multiplyScalar(0.6), roughness: 1, flatShading: true })); mt.position.set(Math.cos(a) * d, 5 + h / 2 - 1, Math.sin(a) * d); wg.add(mt);}if (worldKey === "moon") { const e = new T.Mesh(new T.SphereGeometry(14, 32, 20), new T.MeshBasicMaterial({ color: 0x4a86e8 })); e.position.set(-120, 90, -260); wg.add(e); }
  }
  function resize() { const w = box.clientWidth, h = box.clientHeight || 400; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
  function applyQuality() {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, [1, 1.5, 2][quality])); renderer.shadowMap.enabled = quality > 0; sun.castShadow = quality > 0;const s = [512, 1024, 2048][quality]; sun.shadow.mapSize.set(s, s); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }scene.traverse(o => { if (o.material) o.material.needsUpdate = true; }); resize();
  }
  const zoom = d => { if (viewer) vd = Math.max(3, Math.min(30, vd + d)); else dist = Math.max(2.5, Math.min(14, dist + d)); };
  /* interface */
  const hud = el("div", "ghud"), worldSel = el("select"), qSel = el("select"), fsBtn = el("button", "", "Fullscreen"), zi = el("button", "", "+"), zo = el("button", "", "\u2212"), exitBtn = el("button", "", "Exit model view");
  [["mars", "Mars"], ["moon", "Moon"]].forEach(([v, t]) => { const o = el("option", "", t); o.value = v; worldSel.append(o); });
  ["Low quality", "Medium quality", "High quality"].forEach((t, i) => { const o = el("option", "", t); o.value = i; qSel.append(o); });
  worldSel.value = worldKey; qSel.value = quality; exitBtn.hidden = true;
  worldSel.onchange = () => { worldKey = worldSel.value; build(); };
  qSel.onchange = () => { quality = +qSel.value; applyQuality(); build(); };
  fsBtn.onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else if (box.requestFullscreen) box.requestFullscreen(); };
  zi.onclick = () => zoom(-1); zo.onclick = () => zoom(1);
  exitBtn.onclick = () => { viewer = false; astro.visible = true; exitBtn.hidden = true; };
  hud.append(worldSel, qSel, fsBtn, zi, zo, exitBtn);
  const prompt = el("div", "gprompt", "Press E or tap Inspect to read about " + m.name), inspect = el("button", "gbtn ginspect", "Inspect"), jump = el("button", "gbtn gjump", "Jump");
  const joyEl = el("div", "joy"), knob = el("div", "knob"), info = el("div", "ginfo");
  prompt.hidden = inspect.hidden = info.hidden = true; joyEl.append(knob);
  const setJoy = e => { const r = joyEl.getBoundingClientRect(), R = r.width / 2; let x = e.clientX - (r.left + R), y = e.clientY - (r.top + R); const d = Math.hypot(x, y); if (d > R) { x *= R / d; y *= R / d; } joy.x = x / R; joy.y = y / R; knob.style.transform = "translate(" + x + "px," + y + "px)"; };
  const endJoy = () => { joyEl.dataset.on = ""; joy.x = joy.y = 0; knob.style.transform = ""; };
  joyEl.addEventListener("pointerdown", e => { joyEl.setPointerCapture(e.pointerId); joyEl.dataset.on = "1"; setJoy(e); });
  joyEl.addEventListener("pointermove", e => { if (joyEl.dataset.on) setJoy(e); });
  joyEl.addEventListener("pointerup", endJoy); joyEl.addEventListener("pointercancel", endJoy);
  jump.addEventListener("pointerdown", () => { keys[" "] = true; }); jump.addEventListener("pointerup", () => { keys[" "] = false; });
  function openInfo() {
    const f = (t, v) => { const d = el("p"); d.append(el("strong", "", t + ": "), document.createTextNode(v)); return d; }, imgs = el("div");const v = el("button", "btn", "View the 3D model close up"), c = el("button", "btn", "Close");info.replaceChildren(el("h2", "", m.name), f("Mission", m.name), f("Spacecraft / equipment", label), f("Launch year", String(m.year)), f("Mission objective", m.why),  f("Historical significance", m.matter + " " + m.legacy), f("Scientific achievements", m.answered.join(" ")), el("strong", "", "NASA images"), imgs, v, c);getGallery(m).then(g => g.slice(0, 4).forEach(p => { const i = new Image(); i.alt = p.title; setSrc(i, p, ["med", "thumb"]); imgs.append(i); }));v.onclick = () => { info.hidden = true; viewer = true; astro.visible = false; exitBtn.hidden = false; };c.onclick = () => { info.hidden = true; };info.hidden = false;
  }
  inspect.onclick = openInfo;
  box.replaceChildren(canvas, hud, prompt, inspect, jump, joyEl, info);
  const down = e => { const k = e.key.toLowerCase(); keys[k] = true; if (k === "e" && !prompt.hidden) openInfo(); if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) e.preventDefault(); };
  const up = e => { keys[e.key.toLowerCase()] = false; };
  addEventListener("keydown", down); addEventListener("keyup", up); addEventListener("resize", resize); document.addEventListener("fullscreenchange", resize);
  canvas.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", e => { if (!drag) return; yaw -= (e.clientX - drag.x) * 0.006; pitch = Math.max(-0.1, Math.min(1.25, pitch + (e.clientY - drag.y) * 0.005)); drag = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener("pointerup", () => { drag = null; });
  canvas.addEventListener("wheel", e => { e.preventDefault(); zoom(e.deltaY * 0.01); }, { passive: false });
  function update(dt) {
    const W = WORLDS[worldKey];
    const ix = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + joy.x, iz = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0) - joy.y;const len = Math.hypot(ix, iz), moving = !viewer && len > 0.08;if (moving) {  const fx = -Math.sin(yaw), fz = -Math.cos(yaw), dx = (fx * iz - fz * ix) / len, dz = (fz * iz + fx * ix) / len, sp = 2.4 * (keys.shift ? 1.9 : 1) * Math.min(1, len);  pos.x += dx * sp * dt; pos.z += dz * sp * dt; phase += dt * sp * 2.6;  let d = Math.atan2(dx, dz) - astro.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); astro.rotation.y += d * Math.min(1, dt * 9);}["x", "z"].forEach(a => { const o = Math.abs(pos[a]) - 9; if (o > 0) pos[a] -= Math.sign(pos[a]) * o * Math.min(1, dt * 3); pos[a] = Math.max(-10, Math.min(10, pos[a])); });const gy = gh(pos.x, pos.z);if (onGround && keys[" "] && !viewer) { vy = Math.sqrt(2 * W.g); onGround = false; }vy -= W.g * dt; pos.y += vy * dt;if (pos.y <= gy) { pos.y = gy; vy = 0; onGround = true; } else onGround = false;const sw = moving && onGround ? Math.sin(phase) * 0.7 : 0;L[0].rotation.x = sw; L[1].rotation.x = -sw; A[0].rotation.x = -sw * 0.8 + Math.sin(clock * 1.5) * 0.04; A[1].rotation.x = sw * 0.8 - Math.sin(clock * 1.5) * 0.04;astro.position.set(pos.x, pos.y + (moving && onGround ? Math.abs(Math.cos(phase)) * 0.06 : Math.sin(clock * 1.6) * 0.008), pos.z);const near = !viewer && Math.hypot(pos.x, pos.z) < (isVac ? 8 : 6.5);prompt.hidden = !near || !info.hidden; inspect.hidden = !near;if (viewer && !drag) yaw += dt * 0.3;const tgt = viewer ? craftT : new T.Vector3(pos.x, pos.y + 1.4, pos.z), d = viewer ? vd : dist;const want = new T.Vector3(tgt.x + Math.sin(yaw) * Math.cos(pitch) * d, tgt.y + Math.sin(pitch) * d, tgt.z + Math.cos(yaw) * Math.cos(pitch) * d);if (!isVac) want.y = Math.max(want.y, gh(want.x, want.z) + 0.4);cam.position.lerp(want, Math.min(1, dt * 7)); cam.lookAt(tgt);sun.position.set(pos.x - 18, pos.y + 14, pos.z + 10); sun.target.position.copy(pos);
  }
  const loop = now => { if (!running) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt; update(dt); renderer.render(scene, cam); raf = requestAnimationFrame(loop); };
  build(); applyQuality(); cam.position.set(0, 3, 14); raf = requestAnimationFrame(loop);
  return () => { running = false; cancelAnimationFrame(raf); removeEventListener("keydown", down); removeEventListener("keyup", up); removeEventListener("resize", resize); document.removeEventListener("fullscreenchange", resize); renderer.dispose(); };
}
async function gamePage(mid) {
  const m = MISSIONS.find(x => x.id === mid);
  if (!m) throw new Error("game");
  const back = el("button", "back", "\u2190 Back to " + m.name);
  back.onclick = () => go(m.id);
  const box = el("div", "gamebox"), note = el("p", "muted small", "Loading the 3D engine...");
  const how = el("p", "small", "Move with W A S D or the arrow keys, or the on-screen joystick. Drag to turn the camera, scroll or use + and \u2212 to zoom, press Space to jump and E to inspect. The playable zone is exactly 20 \u00D7 20 meters. " + (VACUUM.includes(m.id) ? "This hardware never landed, so you explore it floating in the vacuum of space." : "Gravity matches the world you choose: Mars 3.71 m/s\u00B2, Moon 1.62 m/s\u00B2."));
  app.replaceChildren(back, panel("Explore " + m.name + " in 3D", how, note, box));
  scrollTo(0, 0);
  try { await loadThree(); } catch (e) { note.textContent = "The 3D engine could not be loaded. Please check your internet connection and try again."; return; }
  if (location.hash.indexOf(mid) < 0) return;
  note.textContent = "This is a detailed procedural model made from NASA mission images. An official NASA 3D model was not loaded.";
  gameStop = startGame(box, m);
}
/* ---------- Routing and controls ---------- */
const go = h => { if (location.hash === "#" + h) route(); else location.hash = h; };
async function route() {
  const h = decodeURIComponent(location.hash.replace(/^#/, ""));
  if (gameStop) { gameStop(); gameStop = null; }
  document.body.classList.toggle("inside", !(h === "" || h === "home" || h === "moon" || h === "mars"));
  try {
    if (h.startsWith("q/")) { const p = h.split("/"); return questionPage(p[1], +p[2]); }
    if (h.startsWith("person/")) return personPage(h.split("/")[1]);
    if (h.startsWith("game/")) return await gamePage(h.split("/")[1]);
    if (h.startsWith("gallery/")) return galleryPage(h.split("/")[1]);
    if (h.startsWith("status/")) return statusPage(h.split("/")[1]);
    if (h.startsWith("quiz/")) return quizPage(h.split("/")[1]);
    if (h.startsWith("photo/")) { const parts = h.split("/"); return await photoPage(parts[1], parts.slice(2).join("/")); }if (MISSIONS.some(x => x.id === h)) return await detail(h);if (h === "moon" || h === "mars")  return list(h === "moon" ? "Missions to the Moon" : "Missions to Mars", findMissions(h, ""));return list("Explore: random picks", findMissions("", ""), true);
  } catch (e) {
    app.replaceChildren(el("p", "muted", "Something went wrong. Please refresh the page."));
  }
}
let timer;
const sugg = $("#sugg");
function showSugg() {
  const v = $("#q").value.trim(), res = v ? suggest(v).slice(0, 5) : [];
  sugg.replaceChildren();
  sugg.hidden = !res.length;
  res.forEach(m => {
    const row = el("button", "srow"), th = el("span", "sthumb", m.name.charAt(0)), tx = el("span", "stext");
    tx.append(el("strong", "", m.name), el("span", "sdef", m.summary));
    row.append(th, tx);
    loadInto(th, m, false);
    row.onmousedown = e => e.preventDefault();
    row.onclick = () => { sugg.hidden = true; go(m.id); };
    sugg.append(row);
  });
}
$("#q").addEventListener("focus", showSugg);
document.addEventListener("click", e => { if (!e.target.closest(".searchwrap")) sugg.hidden = true; });
const doSearch = () => {
  $("#sugg").hidden = true;
  const v = $("#q").value.trim();
  if (!v) return route();
  list("Results for \u201C" + v + "\u201D", suggest(v));
};
$("#go").onclick = doSearch;
$("#q").addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(showSugg, 120); });
$("#q").addEventListener("keydown", e => { if (e.key === "Enter") { clearTimeout(timer); doSearch(); } });
document.querySelectorAll(".world").forEach(p => {
  p.onclick = () => { $("#q").value = ""; go(p.dataset.t); };
});
addEventListener("hashchange", route);
route();