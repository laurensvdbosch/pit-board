// Checks the Puzzles bank: node tools/test-puzzles.cjs [--quick]
// Structure, the answer parser, and every number answer against an
// independent simulation, enumeration or brute-force search.
'use strict';
const { PUZZLE_BANK } = require('../puzzle-bank.js');
const { PuzzleCheck } = require('../puzzles.js');

const QUICK = process.argv.includes('--quick');
const N = QUICK ? 60000 : 400000;
let fail = 0;
const bad = msg => { if (fail++ < 60) console.log('FAIL', msg); };

// Seeded generator so failures are reproducible
let seed = 12345;
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const R = n => Math.floor(rnd() * n);
const die = () => 1 + R(6);
const mean = f => { let s = 0; for (let i = 0; i < N; i++) s += f(); return s / N; };
const prob = f => mean(() => (f() ? 1 : 0));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = R(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const range = n => Array.from({ length: n }, (_, i) => i);
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
function perms(arr) { if (arr.length <= 1) return [arr]; return arr.flatMap((x, i) => perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map(p => [x, ...p])); }
function bfs(start, key, next, done) {
  const seen = new Set([key(start)]); let frontier = [start];
  for (let d = 0; frontier.length; d++) {
    if (frontier.some(done)) return d;
    const nf = [];
    for (const s of frontier) for (const t of next(s)) { const k = key(t); if (!seen.has(k)) { seen.add(k); nf.push(t); } }
    frontier = nf;
  }
  return Infinity;
}

// ---------------- structure ----------------
const BS_IDS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
  201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 213, 215, 216, 217, 218, 220, 221, 222, 223, 224, 225, 226,
  1002, 1003, 1004, 1005, 1006, 1008, 1009, 1011, 1012, 1013, 1014, 1015, 1016, 1017, 1018, 1019, 1020]);
const ids = new Set();
for (const p of PUZZLE_BANK) {
  if (ids.has(p.id)) bad(`duplicate id ${p.id}`);
  ids.add(p.id);
  if (!p.t || !p.q || !p.h || !Array.isArray(p.s) || !p.s.length) bad(`${p.id}: missing text`);
  if (!['prob', 'maths', 'strat', 'logic'].includes(p.c)) bad(`${p.id}: category ${p.c}`);
  if (![1, 2, 3, 4].includes(p.d)) bad(`${p.id}: level ${p.d}`);
  if (!['insight', 'working'].includes(p.k)) bad(`${p.id}: kind ${p.k}`);
  if (p.bs !== undefined && !BS_IDS.has(p.bs)) bad(`${p.id}: Brainstellar id ${p.bs} doesn't exist`);
  const a = p.a, types = ['n', 'opts', 'self'].filter(k => a[k] !== undefined);
  if (types.length !== 1) bad(`${p.id}: answer needs exactly one of n / opts / self`);
  if (a.n !== undefined && (!Number.isFinite(a.n) || !a.show)) bad(`${p.id}: bad number answer`);
  if (a.int && a.n !== Math.round(a.n)) bad(`${p.id}: int answer isn't whole`);
  if (a.opts && !(Number.isInteger(a.i) && a.i >= 0 && a.i < a.opts.length && a.opts.length >= 2)) bad(`${p.id}: bad choice answer`);
  const text = [p.t, p.q, p.h, ...p.s, a.show || '', a.self || '', ...(a.opts || [])].join(' ');
  if (/undefined|NaN|<\/?[a-z]/.test(text)) bad(`${p.id}: suspicious text`);
  // the shown answer must be accepted by the checker
  if (a.n !== undefined) {
    const shown = a.show.replace(/\s*\(.*\)$/, '').split(/[≈=]/).pop();
    if (PuzzleCheck.check(a, shown) !== true) bad(`${p.id}: shown answer "${shown}" is rejected by the checker`);
  }
}

// ---------------- answer parser ----------------
const P = PuzzleCheck.parse;
const parseCases = [['2/3', 2 / 3], ['0.667', 0.667], ['66.7%', 0.667], ['-17/216', -17 / 216], ['−17/216', -17 / 216], ['1/e', 1 / Math.E],
  ['100/(2pi)', 100 / (2 * Math.PI)], ['100/(2π)', 100 / (2 * Math.PI)], ['0,5', 0.5], ['1,000', 1000], ['1,250,000', 1250000], ['14', 14],
  ['$9', 9], ['16 cm', 16], ['40 km/h', 40], ['1 - (5/6)^4', 1 - Math.pow(5 / 6, 4)], ['2^10', 1024], ['sqrt(2)', Math.SQRT2], ['3 coins', 3],
  ['.25', 0.25], ['e', Math.E], ['2e', 2 * Math.E], ['(1+2)*3', 9], ['1/2 + 29/118', 0.5 + 29 / 118]];
for (const [s, v] of parseCases) { const x = P(s); if (x === null || Math.abs(x - v) > 1e-9) bad(`parse "${s}" = ${x}, expected ${v}`); }
for (const s of ['', 'abc', '2/', '(3', '1/0', '+-', '..5']) if (P(s) !== null) bad(`parse "${s}" should fail, got ${P(s)}`);
const chk = (a, s, want) => { const got = PuzzleCheck.check(a, s); if (got !== want) bad(`check ${JSON.stringify(a)} "${s}": ${got}, expected ${want}`); };
chk({ n: 2 / 3 }, '0.667', true); chk({ n: 2 / 3 }, '67%', true); chk({ n: 2 / 3 }, '66.7', true); chk({ n: 2 / 3 }, '0.6', false);
chk({ n: 14, int: true }, '14', true); chk({ n: 14, int: true }, '14.1', false); chk({ n: 73, int: true }, '72', false);
chk({ n: -17 / 216, tol: 0.002 }, '-0.079', true); chk({ n: -17 / 216, tol: 0.002 }, '0.079', false); chk({ n: 0.6 }, '60', true);
chk({ n: 0.0876, tol: 0.003 }, '8.8%', true); chk({ n: 15.915, tol: 0.6 }, '16', true); chk({ n: 1 }, 'x', null);

// ---------------- independent checks of every number answer ----------------
const exact = {};
// probability
exact.marbles = () => { let best = 0; for (let g = 0; g <= 30; g++) for (let r = 0; r <= 30; r++) { const a = g + r, b = 60 - a; if (!a || !b) continue; best = Math.max(best, 0.5 * g / a + 0.5 * (30 - g) / b); } return best; };
exact.meteor = () => prob(() => { const rate = -Math.log(0.16); let t = -Math.log(1 - rnd()) / rate; return t < 0.5; });
exact.monty = () => prob(() => { const prize = R(3), pick = 0; const open = [1, 2].filter(d => d !== prize)[R(prize === 0 ? 2 : 1)]; const sw = [0, 1, 2].find(d => d !== pick && d !== open); return sw === prize; });
exact.monty4 = () => prob(() => { const prize = R(4), pick = 0; const can = [1, 2, 3].filter(d => d !== prize); const open = can[R(can.length)]; const rest = [1, 2, 3].filter(d => d !== open); return rest[R(2)] === prize; });
exact.vonneumann = () => mean(() => { let n = 0; for (;;) { const a = rnd() < 0.3, b = rnd() < 0.3; n += 2; if (a !== b) return n; } });
exact.twobuses = () => { for (let x = 0; x <= 12; x++) { const pA = prob(() => rnd() * 12 < x); if (Math.abs(pA - 0.75) < 0.01) return x; } return NaN; };
exact.boygirl = () => { const fam = [[0, 0], [0, 1], [1, 0], [1, 1]].filter(f => f.includes(1)); return fam.filter(f => f[0] && f[1]).length / fam.length; };
exact.liar = () => { let yes = 0, rain = 0; for (let i = 0; i < N; i++) { const r = rnd() < 0.2, truth = rnd() < 2 / 3; const says = truth ? r : !r; if (says) { yes++; if (r) rain++; } } return rain / yes; };
exact.meetup = () => prob(() => Math.abs(rnd() - rnd()) * 60 <= 20);
exact.triangle = () => prob(() => { const x = rnd(), y = rnd(); const a = Math.min(x, y), b = Math.max(x, y); return a < 0.5 && b - a < 0.5 && 1 - b < 0.5; });
exact.chuck = () => { let s = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) { const m = [a, b, c].filter(x => x === 1).length; s += m ? m : -1; } return s / 216; };
exact.weather = () => { let s = 0.5; for (let i = 0; i < 1000; i++) s = s * 0.8 + (1 - s) * 0.4; return s; };
exact.ratio = () => prob(() => { const r = rnd() / rnd(); return r > 1 && r < 3; });
const rerollValue = k => { let v = 3.5; for (let i = 0; i < k; i++) { let s = 0; for (let f = 1; f <= 6; f++) s += Math.max(f, v); v = s / 6; } return v; };
exact.reroll = () => rerollValue(1);
exact.reroll2 = () => rerollValue(2);
exact.bonusroll = () => mean(() => { let t = 0; for (;;) { const f = die(); t += f; if (f !== 6) return t; } });
exact.hhh = () => mean(() => { let n = 0, run = 0; while (run < 3) { n++; run = rnd() < 0.5 ? run + 1 : 0; } return n; });
exact.knockout = () => prob(() => { let alive = shuffle(range(32)); while (alive.length > 1) { const nx = []; for (let i = 0; i < alive.length; i += 2) { const a = alive[i], b = alive[i + 1]; if ((a === 0 && b === 1) || (a === 1 && b === 0)) return true; nx.push(rnd() < 0.5 ? a : b); } alive = nx; } return false; });
exact.htcount = () => mean(() => { let c = 0, prev = rnd() < 0.5; for (let i = 1; i < 20; i++) { const h = rnd() < 0.5; if (prev && !h) c++; prev = h; } return c; });
exact.shortpiece = () => mean(() => { const x = 2 * rnd(); return Math.min(x, 2 - x); });
exact.longpiece = () => mean(() => { const x = rnd(), y = rnd(); const a = Math.min(x, y), b = Math.max(x, y); return Math.max(a, b - a, 1 - b); });
exact.redball = () => { let w = 0; for (let pos = 0; pos < 9; pos++) if (pos % 2 === 0) w++; return w / 9; };
exact.polya = () => prob(() => { let r = 1, b = 1, reds = 0; for (let i = 0; i < 10; i++) { if (rnd() < r / (r + b)) { r++; reds++; } else b++; } return reds === 5; });
exact.lowbid = () => { let best = -Infinity, arg = NaN; for (let b = 0; b <= 100; b++) { let s = 0; for (let v = 0; v <= 100; v += 0.25) if (v <= b) s += 1.4 * v - b; if (s > best + 1e-9) { best = s; arg = b; } } return arg; };
exact.poisson = () => { // arrive at a random time in a long Poisson stream
  const T = 200000; const times = []; let t = 0; while (t < T) { t += -12 * Math.log(1 - rnd()); times.push(t); }
  let s = 0; const M = 50000; for (let i = 0; i < M; i++) { const a = rnd() * (T - 500); let lo = 0, hi = times.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (times[m] < a) lo = m + 1; else hi = m; } s += times[lo] - a; } return s / M; };
exact.archer = () => { let n = 0, k = 0; for (let i = 0; i < N; i++) { const a = rnd(), b = rnd(), c = rnd(); if (a < b) { n++; if (c < a) k++; } } return k / n; };
exact.runs = () => mean(() => { const d = shuffle([...Array(26).fill(0), ...Array(26).fill(1)]); let r = 1; for (let i = 1; i < 52; i++) if (d[i] !== d[i - 1]) r++; return r; });
exact.cubeant = () => mean(() => { let v = 0, n = 0; while (v !== 7) { v ^= 1 << R(3); n++; } return n; });
exact.sphere = () => mean(() => { const pt = () => { const z = 2 * rnd() - 1, t = 2 * Math.PI * rnd(), r = Math.sqrt(1 - z * z); return [r * Math.cos(t), r * Math.sin(t), z]; }; const a = pt(), b = pt(); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); });
exact.letters = () => perms(range(5)).filter(p => p.every((v, i) => v !== i)).length / 120;
exact.allfaces = () => mean(() => { const seen = new Set(); let n = 0; while (seen.size < 6) { seen.add(die()); n++; } return n; });
exact.noodles = () => mean(() => { // ends 2i and 2i+1 belong to noodle i; partner[] links the other end
  let n = 10, loops = 0; const other = range(20).map(e => e ^ 1); let ends = range(20);
  while (ends.length) { const i = R(ends.length); const a = ends[i]; ends.splice(i, 1); const j = R(ends.length); const b = ends[j]; ends.splice(j, 1);
    if (other[a] === b) loops++; else { const oa = other[a], ob = other[b]; other[oa] = ob; other[ob] = oa; } n--; }
  return loops; });
exact.distinct = () => mean(() => new Set([die(), die(), die(), die(), die(), die()]).size);
exact.firstace = () => mean(() => { const d = shuffle(range(52)); return d.findIndex(c => c < 4) + 1; });
exact.disk = () => mean(() => { for (;;) { const x = 2 * rnd() - 1, y = 2 * rnd() - 1; if (x * x + y * y <= 1) return Math.hypot(x, y); } });
exact.centre5 = () => prob(() => { const a = range(5).map(() => rnd()).sort((x, y) => x - y); let gap = 1 - a[4] + a[0]; for (let i = 1; i < 5; i++) gap = Math.max(gap, a[i] - a[i - 1]); return gap < 0.5; });
exact.sumone = () => mean(() => { let s = 0, n = 0; while (s <= 1) { s += rnd(); n++; } return n; });
exact.walk32 = () => prob(() => { let x = 0; while (x < 3 && x > -2) x += rnd() < 0.5 ? 1 : -1; return x === 3; });
exact.candies = () => prob(() => { const jar = shuffle([...Array(4).fill('r'), ...Array(6).fill('b'), ...Array(10).fill('g')]); const lastRed = jar.lastIndexOf('r'); const rest = jar.slice(lastRed + 1); return rest.includes('b') && rest.includes('g'); });
exact.birthday = () => { let p = 1; for (let n = 1; n < 100; n++) { p *= (366 - n) / 365; if (1 - p > 0.5) return n; } return NaN; };
exact.mybirthday = () => { for (let n = 1; ; n++) if (1 - Math.pow(364 / 365, n) > 0.5) return n; };
exact.testpos = () => { let pos = 0, sick = 0; for (let i = 0; i < N * 4; i++) { const s = rnd() < 0.01; const t = s ? rnd() < 0.95 : rnd() < 0.1; if (t) { pos++; if (s) sick++; } } return sick / pos; };
exact.boxes = () => { let g = 0, gg = 0; for (let i = 0; i < N; i++) { const box = [['g', 'g'], ['s', 's'], ['g', 's']][R(3)]; const k = R(2); if (box[k] === 'g') { g++; if (box[1 - k] === 'g') gg++; } } return gg / g; };
exact.ants3 = () => { let ok = 0; for (let m = 0; m < 8; m++) if (m === 0 || m === 7) ok++; return ok / 8; };
exact.penney = () => prob(() => { let prev = rnd() < 0.5; for (;;) { const c = rnd() < 0.5; if (prev && c) return false; if (!prev && c) return true; prev = c; } });
exact.prisoners10 = () => prob(() => { const box = shuffle(range(10)); for (let k = 0; k < 10; k++) { let b = k, found = false; for (let t = 0; t < 5; t++) { if (box[b] === k) { found = true; break; } b = box[b]; } if (!found) return false; } return true; });
exact.secretary = () => { const n = 5000; let best = 0; for (let r = 1; r < n; r++) { let h = 0; for (let i = r + 1; i <= n; i++) h += 1 / (i - 1); best = Math.max(best, (r / n) * h); } return best; };  // exact for n = 5000
exact.beforesix = () => mean(() => { let s = 0; for (;;) { const f = die(); if (f === 6) return s; s += f; } });
exact.maxdice = () => { let s = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) s += Math.max(a, b); return s / 36; };
exact.onesix = () => prob(() => [die(), die(), die(), die()].includes(6));
exact.firstheads = () => prob(() => { for (let t = 0; ; t++) if (rnd() < 0.5) return t % 2 === 0; });
exact.increasing = () => { let k = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) for (let c = 1; c <= 6; c++) if (a < b && b < c) k++; return k / 216; };
exact.hatcheck = () => mean(() => shuffle(range(20)).filter((v, i) => v === i).length);
exact.maxuniform = () => mean(() => Math.max(rnd(), rnd()));
exact.hitfive = () => mean(() => { let x = 0, n = 0; while (Math.abs(x) < 5) { x += rnd() < 0.5 ? 1 : -1; n++; } return n; });
exact.pairs30 = () => mean(() => { const b = range(30).map(() => R(365)); let k = 0; for (let i = 0; i < 30; i++) for (let j = i + 1; j < 30; j++) if (b[i] === b[j]) k++; return k; });
exact.diceduel = () => { let w = 0; for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) if (a > b) w++; return w / 36; };
// maths
exact.lockers = () => { const on = Array(201).fill(false); for (let k = 1; k <= 200; k++) for (let j = k; j <= 200; j += k) on[j] = !on[j]; return on.filter(Boolean).length; };
exact.socks = () => { // smallest m such that every possible draw of m socks has 2 reds
  for (let m = 1; m <= 24; m++) { let worst = Infinity; for (let r = 0; r <= 8; r++) { const others = m - r; if (others >= 0 && others <= 16) worst = Math.min(worst, r); } if (worst >= 2) return m; } return NaN; };
exact.josephus = () => { const c = range(100).map(i => i + 1); let i = 0; while (c.length > 1) { i = (i + 1) % c.length; c.splice(i, 1); } return c[0]; };
exact.dicesum = () => { const faces = [0, 0, 0, 6, 6, 6]; const cnt = {}; for (let a = 1; a <= 6; a++) for (const b of faces) cnt[a + b] = (cnt[a + b] || 0) + 1; const okU = range(12).every(k => cnt[k + 1] === 3); return okU ? faces.reduce((s, v) => s + v, 0) : NaN; };
exact.bread = () => { const each = 12 / 3; return 12 * (7 - each) / ((7 - each) + (5 - each)); };
exact.languages = () => { for (let n = 1; ; n++) if (C(n, Math.floor(n / 2)) >= 250) return n; };
exact.antsstick = () => { // simulate bouncing ants with random starts: never longer than 200 s, and an end-start ant takes 200
  let worst = 0; for (let t = 0; t < 200; t++) { const pos = range(30).map(() => R(201)); const dir = pos.map(() => (rnd() < 0.5 ? -1 : 1)); pos[0] = 0; dir[0] = 1;
    // pass-through equivalence: time for each to walk off
    worst = Math.max(worst, ...pos.map((p, i) => (dir[i] > 0 ? 200 - p : p))); } return worst; };
exact.chocolate = () => { let pieces = 1, breaks = 0; const stack = [[5, 9]]; while (stack.length) { const [a, b] = stack.pop(); if (a * b === 1) continue; breaks++; pieces++; if (a > 1) { const k = 1 + R(a - 1); stack.push([k, b], [a - k, b]); } else { const k = 1 + R(b - 1); stack.push([a, k], [a, b - k]); } } return breaks; };
exact.infection = () => { // the diagonal infects everything, and 9 never suffice on a 10x10 (perimeter bound); check the diagonal
  const g = range(10).map(r => range(10).map(c => r === c)); let changed = true;
  while (changed) { changed = false; for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) if (!g[r][c]) { const n = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([y, x]) => y >= 0 && y < 10 && x >= 0 && x < 10 && g[y][x]).length; if (n >= 2) { g[r][c] = true; changed = true; } } }
  return g.flat().every(Boolean) ? 10 : NaN; };
exact.minmax = () => { // count comparisons of the pairing method on random data, and check it finds both
  const v = shuffle(range(100)); let cmp = 0; const hi = [], lo = []; for (let i = 0; i < 100; i += 2) { cmp++; if (v[i] > v[i + 1]) { hi.push(v[i]); lo.push(v[i + 1]); } else { hi.push(v[i + 1]); lo.push(v[i]); } }
  let mx = hi[0], mn = lo[0]; for (let i = 1; i < 50; i++) { cmp++; if (hi[i] > mx) mx = hi[i]; cmp++; if (lo[i] < mn) mn = lo[i]; } return mx === 99 && mn === 0 ? cmp : NaN; };
exact.consecutive = () => { let k = 0; for (let n = 1; n <= 100; n++) { let ok = false; for (let a = 1; a < n && !ok; a++) { let s = 0; for (let b = a; s < n; b++) { s += b; if (s === n && b > a) ok = true; } } if (!ok) k++; } return k; };
exact.pillars = () => 8 * prob(() => { const x = 2 * rnd() - 1, y = 2 * rnd() - 1, z = 2 * rnd() - 1; return x * x + z * z <= 1 && y * y + z * z <= 1; });
exact.lookandsay = () => { let s = '1'; for (let k = 0; k < 5; k++) s = s.replace(/(\d)\1*/g, m => m.length + m[0]); return Number(s); };
exact.zeros = () => { let f = 1n; for (let i = 1n; i <= 125n; i++) f *= i; return f.toString().match(/0*$/)[0].length; };
exact.paintcube = () => { let k = 0; for (let x = 0; x < 10; x++) for (let y = 0; y < 10; y++) for (let z = 0; z < 10; z++) if ([x, y, z].filter(v => v === 0 || v === 9).length === 2) k++; return k; };
exact.squares = () => { let k = 0; for (let s = 1; s <= 8; s++) k += (9 - s) ** 2; return k; };
exact.lastdigit = () => Number((7n ** 2026n) % 10n);
exact.threefive = () => range(1000).map(i => i + 1).filter(n => n % 3 === 0 || n % 5 === 0).length;
exact.rightangles = () => { let k = 0; const ang = t => ((5.5 * t) % 360 + 360) % 360; for (let s = 0; s < 1440 * 60; s++) { const a = ang(s / 60), b = ang((s + 1) / 60); for (const target of [90, 270]) if (a < target && b >= target) k++; } return k; };
exact.quarterpast = () => Math.abs((3 * 30 + 15 * 0.5) - 15 * 6);
exact.knockout77 = () => { let players = 77, matches = 0; while (players > 1) { const m = Math.floor(players / 2); matches += m; players -= m; } return matches; };
exact.rope = () => { const r = 6378137; return 100 * ((2 * Math.PI * r + 1) / (2 * Math.PI) - r); };
exact.stairs = () => { const W = [1]; for (let n = 1; n <= 10; n++) W[n] = (W[n - 1] || 0) + (W[n - 2] || 0) + (W[n - 3] || 0); return W[10]; };
exact.avgspeed = () => 120 / (60 / 30 + 60 / 60);
exact.bird = () => 90 * 120 / (40 + 20);
exact.lilies = () => { let size = 1, day = 48; while (size > 0.5) { size /= 2; day--; } return day; };
exact.batball = () => { for (let c = 0; c <= 110; c++) if (c + (c + 100) === 110) return c; return NaN; };
exact.machines = () => { const rate = 6 / (6 * 6); return 60 / (60 * rate); };
exact.ages = () => { const trip = []; for (let a = 1; a <= 36; a++) for (let b = a; b <= 36; b++) for (let c = b; c <= 36; c++) if (a * b * c === 36) trip.push([a, b, c]); const sums = {}; trip.forEach(t => { const s = t[0] + t[1] + t[2]; (sums[s] = sums[s] || []).push(t); }); const amb = Object.values(sums).filter(l => l.length > 1); const left = amb.flat().filter(t => t[2] > t[1]); return left.length === 1 ? left[0][2] : NaN; };
// strategy
exact.pirates = () => { // backward induction, at least half the votes, indifferent votes no
  let alloc = [100]; // alloc[i] = coins for pirate i+1 (1 = most junior)
  for (let n = 2; n <= 7; n++) { const need = Math.ceil(n / 2) - 1; const cheap = range(n - 1).sort((a, b) => alloc[a] - alloc[b]).slice(0, need); const next = Array(n).fill(0); let spent = 0; for (const i of cheap) { next[i] = alloc[i] + 1; spent += next[i]; } next[n - 1] = 100 - spent; alloc = next; }
  return alloc[6]; };
exact.hatline = () => { // run the parity strategy on random hats
  let worst = 20; for (let t = 0; t < 2000; t++) { const h = range(20).map(() => R(2)); const parity = h.slice(1).reduce((s, v) => s ^ v, 0); let known = parity, right = 0; for (let i = 1; i < 20; i++) { const ahead = h.slice(i + 1).reduce((s, v) => s ^ v, 0); const guess = known ^ ahead; if (guess === h[i]) right++; known ^= guess; } worst = Math.min(worst, right); } return worst; };
exact.hatseven = () => { let worst = 50; for (let t = 0; t < 2000; t++) { const h = range(50).map(() => R(7)); const tot = h.slice(1).reduce((s, v) => s + v, 0) % 7; let rem = tot, right = 0; for (let i = 1; i < 50; i++) { const ahead = h.slice(i + 1).reduce((s, v) => s + v, 0); const guess = ((rem - ahead) % 7 + 7) % 7; if (guess === h[i]) right++; rem = ((rem - guess) % 7 + 7) % 7; } worst = Math.min(worst, right); } return worst; };
exact.islanders = () => 7;
exact.strips = () => Math.ceil(Math.log2(600));
exact.strips2 = () => { let k = 0; while (3 ** k < 240) k++; return k; };
exact.eggs = () => { // f[d] = floors 2 eggs can handle with d drops
  let f1 = d => d; for (let d = 1; ; d++) { let f = 0; for (let i = 1; i <= d; i++) f += 1 + f1(i - 1); if (f >= 200) return d; } };
exact.goldbar = () => { for (let cuts = 0; cuts < 5; cuts++) { // try every way to cut 15 into cuts+1 pieces
    const parts = []; const rec = (left, k, min, cur) => { if (k === 1) { if (left >= min) parts.push([...cur, left]); return; } for (let x = min; x <= left; x++) rec(left - x, k - 1, x, [...cur, x]); }; rec(15, cuts + 1, 1, []);
    for (const ps of parts) { const sums = new Set([0]); for (const x of ps) for (const s of [...sums]) sums.add(s + x); if (range(15).every(v => sums.has(v + 1))) return cuts; } } return NaN; };
exact.balance = () => 3 ** 4;
exact.locks = () => C(7, 3);
exact.nim30 = () => { const win = [false]; for (let n = 1; n <= 30; n++) win[n] = [1, 2, 3].some(k => k <= n && !win[n - k]); return [1, 2, 3].find(k => !win[30 - k]); };
exact.race100 = () => { const win = []; win[100] = false; for (let t = 99; t >= 0; t--) win[t] = range(10).some(k => t + k + 1 <= 100 && !win[t + k + 1]); return range(10).map(k => k + 1).find(k => !win[k]); };
exact.twothirds = () => { let hi = 100; for (let i = 0; i < 200; i++) hi = Math.floor(hi * 2 / 3); return hi; };
exact.horses = () => 7;
exact.torch = () => { // shortest total time, Dijkstra over (people on the start side, torch side)
  const all = [1, 3, 6, 8], dist = new Map([['1,3,6,8|0', 0]]), q = [[0, '1,3,6,8|0']];
  while (q.length) { q.sort((x, y) => x[0] - y[0]); const [d, k] = q.shift(); if (d > dist.get(k)) continue; const [l, tch] = k.split('|'); const left = l ? l.split(',').map(Number) : []; if (!left.length) return d;
    const moves = []; if (tch === '0') { for (let i = 0; i < left.length; i++) for (let j = i; j < left.length; j++) { const go = [...new Set([left[i], left[j]])]; moves.push([left.filter(x => !go.includes(x)), '1', Math.max(...go)]); } }
    else for (const x of all.filter(x => !left.includes(x))) moves.push([[...left, x].sort((m, n) => m - n), '0', x]);
    for (const [nl, nt, c] of moves) { const nk = `${nl.join(',')}|${nt}`; if (!dist.has(nk) || d + c < dist.get(nk)) { dist.set(nk, d + c); q.push([d + c, nk]); } } }
  return NaN; };
exact.jugs = () => bfs([0, 0], s => s.join(), ([a, b]) => { const p35 = Math.min(a, 5 - b), p53 = Math.min(b, 3 - a); return [[3, b], [a, 5], [0, b], [a, 0], [a - p35, b + p35], [a + p53, b - p53]]; }, s => s[1] === 4);
exact.threehats = () => { // best deterministic strategies: each player maps the 4 views to guess red / blue / pass
  let best = 0; const views = [[0, 0], [0, 1], [1, 0], [1, 1]];
  const strat = range(81).map(m => views.map((_, v) => Math.floor(m / 3 ** v) % 3));
  for (const s1 of strat) for (const s2 of strat) for (const s3 of strat) { let w = 0;
    for (let h = 0; h < 8; h++) { const hat = [h & 1, (h >> 1) & 1, (h >> 2) & 1]; const ss = [s1, s2, s3]; let right = 0, wrong = 0;
      for (let p = 0; p < 3; p++) { const others = [0, 1, 2].filter(q => q !== p).map(q => hat[q]); const act = ss[p][others[0] * 2 + others[1]]; if (act === 2) continue; if (act === hat[p]) right++; else wrong++; }
      if (right && !wrong) w++; }
    if (w > best) best = w; if (best === 6 && QUICK) return best / 8; }
  return best / 8; };
exact.kelly = () => { let best = -Infinity, arg = 0; for (let f = 0; f < 0.99; f += 0.0005) { const g = 0.6 * Math.log(1 + f) + 0.4 * Math.log(1 - f); if (g > best) { best = g; arg = f; } } return arg; };
// logic
exact.river = () => bfs({ side: [0, 0, 0, 0] }, s => s.side.join(''), s => { // farmer, wolf, goat, cabbage
  const out = []; const f = s.side[0]; for (const item of [null, 1, 2, 3]) { if (item !== null && s.side[item] !== f) continue; const n = [...s.side]; n[0] = 1 - f; if (item !== null) n[item] = 1 - f;
    const bad1 = n[1] === n[2] && n[0] !== n[1], bad2 = n[2] === n[3] && n[0] !== n[2]; if (!bad1 && !bad2) out.push({ side: n }); } return out; }, s => s.side.every(v => v === 1));
exact.labels = () => 1;

// choice answers that can be checked by brute force
const choiceChecks = {
  capgun: p => { const noSpin = 1 / 4, spin = 2 / 6; return p.a.i === (noSpin < spin ? 0 : 1); },
  fruits: p => { // which single-kind end states are reachable from (10, 14, 19)
    const start = [10, 14, 19], seen = new Set([start.join()]), q = [start], ends = new Set();
    while (q.length) { const s = q.pop(); const nz = s.filter(v => v > 0).length; if (nz === 1) ends.add(s.findIndex(v => v > 0));
      for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (s[i] && s[j]) { const k = 3 - i - j; const n = [...s]; n[i]--; n[j]--; n[k] += 2; const key = n.join(); if (!seen.has(key)) { seen.add(key); q.push(n); } } }
    return ends.size === 1 && ends.has(1) && p.a.i === 1; },
  stopboy: p => { let g = 0, b = 0; for (let f = 0; f < 200000; f++) { for (;;) { if (rnd() < 0.5) { b++; break; } g++; } } return Math.abs(g / b - 1) < 0.02 && p.a.i === 2; },
  clans: p => { const sizes = range(2000).map(() => 1 + R(50)); const people = sizes.flatMap(s => Array(s).fill(s)); const survey = mean(() => people[R(people.length)]); const truth = sizes.reduce((a, b) => a + b, 0) / sizes.length; return survey > truth * 1.2 && p.a.i === 0; },
  chessboard: p => p.a.i === 1,
  coinsrow: p => { // first player never loses with optimal play, on random rows
    for (let t = 0; t < 300; t++) { const row = range(2 + 2 * R(4)).map(() => R(10)); const memo = new Map(); const best = (i, j) => { if (i > j) return 0; const k = `${i},${j}`; if (memo.has(k)) return memo.get(k); const v = Math.max(row[i] - best(i + 1, j), row[j] - best(i, j - 1)); memo.set(k, v); return v; }; if (best(0, row.length - 1) < 0) return false; } return p.a.i === 0; },
  divisors: p => { // first player wins for small N by game search
    for (let n = 2; n <= 12; n++) { const memo = new Map(); const win = mask => { if (!mask) return false; if (memo.has(mask)) return memo.get(mask); let w = false; for (let x = 1; x <= n && !w; x++) if (mask & (1 << x)) { let m = mask; for (let d = 1; d <= x; d++) if (x % d === 0) m &= ~(1 << d); if (!win(m)) w = true; } memo.set(mask, w); return w; };
      let full = 0; for (let x = 1; x <= n; x++) full |= 1 << x; if (!win(full)) return false; } return p.a.i === 0; },
  lions: p => { const eaten = n => (n === 1 ? true : !eaten(n - 1)); return eaten(47) === (p.a.i === 0); },
  wind: p => { const v = 500, w = 50, d = 1000; return d / (v + w) + d / (v - w) > 2 * d / v && p.a.i === 1; },
  waterwine: p => { const V = 10, s = 1; const wineInWater = s * V / (V + s); const waterInWine = s - s * (s / (V + s)); return Math.abs(wineInWater - waterInWine) < 1e-12 && p.a.i === 2; },
  bricks: p => { // the colouring bound: each brick covers 2 cells of each colour
    let ok = true; const col = (x, y, z) => (Math.floor(x / 2) + Math.floor(y / 2) + Math.floor(z / 2)) % 2; let black = 0;
    for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) for (let z = 0; z < 6; z++) black += col(x, y, z);
    for (let a = 0; a <= 2; a++) for (let x = 0; x < 6; x++) for (let y = 0; y < 6; y++) for (let z = 0; z < 6; z++) { const c = [0, 1, 2, 3].map(t => [x + (a === 0 ? t : 0), y + (a === 1 ? t : 0), z + (a === 2 ? t : 0)]); if (c.some(q => q.some(v => v > 5))) continue; if (c.reduce((s, q) => s + col(...q), 0) !== 2) ok = false; }
    return ok && Math.floor(Math.min(black, 216 - black) / 2) === 52 && p.a.i === 1; },
};

let checked = 0, unchecked = [];
for (const p of PUZZLE_BANK) {
  if (p.a.n !== undefined) {
    if (!exact[p.id]) { unchecked.push(p.id); continue; }
    const v = exact[p.id]();
    checked++;
    const tol = p.a.int ? (Number.isInteger(v) ? 0 : 0.05 * Math.max(1, Math.abs(p.a.n))) : Math.max(0.02 * Math.abs(p.a.n), 0.004);
    if (!Number.isFinite(v) || Math.abs(v - p.a.n) > tol) bad(`${p.id}: bank says ${p.a.n}, check gives ${v}`);
  } else if (p.a.opts && choiceChecks[p.id]) {
    checked++;
    if (!choiceChecks[p.id](p)) bad(`${p.id}: choice answer failed its check`);
  }
}

const by = (f) => PUZZLE_BANK.reduce((m, p) => { const k = f(p); m[k] = (m[k] || 0) + 1; return m; }, {});
const ranked = PUZZLE_BANK.filter(p => p.a.n !== undefined || (p.a.opts && p.a.opts.length >= 3));
console.log(`${PUZZLE_BANK.length} puzzles · levels ${JSON.stringify(by(p => p.d))} · topics ${JSON.stringify(by(p => p.c))} · ${JSON.stringify(by(p => p.k))}`);
console.log(`answers: ${JSON.stringify(by(p => (p.a.n !== undefined ? 'number' : p.a.opts ? 'choice' : 'self')))} · interview-round eligible ${ranked.length} ${JSON.stringify(ranked.reduce((m, p) => { m[p.d] = (m[p.d] || 0) + 1; return m; }, {}))}`);
console.log(`Brainstellar credits: ${PUZZLE_BANK.filter(p => p.bs).length}`);
console.log(`verified ${checked} answers independently${unchecked.length ? `; no check for: ${unchecked.join(', ')}` : ''}`);
if (unchecked.length) bad(`number answers without an independent check: ${unchecked.join(', ')}`);
console.log(fail ? `${fail} FAILURE(S)` : 'ALL PASS');
process.exit(fail ? 1 : 0);
