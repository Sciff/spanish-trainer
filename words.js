(function () {
  const mainEl = document.getElementById("main");
  const scoreEl = document.getElementById("score");
  const progressEl = document.getElementById("progress");
  const categoryNavEl = document.getElementById("category-nav");

  const ROUND_SIZE = 5;
  let allWords = [];
  let categories = [];
  let filterCategory = null; // null = all
  let words = [];
  let queue = [];
  let queueIndex = 0;
  let round = null;
  let selectedEs = null;
  let selectedRu = null;
  let matched = 0;
  let correctPairs = 0;
  let attempts = 0;
  let locked = false;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function filteredWords() {
    if (!filterCategory) return allWords.slice();
    return allWords.filter((w) => w.category === filterCategory);
  }

  function categoryLabel(id) {
    if (!id) return "все";
    const found = categories.find((c) => c.id === id);
    return found ? found.label : id;
  }

  function categoryCount(id) {
    if (!id) return allWords.length;
    return allWords.filter((w) => w.category === id).length;
  }

  function updateScore() {
    if (scoreEl) {
      scoreEl.innerHTML =
        "Верно: <strong>" + correctPairs + "</strong> / <span>" + attempts + "</span>";
    }
    if (progressEl) {
      if (!queue.length) {
        progressEl.textContent = "Нет слов в этой категории";
        return;
      }
      const roundNum = Math.min(
        Math.floor(queueIndex / ROUND_SIZE) + 1,
        Math.max(1, Math.ceil(queue.length / ROUND_SIZE))
      );
      const totalRounds = Math.max(1, Math.ceil(queue.length / ROUND_SIZE));
      progressEl.textContent =
        categoryLabel(filterCategory) +
        " · набор " +
        roundNum +
        " из " +
        totalRounds +
        " · слов: " +
        words.length;
    }
  }

  function buildQueue() {
    words = filteredWords();
    return shuffle(words);
  }

  function restartWithFilter(categoryId) {
    filterCategory = categoryId;
    queue = buildQueue();
    queueIndex = 0;
    correctPairs = 0;
    attempts = 0;
    renderCategoryNav();
    startRound();
  }

  function renderCategoryNav() {
    if (!categoryNavEl) return;
    categoryNavEl.innerHTML = "";

    const makeBtn = (id, label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const active = filterCategory === id;
      btn.className = "category-btn" + (active ? " active" : "");
      const count = categoryCount(id);
      btn.innerHTML =
        "<span>" + label + '</span><span class="meta">' + count + "</span>";
      btn.addEventListener("click", () => {
        if (filterCategory === id && locked) return;
        restartWithFilter(id);
      });
      categoryNavEl.appendChild(btn);
    };

    makeBtn(null, "все");
    categories.forEach((c) => {
      if (categoryCount(c.id) > 0) makeBtn(c.id, c.label);
    });
  }

  function startRound() {
    selectedEs = null;
    selectedRu = null;
    matched = 0;
    locked = false;

    if (!queue.length) {
      mainEl.innerHTML =
        '<div class="panel"><p class="error">В этой категории пока нет слов.</p></div>';
      updateScore();
      return;
    }

    if (queueIndex >= queue.length) {
      renderDone();
      return;
    }

    let slice = queue.slice(queueIndex, queueIndex + ROUND_SIZE);
    const size = Math.min(ROUND_SIZE, slice.length);
    // if fewer than ROUND_SIZE left, still play with what's left (min 2 for matching)
    if (slice.length < 2 && words.length >= 2) {
      slice = shuffle(words).slice(0, Math.min(ROUND_SIZE, words.length));
    } else if (slice.length === 1) {
      const extra = shuffle(words.filter((w) => w !== slice[0])).slice(0, Math.min(4, words.length - 1));
      slice = slice.concat(extra);
    }

    round = slice.slice(0, Math.max(2, Math.min(ROUND_SIZE, slice.length))).map((w, i) => ({
      id: i,
      es: w.es,
      ru: w.ru,
      matched: false,
    }));

    renderRound();
    updateScore();
  }

  function renderDone() {
    mainEl.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.innerHTML =
      '<h2 class="panel-title">Готово</h2>' +
      "<p>Категория «" +
      categoryLabel(filterCategory) +
      "» пройдена. Верных сопоставлений: <strong>" +
      correctPairs +
      "</strong> из <strong>" +
      attempts +
      "</strong>.</p>";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary-btn";
    btn.textContent = "Начать сначала";
    btn.addEventListener("click", () => restartWithFilter(filterCategory));
    panel.appendChild(btn);
    mainEl.appendChild(panel);
    if (progressEl) progressEl.textContent = "Готово";
  }

  function clearSelection() {
    selectedEs = null;
    selectedRu = null;
    mainEl.querySelectorAll(".match-btn.selected").forEach((el) => {
      el.classList.remove("selected");
    });
  }

  function tryMatch() {
    if (selectedEs == null || selectedRu == null || locked) return;

    locked = true;
    attempts += 1;
    const left = round[selectedEs];
    const right = round[selectedRu];
    const ok = selectedEs === selectedRu;
    const roundSize = round.length;

    const esBtn = mainEl.querySelector('.match-btn.es[data-id="' + selectedEs + '"]');
    const ruBtn = mainEl.querySelector('.match-btn.ru[data-id="' + selectedRu + '"]');

    if (ok) {
      correctPairs += 1;
      left.matched = true;
      right.matched = true;
      matched += 1;
      if (esBtn) esBtn.classList.add("matched", "correct-flash");
      if (ruBtn) ruBtn.classList.add("matched", "correct-flash");
      clearSelection();
      updateScore();

      setTimeout(() => {
        locked = false;
        if (matched >= roundSize) {
          queueIndex += roundSize;
          const nextBtn = document.createElement("button");
          nextBtn.type = "button";
          nextBtn.className = "primary-btn next-btn";
          nextBtn.textContent = "Далее";
          nextBtn.addEventListener("click", startRound);
          const actions = mainEl.querySelector(".match-actions");
          if (actions) {
            actions.innerHTML = "";
            actions.appendChild(nextBtn);
            nextBtn.focus();
          }
        }
      }, 350);
    } else {
      if (esBtn) esBtn.classList.add("wrong-flash");
      if (ruBtn) ruBtn.classList.add("wrong-flash");
      updateScore();
      setTimeout(() => {
        if (esBtn) esBtn.classList.remove("wrong-flash", "selected");
        if (ruBtn) ruBtn.classList.remove("wrong-flash", "selected");
        clearSelection();
        locked = false;
      }, 500);
    }
  }

  function onPick(side, id) {
    if (locked) return;
    const item = round[id];
    if (!item || item.matched) return;

    if (side === "es") {
      if (selectedEs === id) {
        selectedEs = null;
        const btn = mainEl.querySelector('.match-btn.es[data-id="' + id + '"]');
        if (btn) btn.classList.remove("selected");
        return;
      }
      mainEl.querySelectorAll(".match-btn.es.selected").forEach((el) => el.classList.remove("selected"));
      selectedEs = id;
      const btn = mainEl.querySelector('.match-btn.es[data-id="' + id + '"]');
      if (btn) btn.classList.add("selected");
    } else {
      if (selectedRu === id) {
        selectedRu = null;
        const btn = mainEl.querySelector('.match-btn.ru[data-id="' + id + '"]');
        if (btn) btn.classList.remove("selected");
        return;
      }
      mainEl.querySelectorAll(".match-btn.ru.selected").forEach((el) => el.classList.remove("selected"));
      selectedRu = id;
      const btn = mainEl.querySelector('.match-btn.ru[data-id="' + id + '"]');
      if (btn) btn.classList.add("selected");
    }

    tryMatch();
  }

  function renderRound() {
    mainEl.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "panel";

    const title = document.createElement("h2");
    title.className = "panel-title";
    title.textContent = "Соотнеси слова";
    panel.appendChild(title);

    const hint = document.createElement("p");
    hint.className = "match-hint";
    hint.textContent = "Выбери слово слева и перевод справа";
    panel.appendChild(hint);

    const grid = document.createElement("div");
    grid.className = "match-grid";

    const leftCol = document.createElement("div");
    leftCol.className = "match-col";
    const rightCol = document.createElement("div");
    rightCol.className = "match-col";

    const esOrder = shuffle(round.map((_, i) => i));
    const ruOrder = shuffle(round.map((_, i) => i));

    esOrder.forEach((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-btn es";
      btn.dataset.id = String(id);
      btn.textContent = round[id].es;
      btn.addEventListener("click", () => onPick("es", id));
      leftCol.appendChild(btn);
    });

    ruOrder.forEach((id) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "match-btn ru";
      btn.dataset.id = String(id);
      btn.textContent = round[id].ru;
      btn.addEventListener("click", () => onPick("ru", id));
      rightCol.appendChild(btn);
    });

    grid.appendChild(leftCol);
    grid.appendChild(rightCol);
    panel.appendChild(grid);

    const actions = document.createElement("div");
    actions.className = "match-actions";
    panel.appendChild(actions);

    mainEl.appendChild(panel);
  }

  function init() {
    const data = window.WORDS_DATA;
    if (!data || !data.words || !data.words.length) {
      mainEl.innerHTML =
        '<p class="error">Нет данных: проверь, что words-data.js подключён.</p>';
      return;
    }
    allWords = data.words;
    categories = data.categories || [];
    filterCategory = null;
    renderCategoryNav();
    restartWithFilter(null);
  }

  init();
})();
