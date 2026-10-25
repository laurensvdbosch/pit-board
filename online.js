/* ===========================================================
   PIT BOARD — player names & leaderboard (Supabase)
   ---------------------------------------------------------
   - A name is claimed with register_player(). The server returns a
     secret that only this device keeps; posting scores and renaming
     require it, so nobody can post under your name.
   - Finished sessions go into a local queue and are flushed when the
     server is reachable, so playing offline never loses a score.
   - Server tables and rules live in supabase/schema.sql.
   Loaded after app.js and uses its helpers ($, store, money, settings…).
   =========================================================== */

'use strict';

const Online = (() => {
  const cfg = window.PITBOARD_CONFIG || {};
  const enabled = Boolean(cfg.supabaseUrl && cfg.supabaseKey);
  const NAME_RE = /^[A-Za-z0-9 _.-]{2,20}$/;

  // Feed items newer than your previous visit get a NEW tag
  const seenAt = store.get('pitboard-feed-seen', 0);
  store.set('pitboard-feed-seen', Date.now());

  let profile = store.get('pitboard-profile', null);   // { name, id?, secret? } — no id = not registered yet
  let registerMode = 'join';
  let flushing = null;
  const lb = { tab: 'top', mode: settings.mode, difficulty: settings.difficulty, rounds: settings.rounds };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const saveProfile = () => store.set('pitboard-profile', profile);
  const boardLabel = (mode, d, r) => `${MODE_LABEL[mode] || mode} · ${(DIFFICULTY[d] || {}).label || d} · ${r} rounds`;

  function ago(iso) {
    const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  // -------------------- API --------------------
  // Errors carry .offline when retrying later could help (no network, server down, not configured)
  async function api(path, body) {
    if (!enabled) throw Object.assign(new Error('not_configured'), { offline: true });
    const headers = { apikey: cfg.supabaseKey, 'Content-Type': 'application/json' };
    if (cfg.supabaseKey.startsWith('eyJ')) headers.Authorization = `Bearer ${cfg.supabaseKey}`;  // legacy anon JWT
    let res;
    try {
      res = await fetch(`${cfg.supabaseUrl.replace(/\/+$/, '')}/rest/v1/${path}`, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw Object.assign(new Error('network'), { offline: true });
    }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      throw Object.assign(new Error((data && data.message) || `http_${res.status}`), { status: res.status, offline: res.status >= 500 });
    }
    return data;
  }
  const rpc = (fn, args) => api(`rpc/${fn}`, args);

  const fetchBoard = (mode, difficulty, rounds) => api(
    `best_scores?select=player_id,score,achieved_at,players(name)&mode=eq.${mode}&difficulty=eq.${difficulty}` +
    `&rounds=eq.${rounds}&order=score.desc,achieved_at.asc&limit=100`);
  const fetchFeed = limit => api(
    `best_events?select=id,player_id,mode,difficulty,rounds,score,prev_score,created_at,players(name)&order=created_at.desc&limit=${limit}`);

  // -------------------- REGISTRATION --------------------
  async function ensureRegistered() {
    if (!profile || profile.id) return;
    const r = await rpc('register_player', { p_name: profile.name });
    profile = { id: r.id, name: r.name, secret: r.secret };
    saveProfile();
    queueLocalBests();
  }

  // Personal bests from before you had a name still count
  function queueLocalBests() {
    const queue = store.get('pitboard-pending', []);
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const m = /^pitboard-best-(arb|mm)-(easy|medium|hard|expert)-(\d+)$/.exec(localStorage.key(i));
        const score = m && store.get(m[0], null);
        if (typeof score === 'number') queue.push({ mode: m[1], difficulty: m[2], rounds: Number(m[3]), score });
      }
    } catch { /* storage unavailable */ }
    store.set('pitboard-pending', queue);
  }

  function setError(msg) {
    $('registerError').textContent = msg;
    $('registerError').hidden = !msg;
  }

  function showRegister(mode, error = '') {
    registerMode = mode;
    const rename = mode === 'rename';
    $('registerTitle').textContent = rename ? 'Change your trader name' : 'Choose your trader name';
    $('registerBtn').textContent = rename ? 'Save name' : 'Join the pit';
    $('registerCancel').hidden = !rename;
    $('nameInput').value = rename && profile ? profile.name : '';
    setError(error);
    showScreen('register');
    setTimeout(() => $('nameInput').focus(), 50);
  }

  async function onRegisterSubmit(e) {
    e.preventDefault();
    const name = $('nameInput').value.trim().replace(/\s+/g, ' ');
    if (!NAME_RE.test(name)) {
      setError('Use 2–20 letters, numbers, spaces, dots, dashes or underscores.');
      return;
    }
    const btn = $('registerBtn');
    btn.disabled = true;
    try {
      if (registerMode === 'rename' && profile && profile.id) {
        const r = await rpc('rename_player', { p_player: profile.id, p_secret: profile.secret, p_name: name });
        profile.name = r.name;
        saveProfile();
      } else {
        // Saved first, so if the server can't be reached you keep playing and it registers later
        profile = { name };
        saveProfile();
        await ensureRegistered();
      }
    } catch (err) {
      if (err.message === 'name_taken' || err.message === 'invalid_name') {
        if (registerMode === 'join') { profile = null; saveProfile(); }
        setError(err.message === 'name_taken' ? 'That name is taken — try another.' : 'That name isn\'t allowed — try another.');
        return;
      }
      if (registerMode === 'rename') {
        setError('Can\'t reach the leaderboard right now — try again in a bit.');
        return;
      }
    } finally {
      btn.disabled = false;
    }
    showScreen('home');
    renderHome();
    flush();
  }

  // -------------------- SCORE QUEUE --------------------
  function flush() {
    if (!enabled) return Promise.resolve();
    if (flushing) return flushing;
    flushing = (async () => {
      try {
        await ensureRegistered();
      } catch (err) {
        if (err.message === 'name_taken' || err.message === 'invalid_name') {
          // Someone claimed the name while this device was offline: ask again next time home shows
          profile = null;
          saveProfile();
          if ($('game').hidden) showRegister('join', 'Someone claimed that name first — pick another.');
        }
        return;
      }
      if (!profile || !profile.id) return;

      const queue = store.get('pitboard-pending', []);
      while (queue.length) {
        const s = queue[0];
        try {
          await rpc('submit_score', {
            p_player: profile.id, p_secret: profile.secret,
            p_mode: s.mode, p_difficulty: s.difficulty, p_rounds: s.rounds, p_score: s.score,
          });
        } catch (err) {
          if (err.offline) break;   // keep it for later
          if (err.message === 'bad_secret') {
            // This device's identity is gone on the server: register the name again
            profile = { name: profile.name };
            saveProfile();
            break;
          }
          // Anything else was rejected for good: drop it so the queue can't jam
        }
        queue.shift();
        store.set('pitboard-pending', queue);
      }
    })().finally(() => { flushing = null; });
    return flushing;
  }

  async function recordSession(total) {
    const s = { mode: settings.mode, difficulty: settings.difficulty, rounds: settings.rounds, score: total };
    const queue = store.get('pitboard-pending', []);
    queue.push(s);
    store.set('pitboard-pending', queue);

    const el = $('resultsRank');
    el.textContent = '';
    if (!enabled) return;
    el.textContent = 'Posting to the leaderboard…';
    await flush();
    if (store.get('pitboard-pending', []).length || !profile || !profile.id) {
      el.textContent = 'Saved — it\'ll post to the leaderboard when you\'re back online.';
      return;
    }
    try {
      const rows = await fetchBoard(s.mode, s.difficulty, s.rounds);
      const i = rows.findIndex(r => r.player_id === profile.id);
      el.innerHTML = i >= 0 ? `You're <b>#${i + 1}</b> of ${rows.length}${rows.length >= 100 ? '+' : ''} on this board` : '';
    } catch {
      el.textContent = '';
    }
  }

  // -------------------- RENDERING --------------------
  function feedRow(e) {
    const mine = profile && e.player_id === profile.id;
    const fresh = !mine && new Date(e.created_at).getTime() > seenAt;
    return `
      <li class="feed-row${mine ? ' me' : ''}">
        <div>
          <b>${esc(e.players ? e.players.name : 'Unknown')}</b>${fresh ? '<span class="new-tag">NEW</span>' : ''}
          <span class="dim">${e.prev_score === null ? 'first score' : 'new best'}</span><br>
          <small>${boardLabel(e.mode, e.difficulty, e.rounds)} · ${ago(e.created_at)}</small>
        </div>
        <span class="feed-score ${pnlClass(e.score)}">${money(e.score, true)}</span>
      </li>`;
  }

  function lbRow(r, i) {
    const mine = profile && r.player_id === profile.id;
    return `
      <li class="lb-row${mine ? ' me' : ''}">
        <span class="lb-rank">${['🥇', '🥈', '🥉'][i] || i + 1}</span>
        <span class="lb-name">${esc(r.players ? r.players.name : 'Unknown')}${mine ? ' <small>(you)</small>' : ''}</span>
        <span class="lb-score ${pnlClass(r.score)}">${money(r.score, true)}</span>
      </li>`;
  }

  // Called from app.js renderHome()
  async function homeExtras() {
    if (!profile) { showRegister('join'); return; }
    $('playerName').textContent = profile.name;
    $('playerChip').title = enabled && !profile.id ? 'Not on the leaderboard yet — will register when online' : 'Change name';
    const box = $('homeFeed');
    if (!enabled) { box.hidden = true; return; }
    try {
      const rows = await fetchFeed(5);
      $('homeFeedList').innerHTML = rows.length
        ? rows.map(feedRow).join('')
        : '<li class="feed-row dim">No scores yet — be the first on the board.</li>';
      box.hidden = false;
    } catch {
      box.hidden = true;
    }
  }

  function openLeaders() {
    Object.assign(lb, { mode: settings.mode, difficulty: settings.difficulty, rounds: settings.rounds });
    showScreen('leaders');
    renderLeaders();
  }

  async function renderLeaders() {
    document.querySelectorAll('#leaders .seg[data-lb]').forEach(seg => {
      seg.querySelectorAll('button').forEach(b => {
        const on = String(lb[seg.dataset.lb]) === b.dataset.value;
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', on);
      });
    });
    $('lbFilters').hidden = lb.tab !== 'top';
    const list = $('lbList');
    if (!enabled) {
      list.innerHTML = '<p class="note">The leaderboard isn\'t connected yet.</p>';
      return;
    }
    list.innerHTML = '<p class="note dim">Loading…</p>';
    const view = JSON.stringify(lb);
    try {
      if (lb.tab === 'top') {
        const rows = await fetchBoard(lb.mode, lb.difficulty, lb.rounds);
        if (view !== JSON.stringify(lb)) return;   // a newer filter tap won
        list.innerHTML = rows.length
          ? `<ol class="lb-list">${rows.map(lbRow).join('')}</ol>`
          : '<p class="note">Nobody has posted on this board yet. Your move.</p>';
      } else {
        const rows = await fetchFeed(30);
        if (view !== JSON.stringify(lb)) return;
        list.innerHTML = rows.length
          ? `<ul class="feed-list">${rows.map(feedRow).join('')}</ul>`
          : '<p class="note">No scores yet.</p>';
      }
    } catch (err) {
      if (view === JSON.stringify(lb)) {
        list.innerHTML = `<p class="note">Can't reach the leaderboard${err.offline ? ' — check your connection' : ''}.</p>`;
      }
    }
  }

  // -------------------- INIT --------------------
  $('registerForm').addEventListener('submit', onRegisterSubmit);
  $('registerCancel').addEventListener('click', () => { showScreen('home'); renderHome(); });
  $('playerChip').addEventListener('click', () => showRegister('rename'));
  $('leadersBtn').addEventListener('click', openLeaders);
  $('resultsLeadersBtn').addEventListener('click', openLeaders);
  $('leadersBack').addEventListener('click', () => { showScreen('home'); renderHome(); });
  document.querySelectorAll('#leaders .seg[data-lb]').forEach(seg => {
    seg.addEventListener('click', e => {
      const b = e.target.closest('button[data-value]');
      if (!b) return;
      const key = seg.dataset.lb;
      lb[key] = key === 'rounds' ? Number(b.dataset.value) : b.dataset.value;
      renderLeaders();
    });
  });
  window.addEventListener('online', () => flush());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    flush();
    if (!$('home').hidden) homeExtras();
  });

  if (profile) { homeExtras(); flush(); } else showRegister('join');

  return { homeExtras, recordSession, flush };
})();
