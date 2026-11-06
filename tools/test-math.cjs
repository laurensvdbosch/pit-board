// Checks the mental math generator: node tools/test-math.cjs
'use strict';
const M = require('../math-gen.js');

let fail = 0;
const bad = (msg, q) => { if (fail++ < 25) console.log('FAIL', msg, JSON.stringify(q)); };

for (const level of [1, 2, 3]) {
  const kinds = {};
  let maxDp = 0;
  for (let i = 0; i < 20000; i++) {
    const typed = i % 2 === 0;
    const q = M.question(level, { typed });
    kinds[q.kind] = (kinds[q.kind] || 0) + 1;
    if (!Number.isFinite(q.answer)) bad('answer not finite', q);
    if (/NaN|undefined|Infinity|e[+-]\d/.test(q.html)) bad('bad html', q);
    if (typed && q.mcOnly) bad('mc-only question in typed mode', q);
    if (typed && q.answer < 0) bad('negative typed answer', q);
    if (q.choices) { const o = M.options(q); if (o.list.length !== 5 || new Set(o.list).size !== 5 || !(o.answerIndex >= 0)) bad('choices', q); continue; }
    const s = M.fmt(q.answer);
    if (/e/.test(s)) bad('exponent in answer', q);
    const dp = (s.split('.')[1] || '').length;
    maxDp = Math.max(maxDp, dp);
    if (dp > 4) bad('too many decimals', q);
    if (!M.same(M.parse(s.replace('−', '-')), q.answer)) bad('answer does not round-trip through parse', q);
    if (!M.same(M.parse(s.replace('.', ',').replace('−', '-')), q.answer)) bad('comma decimal mark rejected', q);

    const o = M.options(q);
    if (o.list.length !== 5) bad(`options: ${o.list.length}`, { q, o });
    if (new Set(o.list).size !== 5) bad('duplicate options', { q, o });
    if (o.answerIndex < 0 || o.answerIndex > 4) bad('answer missing from options', { q, o });
    if (!q.choices && o.list[o.answerIndex] !== M.fmt(q.answer)) bad('answer index wrong', { q, o });
    if (o.list.some(x => /NaN|undefined|e[+-]/.test(x))) bad('bad option text', { q, o });
    if (!q.choices) {
      const nums = o.list.map(x => Number(x.replace('−', '-')));
      if (nums.some((v, j) => j && v <= nums[j - 1])) bad('options not ascending', { q, o });
      if (nums.some(x => (x.toString().split('.')[1] || '').length > 4)) bad('long decimal option', { q, o });
    }
  }
  console.log(`level ${level}: ${Object.keys(kinds).length} kinds, max ${maxDp} decimals`, JSON.stringify(kinds));
}

// Where does the right answer sit among the 5 sorted options? Should be spread out.
for (const level of [1, 2, 3]) {
  const pos = [0, 0, 0, 0, 0];
  for (let i = 0; i < 5000; i++) pos[M.options(M.question(level)).answerIndex]++;
  const share = pos.map(p => Math.round(100 * p / 5000));
  console.log(`level ${level} answer position %:`, share.join(' / '));
  if (Math.max(...share) > 40) bad(`answer position too predictable at level ${level}`, share);
}

// Parsing
const cases = [['12', 12], ['12.5', 12.5], ['12,5', 12.5], [' 0.248 ', 0.248], ['.5', 0.5], ['7.', 7], ['', NaN], ['1.2.3', NaN], ['abc', NaN], ['−4', -4]];
for (const [s, v] of cases) {
  const p = M.parse(s);
  if (!(Number.isNaN(v) ? Number.isNaN(p) : p === v)) bad(`parse(${JSON.stringify(s)}) = ${p}`, v);
}

// Speed drill on the standard and some odd settings
const cfgs = [M.DRILL_STANDARD, { ...M.DRILL_STANDARD, add: false, sub: false }, { add: false, sub: true, mul: false, div: true, addA: [1, 5], addB: [1, 5], mulA: [0, 3], mulB: [0, 3] }];
for (const cfg of cfgs) {
  let last = null;
  for (let i = 0; i < 5000; i++) {
    const q = M.drill(cfg, last);
    if (!Number.isInteger(q.answer) || q.answer < 0) bad('drill answer', q);
    if (cfg === M.DRILL_STANDARD && last && last.html === q.html) bad('drill repeat', q);
    if (!cfg[q.op]) bad('drill op off', q);
    last = q;
  }
}

console.log(fail ? `\n${fail} failures` : '\nall passed');
process.exit(fail ? 1 : 0);
