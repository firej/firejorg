(function () {
  'use strict';

  const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const RANK_VALUES = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

  // Локализация (RU/EN/ES/TR). Язык берём из SDK Яндекса, иначе из языка браузера.
  // Название игры должно быть одинаковым в игре и во всех материалах черновика
  // на соответствующем языке (требование платформы 5.1.3).
  const I18N = {
    ru: {
      replay: 'Повторить расклад', autoCollect: 'Собрать автоматически', hintMove: 'Перенесите подсвеченную карту в отмеченную стопку.', hintStock: 'Возьмите карты из колоды.', hintNone: 'Доступных ходов не найдено.',
      title: 'Пасьянс "Косынка" от firej', heading: 'Пасьянс "Косынка" от firej', newGame: 'Новая игра', undo: 'Отменить',
      hint: 'Подсказка', movesLabel: 'Ходов:', winTitle: 'Поздравляем!',
      winText: 'Пасьянс разложен.', playAgain: 'Играть снова',
      scoreLabel: 'Очки:', statsWins: 'Побед', statsStreak: 'Серия',
      lbTitle: 'Таблица рекордов', lbLogin: 'Войдите, чтобы попасть в таблицу'
    },
    en: {
      replay: 'Replay deal', autoCollect: 'Collect automatically', hintMove: 'Move the highlighted card to the marked pile.', hintStock: 'Draw from the stock.', hintNone: 'No available moves found.',
      title: 'Kosynka Solitaire by firej', heading: 'Kosynka Solitaire by firej', newGame: 'New game', undo: 'Undo',
      hint: 'Hint', movesLabel: 'Moves:', winTitle: 'Congratulations!',
      winText: 'You solved it!', playAgain: 'Play again',
      scoreLabel: 'Score:', statsWins: 'Wins', statsStreak: 'Streak',
      lbTitle: 'Leaderboard', lbLogin: 'Sign in to join the leaderboard'
    },
    es: {
      replay: 'Repetir reparto', autoCollect: 'Recoger automáticamente', hintMove: 'Mueve la carta resaltada al montón marcado.', hintStock: 'Roba del mazo.', hintNone: 'No hay movimientos disponibles.',
      title: 'Solitario Kosynka de firej', heading: 'Solitario Kosynka de firej', newGame: 'Nueva partida', undo: 'Deshacer',
      hint: 'Pista', movesLabel: 'Movimientos:', winTitle: '¡Felicidades!',
      winText: '¡Lo has resuelto!', playAgain: 'Jugar de nuevo',
      scoreLabel: 'Puntos:', statsWins: 'Victorias', statsStreak: 'Racha',
      lbTitle: 'Clasificación', lbLogin: 'Inicia sesión para entrar en la clasificación'
    },
    tr: {
      replay: 'Dağıtımı tekrarla', autoCollect: 'Otomatik topla', hintMove: 'Vurgulanan kartı işaretli desteye taşıyın.', hintStock: 'Desteden kart çekin.', hintNone: 'Uygun hamle bulunamadı.',
      title: 'Kosynka Solitaire by firej', heading: 'Kosynka Solitaire by firej', newGame: 'Yeni oyun', undo: 'Geri al',
      hint: 'İpucu', movesLabel: 'Hamle:', winTitle: 'Tebrikler!',
      winText: 'Çözdünüz!', playAgain: 'Tekrar oyna',
      scoreLabel: 'Puan:', statsWins: 'Galibiyet', statsStreak: 'Seri',
      lbTitle: 'Skor tablosu', lbLogin: 'Skor tablosuna girmek için oturum açın'
    }
  };

  function pickLang(code) {
    if (!code) return null;
    const c = String(code).toLowerCase();
    if (c.indexOf('ru') === 0) return 'ru';
    if (c.indexOf('es') === 0) return 'es';
    if (c.indexOf('tr') === 0) return 'tr';
    return 'en';
  }

  // Принудительный язык для отладки: ?lang=ru|en|es в адресной строке.
  // На Яндексе параметр не передаётся, поэтому в продакшене не влияет.
  function urlLang() {
    let v;
    try { v = new URLSearchParams(location.search).get('lang'); } catch (e) { return null; }
    if (!v) return null;
    v = v.toLowerCase();
    return I18N[v] ? v : pickLang(v);
  }

  let currentDict = I18N.ru;

  function applyLang(lang) {
    const dict = I18N[lang] || I18N.ru;
    currentDict = dict;
    document.documentElement.lang = I18N[lang] ? lang : 'ru';
    if (dict.title) document.title = dict.title;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (dict[key] != null) el.textContent = dict[key];
    });
  }

  let state = {
    stock: [],
    waste: [],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], []],
    moves: 0,
    score: 0,
    elapsedMs: 0,
    history: []
  };

  // Облачное сохранение включаем только после проверки сохранённой игры при старте,
  // иначе свежая раздача могла бы перезаписать облако до того, как мы его прочитаем.
  let allowCloudSave = false;
  let initialDeck = null;
  let hintMoves = [];
  let hintIndex = -1;
  let autoCollectTimer = null;
  let autoCollecting = false;

  // Звуковые эффекты синтезируются на WebAudio — без внешних файлов. Контекст
  // создаётся лениво (после первого жеста игрока); при муте, рекламе и уходе
  // со вкладки приостанавливается.
  const Sound = (() => {
    let ctx = null;
    let muted = false;
    try { muted = localStorage.getItem('cards-muted') === '1'; } catch (e) {}

    function ensureCtx() {
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
      }
      if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
      return ctx;
    }

    function tone(freq, startAt, dur, type, peak) {
      const c = ensureCtx();
      if (!c) return;
      const osc = c.createOscillator();
      const gain = c.createGain();
      const t = c.currentTime + startAt;
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(peak, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }

    function noise(dur, freq, peak) {
      const c = ensureCtx();
      if (!c) return;
      const len = Math.max(1, Math.floor(c.sampleRate * dur));
      const buf = c.createBuffer(1, len, c.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = c.createBufferSource();
      src.buffer = buf;
      const filter = c.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = freq;
      const gain = c.createGain();
      gain.gain.value = peak;
      src.connect(filter).connect(gain).connect(c.destination);
      src.start();
    }

    return {
      isMuted: () => muted,
      setMuted(v) {
        muted = v;
        try { localStorage.setItem('cards-muted', v ? '1' : '0'); } catch (e) {}
        if (ctx) { try { v ? ctx.suspend() : ctx.resume(); } catch (e) {} }
      },
      suspend() { if (ctx) { try { ctx.suspend(); } catch (e) {} } },
      resume() { if (!muted && ctx && ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } },
      place() { if (!muted) noise(0.05, 2400, 0.35); },
      flip() { if (!muted) noise(0.07, 1300, 0.3); },
      deal() { if (!muted) noise(0.06, 1800, 0.3); },
      win() { if (muted) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.4, 'triangle', 0.14)); }
    };
  })();

  // Таймер партии: идёт только пока игрок реально играет (пауза при уходе
  // со вкладки и на время рекламы). Накопленное время хранится в сохранении.
  let timerRunning = false;
  let timerLastTick = 0;
  let timerInterval = null;

  function currentElapsed() {
    return state.elapsedMs + (timerRunning ? Date.now() - timerLastTick : 0);
  }

  function startTimer() {
    if (timerRunning) return;
    timerRunning = true;
    timerLastTick = Date.now();
    if (!timerInterval) timerInterval = setInterval(renderTimer, 500);
    renderTimer();
  }

  function stopTimer() {
    if (!timerRunning) return;
    state.elapsedMs += Date.now() - timerLastTick;
    timerRunning = false;
    renderTimer();
  }

  function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function renderTimer() {
    document.getElementById('timer').textContent = formatTime(currentElapsed());
  }

  // Начисляет очки, не давая счёту уйти в минус; возвращает фактическую дельту.
  function applyScore(delta) {
    const applied = Math.max(-state.score, delta);
    state.score += applied;
    return applied;
  }

  // Статистика игрока: локально всегда, в облако — когда есть SDK.
  const SAVE_KEY = 'klondike-save-v1';
  const STATS_KEY = 'klondike-stats';
  let stats = { played: 0, won: 0, streak: 0, bestScore: 0 };
  let statGameActive = false; // партия начата (сделан ход) и ещё не завершена
  let gameOver = false;
  let winOverlayTimer = null;

  function loadLocalStats() {
    try {
      const s = JSON.parse(localStorage.getItem(STATS_KEY));
      if (s && typeof s.played === 'number') return s;
    } catch (e) {}
    return null;
  }

  function mergeStats(a, b) {
    if (!a) return b;
    if (!b) return a;
    return (b.played || 0) > (a.played || 0) ? b : a;
  }

  function persistStats() {
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
    if (window.YandexSDK) window.YandexSDK.saveStats(stats);
  }

  // Первый ход партии: запускаем таймер и считаем партию сыгранной.
  function noteMove() {
    startTimer();
    if (!statGameActive) {
      statGameActive = true;
      stats.played++;
      persistStats();
    }
  }

  function persist() {
    if (!allowCloudSave) return;
    const saved = serializeState();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch (e) {}
    if (!gameOver && window.YandexSDK) window.YandexSDK.saveState(saved);
  }

  function loadSavedGame(cloud) {
    let local = null;
    try { local = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    if (!isValidSave(local)) local = null;
    if (!isValidSave(cloud)) cloud = null;
    if (!local) return cloud;
    if (!cloud) return local;
    return (cloud.savedAt || 0) > (local.savedAt || 0) ? cloud : local;
  }

  function serializeState() {
    return {
      stock: state.stock,
      waste: state.waste,
      foundations: state.foundations,
      tableau: state.tableau,
      moves: state.moves,
      score: state.score,
      initialDeck,
      history: state.history,
      statGameActive,
      savedAt: Date.now(),
      elapsedMs: currentElapsed()
    };
  }

  function isValidSave(s) {
    if (!s || !Array.isArray(s.stock) || !Array.isArray(s.waste)) return false;
    if (!Array.isArray(s.foundations) || s.foundations.length !== 4) return false;
    if (!Array.isArray(s.tableau) || s.tableau.length !== 7) return false;
    if (![...s.tableau, ...s.foundations].every(Array.isArray)) return false;
    const cards = [...s.stock, ...(s.waste || []), ...s.tableau.flat(), ...s.foundations.flat()];
    if (cards.some(c => !c || typeof c.id !== 'string' || !SUIT_SYMBOLS[c.suit] ||
      !RANKS.includes(c.rank) || c.value !== RANK_VALUES[c.rank] || typeof c.faceUp !== 'boolean')) return false;
    if (new Set(cards.map(c => c.id)).size !== cards.length) return false;
    if (['moves', 'score', 'elapsedMs', 'savedAt'].some(key =>
      s[key] != null && (!Number.isFinite(s[key]) || s[key] < 0))) return false;
    const count = (arr) => arr.reduce((sum, pile) => sum + (Array.isArray(pile) ? pile.length : 0), 0);
    const total = s.stock.length + s.waste.length + count(s.foundations) + count(s.tableau);
    return total === 52;
  }

  function restoreState(s) {
    const cards = [...s.stock, ...(s.waste || []), ...s.tableau.flat(), ...s.foundations.flat()];
    initialDeck = Array.isArray(s.initialDeck) && s.initialDeck.length === cards.length &&
      new Set(s.initialDeck.map(c => c && c.id)).size === cards.length &&
      s.initialDeck.every(c => c && cards.some(saved => saved.id === c.id && saved.rank === c.rank && saved.suit === c.suit))
      ? JSON.parse(JSON.stringify(s.initialDeck)) : null;
    state.stock = s.stock;
    state.waste = s.waste;
    state.foundations = s.foundations;
    state.tableau = s.tableau;
    state.moves = s.moves || 0;
    state.score = s.score || 0;
    state.elapsedMs = s.elapsedMs || 0;
    state.history = Array.isArray(s.history) ? s.history : [];
  }

  function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        deck.push({
          suit,
          rank,
          value: RANK_VALUES[rank],
          faceUp: false,
          id: `${suit}-${rank}-${Math.random().toString(36).slice(2, 9)}`
        });
      }
    }
    return deck;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isRed(suit) {
    return suit === 'hearts' || suit === 'diamonds';
  }

  function canStackOnTableau(card, targetCard) {
    if (!targetCard) return card.rank === 'K';
    return (
      targetCard.faceUp &&
      RANK_VALUES[card.rank] === RANK_VALUES[targetCard.rank] - 1 &&
      isRed(card.suit) !== isRed(targetCard.suit)
    );
  }

  function canStackOnFoundation(card, pile) {
    if (pile.length === 0) return card.rank === 'A';
    const top = pile[pile.length - 1];
    return (
      top.suit === card.suit &&
      RANK_VALUES[card.rank] === RANK_VALUES[top.rank] + 1
    );
  }

  function deal(replay = false) {
    clearTimeout(autoCollectTimer);
    autoCollecting = false;
    clearTimeout(winOverlayTimer);
    winOverlayTimer = null;
    // Брошенная незаконченная партия обнуляет серию побед.
    if (statGameActive) {
      stats.streak = 0;
      statGameActive = false;
      persistStats();
    }
    stopTimer();
    clearCascade();
    gameOver = false;
    let deck = replay && initialDeck
      ? JSON.parse(JSON.stringify(initialDeck))
      : shuffle(createDeck());
    initialDeck = JSON.parse(JSON.stringify(deck));
    state.stock = [];
    state.waste = [];
    state.foundations = [[], [], [], []];
    state.tableau = [[], [], [], [], [], [], []];
    state.moves = 0;
    state.score = 0;
    state.elapsedMs = 0;
    state.history = [];

    for (let col = 0; col < 7; col++) {
      for (let i = 0; i <= col; i++) {
        const card = deck.pop();
        card.faceUp = i === col;
        state.tableau[col].push(card);
      }
    }
    state.stock = deck;
    render();
    updateUI();
  }

  function drawFromStock() {
    if (gameOver || autoCollecting) return;
    if (state.stock.length === 0) {
      if (state.waste.length === 0) return;
      state.waste.reverse().forEach(c => { c.faceUp = false; });
      state.stock = [...state.waste];
      state.waste = [];
      // Классический штраф за прокрутку колоды.
      state.history.push({ type: 'recycle', scoreDelta: applyScore(-100) });
      Sound.deal();
    } else {
      const card = state.stock.pop();
      card.faceUp = true;
      state.waste.push(card);
      state.moves++;
      noteMove();
      state.history.push({ type: 'draw' });
      pendingAnim = { type: 'draw', cardId: card.id };
      Sound.flip();
    }
    render();
    updateUI();
    checkWin();
  }

  function saveState() {
    state.history.push({
      type: 'move',
      from: state.lastFrom,
      to: state.lastTo,
      cards: state.lastMovedCards,
      revealed: state.lastRevealed,
      scoreDelta: state.lastScoreDelta
    });
  }

  function moveCards(fromPile, fromIndex, toPile, toIndex, count) {
    if (gameOver) return false;
    const from = getPile(fromPile);
    const to = getPile(toPile);
    if (!from || !to) return false;

    const moving = from.slice(fromIndex, fromIndex + count);
    if (moving.length !== count) return false;
    if (!validateMove(moving, toPile, to)) return false;

    state.lastFrom = { pile: fromPile, index: fromIndex };
    state.lastTo = { pile: toPile, index: toIndex };
    state.lastMovedCards = moving;
    state.lastRevealed = null;

    if (fromPile.startsWith('tableau') && from[fromIndex - 1] && !from[fromIndex - 1].faceUp) {
      state.lastRevealed = fromIndex - 1;
      from[fromIndex - 1].faceUp = true;
    }

    // Классический подсчёт очков «Косынки».
    let delta = 0;
    if (toPile.startsWith('foundation')) delta += 10;                                    // карта в фундамент
    if (fromPile === 'waste' && toPile.startsWith('tableau')) delta += 5;                // из отбоя на стол
    if (fromPile.startsWith('foundation') && toPile.startsWith('tableau')) delta -= 15;  // возврат из фундамента
    if (state.lastRevealed !== null) delta += 5;                                         // открыта закрытая карта
    state.lastScoreDelta = applyScore(delta);

    from.splice(fromIndex, count);
    to.push(...moving);
    state.moves++;
    noteMove();
    saveState();
    Sound.place();
    render();
    updateUI();
    checkWin();
    return true;
  }

  function validateMove(cards, toPile, to) {
    if (cards.length === 0) return false;
    const first = cards[0];

    if (toPile.startsWith('foundation')) {
      if (cards.length !== 1) return false;
      return canStackOnFoundation(first, to);
    }

    if (toPile.startsWith('tableau')) {
      const target = to.length ? to[to.length - 1] : null;
      return canStackOnTableau(first, target);
    }

    return false;
  }

  function getPile(name) {
    if (name === 'stock') return state.stock;
    if (name === 'waste') return state.waste;
    if (name.startsWith('foundation-')) {
      const i = parseInt(name.split('-')[1], 10);
      return state.foundations[i];
    }
    if (name.startsWith('tableau-')) {
      const i = parseInt(name.split('-')[1], 10);
      return state.tableau[i];
    }
    return null;
  }

  function findCardIndex(pileName, cardId) {
    const pile = getPile(pileName);
    if (!pile) return -1;
    const idx = pile.findIndex(c => c.id === cardId);
    return idx;
  }

  function findPileContainingCard(cardId) {
    if (state.waste.some(c => c.id === cardId)) return { name: 'waste', index: state.waste.findIndex(c => c.id === cardId) };
    for (let i = 0; i < 4; i++) {
      const idx = state.foundations[i].findIndex(c => c.id === cardId);
      if (idx !== -1) return { name: `foundation-${i}`, index: idx };
    }
    for (let i = 0; i < 7; i++) {
      const idx = state.tableau[i].findIndex(c => c.id === cardId);
      if (idx !== -1) return { name: `tableau-${i}`, index: idx };
    }
    return null;
  }

  function undo() {
    if (gameOver || autoCollecting) return;
    const h = state.history.pop();
    if (!h) return;
    if (h.type === 'draw') {
      const c = state.waste.pop();
      if (!c) return;
      c.faceUp = false;
      state.stock.push(c);
      state.moves--;
      pendingAnim = { type: 'undraw', cardId: c.id, rank: c.rank, suit: c.suit };
    } else if (h.type === 'recycle') {
      state.stock.reverse().forEach(c => { c.faceUp = true; });
      state.waste = [...state.stock];
      state.stock = [];
      state.score -= h.scoreDelta || 0;
    } else if (h.type === 'move' && h.cards && h.from && h.to) {
      const currentPile = getPile(h.to.pile);
      const sourcePile = getPile(h.from.pile);
      const n = h.cards.length;
      const moved = currentPile.splice(currentPile.length - n, n);
      sourcePile.push(...moved);
      if (h.revealed !== null && sourcePile[h.revealed]) sourcePile[h.revealed].faceUp = false;
      state.moves--;
      state.score -= h.scoreDelta || 0;
    }
    render();
    updateUI();
  }

  function checkWin() {
    if (gameOver) return;
    const total = state.foundations.reduce((sum, p) => sum + p.length, 0);
    if (total !== 52) return;
    gameOver = true;
    updateUI();
    stopTimer();
    stats.won++;
    stats.streak++;
    if (state.score > (stats.bestScore || 0)) stats.bestScore = state.score;
    statGameActive = false;
    persistStats();
    persist();
    if (window.YandexSDK) {
      window.YandexSDK.gameplayStop();
      window.YandexSDK.submitScore('fewestMoves', state.moves);
      window.YandexSDK.submitScore('bestScore', state.score);
      window.YandexSDK.clearState();
    }
    Sound.win();
    winCascade();
    winOverlayTimer = setTimeout(showWinOverlay, 2200);
  }

  // Окно победы: итог партии, статистика игрока, таблица рекордов.
  function showWinOverlay() {
    winOverlayTimer = null;
    if (!gameOver) return;
    const d = currentDict;
    document.getElementById('win-result').textContent =
      `${d.movesLabel} ${state.moves} · ${d.scoreLabel} ${state.score} · ${formatTime(currentElapsed())}`;
    document.getElementById('win-stats').textContent =
      `${d.statsWins}: ${stats.won}/${stats.played} · ${d.statsStreak}: ${stats.streak}`;
    document.getElementById('win-overlay').classList.remove('hidden');
    fillLeaderboard();
    // Победа — лучший момент попросить оценку (SDK сам решит, показывать ли диалог).
    if (window.YandexSDK) window.YandexSDK.requestReview();
  }

  function fillLeaderboard() {
    const box = document.getElementById('win-lb');
    const login = document.getElementById('lb-login');
    const list = document.getElementById('lb-list');
    box.classList.add('hidden');
    login.classList.add('hidden');
    list.innerHTML = '';
    if (!window.YandexSDK || !window.YandexSDK.available()) return;
    if (!window.YandexSDK.isAuthorized()) {
      login.classList.remove('hidden');
      return;
    }
    window.YandexSDK.getLeaderboard('bestScore').then((entries) => {
      if (!entries || !entries.length) return;
      entries.forEach((e) => {
        const li = document.createElement('li');
        if (e.isUser) li.className = 'me';
        const rank = document.createElement('span');
        rank.textContent = e.rank + '.';
        const name = document.createElement('span');
        name.className = 'lb-name';
        name.textContent = e.name || '···';
        const score = document.createElement('span');
        score.textContent = e.score;
        li.append(rank, name, score);
        list.appendChild(li);
      });
      box.classList.remove('hidden');
    });
  }

  // Победный каскад: карты слетают с фундаментов и скачут по «полу» экрана.
  let cascadeParts = [];
  let cascadeRaf = null;

  function winCascade() {
    clearCascade();
    const sources = Array.from(document.querySelectorAll('.foundation-pile .card')).reverse();
    const limit = Math.min(sources.length, 60);
    let spawned = 0;
    const spawnOne = () => {
      if (spawned >= limit) return;
      const src = sources[spawned];
      const r = src.getBoundingClientRect();
      const clone = src.cloneNode(true);
      Object.assign(clone.style, {
        position: 'fixed',
        left: r.left + 'px',
        top: r.top + 'px',
        width: r.width + 'px',
        height: r.height + 'px',
        margin: '0',
        zIndex: '1500',
        transition: 'none',
        pointerEvents: 'none'
      });
      document.body.appendChild(clone);
      cascadeParts.push({
        el: clone,
        x: r.left, y: r.top, h: r.height,
        vx: (2 + Math.random() * 5) * (Math.random() < 0.5 ? -1 : 1),
        vy: -(3 + Math.random() * 6)
      });
      spawned++;
      if (spawned < limit) setTimeout(spawnOne, 45);
    };
    spawnOne();
    const step = () => {
      const H = window.innerHeight;
      const W = window.innerWidth;
      let alive = false;
      cascadeParts.forEach((p) => {
        if (!p.el) return;
        p.vy += 0.5;
        p.x += p.vx;
        p.y += p.vy;
        if (p.y + p.h > H) { p.y = H - p.h; p.vy *= -0.72; }
        if (p.x < -250 || p.x > W + 250) { p.el.remove(); p.el = null; return; }
        p.el.style.left = p.x + 'px';
        p.el.style.top = p.y + 'px';
        alive = true;
      });
      cascadeRaf = (alive || spawned < limit) ? requestAnimationFrame(step) : null;
    };
    cascadeRaf = requestAnimationFrame(step);
    setTimeout(clearCascade, 9000);
  }

  function clearCascade() {
    if (cascadeRaf) cancelAnimationFrame(cascadeRaf);
    cascadeRaf = null;
    cascadeParts.forEach((p) => p.el && p.el.remove());
    cascadeParts = [];
  }

  function createCardElement(card) {
    const el = document.createElement('div');
    el.className = 'card' + (card.faceUp ? ' ' + (isRed(card.suit) ? 'red' : 'black') : ' back');
    el.dataset.id = card.id;
    el.dataset.rank = card.rank;
    el.dataset.suit = card.suit;
    if (card.faceUp) {
      el.innerHTML = `
        <span class="card-value">${card.rank}${SUIT_SYMBOLS[card.suit]}</span>
        <span class="card-center">${SUIT_SYMBOLS[card.suit]}</span>
        <span class="card-value bottom">${card.rank}${SUIT_SYMBOLS[card.suit]}</span>
      `;
    }
    return el;
  }

  let pendingAnim = null;
  let pendingDragRects = null;
  const ANIM_MS = 260;
  const ANIM_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

  function render() {
    clearHints();
    // FIRST: запоминаем позиции карт до перерисовки (для FLIP-анимации).
    const firstRects = {};
    document.querySelectorAll('.card[data-id]').forEach(el => {
      if (el.dataset.id !== 'back') firstRects[el.dataset.id] = el.getBoundingClientRect();
    });
    const stockRect = document.getElementById('stock').getBoundingClientRect();
    const anim = pendingAnim;
    pendingAnim = null;
    // Для карт, перетащенных вручную, стартовая позиция — место отпускания, а не позиция в стопке.
    const dragRects = pendingDragRects;
    pendingDragRects = null;
    if (dragRects) Object.assign(firstRects, dragRects);

    const stockEl = document.getElementById('stock');
    const wasteEl = document.getElementById('waste');
    stockEl.innerHTML = '';
    if (state.stock.length > 0) {
      const back = createCardElement({ suit: 'hearts', rank: 'A', faceUp: false, id: 'back' });
      back.style.pointerEvents = 'none';
      stockEl.appendChild(back);
    }
    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    stockEl.appendChild(placeholder);
    placeholder.addEventListener('click', drawFromStock);

    wasteEl.innerHTML = '';
    state.waste.forEach((c) => {
      const el = createCardElement(c);
      el.style.left = '0';
      el.style.top = '0';
      wasteEl.appendChild(el);
    });

    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`foundation-${i}`);
      el.innerHTML = '';
      state.foundations[i].forEach(c => {
        el.appendChild(createCardElement(c));
      });
    }

    for (let i = 0; i < 7; i++) {
      const col = document.getElementById(`tableau-${i}`);
      col.innerHTML = '';
      state.tableau[i].forEach(c => {
        col.appendChild(createCardElement(c));
      });
    }

    adjustOverlaps();
    bindDragAndDrop();
    bindSendToFoundation();
    runAnimations(firstRects, stockRect, anim);

    persist();
  }

  // Интервалы стопки: открытым картам — комфортный шаг, чтобы был виден номинал
  // нижних карт, рубашкам — вдвое плотнее. Если столбец не помещается по высоте
  // поля, оба шага пропорционально ужимаются.
  function adjustOverlaps() {
    for (let i = 0; i < 7; i++) {
      const col = document.getElementById(`tableau-${i}`);
      const cards = state.tableau[i];
      const n = cards.length;
      col.style.removeProperty('--tableau-overlap');
      col.style.removeProperty('--tableau-overlap-back');
      if (n < 2) continue;
      const cardH = col.firstElementChild.getBoundingClientRect().height;
      let upStep = Math.min(30, Math.max(14, cardH * 0.26));
      let backStep = Math.min(14, Math.max(7, cardH * 0.13));
      const nBack = cards.filter(c => !c.faceUp).length;
      const nUp = n - nBack;
      const needed = cardH + nBack * backStep + Math.max(0, nUp - 1) * upStep;
      const avail = col.clientHeight;
      if (needed > avail) {
        const k = (avail - cardH) / (needed - cardH);
        upStep = Math.max(9, upStep * k);
        backStep = Math.max(5, backStep * k);
      }
      col.style.setProperty('--tableau-overlap', upStep.toFixed(2) + 'px');
      col.style.setProperty('--tableau-overlap-back', backStep.toFixed(2) + 'px');
    }
  }

  // FLIP: проигрываем переход каждой карты от старой позиции к новой.
  function runAnimations(firstRects, stockRect, anim) {
    document.querySelectorAll('.card[data-id]').forEach(el => {
      const id = el.dataset.id;
      if (id === 'back') return;
      let from = firstRects[id];
      // Карта, взятая из колоды: летит из стопки колоды (в DOM её раньше не было).
      if (!from && anim && anim.type === 'draw' && id === anim.cardId) from = stockRect;
      if (!from) return;
      const last = el.getBoundingClientRect();
      const dx = from.left - last.left;
      const dy = from.top - last.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.zIndex = '600';
      el.getBoundingClientRect(); // форсируем reflow, чтобы зафиксировать стартовую позицию
      el.style.transition = `transform ${ANIM_MS}ms ${ANIM_EASE}`;
      el.style.transform = 'translate(0, 0)';
      const cleanup = () => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.zIndex = '';
        el.removeEventListener('transitionend', cleanup);
      };
      el.addEventListener('transitionend', cleanup);
    });

    // Откат взятия: карта вернулась в колоду и больше не в DOM — показываем «призрак», улетающий в колоду.
    if (anim && anim.type === 'undraw') {
      const from = firstRects[anim.cardId];
      if (from) flyGhost(from, stockRect, anim);
    }
  }

  function flyGhost(fromRect, toRect, cardData) {
    const ghost = createCardElement({ suit: cardData.suit, rank: cardData.rank, faceUp: true, id: 'ghost' });
    Object.assign(ghost.style, {
      position: 'fixed',
      left: fromRect.left + 'px',
      top: fromRect.top + 'px',
      width: fromRect.width + 'px',
      height: fromRect.height + 'px',
      margin: '0',
      zIndex: '700',
      pointerEvents: 'none',
      transition: `transform ${ANIM_MS}ms ${ANIM_EASE}, opacity ${ANIM_MS}ms ease`
    });
    document.body.appendChild(ghost);
    const dx = toRect.left - fromRect.left;
    const dy = toRect.top - fromRect.top;
    ghost.getBoundingClientRect();
    requestAnimationFrame(() => {
      ghost.style.transform = `translate(${dx}px, ${dy}px)`;
      ghost.style.opacity = '0.25';
    });
    setTimeout(() => ghost.remove(), ANIM_MS + 60);
  }

  // Verify the entire finish on a copy before offering automatic collection.
  function collectionPlan() {
    if (gameOver || state.stock.length || state.tableau.some(col => col.some(c => !c.faceUp))) return null;
    const foundations = state.foundations.map(pile => [...pile]);
    const sources = [state.waste.slice(), ...state.tableau.map(col => [...col])];
    const plan = [];
    while (sources.some(pile => pile.length)) {
      let found = false;
      for (let i = 0; i < sources.length; i++) {
        const pile = sources[i];
        if (!pile.length) continue;
        const card = pile[pile.length - 1];
        const target = foundations.findIndex(f => canStackOnFoundation(card, f));
        if (target < 0) continue;
        plan.push({ from: i === 0 ? 'waste' : `tableau-${i - 1}`, index: pile.length - 1, target });
        foundations[target].push(pile.pop());
        found = true;
        break;
      }
      if (!found) return null;
    }
    return plan.length ? plan : null;
  }

  function autoCollect() {
    if (autoCollecting) return;
    const plan = collectionPlan();
    if (!plan) return;
    autoCollecting = true;
    updateUI();
    const step = () => {
      if (!autoCollecting || gameOver) return;
      if (document.hidden) { autoCollectTimer = setTimeout(step, 250); return; }
      const move = plan.shift();
      if (!move || !moveCards(move.from, move.index, `foundation-${move.target}`, state.foundations[move.target].length, 1)) {
        autoCollecting = false;
        updateUI();
        return;
      }
      if (gameOver) { autoCollecting = false; updateUI(); return; }
      autoCollectTimer = setTimeout(step, 180);
    };
    step();
  }

  function updateUI() {
    document.getElementById('auto-collect').classList.toggle('hidden', autoCollecting || !collectionPlan());
    document.getElementById('replay').disabled = !initialDeck;
    document.getElementById('replay-win').disabled = !initialDeck;
    document.getElementById('moves').textContent = state.moves;
    document.getElementById('score').textContent = state.score;
    document.getElementById('undo').disabled = gameOver || autoCollecting || state.history.length === 0;
    renderTimer();
  }

  let dragSource = null;
  let dragCards = [];
  let dragElements = [];
  let dragPileName = null;
  let dragStartIndex = 0;
  let touchStart = null;
  let lastTap = { id: null, time: 0 };
  let lastPointerWasTouch = false;
  const TAP_SLOP = 30;       // макс. смещение пальца, чтобы считать касание тапом, а не перетаскиванием
  const DOUBLE_TAP_MS = 600; // макс. интервал между тапами для двойного тапа
  const DRAG_THRESHOLD = 6;  // сдвиг курсора, после которого начинается перетаскивание (а не клик)

  function bindDragAndDrop() {
    document.querySelectorAll('.card').forEach(cardEl => {
      cardEl.addEventListener('mousedown', onCardPointerDown);
      cardEl.addEventListener('touchstart', onCardPointerDown, { passive: false });
    });
  }

  function getPoint(e) {
    if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  function onCardPointerDown(e) {
    if (gameOver || autoCollecting) return;
    const isTouch = e.type === 'touchstart';
    if (!isTouch && e.button !== 0) return;
    lastPointerWasTouch = isTouch;
    const point = getPoint(e);
    touchStart = isTouch ? { x: point.x, y: point.y } : null;
    const cardId = e.target.closest('.card')?.dataset?.id;
    if (!cardId) return;
    const src = findPileContainingCard(cardId);
    if (!src) return;

    const pile = getPile(src.name);
    const index = src.index;
    if (!pile[index].faceUp) return;

    if (src.name === 'waste') {
      dragCards = [pile[pile.length - 1]];
      dragStartIndex = pile.length - 1;
    } else if (src.name.startsWith('tableau')) {
      dragCards = pile.slice(index);
      for (let i = 0; i < dragCards.length - 1; i++) {
        if (RANK_VALUES[dragCards[i].rank] !== RANK_VALUES[dragCards[i + 1].rank] + 1 ||
            isRed(dragCards[i].suit) === isRed(dragCards[i + 1].suit)) {
          dragCards = dragCards.slice(0, i + 1);
          break;
        }
      }
      dragStartIndex = index;
    } else {
      dragCards = [pile[index]];
      dragStartIndex = index;
    }

    dragPileName = src.name;
    dragSource = e.target.closest('.card');

    if (src.name.startsWith('tableau') && dragCards.length > 1) {
      const column = dragSource.closest('.tableau-column');
      const allColCards = Array.from(column.querySelectorAll('.card'));
      dragElements = allColCards.slice(dragStartIndex);
    } else {
      dragElements = [dragSource];
    }

    const rect = dragSource.getBoundingClientRect();
    const grabOffsetX = point.x - rect.left;
    const grabOffsetY = point.y - rect.top;

    const offsets = dragElements.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left - rect.left, top: r.top - rect.top };
    });

    // Карту НЕ «поднимаем» сразу: иначе она получает pointer-events:none, mouseup
    // промахивается мимо неё, и браузер не формирует click/dblclick. Перетаскивание
    // начинаем только после реального сдвига курсора (DRAG_THRESHOLD).
    let dragStarted = false;
    const liftDrag = () => {
      dragStarted = true;
      dragElements.forEach((el) => {
        el.classList.add('dragging');
        el.style.pointerEvents = 'none';
      });
      dragElements.forEach((el, i) => {
        el.style.position = 'fixed';
        el.style.left = (rect.left + offsets[i].left) + 'px';
        el.style.top = (rect.top + offsets[i].top) + 'px';
      });
    };

    const onMove = (ev) => {
      if (dragElements.length === 0) return;
      const p = getPoint(ev);
      if (!dragStarted) {
        if (Math.hypot(p.x - point.x, p.y - point.y) < DRAG_THRESHOLD) return;
        liftDrag();
      }
      if (ev.type === 'touchmove') ev.preventDefault();
      const baseX = p.x - grabOffsetX;
      const baseY = p.y - grabOffsetY;
      dragElements.forEach((el, i) => {
        el.style.left = (baseX + offsets[i].left) + 'px';
        el.style.top = (baseY + offsets[i].top) + 'px';
      });
    };
    const onUp = (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
      // Перетаскивание не начиналось — это был клик/тап. Карту не трогали,
      // поэтому ничего не сбрасываем; нативный click/dblclick сработают сами.
      if (!dragStarted) {
        dragSource = null;
        dragCards = [];
        dragElements = [];
        dragPileName = null;
        return;
      }
      if (!dragSource) return;

      // Определяем целевую стопку, пока перетаскиваемые карты ещё с pointer-events: none.
      const p = getPoint(ev);
      const under = document.elementFromPoint(p.x, p.y);
      const targetPile = under?.closest('[data-pile]')?.dataset?.pile;

      // Запоминаем позиции карт в момент отпускания — отсюда должна стартовать анимация.
      const dropRects = {};
      dragElements.forEach((el) => { dropRects[el.dataset.id] = el.getBoundingClientRect(); });

      dragElements.forEach((el) => {
        el.classList.remove('dragging');
        el.style.left = '';
        el.style.top = '';
        el.style.position = '';
        el.style.pointerEvents = '';
      });

      if (targetPile && targetPile !== dragPileName && dragCards.length > 0) {
        const toPile = getPile(targetPile);
        if (targetPile.startsWith('foundation') && dragCards.length === 1 && canStackOnFoundation(dragCards[0], toPile)) {
          pendingDragRects = dropRects;
          moveCards(dragPileName, dragStartIndex, targetPile, toPile.length, 1);
        } else if (targetPile.startsWith('tableau')) {
          const toCol = getPile(targetPile);
          const targetCard = toCol.length ? toCol[toCol.length - 1] : null;
          if (canStackOnTableau(dragCards[0], targetCard)) {
            pendingDragRects = dropRects;
            moveCards(dragPileName, dragStartIndex, targetPile, toCol.length, dragCards.length);
          }
        }
      }

      dragSource = null;
      dragCards = [];
      dragElements = [];
      dragPileName = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  // Отправляет верхнюю карту отбоя/столбца в подходящий фундамент. Возвращает true, если ход сделан.
  function sendToFoundation(cardId) {
    if (autoCollecting) return;
    const src = findPileContainingCard(cardId);
    if (!src) return false;
    const pile = getPile(src.name);
    const card = pile[src.index];
    if (!card || !card.faceUp) return false;
    if (src.name.startsWith('foundation')) return false;
    if (src.index !== pile.length - 1) return false; // только верхняя карта
    for (let i = 0; i < 4; i++) {
      if (canStackOnFoundation(card, state.foundations[i])) {
        moveCards(src.name, src.index, `foundation-${i}`, state.foundations[i].length, 1);
        return true;
      }
    }
    return false;
  }

  function bindSendToFoundation() {
    document.querySelectorAll('.card').forEach(cardEl => {
      // Десктоп: двойной клик ловим вручную по событиям click. Нативный dblclick
      // ненадёжен: карта на время перетаскивания получает pointer-events:none, и в
      // ряде сценариев браузер не формирует dblclick.
      cardEl.addEventListener('click', () => {
        if (lastPointerWasTouch) return; // на тач-устройствах двойной тап ловим в touchend
        const id = cardEl.dataset.id;
        const now = Date.now();
        if (lastTap.id === id && now - lastTap.time < DOUBLE_TAP_MS) {
          lastTap = { id: null, time: 0 };
          sendToFoundation(id);
        } else {
          lastTap = { id, time: now };
        }
      });

      // Тач: двойной тап.
      cardEl.addEventListener('touchend', (e) => {
        const p = getPoint(e);
        const moved = touchStart ? Math.hypot(p.x - touchStart.x, p.y - touchStart.y) : 999;
        if (moved > TAP_SLOP) { lastTap = { id: null, time: 0 }; return; } // это перетаскивание, не тап
        const id = cardEl.dataset.id;
        const now = Date.now();
        if (lastTap.id === id && now - lastTap.time < DOUBLE_TAP_MS) {
          e.preventDefault(); // гасим зум/синтетический dblclick
          lastTap = { id: null, time: 0 };
          // Отменяем начатое перетаскивание, чтобы последующий onUp ничего не делал.
          dragSource = null;
          dragCards = [];
          dragElements = [];
          dragPileName = null;
          sendToFoundation(id);
        } else {
          lastTap = { id, time: now };
        }
      });
    });
  }

  // Сколько карт готовой последовательности продолжает переносимая карта.
  function hintSupportLength(pile, card) {
    let length = 0;
    let next = card;
    for (let i = pile.length - 1; i >= 0; i--) {
      const previous = pile[i];
      if (!previous.faceUp || previous.value !== next.value + 1 || !(isRed(previous.suit) !== isRed(next.suit))) break;
      length++;
      next = previous;
    }
    return length;
  }

  function findHints() {
    const moves = [];
    const sources = [{ pile: 'waste', cards: state.waste }, ...state.tableau.map((cards, i) => ({ pile: `tableau-${i}`, cards }))];
    for (const { pile, cards } of sources) {
      for (let j = 0; j < cards.length; j++) {
        const card = cards[j];
        if (!card.faceUp || (pile === 'waste' && j !== cards.length - 1)) continue;
        const reveals = j > 0 && !cards[j - 1].faceUp;
        if (j === cards.length - 1) state.foundations.forEach((target, i) => {
          if (canStackOnFoundation(card, target)) moves.push({ id: card.id, target: `foundation-${i}`, priority: reveals ? 100 : 40 });
        });
        state.tableau.forEach((target, i) => {
          if (pile === `tableau-${i}` || (!target.length && j === 0 && pile !== 'waste')) return;
          const sourceSupport = pile === 'waste' ? 0 : hintSupportLength(cards.slice(0, j), card);
          if (sourceSupport > 0 && hintSupportLength(target, card) <= sourceSupport) return;
          if (canStackOnTableau(card, target[target.length - 1])) moves.push({ id: card.id, target: `tableau-${i}`, priority: reveals ? 100 : 20 });
        });
      }
    }
    moves.sort((a, b) => b.priority - a.priority);
    if ((state.stock.length || state.waste.length)) moves.push({ stock: true });
    return moves;
  }

  function clearHints(reset = true) {
    if (reset) {
      hintMoves = [];
      hintIndex = -1;
    }
    document.querySelectorAll('.hint, .hint-target').forEach(el => el.classList.remove('hint', 'hint-target'));
    document.getElementById('hint-message').textContent = '';
  }

  function toggleHints() {
    if (gameOver || autoCollecting) return;
    if (hintIndex < 0) {
      const moves = findHints();
      if (!moves.length) {
        document.getElementById('hint-message').textContent = currentDict.hintNone;
        return;
      }
      hintMoves = moves;
    }
    hintIndex = (hintIndex + 1) % hintMoves.length;
    clearHints(false);
    const hint = hintMoves[hintIndex];
    if (hint.stock) {
      document.querySelector('#stock .card-placeholder').classList.add('hint');
    } else {
      const card = document.querySelector(`.card[data-id="${hint.id}"]`);
      if (card) card.classList.add('hint');
      document.getElementById(hint.target).classList.add('hint-target');
    }
    const message = hint.stock ? currentDict.hintStock : currentDict.hintMove;
    document.getElementById('hint-message').textContent = message;
  }

  function replayDeal() {
    if (!initialDeck) return;
    document.getElementById('win-overlay').classList.add('hidden');
    deal(true);
    if (window.YandexSDK) window.YandexSDK.gameplayStart();
  }

  function startNewGame() {
    document.getElementById('win-overlay').classList.add('hidden');
    deal();
    // Полноэкранная реклама на старте новой игры (частоту ограничивает Яндекс).
    if (window.YandexSDK) window.YandexSDK.showInterstitial();
  }

  document.getElementById('auto-collect').addEventListener('click', autoCollect);
  document.getElementById('replay').addEventListener('click', replayDeal);
  document.getElementById('replay-win').addEventListener('click', replayDeal);
  document.getElementById('new-game').addEventListener('click', startNewGame);
  document.getElementById('undo').addEventListener('click', undo);
  document.getElementById('hint').addEventListener('click', toggleHints);
  document.getElementById('play-again').addEventListener('click', startNewGame);

  // Кнопка звука.
  const soundBtn = document.getElementById('sound');
  function renderSoundBtn() {
    soundBtn.textContent = Sound.isMuted() ? '🔇' : '🔊';
  }
  soundBtn.addEventListener('click', () => {
    Sound.setMuted(!Sound.isMuted());
    renderSoundBtn();
  });
  renderSoundBtn();

  // Вход в аккаунт из окна победы: после авторизации отправляем результат заново
  // (у неавторизованных игроков очки в лидерборд не попадают).
  document.getElementById('lb-login').addEventListener('click', () => {
    if (!window.YandexSDK) return;
    window.YandexSDK.authorize().then((ok) => {
      if (!ok) return;
      window.YandexSDK.submitScore('fewestMoves', state.moves);
      window.YandexSDK.submitScore('bestScore', state.score);
      setTimeout(fillLeaderboard, 1000); // даём результату записаться
    });
  });

  // Отмена по Ctrl+Z (Cmd+Z на macOS). Shift/Alt не трогаем — redo нет.
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      undo();
    }
  });

  // Перерисовка при изменении размера окна: пересчитываем ужатие длинных столбцов.
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(adjustOverlaps, 100);
  });

  // Требование платформы 1.6.2.7: взаимодействие с игровым полем не должно
  // выделять элементы и открывать контекстное меню браузера.

  // Пауза при уходе со вкладки (Gameplay API, таймер, звук), возобновление
  // при возврате — если партия идёт и не показан экран победы.
  let gameStarted = false;
  window.addEventListener('pagehide', persist);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      Sound.suspend();
      stopTimer();
      persist();
      if (gameStarted && window.YandexSDK) window.YandexSDK.gameplayStop();
    } else {
      Sound.resume();
      if (!gameStarted || gameOver) return;
      if (document.getElementById('win-overlay').classList.contains('hidden')) {
        if (state.moves > 0) startTimer();
        if (window.YandexSDK) window.YandexSDK.gameplayStart();
      }
    }
  });

  // Пауза таймера и звука на время показа рекламы.
  if (window.YandexSDK) {
    window.YandexSDK.setAdCallback((open) => {
      if (open) {
        Sound.suspend();
        stopTimer();
      } else {
        Sound.resume();
        if (!gameOver && state.moves > 0) startTimer();
      }
    });
  }

  // Старт: сначала ждём SDK (локально без Яндекса он резолвится почти мгновенно),
  // чтобы язык определился из окружения платформы ДО первой отрисовки (п. 2.14)
  // и сохранённая партия восстановилась до показа поля. Только когда игра
  // полностью готова, сигналим Game Ready (п. 1.19.2) и стартуем геймплей.
  const forcedLang = urlLang();

  function startGame(saved, cloudStats) {
    saved = loadSavedGame(saved);
    stats = mergeStats(loadLocalStats(), cloudStats) || stats;
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {}
    if (saved && isValidSave(saved)) {
      restoreState(saved);
      statGameActive = typeof saved.statGameActive === 'boolean' ? saved.statGameActive : state.moves > 0;
      gameOver = state.foundations.every(pile => pile.length === 13);
      render();
      updateUI();
    } else {
      deal();
    }
    allowCloudSave = true;
    gameStarted = true;
    document.body.classList.remove('loading');
    persist();
    if (gameOver) showWinOverlay();
    else if (statGameActive && !document.hidden) startTimer();
    if (window.YandexSDK) {
      window.YandexSDK.ready();
      if (!gameOver && !document.hidden) window.YandexSDK.gameplayStart();
    }
  }

  if (window.YandexSDK) {
    window.YandexSDK.setLangCallback((lang) => {
      applyLang(forcedLang || pickLang(lang) || pickLang(navigator.language) || 'ru');
    });
    window.YandexSDK.init()
      .then(() => {
        applyLang(forcedLang || pickLang(window.YandexSDK.getLang()) || pickLang(navigator.language) || 'ru');
        return window.YandexSDK.loadData();
      })
      .then((d) => Promise.resolve(document.fonts && document.fonts.ready)
        .then(() => startGame(d && d.save, d && d.stats)))
      .catch(() => {
        applyLang(forcedLang || pickLang(navigator.language) || 'ru');
        startGame(null, null);
      });
  } else {
    applyLang(forcedLang || pickLang(navigator.language) || 'ru');
    startGame(null, null);
  }

  // Отладочный хук победы: доступен только при ?debugwin в адресе (на Яндексе
  // параметры не передаются, в продакшене недоступен).
  if (new URLSearchParams(location.search).has('debugwin')) {
    window.__debugWin = () => {
      state.stock = [];
      state.waste = [];
      state.tableau = [[], [], [], [], [], [], []];
      state.foundations = SUITS.map((suit) =>
        RANKS.map((rank) => ({ suit, rank, value: RANK_VALUES[rank], faceUp: true, id: `${suit}-${rank}-dbg` })));
      state.history = [];
      state.moves = 87;
      state.score = 320;
      render();
      updateUI();
      checkWin();
    };
  }
})();
