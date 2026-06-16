'use strict';

/**
 * UI layer: screen routing, login/register modals, auth state (localStorage),
 * the leaderboard, the account bar, and the game-over flow.
 *
 * Talks to the game controller via the global `Pong` object and receives
 * callbacks from it via `PongUI`.
 */
(function (global) {
  const TOKEN_KEY = 'pong_token';
  const NAME_KEY = 'pong_username';
  const GUEST_KEY = 'pong_guest';

  const ADJ = ['Swift', 'Neon', 'Retro', 'Pixel', 'Turbo', 'Atomic', 'Cosmic', 'Laser', 'Glitch', 'Volt'];
  const NOUN = ['Paddle', 'Bat', 'Bounce', 'Ace', 'Rally', 'Spin', 'Volley', 'Smash', 'Blip', 'Comet'];

  // Remember how the last game was started so "Play Again" repeats it.
  let lastMode = null;
  let lastDifficulty = 'medium';

  // ---- small DOM helpers ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  function randomGuestName() {
    const a = ADJ[Math.floor(Math.random() * ADJ.length)];
    const n = NOUN[Math.floor(Math.random() * NOUN.length)];
    return `${a}${n}${Math.floor(Math.random() * 90 + 10)}`;
  }

  // ---- auth state ----
  function isLoggedIn() {
    return !!localStorage.getItem(TOKEN_KEY);
  }

  function currentName() {
    if (isLoggedIn()) return localStorage.getItem(NAME_KEY);
    let g = sessionStorage.getItem(GUEST_KEY);
    if (!g) {
      g = randomGuestName();
      sessionStorage.setItem(GUEST_KEY, g);
    }
    return g;
  }

  function isGuest() {
    return !isLoggedIn();
  }

  // ---- screen routing ----
  function showScreen(name) {
    $$('.screen').forEach((el) => el.classList.remove('active'));
    const el = document.getElementById(`screen-${name}`);
    if (el) el.classList.add('active');

    if (name === 'landing' || name === 'waiting') {
      refreshLeaderboard();
    }
  }

  // ---- account bar ----
  function renderAccount() {
    const name = currentName();
    $('#account-name').textContent = name;
    if (isLoggedIn()) {
      $('#account-logged-out').classList.add('hidden');
      $('#account-logged-in').classList.remove('hidden');
    } else {
      $('#account-logged-out').classList.remove('hidden');
      $('#account-logged-in').classList.add('hidden');
    }
  }

  // ---- leaderboard ----
  async function refreshLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      renderLeaderboard(data.leaderboard || []);
    } catch (e) {
      renderLeaderboard(null);
    }
  }

  function renderLeaderboard(rows) {
    $$('.leaderboard-body').forEach((tbody) => {
      tbody.innerHTML = '';
      if (rows === null) {
        tbody.innerHTML = '<tr><td colspan="5">Leaderboard unavailable</td></tr>';
        return;
      }
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">No ranked players yet - be the first!</td></tr>';
        return;
      }
      rows.forEach((r, i) => {
        const tr = document.createElement('tr');
        const points = Number.isInteger(r.points) ? r.points : r.points.toFixed(1);
        tr.innerHTML =
          `<td>${i + 1}</td>` +
          `<td>${escapeHtml(r.username)}</td>` +
          `<td>${points}</td>` +
          `<td>${r.wins}</td>` +
          `<td>${r.gamesPlayed}</td>`;
        tbody.appendChild(tr);
      });
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  // ---- modals ----
  function openModal(which) {
    closeModals();
    $(`#modal-${which}`).classList.add('active');
    $(`#${which}-error`).textContent = '';
    const input = $(`#${which}-username`);
    if (input) input.focus();
  }

  function closeModals() {
    $$('.modal-overlay').forEach((m) => m.classList.remove('active'));
  }

  async function submitAuth(which) {
    const username = $(`#${which}-username`).value.trim();
    const password = $(`#${which}-password`).value;
    const errEl = $(`#${which}-error`);
    errEl.textContent = '';

    try {
      const res = await fetch(`/api/${which}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || 'Something went wrong.';
        return;
      }
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(NAME_KEY, data.username);
      closeModals();
      renderAccount();
      refreshLeaderboard();
    } catch (e) {
      errEl.textContent = 'Network error - please try again.';
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(NAME_KEY);
    sessionStorage.removeItem(GUEST_KEY);
    renderAccount();
  }

  // ---- game-over overlay ----
  function onGameOver(info) {
    const title = $('#gameover-title');
    const detail = $('#gameover-detail');
    const guestPrompt = $('#guest-prompt');

    title.textContent = info.won ? 'YOU WIN' : 'YOU LOSE';

    if (info.byForfeit) {
      detail.textContent = info.won
        ? 'Opponent forfeited - you win!'
        : 'You forfeited the match.';
    } else if (info.mode === 'local') {
      detail.textContent = `Final: you scored ${info.myScore}`;
    } else {
      detail.textContent = `You scored ${info.myScore} point${info.myScore === 1 ? '' : 's'}`;
    }

    // Guests get a prompt to register after every completed game.
    if (info.isGuest) {
      guestPrompt.textContent = `You scored ${info.myScore} point${
        info.myScore === 1 ? '' : 's'
      } - create a free account to save your stats and appear on the leaderboard`;
      guestPrompt.classList.remove('hidden');
    } else {
      guestPrompt.classList.add('hidden');
    }

    $('#gameover').classList.add('active');
    refreshLeaderboard();
  }

  function hideGameOver() {
    $('#gameover').classList.remove('active');
  }

  function showReconnecting() {
    $('#reconnecting').classList.add('active');
  }
  function hideReconnecting() {
    $('#reconnecting').classList.remove('active');
  }

  function onMatchFound(opponent, side) {
    lastMode = 'online';
    hideGameOver();
    $('#opponent-label').textContent = `vs ${opponent}`;
    $('#controls-hint').textContent =
      side === 'right' ? 'Controls: Up / Down arrows' : 'Controls: W / S';
    showScreen('game');
  }

  function onQueueTimeout() {
    const msg = $('#waiting-message');
    msg.textContent = 'No opponent found - try again';
    $('#waiting-actions').classList.remove('hidden');
    $('#waiting-status').classList.add('hidden');
  }

  function onConnectionLost() {
    hideReconnecting();
    showScreen('landing');
    flashToast('Connection lost - returned to menu');
  }

  function onGameCancelled() {
    hideReconnecting();
    hideGameOver();
    showScreen('landing');
    flashToast('Game cancelled');
  }

  function onWelcome(username, isGuestFlag) {
    // For guests, prefer the server-assigned fun name for display consistency.
    if (isGuestFlag && !isLoggedIn()) {
      sessionStorage.setItem(GUEST_KEY, username);
      renderAccount();
    }
  }

  function flashToast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  // ---- wiring ----
  function wire() {
    // Landing actions
    $('#btn-play-online').addEventListener('click', () => {
      lastMode = 'online';
      $('#waiting-message').textContent = 'Waiting for opponent...';
      $('#waiting-actions').classList.add('hidden');
      $('#waiting-status').classList.remove('hidden');
      Pong.playOnline();
    });

    $('#btn-play-computer').addEventListener('click', () => showScreen('difficulty'));

    // Difficulty actions
    $$('.btn-difficulty').forEach((btn) => {
      btn.addEventListener('click', () => {
        lastMode = 'local';
        lastDifficulty = btn.dataset.difficulty;
        hideGameOver();
        $('#opponent-label').textContent = `vs Computer (${capitalize(lastDifficulty)})`;
        $('#controls-hint').textContent = 'Controls: W / S';
        showScreen('game');
        Pong.playVsComputer(lastDifficulty);
      });
    });
    $('#btn-difficulty-back').addEventListener('click', () => showScreen('landing'));

    // Waiting screen
    $('#btn-cancel-queue').addEventListener('click', () => {
      Pong.cancelQueue();
      showScreen('landing');
    });
    $('#btn-waiting-retry').addEventListener('click', () => {
      $('#waiting-message').textContent = 'Waiting for opponent...';
      $('#waiting-actions').classList.add('hidden');
      $('#waiting-status').classList.remove('hidden');
      Pong.playOnline();
    });
    $('#btn-waiting-back').addEventListener('click', () => {
      Pong.cancelQueue();
      showScreen('landing');
    });

    // Game-over actions
    $('#btn-play-again').addEventListener('click', () => {
      hideGameOver();
      if (lastMode === 'local') {
        $('#opponent-label').textContent = `vs Computer (${capitalize(lastDifficulty)})`;
        showScreen('game');
        Pong.playVsComputer(lastDifficulty);
      } else {
        $('#waiting-message').textContent = 'Waiting for opponent...';
        $('#waiting-actions').classList.add('hidden');
        $('#waiting-status').classList.remove('hidden');
        Pong.playOnline();
      }
    });
    $('#btn-menu').addEventListener('click', () => {
      hideGameOver();
      Pong.leaveGame();
      showScreen('landing');
    });
    $('#btn-gameover-register').addEventListener('click', () => openModal('register'));

    // Account bar
    $('#btn-login').addEventListener('click', () => openModal('login'));
    $('#btn-register').addEventListener('click', () => openModal('register'));
    $('#btn-logout').addEventListener('click', logout);

    // Modals
    $('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitAuth('login');
    });
    $('#register-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitAuth('register');
    });
    $$('.modal-close').forEach((b) => b.addEventListener('click', closeModals));
    $$('.modal-overlay').forEach((m) =>
      m.addEventListener('click', (e) => {
        if (e.target === m) closeModals();
      })
    );
    $$('.switch-to-register').forEach((b) =>
      b.addEventListener('click', () => openModal('register'))
    );
    $$('.switch-to-login').forEach((b) => b.addEventListener('click', () => openModal('login')));
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---- boot ----
  function boot() {
    wire();
    renderAccount();
    showScreen('landing');
    Pong.init();
  }

  // Expose callbacks used by the game controller.
  global.PongUI = {
    showScreen,
    onWelcome,
    onMatchFound,
    onQueueTimeout,
    onGameOver,
    onConnectionLost,
    onGameCancelled,
    showReconnecting,
    hideReconnecting,
    isGuest,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
