/* ===========================================================
   PIT BOARD — poker engine: No-Limit Texas Hold'em
   ---------------------------------------------------------
   Cards, hand evaluation, the betting state machine (blinds,
   min-raises, incomplete all-in raises, side pots, split pots)
   and Monte Carlo equity. No DOM: the same file runs in the
   browser (window.Poker) and in Node for tests.

   Cards are 0–51: rank = c % 13 (0 = deuce … 12 = ace),
   suit = floor(c / 13) (0 ♣, 1 ♦, 2 ♥, 3 ♠).
   =========================================================== */

(function (root) {
  'use strict';

  const RANKS = '23456789TJQKA';
  const SUITS = 'cdhs';
  const RANK_NAME = ['Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Jack', 'Queen', 'King', 'Ace'];
  const plural = r => (r === 4 ? 'Sixes' : `${RANK_NAME[r]}s`);
  const CATEGORY = ['High card', 'Pair', 'Two pair', 'Three of a kind', 'Straight', 'Flush', 'Full house', 'Four of a kind', 'Straight flush'];

  const rankOf = c => c % 13;
  const suitOf = c => Math.floor(c / 13);
  const cardStr = c => RANKS[rankOf(c)] + SUITS[suitOf(c)];
  const parseCard = s => RANKS.indexOf(s[0].toUpperCase()) + 13 * SUITS.indexOf(s[1].toLowerCase());

  function shuffledDeck(rng = Math.random) {
    const d = Array.from({ length: 52 }, (_, i) => i);
    for (let i = 51; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  // -------------------- HAND EVALUATION --------------------
  // Score = category then up to 5 tie-break ranks, base 16. Higher wins.
  const pack = (cat, ks) => { let s = cat; for (let i = 0; i < 5; i++) s = s * 16 + (ks[i] || 0); return s; };

  function straightHigh(mask) {
    for (let hi = 12; hi >= 4; hi--) {
      const need = 0b11111 << (hi - 4);
      if ((mask & need) === need) return hi;
    }
    return (mask & 0b1000000001111) === 0b1000000001111 ? 3 : -1;   // A-2-3-4-5
  }

  // Best 5-card hand out of 5–7 cards
  function evaluate(cards) {
    const counts = new Array(13).fill(0), suitMask = [0, 0, 0, 0], suitCount = [0, 0, 0, 0];
    let mask = 0;
    for (const c of cards) {
      const r = c % 13, s = (c / 13) | 0;
      counts[r]++; suitMask[s] |= 1 << r; suitCount[s]++; mask |= 1 << r;
    }
    const fs = suitCount.findIndex(n => n >= 5);
    if (fs >= 0) {
      const sh = straightHigh(suitMask[fs]);
      if (sh >= 0) return pack(8, [sh]);
    }
    const quads = [], trips = [], pairs = [], singles = [];
    for (let r = 12; r >= 0; r--) {
      if (counts[r] === 4) quads.push(r);
      else if (counts[r] === 3) trips.push(r);
      else if (counts[r] === 2) pairs.push(r);
      else if (counts[r] === 1) singles.push(r);
    }
    const desc = arr => arr.sort((a, b) => b - a);
    if (quads.length) return pack(7, [quads[0], desc([...trips, ...pairs, ...singles])[0]]);
    if (trips.length && (trips.length > 1 || pairs.length)) return pack(6, [trips[0], Math.max(trips[1] ?? -1, pairs[0] ?? -1)]);
    if (fs >= 0) {
      const ks = [];
      for (let r = 12; r >= 0 && ks.length < 5; r--) if (suitMask[fs] & (1 << r)) ks.push(r);
      return pack(5, ks);
    }
    const sh = straightHigh(mask);
    if (sh >= 0) return pack(4, [sh]);
    if (trips.length) return pack(3, [trips[0], ...desc([...pairs, ...singles]).slice(0, 2)]);
    if (pairs.length >= 2) return pack(2, [pairs[0], pairs[1], desc([...pairs.slice(2), ...singles])[0]]);
    if (pairs.length) return pack(1, [pairs[0], ...singles.slice(0, 3)]);
    return pack(0, singles.slice(0, 5));
  }

  const categoryOf = score => Math.floor(score / 16 ** 5);
  const keyRank = (score, i) => Math.floor(score / 16 ** (4 - i)) % 16;

  function describe(score) {
    const cat = categoryOf(score), a = keyRank(score, 0), b = keyRank(score, 1);
    switch (cat) {
      case 0: return `${RANK_NAME[a]} high`;
      case 1: return `Pair of ${plural(a)}`;
      case 2: return `Two pair, ${plural(a)} and ${plural(b)}`;
      case 3: return `Three of a kind, ${plural(a)}`;
      case 4: return `Straight, ${RANK_NAME[a]} high`;
      case 5: return `Flush, ${RANK_NAME[a]} high`;
      case 6: return `Full house, ${plural(a)} full of ${plural(b)}`;
      case 7: return `Four of a kind, ${plural(a)}`;
      default: return a === 12 ? 'Royal flush' : `Straight flush, ${RANK_NAME[a]} high`;
    }
  }

  // "Pocket Kings", "Ace-King suited" — for hole cards before the flop
  function describeHole([a, b]) {
    const [hi, lo] = rankOf(a) >= rankOf(b) ? [a, b] : [b, a];
    if (rankOf(hi) === rankOf(lo)) return `Pocket ${plural(rankOf(hi))}`;
    return `${RANK_NAME[rankOf(hi)]}-${RANK_NAME[rankOf(lo)]} ${suitOf(hi) === suitOf(lo) ? 'suited' : 'offsuit'}`;
  }

  // -------------------- EQUITY --------------------
  // Chance to win (ties shared) against `opponents` random hands
  function equity(hole, board, opponents, iterations = 300, rng = Math.random) {
    const used = new Set([...hole, ...board]);
    const deck = [];
    for (let c = 0; c < 52; c++) if (!used.has(c)) deck.push(c);
    const need = opponents * 2 + (5 - board.length);
    let won = 0;
    for (let it = 0; it < iterations; it++) {
      for (let i = 0; i < need; i++) {   // partial shuffle: first `need` cards are random
        const j = i + Math.floor(rng() * (deck.length - i));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const full = board.concat(deck.slice(opponents * 2, need));
      const mine = evaluate(hole.concat(full));
      let best = 0, ties = 0;
      for (let o = 0; o < opponents; o++) {
        const s = evaluate([deck[o * 2], deck[o * 2 + 1], ...full]);
        if (s > best) best = s;
        if (s === mine) ties++;
      }
      if (mine > best) won += 1;
      else if (mine === best) won += 1 / (ties + 1);
    }
    return won / iterations;
  }

  // -------------------- GAME --------------------
  const STREETS = ['preflop', 'flop', 'turn', 'river'];

  class Game {
    // players: [{ id, name, stack, human?, ... }] in seat order; button: seat that had the button last hand
    constructor({ players, sb, bb, button = -1, rng = Math.random }) {
      this.players = players;
      this.sb = sb;
      this.bb = bb;
      this.button = button;
      this.rng = rng;
      this.handNo = 0;
      this.over = true;
    }

    canAct(p) { return p.inHand && !p.folded && !p.allIn; }
    live() { return this.players.filter(p => p.inHand && !p.folded); }
    pot() { return this.players.reduce((s, p) => s + p.total, 0); }

    nextSeat(from, pred) {
      const n = this.players.length;
      for (let i = 1; i <= n; i++) {
        const s = (((from + i) % n) + n) % n;
        if (pred(this.players[s])) return s;
      }
      return -1;
    }

    post(p, amount) {
      const a = Math.min(amount, p.stack);
      p.stack -= a; p.bet += a; p.total += a;
      if (p.stack === 0) p.allIn = true;
      return a;
    }

    startHand() {
      if (this.players.filter(p => p.stack > 0).length < 2) return false;
      this.handNo++;
      this.deck = shuffledDeck(this.rng);
      this.board = [];
      this.street = 'preflop';
      this.over = false;
      this.result = null;
      this.log = [];
      for (const p of this.players) {
        Object.assign(p, { hole: [], bet: 0, total: 0, inHand: p.stack > 0, folded: false, allIn: false, acted: false, canRaise: true, lastAction: null });
      }
      this.button = this.nextSeat(this.button, p => p.inHand);
      const seated = this.players.filter(p => p.inHand).length;
      const order = [];
      for (let s = this.nextSeat(this.button, p => p.inHand), i = 0; i < seated; i++, s = this.nextSeat(s, p => p.inHand)) order.push(s);
      for (let r = 0; r < 2; r++) for (const s of order) this.players[s].hole.push(this.deck.pop());

      // Heads-up the button posts the small blind and acts first before the flop
      this.sbSeat = seated === 2 ? this.button : order[0];
      this.bbSeat = this.nextSeat(this.sbSeat, p => p.inHand);
      this.post(this.players[this.sbSeat], this.sb);
      this.post(this.players[this.bbSeat], this.bb);
      this.players[this.sbSeat].lastAction = `SB ${this.players[this.sbSeat].bet}`;
      this.players[this.bbSeat].lastAction = `BB ${this.players[this.bbSeat].bet}`;
      this.currentBet = Math.max(this.players[this.sbSeat].bet, this.players[this.bbSeat].bet, this.bb);
      this.minRaise = this.bb;
      this.toAct = this.bbSeat;
      this.advance();
      return true;
    }

    // What the player to act may do
    legal() {
      const p = this.players[this.toAct];
      const toCall = Math.min(this.currentBet - p.bet, p.stack);
      const maxTo = p.bet + p.stack;
      const othersCanAct = this.players.some(o => o !== p && this.canAct(o));
      const canRaise = p.canRaise && maxTo > this.currentBet && othersCanAct;
      return {
        seat: this.toAct, toCall, canCheck: toCall === 0, canRaise,
        minTo: Math.min(this.currentBet + this.minRaise, maxTo), maxTo, pot: this.pot(), currentBet: this.currentBet,
      };
    }

    // action: { type: 'fold' | 'check' | 'call' | 'raise', to }
    act(action) {
      if (this.over) throw new Error('hand is over');
      const p = this.players[this.toAct];
      const L = this.legal();
      let type = action.type;
      if (type === 'check' && !L.canCheck) type = 'call';
      if (type === 'call' && L.toCall === 0) type = 'check';
      if (type === 'raise' && !L.canRaise) type = L.canCheck ? 'check' : 'call';

      if (type === 'fold') {
        p.folded = true;
        p.lastAction = 'Fold';
      } else if (type === 'check') {
        p.lastAction = 'Check';
      } else if (type === 'call') {
        this.post(p, L.toCall);
        p.lastAction = p.allIn ? `All-in ${p.bet}` : `Call ${p.bet}`;
      } else {
        const to = Math.max(L.minTo, Math.min(L.maxTo, Math.round(action.to)));
        const increase = to - this.currentBet;
        const opened = this.currentBet === 0;
        this.post(p, to - p.bet);
        if (increase >= this.minRaise) {
          // Full raise: everyone else must respond and may re-raise
          this.minRaise = increase;
          for (const o of this.players) if (o !== p && this.canAct(o)) { o.acted = false; o.canRaise = true; }
        } else {
          // All-in for less than a full raise: others must respond but can't re-raise unless they hadn't acted
          for (const o of this.players) if (o !== p && this.canAct(o)) { if (o.acted) o.canRaise = false; o.acted = false; }
        }
        this.currentBet = to;
        p.lastAction = p.allIn ? `All-in ${to}` : `${opened ? 'Bet' : 'Raise to'} ${to}`;
      }
      p.acted = true;
      this.log.push({ street: this.street, seat: p === undefined ? -1 : this.players.indexOf(p), type, amount: p.bet });
      this.advance();
    }

    // Move to the next player, the next street, or the end of the hand
    advance() {
      const live = this.live();
      if (live.length === 1) return this.finishUncontested(live[0]);
      const pending = p => this.canAct(p) && (!p.acted || p.bet < this.currentBet);
      if (this.players.some(pending)) {
        this.toAct = this.nextSeat(this.toAct, pending);
        return;
      }
      // Betting round over
      for (const p of this.players) { p.bet = 0; p.acted = false; p.canRaise = true; }
      this.currentBet = 0;
      this.minRaise = this.bb;
      if (this.street === 'river') return this.showdown();
      this.street = STREETS[STREETS.indexOf(this.street) + 1];
      this.deck.pop();   // burn
      const n = this.street === 'flop' ? 3 : 1;
      for (let i = 0; i < n; i++) this.board.push(this.deck.pop());
      for (const p of this.players) if (p.inHand && !p.folded && !p.allIn) p.lastAction = null;
      if (live.filter(p => this.canAct(p)).length < 2) return this.advance();   // nobody left to bet: run it out
      this.toAct = this.nextSeat(this.button, p => this.canAct(p));
    }

    finishUncontested(winner) {
      const amount = this.pot();
      winner.stack += amount;
      this.over = true;
      this.street = 'done';
      this.result = { showdown: false, pots: [{ amount, winners: [this.players.indexOf(winner)], hand: null }], shown: [] };
    }

    // Main pot and side pots from what each player put in
    sidePots() {
      const levels = [...new Set(this.players.filter(p => p.total > 0).map(p => p.total))].sort((a, b) => a - b);
      const pots = [];
      let prev = 0;
      for (const level of levels) {
        const amount = this.players.reduce((s, p) => s + Math.max(0, Math.min(p.total, level) - prev), 0);
        const eligible = this.players.map((p, i) => i).filter(i => !this.players[i].folded && this.players[i].inHand && this.players[i].total >= level);
        if (!eligible.length && pots.length) pots[pots.length - 1].amount += amount;
        else if (pots.length && pots[pots.length - 1].eligible.join() === eligible.join()) pots[pots.length - 1].amount += amount;
        else pots.push({ amount, eligible });
        prev = level;
      }
      return pots;
    }

    showdown() {
      while (this.board.length < 5) this.board.push(this.deck.pop());
      const scores = new Map();
      for (const p of this.live()) scores.set(this.players.indexOf(p), evaluate([...p.hole, ...this.board]));
      const pots = this.sidePots().map(pot => {
        const best = Math.max(...pot.eligible.map(i => scores.get(i)));
        const winners = pot.eligible.filter(i => scores.get(i) === best);
        // Odd chips go to the first winner left of the button
        const ordered = [];
        for (let s = this.nextSeat(this.button, () => true), k = 0; k < this.players.length; k++, s = this.nextSeat(s, () => true)) if (winners.includes(s)) ordered.push(s);
        const share = Math.floor(pot.amount / winners.length);
        let rest = pot.amount - share * winners.length;
        for (const i of ordered) { this.players[i].stack += share + (rest > 0 ? 1 : 0); rest--; }
        return { amount: pot.amount, winners: ordered, hand: describe(best), eligible: pot.eligible };
      });
      this.over = true;
      this.street = 'showdown';
      this.result = { showdown: true, pots, shown: [...scores.keys()], scores: Object.fromEntries(scores) };
    }
  }

  // -------------------- PREFLOP STRENGTH --------------------
  // Chen formula: quick 0–20 score of two hole cards (AA = 20, 72o ≈ −1)
  function chen([a, b]) {
    let r1 = rankOf(a), r2 = rankOf(b);
    if (r2 > r1) [r1, r2] = [r2, r1];
    const base = r => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2);
    let s = base(r1);
    if (r1 === r2) return Math.ceil(Math.max(5, s * 2));
    if (suitOf(a) === suitOf(b)) s += 2;
    const gap = r1 - r2 - 1;
    s -= [0, 1, 2, 4][gap] ?? 5;
    if (gap <= 1 && r1 < 10) s += 1;
    return Math.ceil(s);
  }

  const API = { RANKS, SUITS, RANK_NAME, CATEGORY, rankOf, suitOf, cardStr, parseCard, shuffledDeck, evaluate, categoryOf, describe, describeHole, equity, chen, Game };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.Poker = API;
})(typeof window !== 'undefined' ? window : globalThis);
