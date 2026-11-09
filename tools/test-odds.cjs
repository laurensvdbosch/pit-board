// Checks the Odds section: node tools/test-odds.cjs [--quick]
// Every Probability Paper template's exact answer is compared with its own
// simulation, for several random parameter draws.
'use strict';
const Bank = require('../prob-bank.js');

let fail = 0;
const bad = msg => { if (fail++ < 40) console.log('FAIL', msg); };
const QUICK = process.argv.includes('--quick');

// A seeded generator for simulations, separate from the question RNG
function mulberry(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ---------- answers vs simulation ----------
const levels = { 1: 0, 2: 0 };
const genAt = t => { const orig = Bank.make; void orig; return t.gen(); };
const DRAWS = QUICK ? 4 : 12, N = QUICK ? 40000 : 120000;
let seed = 1;
for (const t of Bank.templates) {
  levels[t.level]++;
  for (let d = 0; d < DRAWS; d++) {
    const q = genAt(t);
    if (!Number.isFinite(q.value)) { bad(`${t.id}: value ${q.value} — ${q.text}`); continue; }
    if (/NaN|undefined|Infinity/.test(q.text + q.how)) bad(`${t.id}: bad text — ${q.text}`);
    if (q.kind === 'p' && !(q.value > 0 && q.value < 1 + 1e-12)) bad(`${t.id}: probability ${q.value} — ${q.text}`);
    const u = mulberry(seed++);
    let s = 0, s2 = 0;
    for (let i = 0; i < N; i++) { const x = q.sim(u); s += x; s2 += x * x; }
    let est = s / N, sd = Math.sqrt(Math.max(s2 / N - est * est, 1e-12));
    let se = sd / Math.sqrt(N);
    if (q.variance !== undefined) {   // this template asks for the variance of the simulated quantity
      est = s2 / N - est * est; se = est * Math.sqrt(2 / N) * 2.5;
    }
    const tol = Math.max(5 * se, Math.abs(q.value) * 1e-4, 1e-4);
    if (Math.abs(est - q.value) > tol) bad(`${t.id}: exact ${q.value} vs sim ${est} (tol ${tol.toFixed(5)}) — ${q.text}`);
  }
}
console.log(`Paper: ${levels[1]} easy + ${levels[2]} hard templates checked against simulation (${DRAWS} draws each)`);

// ---------- options ----------
for (const level of [1, 2, null]) {
  const pos = [0, 0, 0, 0, 0];
  const kinds = new Set();
  let n = 0;
  for (let i = 0; i < 20000; i++) {
    const q = Bank.make(level);
    kinds.add(q.id); n++;
    if (q.list.length !== 5) bad(`${q.id}: ${q.list.length} options`);
    if (new Set(q.list).size !== 5) bad(`${q.id}: duplicate options ${q.list} — ${q.text}`);
    const d = q.values.map(x => Math.abs(x - q.value)).sort((a, b) => a - b);
    const nearest = q.values.reduce((b, x, j) => (Math.abs(x - q.value) < Math.abs(q.values[b] - q.value) ? j : b), 0);
    if (nearest !== q.answerIndex) bad(`${q.id}: answer isn't the closest`);
    if (d[0] > 0.62 * d[1] + 1e-12) bad(`${q.id}: closest option not clear (${q.value} in ${q.list}) — ${q.text}`);
    if (q.kind === 'p' && q.values.some(x => x <= 0 || x >= 1)) bad(`${q.id}: option outside (0,1): ${q.list}`);
    if (q.values.some((x, j) => j && x <= q.values[j - 1])) bad(`${q.id}: not ascending ${q.list}`);
    if (q.text.length > 320) bad(`${q.id}: question too long`);
    pos[q.answerIndex]++;
  }
  const share = pos.map(p => Math.round(100 * p / n));
  console.log(`level ${level || 'mixed'}: ${kinds.size} templates used · answer position % ${share.join(' / ')}`);
  if (Math.max(...share) > 34 || Math.min(...share) < 10) bad(`level ${level}: answer position predictable ${share}`);
}

module.exports = { bad, mulberry };
require('./test-odds-games.cjs');
console.log(fail ? `\n${fail} failures` : '\nall passed');
process.exit(fail ? 1 : 0);
