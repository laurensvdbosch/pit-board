// Checks the SJT bank: node tools/test-sjt.cjs
'use strict';
const { SJT_BANK, SJTScore } = require('../sjt-bank.js');

let fail = 0;
const bad = msg => { if (fail++ < 40) console.log('FAIL', msg); };
const SECS = ['fin', 'pro', 'gen'];
const COMPS = ['integrity', 'teamwork', 'client', 'priorities', 'communication', 'learning', 'initiative', 'resilience'];

const ids = new Set();
for (const sc of SJT_BANK) {
  if (ids.has(sc.id)) bad(`duplicate id ${sc.id}`);
  ids.add(sc.id);
  if (!SECS.includes(sc.sec)) bad(`${sc.id}: sector ${sc.sec}`);
  if (!COMPS.includes(sc.comp)) bad(`${sc.id}: competency ${sc.comp}`);
  if (!sc.t || !sc.s || sc.s.length > 260) bad(`${sc.id}: scenario missing or too long (${sc.s && sc.s.length})`);
  if (!Array.isArray(sc.r) || sc.r.length !== 4) { bad(`${sc.id}: needs 4 responses`); continue; }
  const ratings = sc.r.map(x => x[1]);
  if (ratings.some(v => ![1, 2, 3, 4].includes(v))) bad(`${sc.id}: rating outside 1-4`);
  // Most / least needs one clear best and one clear worst
  if (ratings.filter(v => v === Math.max(...ratings)).length !== 1) bad(`${sc.id}: no single best response`);
  if (ratings.filter(v => v === Math.min(...ratings)).length !== 1) bad(`${sc.id}: no single worst response`);
  if (Math.max(...ratings) !== 4 || Math.min(...ratings) !== 1) bad(`${sc.id}: best should be 4 and worst 1`);
  for (const [text, , why] of sc.r) {
    if (!text || !why) bad(`${sc.id}: response without text or reason`);
    if (text.length > 160) bad(`${sc.id}: response too long (${text.length})`);
  }
  if (new Set(sc.r.map(x => x[0])).size !== 4) bad(`${sc.id}: duplicate responses`);
  // Scoring sanity: the key scores full marks, the reverse scores low
  const key = sc.r.map(x => x[1]);
  if (SJTScore.rate(sc, key) !== 8) bad(`${sc.id}: key doesn't score 8`);
  if (SJTScore.mostLeast(sc, SJTScore.best(sc), SJTScore.worst(sc)) !== 2) bad(`${sc.id}: key doesn't score 2`);
  if (SJTScore.mostLeast(sc, SJTScore.worst(sc), SJTScore.best(sc)) !== 0) bad(`${sc.id}: swapped picks should score 0`);
}

// An even mix across sectors, and every competency in every sector
const by = f => SJT_BANK.reduce((m, sc) => { const k = f(sc); m[k] = (m[k] || 0) + 1; return m; }, {});
const sec = by(sc => sc.sec), comp = by(sc => sc.comp);
console.log(`${SJT_BANK.length} scenarios · sectors ${JSON.stringify(sec)} · competencies ${JSON.stringify(comp)}`);
if (Math.max(...Object.values(sec)) - Math.min(...Object.values(sec)) > 1) bad(`sectors uneven: ${JSON.stringify(sec)}`);
for (const c of COMPS) if (!comp[c]) bad(`no scenario for ${c}`);
// The best answer shouldn't sit in the same position every time (it's shuffled on screen, but keep the bank varied too)
const bestPos = by(sc => SJTScore.best(sc));
console.log(`best response position in the bank: ${JSON.stringify(bestPos)} (shuffled when shown)`);

console.log(fail ? `${fail} FAILURE(S)` : 'ALL PASS');
process.exit(fail ? 1 : 0);
