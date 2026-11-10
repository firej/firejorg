(function () {
  'use strict';

  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUIT_SYMBOLS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
  const RANK_VALUES = { A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13 };

  // В «Пауке» 104 карты = 8 комплектов по 13. Сложность определяет набор мастей:
  // 1 масть — восемь комплектов пик, 2 — пики и червы, 4 — две полные колоды.
  const SUIT_SETS = {
    1: ['spades', 'spades', 'spades', 'spades', 'spades', 'spades', 'spades', 'spades'],
    2: ['spades', 'hearts', 'spades', 'hearts', 'spades', 'hearts', 'spades', 'hearts'],
    4: ['spades', 'hearts', 'clubs', 'diamonds', 'spades', 'hearts', 'clubs', 'diamonds']
  };

  // Локализация (RU/EN/ES/TR). Язык берём из SDK Яндекса, иначе из языка браузера.
  // Название игры должно быть одинаковым в игре и во всех материалах черновика
  // на соответствующем языке (требование платформы 5.1.3).
  const I18N = {
    ru: {
      replay: 'Повторить расклад', autoCollect: 'Собрать автоматически', hintMove: 'Перенесите подсвеченную карту в отмеченную стопку.', hintStock: 'Возьмите карты из колоды.', hintNone: 'Доступных ходов не найдено.',
      title: 'Пасьянс "Паук" от firej', heading: 'Пасьянс "Паук" от firej', newGame: 'Новая игра', undo: 'Отменить',
      hint: 'Подсказка', movesLabel: 'Ходов:', winTitle: 'Поздравляем!',
      winText: 'Пасьянс разложен.', playAgain: 'Играть снова',
      suits1: '1 масть', suits2: '2 масти', suits4: '4 масти',
      scoreLabel: 'Очки:', statsWins: 'Побед', statsStreak: 'Серия',
      lbTitle: 'Таблица рекордов', lbLogin: 'Войдите, чтобы попасть в таблицу'
    },
    en: {
      replay: 'Replay deal', autoCollect: 'Collect automatically', hintMove: 'Move the highlighted card to the marked pile.', hintStock: 'Draw from the stock.', hintNone: 'No available moves found.',
      title: 'Spider Solitaire by firej', heading: 'Spider Solitaire by firej', newGame: 'New game', undo: 'Undo',
      hint: 'Hint', movesLabel: 'Moves:', winTitle: 'Congratulations!',
      winText: 'You solved it!', playAgain: 'Play again',
      suits1: '1 suit', suits2: '2 suits', suits4: '4 suits',
      scoreLabel: 'Score:', statsWins: 'Wins', statsStreak: 'Streak',
      lbTitle: 'Leaderboard', lbLogin: 'Sign in to join the leaderboard'
    },
    es: {
      replay: 'Repetir reparto', autoCollect: 'Recoger automáticamente', hintMove: 'Mueve la carta resaltada al montón marcado.', hintStock: 'Roba del mazo.', hintNone: 'No hay movimientos disponibles.',
      title: 'Solitario Araña de firej', heading: 'Solitario Araña de firej', newGame: 'Nueva partida', undo: 'Deshacer',
      hint: 'Pista', movesLabel: 'Movimientos:', winTitle: '¡Felicidades!',
      winText: '¡Lo has resuelto!', playAgain: 'Jugar de nuevo',
      suits1: '1 palo', suits2: '2 palos', suits4: '4 palos',
      scoreLabel: 'Puntos:', statsWins: 'Victorias', statsStreak: 'Racha',
      lbTitle: 'Clasificación', lbLogin: 'Inicia sesión para entrar en la clasificación'
    },
    tr: {
      replay: 'Dağıtımı tekrarla', autoCollect: 'Otomatik topla', hintMove: 'Vurgulanan kartı işaretli desteye taşıyın.', hintStock: 'Desteden kart çekin.', hintNone: 'Uygun hamle bulunamadı.',
      title: 'Örümcek Solitaire by firej', heading: 'Örümcek Solitaire by firej', newGame: 'Yeni oyun', undo: 'Geri al',
      hint: 'İpucu', movesLabel: 'Hamle:', winTitle: 'Tebrikler!',
      winText: 'Çözdünüz!', playAgain: 'Tekrar oyna',
      suits1: '1 takım', suits2: '2 takım', suits4: '4 takım',
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
    tableau: [[], [], [], [], [], [], [], [], [], []],
    foundations: [],   // собранные последовательности K→A, каждая — массив из 13 карт
    suitMode: 1,
    moves: 0,
    score: 500,
    elapsedMs: 0,
    history: []
  };

  // Облачное сохранение включаем только после проверки сохранённой игры при старте,
  // иначе свежая раздача могла бы перезаписать облако до того, как мы его прочитаем.
  let allowCloudSave = false;
  let initialDeck = null;
  let hintMoves = [];
  let hintIndex = -1;

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
      deal() { if (!muted) noise(0.06, 1800, 0.3); },
      complete() { if (muted) return; tone(523, 0, 0.22, 'triangle', 0.12); tone(784, 0.08, 0.3, 'triangle', 0.12); },
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
  const SAVE_KEY = 'spider-save-v1';
  const STATS_KEY = 'spider-stats';
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
      tableau: state.tableau,
      foundations: state.foundations,
      suitMode: state.suitMode,
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
    if (!s || !Array.isArray(s.stock)) return false;
    if (!Array.isArray(s.tableau) || s.tableau.length !== 10) return false;
    if (!Array.isArray(s.foundations)) return false;
    if (!SUIT_SETS[s.suitMode]) return false;
    if (![...s.tableau, ...s.foundations].every(Array.isArray)) return false;
    const cards = [...s.stock, ...(s.waste || []), ...s.tableau.flat(), ...s.foundations.flat()];
    if (cards.some(c => !c || typeof c.id !== 'string' || !SUIT_SYMBOLS[c.suit] ||
      !RANKS.includes(c.rank) || c.value !== RANK_VALUES[c.rank] || typeof c.faceUp !== 'boolean')) return false;
    if (new Set(cards.map(c => c.id)).size !== cards.length) return false;
    if (['moves', 'score', 'elapsedMs', 'savedAt'].some(key =>
      s[key] != null && (!Number.isFinite(s[key]) || s[key] < 0))) return false;
    const count = (arr) => arr.reduce((sum, pile) => sum + (Array.isArray(pile) ? pile.length : 0), 0);
    const total = s.stock.length + count(s.tableau) + count(s.foundations);
    return total === 104;
  }

  function restoreState(s) {
    const cards = [...s.stock, ...(s.waste || []), ...s.tableau.flat(), ...s.foundations.flat()];
    initialDeck = Array.isArray(s.initialDeck) && s.initialDeck.length === cards.length &&
      new Set(s.initialDeck.map(c => c && c.id)).size === cards.length &&
      s.initialDeck.every(c => c && cards.some(saved => saved.id === c.id && saved.rank === c.rank && saved.suit === c.suit))
      ? JSON.parse(JSON.stringify(s.initialDeck)) : null;
    state.stock = s.stock;
    state.tableau = s.tableau;
    state.foundations = s.foundations;
    state.suitMode = s.suitMode;
    state.moves = s.moves || 0;
    state.score = typeof s.score === 'number' ? s.score : 0;
    state.elapsedMs = s.elapsedMs || 0;
    state.history = Array.isArray(s.history) ? s.history : [];
    document.getElementById('suit-mode').value = String(state.suitMode);
  }

  function createDeck(suitMode) {
    const deck = [];
    for (const suit of SUIT_SETS[suitMode]) {
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

  // Хвост столбца начиная с index можно взять в руку, если это открытая
  // последовательность одной масти по убыванию без разрывов.
  function canPickUp(col, index) {
    if (index < 0 || index >= col.length) return false;
    if (!col[index].faceUp) return false;
    for (let i = index; i < col.length - 1; i++) {
      if (col[i].suit !== col[i + 1].suit) return false;
      if (col[i].value !== col[i + 1].value + 1) return false;
    }
    return true;
  }

  // Класть можно на пустой столбец или на карту на единицу старше (масть не важна).
  function canDrop(card, col) {
    if (col.length === 0) return true;
    const top = col[col.length - 1];
    return top.faceUp && top.value === card.value + 1;
  }

  function deal(replay = false) {
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
      : shuffle(createDeck(state.suitMode));
    initialDeck = JSON.parse(JSON.stringify(deck));
    state.stock = [];
    state.tableau = [[], [], [], [], [], [], [], [], [], []];
    state.foundations = [];
    state.moves = 0;
    state.score = 500; // классический счёт «Паука»: 500 − ход, +100 за собранную масть
    state.elapsedMs = 0;
    state.history = [];

    // Первые 4 столбца получают по 6 карт, остальные — по 5; верхняя открыта.
    for (let col = 0; col < 10; col++) {
      const n = col < 4 ? 6 : 5;
      for (let i = 0; i < n; i++) {
        const card = deck.pop();
        card.faceUp = i === n - 1;
        state.tableau[col].push(card);
      }
    }
    state.stock = deck; // остаётся 50 карт — пять раздач по 10
    render();
    updateUI();
  }

  // Раздача из колоды: по одной открытой карте в каждый столбец.
  // По классическим правилам запрещена, пока есть пустые столбцы.
  function dealFromStock() {
    if (gameOver) return;
    if (state.stock.length === 0) return;

    const empty = state.tableau
      .map((col, i) => (col.length === 0 ? i : -1))
      .filter(i => i !== -1);
    if (empty.length) {
      empty.forEach(i => {
        const el = document.getElementById(`tableau-${i}`);
        el.classList.remove('flash');
        void el.offsetWidth; // перезапускаем анимацию, если класс уже был
        el.classList.add('flash');
      });
      return;
    }

    const entry = { type: 'deal', completions: [] };
    const ids = [];
    for (let col = 0; col < 10; col++) {
      const card = state.stock.pop();
      card.faceUp = true;
      state.tableau[col].push(card);
      ids.push(card.id);
    }
    state.moves++;
    noteMove();
    checkCompletions(entry.completions);
    entry.scoreDelta = applyScore(-1 + 100 * entry.completions.length);
    if (entry.completions.length) {
      pendingCompletionOrder = completionFlightOrder(entry.completions);
      Sound.complete();
    } else {
      Sound.deal();
    }
    state.history.push(entry);
    pendingAnim = { type: 'deal', cardIds: ids };
    render();
    updateUI();
    checkWin();
  }

  // Перенос открытой последовательности из столбца в столбец.
  function moveRun(fromCol, fromIndex, toCol) {
    if (gameOver) return false;
    const from = state.tableau[fromCol];
    const to = state.tableau[toCol];
    const moving = from.slice(fromIndex);
    if (!moving.length || !canPickUp(from, fromIndex)) return false;
    if (!canDrop(moving[0], to)) return false;

    const entry = {
      type: 'move',
      from: fromCol,
      to: toCol,
      count: moving.length,
      revealed: false,
      completions: []
    };

    from.splice(fromIndex, moving.length);
    if (from.length && !from[from.length - 1].faceUp) {
      from[from.length - 1].faceUp = true;
      entry.revealed = true;
    }
    to.push(...moving);
    state.moves++;
    noteMove();
    checkCompletions(entry.completions);
    entry.scoreDelta = applyScore(-1 + 100 * entry.completions.length);
    if (entry.completions.length) {
      pendingCompletionOrder = completionFlightOrder(entry.completions);
      Sound.complete();
    } else {
      Sound.place();
    }
    state.history.push(entry);
    render();
    updateUI();
    checkWin();
    return true;
  }

  // Ищем в каждом столбце собранную последовательность K→A одной масти
  // и убираем её в фундамент. Может сработать несколько раз за один ход.
  function checkCompletions(out) {
    for (let col = 0; col < 10; col++) {
      const pile = state.tableau[col];
      while (pile.length >= 13) {
        const start = pile.length - 13;
        if (pile[start].value !== 13 || !canPickUp(pile, start)) break;
        const cards = pile.splice(start, 13);
        state.foundations.push(cards);
        let revealed = false;
        if (pile.length && !pile[pile.length - 1].faceUp) {
          pile[pile.length - 1].faceUp = true;
          revealed = true;
        }
        out.push({ col, cards, revealed });
      }
    }
  }

  function undoCompletions(completions) {
    for (let i = completions.length - 1; i >= 0; i--) {
      const c = completions[i];
      state.foundations.pop();
      const pile = state.tableau[c.col];
      if (c.revealed && pile.length) pile[pile.length - 1].faceUp = false;
      pile.push(...c.cards);
    }
  }

  function getPile(name) {
    if (name === 'stock') return state.stock;
    if (name.startsWith('foundation-')) {
      const i = parseInt(name.split('-')[1], 10);
      return state.foundations[i] || null;
    }
    if (name.startsWith('tableau-')) {
      const i = parseInt(name.split('-')[1], 10);
      return state.tableau[i];
    }
    return null;
  }

  function findPileContainingCard(cardId) {
    for (let i = 0; i < 10; i++) {
      const idx = state.tableau[i].findIndex(c => c.id === cardId);
      if (idx !== -1) return { name: `tableau-${i}`, col: i, index: idx };
    }
    return null;
  }

  function undo() {
    if (gameOver) return;
    const h = state.history.pop();
    if (!h) return;
    undoCompletions(h.completions);
    if (h.type === 'deal') {
      // Возвращаем по карте из каждого столбца в обратном порядке — порядок колоды восстанавливается.
      const ghosts = [];
      for (let col = 9; col >= 0; col--) {
        const card = state.tableau[col].pop();
        card.faceUp = false;
        state.stock.push(card);
        ghosts.push({ id: card.id, rank: card.rank, suit: card.suit });
      }
      state.moves--;
      state.score -= h.scoreDelta || 0;
      pendingAnim = { type: 'undeal', cards: ghosts };
    } else if (h.type === 'move') {
      const to = state.tableau[h.to];
      const from = state.tableau[h.from];
      const moved = to.splice(to.length - h.count, h.count);
      if (h.revealed && from.length) from[from.length - 1].faceUp = false;
      from.push(...moved);
      state.moves--;
      state.score -= h.scoreDelta || 0;
    }
    render();
    updateUI();
  }

  function checkWin() {
    if (gameOver) return;
    if (state.foundations.length !== 8) return;
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
  let pendingCompletionOrder = null;
  const ANIM_MS = 260;
  const ANIM_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
  const DEAL_STAGGER_MS = 24;
  const COMPLETE_MS = 550;
  const COMPLETE_STAGGER_MS = 50;

  // Порядок полёта карт собранной последовательности в фундамент:
  // туз (верх стопки) снимается первым, король — последним.
  function completionFlightOrder(completions) {
    const order = {};
    let i = 0;
    completions.forEach(c => {
      [...c.cards].reverse().forEach(card => { order[card.id] = i++; });
    });
    return order;
  }

  function render() {
    clearHints();
    // FIRST: запоминаем позиции карт до перерисовки (для FLIP-анимации).
    const firstRects = {};
    document.querySelectorAll('.card[data-id]').forEach(el => {
      if (el.dataset.id.indexOf('back') !== 0) firstRects[el.dataset.id] = el.getBoundingClientRect();
    });
    const stockRect = document.getElementById('stock').getBoundingClientRect();
    const anim = pendingAnim;
    pendingAnim = null;
    const completionOrder = pendingCompletionOrder;
    pendingCompletionOrder = null;
    // Для карт, перетащенных вручную, стартовая позиция — место отпускания, а не позиция в стопке.
    const dragRects = pendingDragRects;
    pendingDragRects = null;
    if (dragRects) Object.assign(firstRects, dragRects);

    const stockEl = document.getElementById('stock');
    stockEl.innerHTML = '';
    // По одной рубашке на каждую оставшуюся раздачу, с небольшим сдвигом.
    const dealsLeft = Math.ceil(state.stock.length / 10);
    for (let i = 0; i < dealsLeft; i++) {
      const back = createCardElement({ suit: 'spades', rank: 'A', faceUp: false, id: `back-${i}` });
      back.style.pointerEvents = 'none';
      back.style.left = (i * 4) + 'px';
      stockEl.appendChild(back);
    }
    const placeholder = document.createElement('div');
    placeholder.className = 'card-placeholder';
    // Кликабельная зона (и подсветка при наведении) лежит ровно на верхней рубашке.
    placeholder.style.left = Math.max(0, (dealsLeft - 1) * 4) + 'px';
    placeholder.style.right = 'auto';
    placeholder.style.width = 'var(--card-width)';
    stockEl.appendChild(placeholder);
    placeholder.addEventListener('click', dealFromStock);

    // Фундаменты: собранная последовательность лежит королём вверх.
    for (let i = 0; i < 8; i++) {
      const el = document.getElementById(`foundation-${i}`);
      el.innerHTML = '';
      const run = state.foundations[i];
      if (run) {
        [...run].reverse().forEach(c => {
          el.appendChild(createCardElement(c));
        });
      }
    }

    for (let i = 0; i < 10; i++) {
      const col = document.getElementById(`tableau-${i}`);
      col.innerHTML = '';
      state.tableau[i].forEach(c => {
        col.appendChild(createCardElement(c));
      });
    }

    adjustOverlaps();
    bindDragAndDrop();
    bindSmartMove();
    runAnimations(firstRects, stockRect, anim, completionOrder);

    persist();
  }

  // Интервалы стопки: открытым картам — комфортный шаг, чтобы был виден номинал,
  // рубашкам — вдвое плотнее. Если столбец не помещается по высоте поля,
  // оба шага пропорционально ужимаются.
  function adjustOverlaps() {
    for (let i = 0; i < 10; i++) {
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
  function runAnimations(firstRects, stockRect, anim, completionOrder) {
    document.querySelectorAll('.card[data-id]').forEach(el => {
      const id = el.dataset.id;
      if (id.indexOf('back') === 0) return;
      let from = firstRects[id];
      let delay = 0;
      // Карты, разданные из колоды, летят из её стопки (в DOM их раньше не было) — с лёгкой задержкой по очереди.
      if (!from && anim && anim.type === 'deal') {
        const idx = anim.cardIds.indexOf(id);
        if (idx !== -1) {
          from = stockRect;
          delay = idx * DEAL_STAGGER_MS;
        }
      }
      if (!from) return;
      const last = el.getBoundingClientRect();
      const dx = from.left - last.left;
      const dy = from.top - last.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

      // Собранная последовательность улетает в фундамент торжественно:
      // по одной карте, дугой и с лёгким увеличением в полёте.
      if (completionOrder && completionOrder[id] != null) {
        const idx = completionOrder[id];
        el.style.zIndex = String(700 + idx);
        const flight = el.animate([
          { transform: `translate(${dx}px, ${dy}px) scale(1)` },
          { transform: `translate(${dx * 0.5}px, ${dy * 0.5 - 30}px) scale(1.08)`, offset: 0.55 },
          { transform: 'translate(0, 0) scale(1)' }
        ], {
          duration: COMPLETE_MS,
          delay: idx * COMPLETE_STAGGER_MS,
          easing: 'cubic-bezier(0.45, 0.05, 0.25, 1)',
          fill: 'backwards'
        });
        flight.onfinish = flight.oncancel = () => { el.style.zIndex = ''; };
        return;
      }

      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      el.style.zIndex = '600';
      el.getBoundingClientRect(); // форсируем reflow, чтобы зафиксировать стартовую позицию
      el.style.transition = `transform ${ANIM_MS}ms ${ANIM_EASE} ${delay}ms`;
      el.style.transform = 'translate(0, 0)';
      const cleanup = () => {
        el.style.transition = '';
        el.style.transform = '';
        el.style.zIndex = '';
        el.removeEventListener('transitionend', cleanup);
      };
      el.addEventListener('transitionend', cleanup);
    });

    // Откат раздачи: карты вернулись в колоду и больше не в DOM — показываем «призраков», улетающих в колоду.
    if (anim && anim.type === 'undeal') {
      anim.cards.forEach(cardData => {
        const from = firstRects[cardData.id];
        if (from) flyGhost(from, stockRect, cardData);
      });
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

  function updateUI() {
    document.getElementById('replay').disabled = !initialDeck;
    document.getElementById('replay-win').disabled = !initialDeck;
    document.getElementById('moves').textContent = state.moves;
    document.getElementById('score').textContent = state.score;
    document.getElementById('undo').disabled = gameOver || state.history.length === 0;
    renderTimer();
  }

  let dragSource = null;
  let dragCards = [];
  let dragElements = [];
  let dragCol = -1;
  let dragStartIndex = 0;
  let touchStart = null;
  let lastTap = { id: null, time: 0 };
  let lastPointerWasTouch = false;
  const TAP_SLOP = 30;       // макс. смещение пальца, чтобы считать касание тапом, а не перетаскиванием
  const DOUBLE_TAP_MS = 600; // макс. интервал между тапами для двойного тапа
  const DRAG_THRESHOLD = 6;  // сдвиг курсора, после которого начинается перетаскивание (а не клик)

  function bindDragAndDrop() {
    document.querySelectorAll('.tableau-column .card').forEach(cardEl => {
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
    if (gameOver) return;
    const isTouch = e.type === 'touchstart';
    if (!isTouch && e.button !== 0) return;
    lastPointerWasTouch = isTouch;
    const point = getPoint(e);
    touchStart = isTouch ? { x: point.x, y: point.y } : null;
    const cardId = e.target.closest('.card')?.dataset?.id;
    if (!cardId) return;
    const src = findPileContainingCard(cardId);
    if (!src) return;

    const pile = state.tableau[src.col];
    // Брать можно только открытую последовательность одной масти до конца столбца.
    if (!canPickUp(pile, src.index)) return;

    dragCards = pile.slice(src.index);
    dragStartIndex = src.index;
    dragCol = src.col;
    dragSource = e.target.closest('.card');

    const column = dragSource.closest('.tableau-column');
    const allColCards = Array.from(column.querySelectorAll('.card'));
    dragElements = allColCards.slice(dragStartIndex);

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
        dragCol = -1;
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

      if (targetPile && targetPile.startsWith('tableau') && dragCards.length > 0) {
        const toCol = parseInt(targetPile.split('-')[1], 10);
        if (toCol !== dragCol && canDrop(dragCards[0], state.tableau[toCol])) {
          pendingDragRects = dropRects;
          moveRun(dragCol, dragStartIndex, toCol);
        }
      }

      dragSource = null;
      dragCards = [];
      dragElements = [];
      dragCol = -1;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }

  // «Умный ход» по двойному клику: переносит последовательность в лучший столбец.
  // Предпочитаем продолжение той же масти, затем любой непустой столбец, затем пустой.
  function smartMove(cardId) {
    const src = findPileContainingCard(cardId);
    if (!src) return false;
    const pile = state.tableau[src.col];
    if (!canPickUp(pile, src.index)) return false;
    const card = pile[src.index];

    let sameSuit = -1, anyCol = -1, emptyCol = -1;
    for (let i = 0; i < 10; i++) {
      if (i === src.col) continue;
      const col = state.tableau[i];
      if (!canDrop(card, col)) continue;
      if (col.length === 0) {
        if (emptyCol === -1) emptyCol = i;
      } else if (col[col.length - 1].suit === card.suit) {
        if (sameSuit === -1) sameSuit = i;
      } else if (anyCol === -1) {
        anyCol = i;
      }
    }
    // Перекладывать целый столбец в пустой бессмысленно.
    if (src.index === 0) emptyCol = -1;
    const target = sameSuit !== -1 ? sameSuit : (anyCol !== -1 ? anyCol : emptyCol);
    if (target === -1) return false;
    return moveRun(src.col, src.index, target);
  }

  function bindSmartMove() {
    document.querySelectorAll('.tableau-column .card').forEach(cardEl => {
      // Десктоп: двойной клик ловим вручную по событиям click. Нативный dblclick
      // ненадёжен: карта на время перетаскивания получает pointer-events:none, и в
      // ряде сценариев браузер не формирует dblclick.
      cardEl.addEventListener('click', () => {
        if (lastPointerWasTouch) return; // на тач-устройствах двойной тап ловим в touchend
        const id = cardEl.dataset.id;
        const now = Date.now();
        if (lastTap.id === id && now - lastTap.time < DOUBLE_TAP_MS) {
          lastTap = { id: null, time: 0 };
          smartMove(id);
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
          dragCol = -1;
          smartMove(id);
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
      if (!previous.faceUp || previous.value !== next.value + 1 || !(previous.suit === next.suit)) break;
      length++;
      next = previous;
    }
    return length;
  }

  function findHints() {
    const moves = [];
    state.tableau.forEach((col, i) => {
      col.forEach((card, j) => {
        if (!canPickUp(col, j)) return;
        const under = col[j - 1];
        const reveals = under && !under.faceUp;
        state.tableau.forEach((target, k) => {
          if (i === k || (!target.length && j === 0) || !canDrop(card, target)) return;
          const top = target[target.length - 1];
          const sameSuit = top && top.suit === card.suit;
          const sourceSupport = hintSupportLength(col.slice(0, j), card);
          if (sourceSupport > 0 && hintSupportLength(target, card) <= sourceSupport) return;
          moves.push({ id: card.id, target: `tableau-${k}`, priority: (reveals ? 100 : 0) + (sameSuit ? 40 : 0) + (j === 0 ? 10 : 0) });
        });
      });
    });
    moves.sort((a, b) => b.priority - a.priority);
    if (state.stock.length && state.tableau.every(col => col.length)) moves.push({ stock: true });
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
    if (gameOver) return;
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

  document.getElementById('suit-mode').addEventListener('change', (e) => {
    state.suitMode = parseInt(e.target.value, 10) || 1;
    startNewGame();
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
      gameOver = state.foundations.length === 8;
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
      state.tableau = [[], [], [], [], [], [], [], [], [], []];
      state.foundations = SUIT_SETS[state.suitMode].map((suit) =>
        RANKS.slice().reverse().map((rank) => ({ suit, rank, value: RANK_VALUES[rank], faceUp: true, id: `${suit}-${rank}-dbg-${Math.random().toString(36).slice(2, 6)}` })));
      state.history = [];
      state.moves = 180;
      state.score = 500 - 180 + 800;
      render();
      updateUI();
      checkWin();
    };
  }
})();
