/* ===========================================================
   PIT BOARD — Data Room (DATA): numerical reasoning
   ---------------------------------------------------------
   The table-and-chart test used by banks, consulting and the Big 4:
   read an exhibit, answer from 5 options, calculator allowed. Move freely
   between questions, change answers, nothing is marked until you hand in.
   +1 per correct. Board (data, standard|hard, 20).
   Exhibits are generated, so every run has new numbers.

   TO REMOVE THIS GAME: delete this file and its <script> line in
   index.html (and tools/test-dataroom.cjs). Everything else stays working;
   it registers itself with GAMES and adds its own screens and styles.
   The 'data' lines in supabase/schema.sql are harmless if left in.
   =========================================================== */

'use strict';

const DataGen = (() => {
  let rnd = Math.random;
  const R = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
  const P = arr => arr[Math.floor(rnd() * arr.length)];
  const shuffled = arr => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  const sample = (arr, n) => shuffled(arr).slice(0, n);
  const total = arr => arr.reduce((s, v) => s + v, 0);
  const rd = (v, dp) => Math.round(v * 10 ** dp + 1e-9 * Math.sign(v)) / 10 ** dp;
  // A value sitting on a rounding boundary could fairly round either way
  const isTie = (v, dp) => { const x = Math.abs(v) * 10 ** dp; return Math.abs(x - Math.floor(x) - 0.5) < 0.03; };
  const num = (v, dp = 0) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const show = (v, u) => `${v < 0 ? '−' : ''}${u.pre || ''}${num(v, u.dp)}${u.suf || ''}`;

  const PCT = { suf: '%', dp: 1 };
  const MN = { pre: '$', suf: 'm', dp: 0 };
  const MN1 = { pre: '$', suf: 'm', dp: 1 };
  const USD = { pre: '$', dp: 0 };
  const USD2 = { pre: '$', dp: 2 };
  const COUNT = { dp: 0 };
  const K = { suf: 'k', dp: 0 };

  const N = (text, value, unit, wrong, how) => ({ text, value, unit, wrong, how });
  const C = (text, choices, answer, how) => ({ text, choices, answer, how });

  // -------------------- OPTIONS --------------------
  function buildOptions(def) {
    if (def.choices) {
      const list = shuffled(def.choices);
      return { list, answerIndex: list.indexOf(def.answer) };
    }
    const u = def.unit;
    if (!Number.isFinite(def.value) || isTie(def.value, u.dp)) return null;
    const A = rd(def.value, u.dp);
    const unit = 10 ** -u.dp;
    const gap = Math.max(2 * unit, Math.abs(A) * 0.015);   // near misses from rounding aren't "wrong answers"
    const pool = [];
    const add = (v, pri) => {
      if (!Number.isFinite(v)) return;
      const x = rd(v, u.dp);
      if (Math.abs(x - A) < gap || (A > 0 && !u.signed && x <= 0)) return;
      if (pool.some(p => Math.abs(p.v - x) < gap)) return;
      pool.push({ v: x, pri });
    };
    (def.wrong || []).forEach(v => add(v, 0));
    shuffled([0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.4, 1.5]).forEach(m => add(A * m, 1));
    for (let k = 2; k <= 8; k++) { add(A + k * gap, 2); add(A - k * gap, 2); }
    const ranked = f => shuffled(pool.filter(f)).sort((a, b) => a.pri - b.pri).map(p => p.v);
    const below = ranked(p => p.v < A), above = ranked(p => p.v > A);
    let nb = Math.min(R(0, 4), below.length);
    let na = 4 - nb;
    if (na > above.length) { na = above.length; nb = 4 - na; }
    if (nb > below.length) return null;
    const values = [...below.slice(0, nb), A, ...above.slice(0, na)].sort((a, b) => a - b);
    return { list: values.map(v => show(v, u)), answerIndex: values.indexOf(A) };
  }

  // -------------------- DRAWING --------------------
  const COLORS = ['#3987E5', '#D95F0E', '#199E70'];   // passes the colour-blind checks on the dark panel
  const SHAPES = ['circle', 'square', 'diamond'];
  function marker(x, y, i) {
    const f = `fill="${COLORS[i]}" stroke="var(--panel)" stroke-width="2"`;
    if (SHAPES[i] === 'circle') return `<circle cx="${x}" cy="${y}" r="5" ${f}/>`;
    if (SHAPES[i] === 'square') return `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" ${f}/>`;
    return `<path d="M${x} ${y - 6}L${x + 6} ${y}L${x} ${y + 6}L${x - 6} ${y}Z" ${f}/>`;
  }
  const legend = (names, shaped) => `<div class="dr-legend">${names.map((n, i) =>
    `<span><svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">${shaped ? marker(0, 0, i) : `<rect x="-6" y="-6" width="12" height="12" rx="2" fill="${COLORS[i]}"/>`}</svg>${n}</span>`).join('')}</div>`;
  const text = (x, y, s, a = 'middle', c = 'var(--chalk-dim)', size = 10) => `<text x="${x}" y="${y}" text-anchor="${a}" fill="${c}" font-size="${size}">${s}</text>`;
  const topRound = (x, y, w, base, r = 3) => `M${x} ${base}V${y + r}Q${x} ${y} ${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${base}Z`;

  function barChart(groups, series) {
    const W = 340, H = 190, base = H - 22, top = 18;
    const max = Math.max(...series.flatMap(s => s.values));
    const gw = (W - 8) / groups.length, bw = 21, gapB = 2;
    const span = series.length * bw + (series.length - 1) * gapB;
    let out = `<line x1="4" x2="${W - 4}" y1="${base}" y2="${base}" stroke="var(--chalk-dim)"/>`;
    groups.forEach((g, gi) => {
      const x0 = 4 + gi * gw + (gw - span) / 2;
      series.forEach((s, si) => {
        const v = s.values[gi], y = base - (v / max) * (base - top), x = x0 + si * (bw + gapB);
        out += `<path d="${topRound(x, y, bw, base)}" fill="${COLORS[si]}"/>` + text(x + bw / 2, y - 4, v, 'middle', 'var(--chalk)', 10);
      });
      out += text(4 + gi * gw + gw / 2, H - 7, g, 'middle', 'var(--chalk-dim)', 11);
    });
    return `${legend(series.map(s => s.name))}<svg class="dr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${out}</svg>`;
  }

  function lineChart(months, series, lo, hi) {
    const W = 340, H = 240, L = 30, Rt = 44, T = 10, B = 22;
    const y = v => T + ((hi - v) / (hi - lo)) * (H - T - B);
    const x = i => L + 12 + (i * (W - L - Rt - 12)) / (months.length - 1);   // clear of the axis labels
    let out = '';
    for (let v = lo; v <= hi; v += 10) {
      out += `<line x1="${L}" x2="${W - Rt}" y1="${y(v)}" y2="${y(v)}" stroke="var(--panel-border)"/>` + text(L - 5, y(v) + 3.5, v, 'end');
    }
    months.forEach((m, i) => { out += text(x(i), H - 7, m, 'middle', 'var(--chalk-dim)', 11); });
    series.forEach((s, si) => {
      out += `<polyline fill="none" stroke="${COLORS[si]}" stroke-width="2" stroke-linejoin="round" points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}"/>`;
    });
    series.forEach((s, si) => {
      out += s.values.map((v, i) => marker(x(i), y(v), si)).join('');
      out += text(W - Rt + 8, y(s.values[s.values.length - 1]) + 3.5, s.name, 'start', 'var(--chalk)', 10);
    });
    return `${legend(series.map(s => s.name), true)}<svg class="dr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Line chart">${out}</svg>`;
  }

  function hBars(names, series) {
    const W = 340, rowH = 36, H = names.length * rowH + 4, L = 86, Rt = 36;
    const max = Math.max(...series.flatMap(s => s.values));
    let out = `<line x1="${L}" x2="${L}" y1="0" y2="${H}" stroke="var(--chalk-dim)"/>`;
    names.forEach((n, ni) => {
      const y0 = ni * rowH + 5;
      out += text(L - 7, y0 + 16, n, 'end', 'var(--chalk-dim)', 11);
      series.forEach((s, si) => {
        const v = s.values[ni], w = (v / max) * (W - L - Rt), y = y0 + si * 14;
        out += `<rect x="${L}" y="${y}" width="${w}" height="12" rx="2" fill="${COLORS[si]}"/>` + text(L + w + 5, y + 10, `${v}%`, 'start', 'var(--chalk)', 10);
      });
    });
    return `${legend(series.map(s => s.name))}<svg class="dr-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Allocation chart">${out}</svg>`;
  }

  const poss = n => (n.endsWith('s') ? `${n}'` : `${n}'s`);
  const table = (head, rows) => `<div class="table-wrap"><table class="book-table dr-table"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.map(r => `<tr>${r.map((c, i) => `<td${i ? '' : ' class="dr-rowh"'}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  // A clear winner only: a near-tie would just be a calculator-precision question
  function winner(names, scores, margin) {
    const order = names.map((n, i) => [n, scores[i]]).sort((a, b) => b[1] - a[1]);
    return order[0][1] - order[1][1] >= margin ? order[0][0] : null;
  }

  const TICKERS = ['ORCA', 'ZNTH', 'KLVR', 'BRIX', 'MYRA', 'FJRD', 'LUMA', 'VANT', 'TALO', 'NOVX'];

  // ================== EXHIBITS ==================
  // Each returns { kind, title, html, s: [standard templates], h: [hard templates] }
  function revenueTable(hard) {
    const names = sample(['Retail', 'Wholesale', 'Online', 'Licensing', 'Services', 'Hardware', 'Advisory'], 5);
    const y0 = R(2018, 2021), years = [0, 1, 2, 3].map(i => y0 + i);
    const step = hard ? 1 : 5;
    const v = names.map(() => {
      let x = R(30, 180) * 5;
      return years.map(() => { const out = Math.max(step * 8, Math.round(x / step) * step); x *= 0.82 + rnd() * 0.5; return out; });
    });
    const yt = j => total(v.map(r => r[j]));
    const tkr = P(TICKERS);
    const pickI = () => R(0, 4);
    const pair = () => { const a = R(0, 2); return [a, R(a + 1, 3)]; };
    const two = () => sample([0, 1, 2, 3, 4], 2);
    const s = [
      () => { const d = pickI(), [a, b] = pair(), A = v[d][a], B = v[d][b]; if (A === B) return null;
        const up = B > A; return N(`By what percentage did ${names[d]} revenue ${up ? 'increase' : 'decrease'} from ${years[a]} to ${years[b]}? (1 d.p.)`, Math.abs(B - A) / A * 100, PCT,
          [Math.abs(B - A) / B * 100, B / A * 100, Math.abs(B - A) / 10], `(${B} − ${A}) ÷ ${A} × 100. Divide by the starting year.`); },
      () => { const [x, y] = two(), j = R(0, 3); const hi = v[x][j] >= v[y][j] ? x : y, lo = hi === x ? y : x; if (v[hi][j] === v[lo][j]) return null;
        return N(`How much more revenue did ${names[hi]} make than ${names[lo]} in ${years[j]}?`, v[hi][j] - v[lo][j], MN, [v[hi][j] + v[lo][j], v[hi][(j + 1) % 4] - v[lo][(j + 1) % 4]], `${v[hi][j]} − ${v[lo][j]}.`); },
      () => { const d = pickI(), j = R(0, 3); return N(`What share of ${tkr}'s total ${years[j]} revenue came from ${names[d]}? (1 d.p.)`, v[d][j] / yt(j) * 100, PCT,
        [v[d][j] / (yt(j) - v[d][j]) * 100, 100 - v[d][j] / yt(j) * 100, v[d][j] / yt((j + 1) % 4) * 100], `${v[d][j]} ÷ ${yt(j)} × 100.`); },
      () => { const d = pickI(); return N(`What was ${poss(names[d])} average annual revenue over the four years? (1 d.p.)`, total(v[d]) / 4, MN1,
        [total(v[d]) / 3, total(v[d]) / 5, (v[d][0] + v[d][3]) / 3], `${total(v[d])} ÷ 4.`); },
      () => { const j = R(0, 3); return N(`What was ${tkr}'s total revenue in ${years[j]}?`, yt(j), MN, [yt((j + 1) % 4), yt(j) - v[0][j], yt(j) + v[1][j]], `Add all five divisions: ${v.map(r => r[j]).join(' + ')}.`); },
      () => { const [a, b] = pair(); const g = v.map(r => (r[b] - r[a]) / r[a]); const w = winner(names, g, 0.03); if (!w) return null;
        return C(`Which division had the largest percentage growth from ${years[a]} to ${years[b]}?`, names, w, `Compare (later − earlier) ÷ earlier for each. Biggest in dollars isn't always biggest in percent.`); },
    ];
    const h = [
      () => { const d = pickI(), A2 = v[d][2], B2 = v[d][3]; if (A2 === B2) return null;
        return N(`If ${names[d]} grows by the same percentage from ${years[3]} to ${years[3] + 1} as from ${years[2]} to ${years[3]}, what is its ${years[3] + 1} revenue? (nearest $m)`, B2 * B2 / A2, MN,
          [B2 + (B2 - A2), A2 + (B2 - A2) / 2, B2 * 1.1], `Growth factor ${B2} ÷ ${A2}, applied to ${B2}. Adding the same dollars again is the trap.`); },
      () => { const d = pickI(), [a, b] = pair(); const sa = v[d][a] / yt(a) * 100, sb = v[d][b] / yt(b) * 100; if (Math.abs(sb - sa) < 0.4) return null;
        return N(`By how many percentage points did ${poss(names[d])} share of total revenue ${sb > sa ? 'rise' : 'fall'} from ${years[a]} to ${years[b]}? (1 d.p.)`, Math.abs(sb - sa), { suf: ' pts', dp: 1 },
          [Math.abs(sb - sa) / sa * 100, Math.abs(v[d][b] - v[d][a]) / v[d][a] * 100], `Share ${years[b]} (${sb.toFixed(1)}%) minus share ${years[a]} (${sa.toFixed(1)}%). Percentage points aren't percent change.`); },
      () => { const [x, y] = two(), j = R(0, 3); const c = v[x][j] + v[y][j]; return N(`In ${years[j]}, ${names[x]} and ${names[y]} combined were what percentage of the other three divisions together? (1 d.p.)`, c / (yt(j) - c) * 100, PCT,
        [c / yt(j) * 100, (yt(j) - c) / c * 100], `${c} ÷ (${yt(j)} − ${c}) × 100.`); },
      () => { const g = v.map((r, i) => r[3] / yt(3) - r[0] / yt(0)); const w = winner(names, g, 0.01); if (!w) return null;
        return C(`Which division gained the most share of total revenue from ${years[0]} to ${years[3]}?`, names, w, `Work out each division's share in both years and compare the change in points.`); },
    ];
    return { kind: 'Revenue table', title: `${tkr} Group: revenue by division ($m)`, html: table(['Division', ...years], names.map((n, i) => [n, ...v[i]])), s, h };
  }

  function unitsChart(hard) {
    const q = ['Q1', 'Q2', 'Q3', 'Q4'];
    const names = sample(['Alpha', 'Bravo', 'Delta', 'Sigma', 'Omega'], 3);
    const v = names.map(() => q.map(() => R(4, 28) * 5 + (hard ? R(-4, 4) : 0)));
    const price = names.map(() => (hard ? R(6, 48) : R(2, 10) * 5));
    const qt = j => total(v.map(r => r[j]));
    const qrev = j => total(v.map((r, i) => r[j] * price[i]));
    const yrev = total(q.map((_, j) => qrev(j)));
    const pi = () => R(0, 2), qi = () => R(0, 3);
    const s = [
      () => { const p = pi(); return N(`How many ${names[p]} units were sold over the whole year? (thousands)`, total(v[p]), K, [total(v[p]) - v[p][0], total(v[p]) + v[(p + 1) % 3][0], total(v[p]) / 4], `${v[p].join(' + ')}.`); },
      () => { const p = pi(), a = R(0, 2), b = R(a + 1, 3), A = v[p][a], B = v[p][b]; if (A === B) return null; return N(`By what percentage did ${names[p]} sales ${B > A ? 'rise' : 'fall'} from ${q[a]} to ${q[b]}? (1 d.p.)`, Math.abs(B - A) / A * 100, PCT, [Math.abs(B - A) / B * 100, B / A * 100], `(${B} − ${A}) ÷ ${A} × 100.`); },
      () => { const p = pi(), j = qi(); return N(`What was ${poss(names[p])} revenue in ${q[j]}? (thousands)`, v[p][j] * price[p], { pre: '$', suf: 'k', dp: 0 }, [v[p][j] * price[(p + 1) % 3], v[(p + 1) % 3][j] * price[p], v[p][(j + 1) % 4] * price[p]], `${v[p][j]}k units × $${price[p]}.`); },
      () => { const [x, y] = sample([0, 1, 2], 2), j = qi(); return N(`In ${q[j]}, how many ${names[x]} units were sold for every ${names[y]} unit? (2 d.p.)`, v[x][j] / v[y][j], { dp: 2 }, [v[y][j] / v[x][j], v[x][(j + 1) % 4] / v[y][(j + 1) % 4]], `${v[x][j]} ÷ ${v[y][j]}.`); },
      () => { const w = winner(q, q.map((_, j) => qt(j)), 5); if (!w) return null; return C('In which quarter were the most units sold in total?', q, w, 'Add the three bars in each quarter.'); },
      () => { const j = qi(); return N(`What were total units sold in ${q[j]}? (thousands)`, qt(j), K, [qt((j + 1) % 4), qt(j) - v[0][j]], `${v.map(r => r[j]).join(' + ')}.`); },
    ];
    const h = [
      () => { const j = qi(); return N(`What was total revenue in ${q[j]}? (thousands)`, qrev(j), { pre: '$', suf: 'k', dp: 0 }, [qrev((j + 1) % 4), qrev(j) - v[0][j] * price[0], qt(j) * price[0]], `Units × price for each product, then add.`); },
      () => { const j = qi(); return N(`What was the average revenue per unit sold in ${q[j]}? (2 d.p.)`, qrev(j) / qt(j), USD2, [total(price) / 3, qrev((j + 1) % 4) / qt((j + 1) % 4)], `Total revenue ÷ total units: the simple average of the prices is the trap.`); },
      () => { const w = winner(q, q.map((_, j) => qrev(j)), qrev(0) * 0.02); if (!w) return null; return C('In which quarter was total revenue highest?', q, w, 'Weight each bar by its price: the busiest quarter by units may not win.'); },
      () => { const p = pi(); const r = total(v[p]) * price[p]; return N(`What percentage of the year's revenue came from ${names[p]}? (1 d.p.)`, r / yrev * 100, PCT, [total(v[p]) / total(q.map((_, j) => qt(j))) * 100, 100 - r / yrev * 100], `${names[p]} revenue ÷ revenue of all three. Units share is the trap.`); },
    ];
    return {
      kind: 'Bar chart',
      title: 'Units sold by quarter (thousands)',
      html: `${barChart(q, names.map((n, i) => ({ name: n, values: v[i] })))}<p class="dr-note">Price per unit: ${names.map((n, i) => `${n} $${price[i]}`).join(' · ')}</p>`,
      s, h,
    };
  }

  function allocation(hard) {
    const names = sample(['Equities', 'Bonds', 'Credit', 'Property', 'Commods', 'Cash'], 5);
    const split = () => {
      for (;;) {
        const unit = hard ? 1 : 5;
        const v = [0, 0, 0, 0].map(() => R(Math.ceil(8 / unit), Math.floor(36 / unit)) * unit);
        const last = 100 - total(v);
        if (last >= 6 && last <= 40) return [...v, last];
      }
    };
    const a = split(), b = split();
    const A = R(12, 80) * 10, B = A + R(-6, 20) * 10;
    if (B <= 0 || B === A) return allocation(hard);
    const amtA = i => a[i] / 100 * A, amtB = i => b[i] / 100 * B;
    const pick = () => R(0, 4);
    const ser = [['January', a, A], ['December', b, B]];
    const s = [
      () => { const i = pick(), [lbl, w, T] = P(ser); return N(`How much was held in ${names[i]} in ${lbl}? (1 d.p.)`, w[i] / 100 * T, MN1, [w[i] / 100 * (T === A ? B : A), w[i] * 10, T - w[i] / 100 * T], `${w[i]}% × $${T}m.`); },
      () => { const i = pick(); if (Math.abs(amtB(i) - amtA(i)) < 1) return null; return N(`By how much did the ${names[i]} holding ${amtB(i) > amtA(i) ? 'rise' : 'fall'} from January to December? (1 d.p.)`, Math.abs(amtB(i) - amtA(i)), MN1, [Math.abs(b[i] - a[i]) / 100 * A, Math.abs(b[i] - a[i]) / 100 * B], `December ${amtB(i).toFixed(1)} minus January ${amtA(i).toFixed(1)}. Totals differ, so subtracting percentages is the trap.`); },
      () => { const [x, y] = sample([0, 1, 2, 3, 4], 2), [lbl, w, T] = P(ser); return N(`What was the combined value of ${names[x]} and ${names[y]} in ${lbl}? (1 d.p.)`, (w[x] + w[y]) / 100 * T, MN1, [(w[x] + w[y]) / 100 * (T === A ? B : A), w[x] / 100 * T], `(${w[x]}% + ${w[y]}%) × $${T}m.`); },
      () => N(`By what percentage did total fund value ${B > A ? 'grow' : 'shrink'} over the year? (1 d.p.)`, Math.abs(B - A) / A * 100, PCT, [Math.abs(B - A) / B * 100, B / A * 100], `(${B} − ${A}) ÷ ${A} × 100.`),
      () => { const [x, y] = sample([0, 1, 2, 3, 4], 2), [lbl, w, T] = P(ser); if (w[x] === w[y]) return null; const hi = w[x] > w[y] ? x : y, lo = hi === x ? y : x; return N(`How much more was in ${names[hi]} than ${names[lo]} in ${lbl}? (1 d.p.)`, (w[hi] - w[lo]) / 100 * T, MN1, [w[hi] - w[lo], (w[hi] + w[lo]) / 100 * T], `(${w[hi]}% − ${w[lo]}%) × $${T}m.`); },
    ];
    const h = [
      () => { const i = pick(); if (Math.abs(amtB(i) - amtA(i)) / amtA(i) < 0.01) return null; return N(`By what percentage did the dollar value of ${names[i]} ${amtB(i) > amtA(i) ? 'rise' : 'fall'} over the year? (1 d.p.)`, Math.abs(amtB(i) - amtA(i)) / amtA(i) * 100, PCT, [Math.abs(b[i] - a[i]) / a[i] * 100, Math.abs(b[i] - a[i]), Math.abs(amtB(i) - amtA(i)) / amtB(i) * 100], `Convert both to dollars first: ${amtA(i).toFixed(1)} to ${amtB(i).toFixed(1)}. A share can fall while the dollars rise.`); },
      () => { const w = winner(names, names.map((_, i) => amtB(i) - amtA(i)), 2); if (!w) return null; return C('Which holding rose the most in dollar terms over the year?', names, w, 'Multiply each share by its fund total, then compare December minus January.'); },
      () => { const i = pick(), add = R(2, 12) * 10; return N(`If $${add}m of new money in December all went into ${names[i]}, what would its share of the fund be? (1 d.p.)`, (amtB(i) + add) / (B + add) * 100, PCT, [(amtB(i) + add) / B * 100, b[i] + add / B * 100], `(${amtB(i).toFixed(1)} + ${add}) ÷ (${B} + ${add}). The total grows too.`); },
    ];
    return { kind: 'Allocation chart', title: `Fund allocation · January $${A}m · December $${B}m`, html: hBars(names, [{ name: 'January', values: a }, { name: 'December', values: b }]), s, h };
  }

  function fxTable(hard) {
    const base = { EUR: [0.86, 0.97, 2], GBP: [0.72, 0.84, 2], JPY: [130, 158, 0], CHF: [0.82, 0.96, 2], AUD: [1.38, 1.58, 2] };
    const codes = sample(Object.keys(base), 4);
    const rate = {};
    codes.forEach(c => { const [lo, hi, dp] = base[c]; rate[c] = rd(lo + rnd() * (hi - lo), dp); });
    const fee = hard ? R(3, 9) / 4 : R(1, 4) / 2;   // % commission
    const money = c => ({ pre: `${c} `, dp: c === 'JPY' ? 0 : 2 });
    const usdAmt = () => R(hard ? 7 : 2, hard ? 95 : 40) * (hard ? 130 : 500);
    const nonYen = () => P(codes.filter(c => c !== 'JPY').concat(codes.filter(c => c !== 'JPY')));
    const s = [
      () => { const c = P(codes), a = usdAmt(); return N(`How much is $${num(a)} in ${c}?`, a * rate[c], money(c), [a / rate[c], a * rate[c] * 1.1, a * rate[codes[(codes.indexOf(c) + 1) % 4]]], `$${num(a)} × ${rate[c]}.`); },
      () => { const c = P(codes), a = R(2, 40) * (c === 'JPY' ? 50000 : 500); return N(`How many US dollars is ${c} ${num(a)}?`, a / rate[c], USD2, [a * rate[c], a / rate[c] * 1.08], `${num(a)} ÷ ${rate[c]}.`); },
      () => { const [x, y] = sample(codes, 2); return N(`Using these rates, 1 ${x} is worth how many ${y}? (${y === 'JPY' ? '1' : '3'} d.p.)`, rate[y] / rate[x], { pre: `${y} `, dp: y === 'JPY' ? 1 : 3 }, [rate[x] / rate[y], rate[y] * rate[x]], `${rate[y]} ÷ ${rate[x]}. Both quotes are per dollar.`); },
      () => { const a = usdAmt(); return N(`What is the commission on converting $${num(a)}?`, a * fee / 100, USD2, [a * fee / 10, a * fee / 1000, a * (fee + 1) / 100], `$${num(a)} × ${fee}%.`); },
      () => { const c = nonYen(), a = usdAmt(); return N(`After commission is deducted first, how much ${c} do you receive for $${num(a)}?`, a * (1 - fee / 100) * rate[c], money(c), [a * rate[c], a * (1 + fee / 100) * rate[c], a * rate[c] - a * fee / 100], `$${num(a)} × (1 − ${fee}%) × ${rate[c]}.`); },
    ];
    const h = [
      () => { const [x, y] = sample(codes.filter(c => c !== 'JPY'), 2), a = R(11, 95) * 110; return N(`You convert ${x} ${num(a)} to ${y}, with commission deducted from the ${x} first. How much ${y} do you receive?`, a * (1 - fee / 100) * rate[y] / rate[x], money(y), [a * rate[y] / rate[x], a * (1 - fee / 100) * rate[x] / rate[y], a * (1 - fee / 100) * rate[y]], `${num(a)} × (1 − ${fee}%) × ${rate[y]} ÷ ${rate[x]}.`); },
      () => { const a = usdAmt(); return N(`You convert $${num(a)} into a foreign currency and straight back at the same rate, paying commission each way. How many dollars do you lose?`, a * (1 - (1 - fee / 100) ** 2), USD2, [a * fee / 100, a * fee / 100 * 3, a * (fee / 100) ** 2], `$${num(a)} × (1 − (1 − ${fee}%)²). Commission compounds, and the rate cancels.`); },
      () => { const c = nonYen(), target = R(3, 40) * 500; return N(`How many dollars must you hand over to receive exactly ${c} ${num(target)} after commission?`, target / rate[c] / (1 - fee / 100), USD2, [target / rate[c], target / rate[c] * (1 + fee / 100), target * rate[c] / (1 - fee / 100)], `${num(target)} ÷ ${rate[c]} ÷ (1 − ${fee}%). Grossing up isn't adding ${fee}%.`); },
    ];
    return { kind: 'FX table', title: `Desk FX rates · commission ${fee}% of amount converted`, html: table(['Currency', '1 USD buys'], codes.map(c => [c, rate[c]])), s, h };
  }

  function deskTable(hard) {
    const names = sample(['Rates', 'Credit', 'FX', 'Equities', 'Commods', 'Vol'], 5);
    const d = names.map(() => ({ trades: R(5, 40) * 40, win: R(8, 14) * 5, avgW: R(hard ? 110 : 12, hard ? 890 : 80) * (hard ? 1 : 10), avgL: R(hard ? 90 : 10, hard ? 760 : 60) * (hard ? 1 : 10) }));
    const wins = i => d[i].trades * d[i].win / 100;
    const losses = i => d[i].trades - wins(i);
    const net = i => wins(i) * d[i].avgW - losses(i) * d[i].avgL;
    const all = total(d.map(x => x.trades));
    const pick = () => R(0, 4);
    const s = [
      () => { const i = pick(); return N(`How many winning trades did ${names[i]} make?`, wins(i), COUNT, [losses(i), d[i].trades * (d[i].win + 5) / 100], `${num(d[i].trades)} × ${d[i].win}%.`); },
      () => { const i = pick(); return N(`What was ${poss(names[i])} total profit from winning trades?`, wins(i) * d[i].avgW, USD, [d[i].trades * d[i].avgW, losses(i) * d[i].avgW, wins(i) * d[i].avgL], `${num(wins(i))} wins × $${d[i].avgW}.`); },
      () => { const i = pick(); return N(`What was ${poss(names[i])} total loss from losing trades?`, losses(i) * d[i].avgL, USD, [d[i].trades * d[i].avgL, wins(i) * d[i].avgL, losses(i) * d[i].avgW], `${num(losses(i))} losses × $${d[i].avgL}.`); },
      () => { const [x, y] = sample([0, 1, 2, 3, 4], 2); return N(`How many losing trades did ${names[x]} and ${names[y]} make in total?`, losses(x) + losses(y), COUNT, [wins(x) + wins(y), losses(x) + wins(y)], `${num(losses(x))} + ${num(losses(y))}.`); },
      () => { const i = pick(); return N(`What percentage of all trades were made by ${names[i]}? (1 d.p.)`, d[i].trades / all * 100, PCT, [d[i].trades / (all - d[i].trades) * 100, wins(i) / all * 100], `${num(d[i].trades)} ÷ ${num(all)} × 100.`); },
    ];
    const h = [
      () => { const i = pick(); return N(`What was ${poss(names[i])} net P&L?`, net(i), { ...USD, signed: true }, [wins(i) * d[i].avgW, wins(i) * d[i].avgW + losses(i) * d[i].avgL, d[i].trades * (d[i].avgW - d[i].avgL)], `Wins × avg win − losses × avg loss.`); },
      () => { const margin = Math.abs(net(0)) * 0.03 + 200; const w = winner(names, names.map((_, i) => net(i)), margin); if (!w) return null; return C('Which desk had the highest net P&L?', names, w, 'Work out wins × avg win − losses × avg loss for each desk. Highest win rate need not win.'); },
      () => { const i = pick(); return N(`What was ${poss(names[i])} average P&L per trade? (2 d.p.)`, net(i) / d[i].trades, { ...USD2, signed: true }, [d[i].avgW - d[i].avgL, net(i) / wins(i)], `Net P&L ÷ all ${num(d[i].trades)} trades.`); },
      () => { const i = pick(); return N(`At ${poss(names[i])} average win and loss sizes, what win rate would exactly break even? (1 d.p.)`, d[i].avgL / (d[i].avgW + d[i].avgL) * 100, PCT, [d[i].avgW / (d[i].avgW + d[i].avgL) * 100, d[i].avgL / d[i].avgW * 100], `Avg loss ÷ (avg win + avg loss) = ${d[i].avgL} ÷ ${d[i].avgW + d[i].avgL}.`); },
    ];
    return { kind: 'Desk table', title: 'Trading desks: last quarter', html: table(['Desk', 'Trades', 'Win rate', 'Avg win', 'Avg loss'], names.map((n, i) => [n, num(d[i].trades), `${d[i].win}%`, `$${d[i].avgW}`, `$${d[i].avgL}`])), s, h };
  }

  function priceChart() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const names = sample(TICKERS, 3);
    // Prices sit on the gridlines, and no two lines share a point
    const v = names.map(() => []);
    months.forEach((_, j) => {
      const used = new Set();
      names.forEach((__, i) => {
        let x;
        do { x = j ? Math.max(30, Math.min(130, v[i][j - 1] + R(-3, 3) * 10)) : R(4, 12) * 10; if (used.has(x)) x = R(3, 13) * 10; } while (used.has(x));
        used.add(x);
        v[i].push(x);
      });
    });
    const flat = v.flat();
    const lo = Math.max(0, Math.min(...flat) - 10), hi = Math.max(...flat) + 10;
    const pairs = months.slice(1).map((m, j) => `${months[j]} to ${m}`);
    const rising = i => { const out = []; for (let a = 0; a < 5; a++) for (let b = a + 1; b < 6; b++) if (v[i][b] > v[i][a]) out.push([a, b]); return out; };
    const pi = () => R(0, 2);
    const s = [
      () => { const i = pi(), a = R(0, 4), b = R(a + 1, 5), A = v[i][a], B = v[i][b]; if (A === B) return null; return N(`By what percentage did ${names[i]} ${B > A ? 'rise' : 'fall'} from ${months[a]} to ${months[b]}? (1 d.p.)`, Math.abs(B - A) / A * 100, PCT, [Math.abs(B - A) / B * 100, Math.abs(B - A), B / A * 100], `Read ${A} and ${B}: (${B} − ${A}) ÷ ${A} × 100.`); },
      () => { const i = pi(), r = rising(i); if (!r.length) return null; const [a, b] = P(r), n = R(1, 9) * 50; return N(`You bought ${n} ${names[i]} shares at the end of ${months[a]} and sold at the end of ${months[b]}. What was your profit?`, n * (v[i][b] - v[i][a]), USD, [n * v[i][b], n * (v[i][b] - v[i][a] + 10), n * (v[i][b] - v[i][a] - 10)], `${n} × (${v[i][b]} − ${v[i][a]}).`); },
      () => { const i = pi(); const w = winner(pairs, pairs.map((_, j) => v[i][j + 1] - v[i][j]), 10); if (!w) return null; return C(`In which month did ${names[i]} have its largest dollar rise?`, pairs, w, 'Compare the step between each pair of points.'); },
      () => { const j = R(0, 5), [x, y] = sample([0, 1, 2], 2); return N(`What was the price gap between ${names[x]} and ${names[y]} at the end of ${months[j]}?`, Math.abs(v[x][j] - v[y][j]), USD, [v[x][j] + v[y][j], Math.abs(v[x][(j + 1) % 6] - v[y][(j + 1) % 6]) + 10], `|${v[x][j]} − ${v[y][j]}|.`); },
      () => { const i = pi(); return N(`What was ${poss(names[i])} average month-end price? (1 d.p.)`, total(v[i]) / 6, { pre: '$', dp: 1 }, [total(v[i]) / 5, (v[i][0] + v[i][5]) / 2 + 5], `${v[i].join(' + ')} = ${total(v[i])}, ÷ 6.`); },
    ];
    const h = [
      () => { const [x, y] = sample([0, 1, 2], 2), a = R(0, 2), b = R(3, 5), nx = R(1, 6) * 100, ny = R(1, 6) * 100; const A = nx * v[x][a] + ny * v[y][a], B = nx * v[x][b] + ny * v[y][b]; if (A === B) return null;
        return N(`A portfolio holds ${nx} ${names[x]} and ${ny} ${names[y]}. By what percentage did its value ${B > A ? 'rise' : 'fall'} from ${months[a]} to ${months[b]}? (1 d.p.)`, Math.abs(B - A) / A * 100, PCT, [Math.abs(((v[x][b] - v[x][a]) / v[x][a] + (v[y][b] - v[y][a]) / v[y][a]) / 2 * 100) + 0.8, Math.abs(B - A) / B * 100], `Value then: ${num(A)}, value later: ${num(B)}. Averaging the two percent moves ignores the weights.`); },
      () => { const i = pi(), a = R(0, 1), b = R(3, 5), A = v[i][a], B = v[i][b]; if (A === B) return null; const steps = b - a; return N(`What constant monthly dollar change would take ${names[i]} from its ${months[a]} price to its ${months[b]} price? (2 d.p., size only)`, Math.abs(B - A) / steps, USD2, [Math.abs(B - A) / (steps + 1), Math.abs(B - A)], `|${B} − ${A}| over ${steps} monthly steps, not ${steps + 1} months.`); },
    ];
    return { kind: 'Line chart', title: 'Month-end share prices ($)', html: lineChart(months, names.map((n, i) => ({ name: n, values: v[i] })), lo, hi), s, h };
  }

  const EXHIBITS = [revenueTable, unitsChart, allocation, fxTable, deskTable, priceChart];

  // Pick `count` questions from a fresh exhibit
  function fromExhibit(make, hard, count) {
    for (let tries = 0; tries < 200; tries++) {
      const ex = make(hard);
      const order = hard ? [...shuffled(ex.h), ...shuffled(ex.s)] : shuffled(ex.s);
      const out = [];
      for (const fn of order) {
        if (out.length >= count) break;
        const def = fn();
        if (!def) continue;
        const opts = buildOptions(def);
        if (!opts) continue;
        out.push({ text: def.text, how: def.how, options: opts.list, answerIndex: opts.answerIndex, exhibit: ex });
      }
      if (out.length === count) return out;
    }
    throw new Error('Could not build exhibit questions');
  }

  // 20 questions: every exhibit type once, two of them get a fourth question
  function run(level, source) {
    rnd = source || Math.random;
    const hard = level === 'hard';
    const counts = shuffled([4, 4, 3, 3, 3, 3]);
    return shuffled(EXHIBITS).flatMap((make, i) => fromExhibit(make, hard, counts[i]));
  }

  return { run };
})();

if (typeof module !== 'undefined') module.exports = DataGen;

// ================================================================
//  GAME  (browser only)
// ================================================================
if (typeof document !== 'undefined') (() => {
  const N_Q = 20;
  const SECS = { standard: 1200, hard: 900 };
  const KEY = 'pitboard-data';
  let level = store.get(KEY, 'standard');
  if (!SECS[level]) level = 'standard';
  let g = null;

  const board = () => ({ mode: 'data', difficulty: level, rounds: N_Q });
  const clock = t => `${Math.floor(Math.max(0, t) / 60)}:${String(Math.max(0, t) % 60).padStart(2, '0')}`;
  const secsLeft = () => Math.max(0, Math.ceil((g.endAt - Date.now()) / 1000));

  // Register with the lobby and leaderboard (see games.js currentBoard / openGame)
  GAMES.data = {
    sym: 'DATA', short: 'Data', name: 'Data Room', color: '#6FC3DF',
    blurb: 'Read tables and charts, calculator allowed',
    filters: [{ key: 'difficulty', options: [['standard', '20 in 20 min'], ['hard', 'Hard · 20 in 15 min']] }],
    fmt: s => `${s} / ${N_Q}`,
    board,
    open: () => { renderSetup(); showScreen('drSetup'); },
  };

  document.head.insertAdjacentHTML('beforeend', `<style>
    .dr-body{ display: flex; flex-direction: column; gap: 10px; padding: 10px 0 calc(16px + env(safe-area-inset-bottom)); }
    .dr-body.calc-open{ padding-bottom: 370px; }
    .dr-strip{ display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; }
    .dr-strip button{ padding: 5px 0; font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--chalk-dim); background: var(--panel); border: 1px solid var(--panel-border); border-radius: 4px; }
    .dr-strip button.done{ color: var(--board); background: var(--amber); border-color: var(--amber); }
    .dr-strip button.cur{ border-color: var(--chalk); box-shadow: 0 0 0 1px var(--chalk); }
    .dr-exhibit{ background: var(--panel); border: 1px solid var(--panel-border); border-radius: var(--radius); padding: 10px; }
    .dr-title{ font-size: 13px; font-weight: 700; margin-bottom: 6px; }
    .dr-svg{ display: block; width: 100%; height: auto; font-family: var(--mono); }
    .dr-legend{ display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 12px; color: #CFCCC5; margin-bottom: 4px; }
    .dr-legend span{ display: inline-flex; align-items: center; gap: 5px; }
    .dr-note{ margin: 6px 0 0; font-size: 12px; color: #CFCCC5; font-family: var(--mono); }
    .dr-table{ margin: 0; font-family: var(--mono); }
    .dr-table th:not(:first-child), .dr-table td:not(:first-child){ text-align: right; }
    .dr-rowh{ font-family: var(--sans); font-weight: 600; }
    .dr-q{ margin: 2px 0; font-size: 16px; font-weight: 700; line-height: 1.35; }
    #drOptions .sr-opt.picked{ border-color: var(--amber); background: linear-gradient(180deg, #3A3223, var(--panel)); }
    #drOptions .sr-val{ font-size: 17px; }
    #drOptions .sr-opt{ min-height: 44px; }
    .dr-nav{ display: grid; grid-template-columns: 1fr 1fr 56px; gap: 8px; }
    .dr-nav .btn{ padding: 12px 0; flex: none; }
    .dr-calc{ position: fixed; left: 50%; bottom: 0; transform: translateX(-50%); z-index: 20; width: min(100%, 520px); padding: 10px 14px calc(12px + env(safe-area-inset-bottom)); background: var(--panel-2); border-top: 1px solid var(--panel-border); box-shadow: 0 -6px 18px rgba(0,0,0,.45); }
    .dr-calc-expr{ min-height: 16px; text-align: right; font-family: var(--mono); font-size: 12px; color: var(--chalk-dim); }
    .dr-calc-screen{ text-align: right; font-family: var(--mono); font-size: 26px; font-weight: 700; padding: 2px 4px 8px; overflow: hidden; white-space: nowrap; }
    .dr-keys{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .dr-keys button{ padding: 11px 0; font-family: var(--mono); font-size: 18px; font-weight: 700; background: var(--panel); border: 1px solid var(--panel-border); border-radius: var(--radius); }
    .dr-keys button.op{ color: var(--amber); }
    .dr-keys button.wide{ grid-column: span 2; }
    .dr-review summary{ cursor: pointer; font-size: 12px; font-weight: 700; color: var(--chalk-dim); margin-top: 4px; }
    .dr-review .dr-exhibit{ margin-top: 6px; background: var(--board); }
  </style>`);

  document.getElementById('app').insertAdjacentHTML('beforeend', `
  <section id="drSetup" class="screen" hidden>
    <header class="topbar">
      <button class="icon-btn" id="drBack" aria-label="Back to games">←</button>
      <div class="round-indicator">DATA · Data Room</div>
    </header>
    <div class="setup-body">
      <p class="field-help">The classic numerical reasoning test: read each table or chart and pick the right answer from 5 options. A calculator is built in, just like the real thing.</p>
      <div class="field">
        <div class="field-label">Level</div>
        <div class="seg seg-2" id="drLevel">
          <button data-value="standard"><strong>Standard</strong><small>20 questions · 20 min</small></button>
          <button data-value="hard"><strong>Hard</strong><small>Multi-step · 20 in 15 min</small></button>
        </div>
      </div>
      <div class="best-line" id="drBest"></div>
      <button class="btn btn-primary btn-start" id="drStart">Start</button>
      <button class="btn btn-ghost btn-leaders" id="drLeaders">🏆 Leaderboard</button>
      <details class="howto">
        <summary>How it works</summary>
        <div>
          <ul>
            <li>Every test uses new data: revenue tables, bar and line charts, fund allocations, FX rates and trading desk stats.</li>
            <li>Jump between questions with the numbers at the top and change any answer. Nothing is marked until you hand in.</li>
            <li>+1 for every correct answer and nothing off for wrong ones, so never leave one blank.</li>
            <li>Watch the base: percent change divides by the <b>starting</b> value, and percentage points aren't percent.</li>
            <li>The review shows the working for every question, with the exhibit one tap away.</li>
          </ul>
        </div>
      </details>
    </div>
  </section>

  <section id="drPlay" class="screen" hidden>
    <header class="topbar ms-top">
      <button class="icon-btn" id="drQuit" aria-label="Quit test">✕</button>
      <div class="round-indicator" id="drInfo"></div>
      <div class="timer" id="drTimer"></div>
    </header>
    <div class="dr-body" id="drBody">
      <div class="dr-strip" id="drStrip"></div>
      <div class="dr-exhibit" id="drExhibit"></div>
      <p class="dr-q" id="drQ"></p>
      <div class="sr-options" id="drOptions"></div>
      <div class="dr-nav">
        <button class="btn btn-ghost" id="drPrev">Back</button>
        <button class="btn btn-primary" id="drNext">Next</button>
        <button class="btn btn-ghost" id="drCalcBtn" aria-label="Calculator">🧮</button>
      </div>
      <button class="btn btn-ghost" id="drSubmit">Hand in</button>
    </div>
    <div class="dr-calc" id="drCalc" hidden>
      <div class="dr-calc-expr" id="drExpr"></div>
      <div class="dr-calc-screen" id="drScreen">0</div>
      <div class="dr-keys" id="drKeys">
        ${['C', '⌫', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '−', '1', '2', '3', '+', '0', '.', '='].map(k =>
          `<button data-k="${k}" class="${'÷×−+=C⌫%'.includes(k) ? 'op' : ''}${k === '0' ? ' wide' : ''}">${k}</button>`).join('')}
      </div>
    </div>
  </section>`);

  const $d = id => document.getElementById(id);

  // -------------------- SETUP --------------------
  function renderSetup() {
    $d('drLevel').querySelectorAll('button').forEach(b => {
      const on = b.dataset.value === level;
      b.classList.toggle('active', on);
      b.setAttribute('aria-pressed', on);
    });
    const best = store.get(boardBestKey(board()), null);
    $d('drBest').textContent = best === null ? 'No tests on this level yet' : `Your best: ${best} / ${N_Q}`;
  }

  // -------------------- CALCULATOR --------------------
  // Works left to right like a basic desk calculator, as in the real tests
  const calc = { acc: null, op: null, entry: '0', fresh: true };
  const tidy = v => String(Number(v.toPrecision(12)));
  function calcShow() {
    $d('drScreen').textContent = calc.entry;
    $d('drExpr').textContent = calc.op ? `${calc.acc} ${calc.op}` : '';
  }
  function calcReset() { Object.assign(calc, { acc: null, op: null, entry: '0', fresh: true }); calcShow(); }
  function compute() {
    const a = calc.acc, b = Number(calc.entry);
    const v = { '+': a + b, '−': a - b, '×': a * b, '÷': b === 0 ? NaN : a / b }[calc.op];
    if (!Number.isFinite(v)) { calcReset(); $d('drScreen').textContent = 'Error'; return false; }
    calc.entry = tidy(v);
    return true;
  }
  function calcKey(k) {
    if (/^[0-9]$/.test(k)) {
      if (calc.fresh) { calc.entry = k; calc.fresh = false; } else if (calc.entry.length < 13) calc.entry = calc.entry === '0' ? k : calc.entry + k;
    } else if (k === '.') {
      if (calc.fresh) { calc.entry = '0.'; calc.fresh = false; } else if (!calc.entry.includes('.')) calc.entry += '.';
    } else if (k === 'C') { calcReset(); return; }
    else if (k === '⌫') { if (!calc.fresh) calc.entry = calc.entry.length > 1 ? calc.entry.slice(0, -1) : '0'; }
    else if (k === '%') { calc.entry = tidy(Number(calc.entry) / 100); calc.fresh = true; }
    else if (k === '=') {
      if (calc.op) { if (!compute()) return; calc.op = null; calc.acc = null; }
      calc.fresh = true;
    } else {   // + − × ÷
      if (calc.op && !calc.fresh) { if (!compute()) return; }
      calc.acc = Number(calc.entry);
      calc.op = k;
      calc.fresh = true;
    }
    calcShow();
  }
  function toggleCalc(open) {
    const show = open === undefined ? $d('drCalc').hidden : open;
    $d('drCalc').hidden = !show;
    $d('drBody').classList.toggle('calc-open', show);
  }

  // -------------------- RUN --------------------
  function stop() {
    if (!g) return;
    clearInterval(g.timer);
    g = null;
    toggleCalc(false);
  }

  function start() {
    stop();
    const qs = DataGen.run(level).map(q => ({ ...q, given: null }));
    g = { level, qs, i: 0, secs: SECS[level], endAt: Date.now() + SECS[level] * 1000, timer: setInterval(tick, 250), lastEx: null };
    calcReset();
    showScreen('drPlay');
    render();
    tick();
  }

  function tick() {
    if (!g) return;
    const left = secsLeft();
    $d('drTimer').textContent = clock(left);
    $d('drTimer').classList.toggle('low', left <= 60);
    if (left <= 0) finish(true);
  }

  function render() {
    const q = g.qs[g.i];
    const answered = g.qs.filter(x => x.given !== null).length;
    $d('drInfo').textContent = `DATA · Q${g.i + 1} of ${N_Q} · ${answered} answered`;
    $d('drStrip').innerHTML = g.qs.map((x, i) => `<button data-i="${i}" class="${x.given !== null ? 'done' : ''}${i === g.i ? ' cur' : ''}">${i + 1}</button>`).join('');
    if (g.lastEx !== q.exhibit) {     // same exhibit: keep your place on the page
      $d('drExhibit').innerHTML = `<div class="dr-title">${q.exhibit.title}</div>${q.exhibit.html}`;
      if (g.lastEx) window.scrollTo(0, 0);
      g.lastEx = q.exhibit;
    }
    $d('drQ').textContent = q.text;
    $d('drOptions').innerHTML = q.options.map((o, i) =>
      `<button class="sr-opt${q.given === i ? ' picked' : ''}" data-i="${i}"><span class="sr-key">${'ABCDE'[i]}</span><span class="sr-val">${o}</span></button>`).join('');
    $d('drPrev').disabled = g.i === 0;
    $d('drPrev').style.opacity = g.i === 0 ? 0.4 : 1;
    $d('drNext').textContent = g.i === N_Q - 1 ? 'Last question' : 'Next';
    $d('drNext').disabled = g.i === N_Q - 1;
    $d('drNext').style.opacity = g.i === N_Q - 1 ? 0.5 : 1;
  }

  const go = i => { if (g && i >= 0 && i < N_Q) { g.i = i; render(); } };

  function submit() {
    if (!g) return;
    const blank = g.qs.filter(q => q.given === null).length;
    if (!confirm(blank ? `${blank} question${blank === 1 ? '' : 's'} still blank. Hand in anyway?` : 'Hand in your test?')) return;
    finish(false);
  }

  // -------------------- RESULTS --------------------
  function finish(timeUp) {
    if (!g) return;
    const run = g;
    const used = run.secs - secsLeft();
    stop();
    const answered = run.qs.filter(q => q.given !== null);
    const isRight = q => q.given === q.answerIndex;
    const right = answered.filter(isRight).length;
    const wrong = answered.length - right;
    const kinds = [...new Set(run.qs.map(q => q.exhibit.kind))];
    const byKind = kinds.map(k => {
      const rows = run.qs.filter(q => q.exhibit.kind === k);
      return `<tr><td>${k}</td><td>${rows.filter(isRight).length} / ${rows.length}</td></tr>`;
    }).join('');
    const items = run.qs.map((q, i) => {
      const status = q.given === null ? 'skip' : isRight(q) ? 'ok' : 'bad';
      return `
        <li class="sr-item ${status}">
          <div class="sr-item-head"><span>Q${i + 1} · ${q.exhibit.kind} <span class="sr-mark">${{ ok: '✓', bad: '✗', skip: '—' }[status]}</span></span><span class="sr-pts">${status === 'ok' ? '+1' : '0'}</span></div>
          <div class="dr-q" style="font-size:14px">${q.text}</div>
          <div class="sr-item-ans">
            ${status === 'ok' ? '' : `<span>You: <b class="${status === 'bad' ? 'neg' : ''}">${q.given === null ? 'blank' : q.options[q.given]}</b></span>`}
            <span>Answer: <b class="${status === 'ok' ? 'pos' : ''}">${q.options[q.answerIndex]}</b></span>
          </div>
          <small>${q.how}</small>
          <details class="dr-review"><summary>Show exhibit</summary><div class="dr-exhibit"><div class="dr-title">${q.exhibit.title}</div>${q.exhibit.html}</div></details>
        </li>`;
    }).join('');
    showSummary({
      board: { mode: 'data', difficulty: run.level, rounds: N_Q },
      score: right,
      title: timeUp ? 'Time called' : 'Test handed in',
      again: start,
      bodyHtml: `
        <div class="stat-grid">
          <div><span class="stat-lbl">Right</span><span class="stat-val pos">${right}</span></div>
          <div><span class="stat-lbl">Wrong</span><span class="stat-val neg">${wrong}</span></div>
          <div><span class="stat-lbl">Blank</span><span class="stat-val">${N_Q - answered.length}</span></div>
          <div><span class="stat-lbl">Accuracy</span><span class="stat-val">${answered.length ? `${Math.round((100 * right) / answered.length)}%` : '—'}</span></div>
          <div><span class="stat-lbl">Time used</span><span class="stat-val">${clock(used)}</span></div>
          <div><span class="stat-lbl">Per question</span><span class="stat-val">${Math.round(used / N_Q)}s</span></div>
        </div>
        <h4>By exhibit</h4>
        <div class="table-wrap"><table class="book-table"><tbody>${byKind}</tbody></table></div>
        <h4>Every question</h4>
        <ul class="sr-list">${items}</ul>`,
    });
  }

  function quit() {
    if (g && !confirm('Quit this test?')) return;
    stop();
    renderSetup();
    showScreen('drSetup');
  }

  // -------------------- INIT --------------------
  $d('drBack').addEventListener('click', goHome);
  $d('drLevel').addEventListener('click', e => {
    const b = e.target.closest('button[data-value]');
    if (!b) return;
    level = b.dataset.value;
    store.set(KEY, level);
    renderSetup();
  });
  $d('drStart').addEventListener('click', start);
  $d('drLeaders').addEventListener('click', () => openLeadersFor(board()));
  $d('drQuit').addEventListener('click', quit);
  $d('drSubmit').addEventListener('click', submit);
  $d('drPrev').addEventListener('click', () => g && go(g.i - 1));
  $d('drNext').addEventListener('click', () => g && go(g.i + 1));
  $d('drCalcBtn').addEventListener('click', () => toggleCalc());
  $d('drStrip').addEventListener('click', e => { const b = e.target.closest('button[data-i]'); if (b) go(Number(b.dataset.i)); });
  $d('drOptions').addEventListener('click', e => {
    const b = e.target.closest('.sr-opt');
    if (!b || !g) return;
    const q = g.qs[g.i], i = Number(b.dataset.i);
    q.given = q.given === i ? null : i;   // tap again to clear
    render();
  });
  $d('drKeys').addEventListener('click', e => { const b = e.target.closest('button[data-k]'); if (b) calcKey(b.dataset.k); });
  document.addEventListener('keydown', e => {
    if (!g || $d('drPlay').hidden || $d('drCalc').hidden) return;
    const map = { '*': '×', x: '×', '/': '÷', '-': '−', '+': '+', Enter: '=', '=': '=', Backspace: '⌫', Escape: 'C', '%': '%', '.': '.', ',': '.' };
    const k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
    if (k) { calcKey(k); e.preventDefault(); }
  });

  renderLobby();   // show the new row
})();
