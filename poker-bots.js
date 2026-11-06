/* ===========================================================
   PIT BOARD — poker bots
   ---------------------------------------------------------
   decide(game, profile, rng) → { type, to } for the seat to act.
   Preflop: Chen score vs thresholds set by the profile.
   Postflop: Monte Carlo equity vs the live opponents, compared
   with the pot odds; profiles add aggression, bluffs and
   stickiness. Difficulty sets how sharp the estimates are.
   =========================================================== */

(function (root) {
  'use strict';

  const P = typeof module === 'object' && module.exports ? require('./poker-engine.js') : root.Poker;

  // Personalities: tight (folds more), aggr (bets/raises more), bluff, sticky (calls too much)
  const STYLES = {
    rock:     { label: 'Tight',      tight: 0.85, aggr: 0.35, bluff: 0.05, sticky: 0.05 },
    shark:    { label: 'Solid',      tight: 0.6,  aggr: 0.65, bluff: 0.2,  sticky: 0.1 },
    maniac:   { label: 'Aggressive', tight: 0.2,  aggr: 0.9,  bluff: 0.45, sticky: 0.2 },
    station:  { label: 'Calls a lot', tight: 0.3, aggr: 0.2,  bluff: 0.05, sticky: 0.6 },
    tourist:  { label: 'Loose',      tight: 0.15, aggr: 0.4,  bluff: 0.15, sticky: 0.4 },
  };
  // Difficulty: equity samples (accuracy), random noise, and how much position/pot odds matter
  const LEVELS = {
    easy:   { iters: 60,  noise: 0.18, styles: ['station', 'tourist', 'tourist', 'rock', 'maniac'] },
    medium: { iters: 160, noise: 0.08, styles: ['shark', 'rock', 'tourist', 'station', 'maniac'] },
    hard:   { iters: 360, noise: 0.03, styles: ['shark', 'shark', 'rock', 'maniac', 'shark'] },
  };

  function profile(level, rng = Math.random) {
    const L = LEVELS[level];
    const style = L.styles[Math.floor(rng() * L.styles.length)];
    return { level, style, ...STYLES[style], iters: L.iters, noise: L.noise };
  }

  const round = (x, unit) => Math.max(unit, Math.round(x / unit) * unit);

  function raiseTo(game, L, target) {
    const to = round(target, game.bb);
    if (to >= L.maxTo * 0.85) return { type: 'raise', to: L.maxTo };   // close to all-in: just shove
    return { type: 'raise', to: Math.max(L.minTo, Math.min(L.maxTo, to)) };
  }

  function decide(game, prof, rng = Math.random) {
    const L = game.legal();
    const me = game.players[L.seat];
    const opponents = game.live().length - 1;
    const noise = () => (rng() - 0.5) * 2 * prof.noise;
    const late = isLatePosition(game, L.seat);

    if (game.street === 'preflop') {
      const c = P.chen(me.hole) + noise() * 10 + (late ? 1.5 : 0);
      const raised = game.currentBet > game.bb;
      const openAt = 5 + prof.tight * 4;          // ~ 5.6 (loose) … 8.4 (tight)
      const callAt = openAt - 1.5 - prof.sticky * 3;
      if (!raised) {
        if (c >= openAt && L.canRaise && rng() < 0.55 + prof.aggr * 0.45) {
          const limpers = game.players.filter(p => p.inHand && !p.folded && p.bet === game.bb).length - 1;
          return raiseTo(game, L, game.bb * (3 + Math.max(0, limpers)));
        }
        if (L.canCheck) return { type: 'check' };
        return c >= callAt ? { type: 'call' } : { type: 'fold' };
      }
      // Facing a raise
      const threeBetAt = 10 + prof.tight * 2 - prof.aggr * 2;
      const costShare = L.toCall / Math.max(1, me.stack + me.bet);
      if (c >= threeBetAt && L.canRaise) return raiseTo(game, L, game.currentBet * 3);
      if (c >= callAt + 2 - prof.sticky * 2 && (costShare < 0.35 || c >= 11)) return { type: 'call' };
      return L.canCheck ? { type: 'check' } : { type: 'fold' };
    }

    // Postflop: equity vs random hands, nudged by noise
    const raw = Math.min(1, Math.max(0, P.equity(me.hole, game.board, opponents, prof.iters, rng) + noise()));
    const pot = L.pot;
    const potOdds = L.toCall / (pot + L.toCall || 1);
    // Someone who bets usually has better than a random hand: discount by bet size
    // (sticky players ignore this, which is exactly their leak)
    const betSize = Math.min(1, L.toCall / Math.max(1, pot - L.toCall) * 1.5);
    const eq = raw - (L.toCall ? 0.15 * betSize * (1 - prof.sticky) : 0);
    const strong = 1 / (opponents + 1) + 0.15;     // ahead of the field: bet for value
    const lastStreet = game.street === 'river';

    if (L.canCheck) {
      if (eq >= strong && L.canRaise && rng() < 0.5 + prof.aggr * 0.5) return raiseTo(game, L, pot * (0.5 + rng() * 0.3));
      if (eq < 0.3 && L.canRaise && rng() < prof.bluff * (lastStreet ? 0.7 : 0.4) * (late ? 1.4 : 1)) return raiseTo(game, L, pot * 0.55);
      return { type: 'check' };
    }
    if (eq >= strong + 0.1 && L.canRaise && rng() < 0.25 + prof.aggr * 0.5) return raiseTo(game, L, game.currentBet * 2.5 + pot * 0.3);
    if (eq >= potOdds + 0.04 - prof.sticky * 0.2) return { type: 'call' };
    if (eq < 0.25 && L.canRaise && rng() < prof.bluff * 0.08) return raiseTo(game, L, game.currentBet * 2.5 + pot * 0.3);
    return { type: 'fold' };
  }

  // Button and the seat before it act last after the flop
  function isLatePosition(game, seat) {
    const before = game.nextSeat(game.button, p => p.inHand) === seat ? false : true;
    return seat === game.button || (before && game.nextSeat(seat, p => p.inHand) === game.button);
  }

  const API = { STYLES, LEVELS, profile, decide };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.PokerBots = API;
})(typeof window !== 'undefined' ? window : globalThis);
