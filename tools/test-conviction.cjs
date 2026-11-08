// Checks the Conviction question bank: node tools/test-conviction.cjs
'use strict';
const { CONV_BANK, CONV_POOLS, drawConviction } = require('../conviction-bank.js');

let fail = 0;
const bad = msg => { if (fail++ < 40) console.log('FAIL', msg); };
const MAX_LEN = 80;

const texts = new Map();
for (const [pool, rows] of Object.entries(CONV_BANK)) {
  let yes = 0, no = 0, more = 0, less = 0, twins = 0;
  const twinCount = {};
  rows.forEach(r => {
    const [text, ans, why, twin] = r;
    if (typeof text !== 'string' || !text.trim()) bad(`${pool}: empty text`);
    if (text.length > MAX_LEN) bad(`${pool}: too long (${text.length}): ${text}`);
    if (texts.has(text)) bad(`${pool}: duplicate: ${text}`);
    texts.set(text, pool);
    if (ans === true) yes++; else if (ans === false) no++; else if (ans === 'more') more++; else if (ans === 'less') less++; else bad(`${pool}: bad answer: ${text}`);
    const ml = ans === 'more' || ans === 'less';
    if (ml !== /more or less than/.test(text)) bad(`${pool}: format mismatch: ${text}`);
    if (ml && !why) bad(`${pool}: more/less needs a why: ${text}`);
    if (twin) { twins++; (twinCount[twin] = twinCount[twin] || []).push(ans); }
  });
  for (const [id, ans] of Object.entries(twinCount)) {
    if (ans.length !== 2) bad(`${pool}: twin ${id} has ${ans.length} members`);
    else if (ans[0] === ans[1] && !['var', 'indep', 'order'].includes(id)) bad(`${pool}: twin ${id} has the same answer twice`);
  }
  const tf = yes + no, ml = more + less;
  console.log(`${pool}: ${rows.length} questions · T/F ${yes}/${no} (${Math.round(100 * yes / tf)}% true) · more/less ${more}/${less} (${Math.round(100 * ml / rows.length)}% of bank) · ${twins / 2} twin pairs`);
  if (rows.length < 70) bad(`${pool}: fewer than 70 questions`);
  const share = yes / tf;
  if (share < 0.4 || share > 0.6) bad(`${pool}: true share ${Math.round(share * 100)}% is predictable`);
}

// Draws
for (const diff of Object.keys(CONV_POOLS)) {
  for (const n of [25, 50]) {
    let trueShare = 0, tfSeen = 0, twinPairs = 0;
    for (let run = 0; run < 500; run++) {
      const set = drawConviction(diff, n, []);
      if (set.length !== n) bad(`${diff}/${n}: drew ${set.length}`);
      if (new Set(set.map(q => q.id)).size !== n) bad(`${diff}/${n}: repeated question`);
      const at = new Map();
      set.forEach((q, i) => {
        if (typeof q.answer === 'boolean') { tfSeen++; if (q.answer) trueShare++; }
        if (!q.twin) return;
        if (at.has(q.twin)) {
          twinPairs++;
          const gap = i - at.get(q.twin);
          if (gap < 2) bad(`${diff}/${n}: twins only ${gap} apart`);
        } else at.set(q.twin, i);
      });
    }
    const pct = Math.round(100 * trueShare / tfSeen);
    console.log(`  draw ${diff} ${n}: ${pct}% true · ${(twinPairs / 500).toFixed(1)} twin pairs per test`);
    if (pct < 38 || pct > 62) bad(`${diff}/${n}: drawn true share ${pct}%`);
  }
}

// Recently seen questions should be avoided while fresh ones remain
for (const diff of ['gk-easy', 'fin-quant']) {
  const first = drawConviction(diff, 25, []);
  const recent = first.map(q => q.id);
  for (let i = 0; i < 200; i++) {
    const next = drawConviction(diff, 25, recent);
    const overlap = next.filter(q => recent.includes(q.id)).length;
    if (overlap) { bad(`${diff}: ${overlap} recent questions came back`); break; }
  }
}

console.log(fail ? `\n${fail} failures` : '\nall passed');
process.exit(fail ? 1 : 0);
