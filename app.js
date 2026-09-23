(function () {
  const navEl = document.getElementById("verb-nav");
  const tenseEl = document.getElementById("tense-nav");
  const mainEl = document.getElementById("main");
  const scoreEl = document.getElementById("score");
  const loadingEl = document.getElementById("loading");

  let verbs = [];
  let queue = [];
  let queueIndex = 0;
  let filterInfinitive = null;
  let filterTense = null; // null = all
  let correctCount = 0;
  let answeredCount = 0;
  let advancing = false;
  let verbsExpanded = false;

  const TENSE_LABELS = {
    presente: "настоящее",
    pretérito: "прошлое",
    futuro: "будущее",
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function uniqueInfinitives() {
    const seen = new Set();
    const list = [];
    verbs.forEach((v) => {
      if (!seen.has(v.infinitive)) {
        seen.add(v.infinitive);
        list.push(v);
      }
    });
    return list;
  }

  function availableTenses() {
    const set = new Set();
    verbs.forEach((v) => {
      if (v.tense) set.add(v.tense);
    });
    return Array.from(set);
  }

  function updateScore() {
    scoreEl.innerHTML =
      "Правильно: <strong>" +
      correctCount +
      "</strong> / <span>" +
      answeredCount +
      "</span>";
  }

  function buildQueue() {
    const items = [];
    verbs.forEach((verb) => {
      if (filterInfinitive && verb.infinitive !== filterInfinitive) return;
      if (filterTense && verb.tense !== filterTense) return;
      (verb.sentences || []).forEach((sentence) => {
        items.push({ verb: verb, sentence: sentence });
      });
    });
    return shuffle(items);
  }

  function startQueue(opts) {
    if (opts && "infinitive" in opts) filterInfinitive = opts.infinitive;
    if (opts && "tense" in opts) filterTense = opts.tense;
    queue = buildQueue();
    queueIndex = 0;
    correctCount = 0;
    answeredCount = 0;
    advancing = false;
    updateScore();
    renderTenseNav();
    renderNav();
    renderQuestion();
  }

  function currentItem() {
    return queue[queueIndex] || null;
  }

  function renderTenseNav() {
    if (!tenseEl) return;
    tenseEl.innerHTML = "";
    const makeBtn = (value, label) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "tense-btn" + (filterTense === value ? " active" : "");
      btn.textContent = label;
      btn.addEventListener("click", () => {
        if (advancing) return;
        startQueue({ tense: value });
      });
      tenseEl.appendChild(btn);
    };
    makeBtn(null, "все времена");
    availableTenses().forEach((t) => {
      makeBtn(t, TENSE_LABELS[t] || t);
    });
  }

  function renderNav() {
    navEl.innerHTML = "";
    navEl.classList.toggle("collapsed", !verbsExpanded);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "verb-toggle";
    toggle.setAttribute("aria-expanded", verbsExpanded ? "true" : "false");
    const count = uniqueInfinitives().length;
    const label = filterInfinitive || "все глаголы";
    toggle.innerHTML =
      '<span class="verb-toggle-label">' +
      (verbsExpanded ? "Скрыть глаголы" : "Глаголы") +
      '</span><span class="verb-toggle-meta">' +
      label +
      " · " +
      count +
      "</span>";
    toggle.addEventListener("click", () => {
      verbsExpanded = !verbsExpanded;
      renderNav();
    });
    navEl.appendChild(toggle);

    const list = document.createElement("div");
    list.className = "verb-list";
    list.hidden = !verbsExpanded;

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "verb-btn" + (filterInfinitive === null ? " active" : "");
    allBtn.innerHTML = '<span>все</span><span class="meta">random</span>';
    allBtn.addEventListener("click", () => {
      if (advancing) return;
      startQueue({ infinitive: null });
    });
    list.appendChild(allBtn);

    const current = currentItem();
    uniqueInfinitives().forEach((verb) => {
      const btn = document.createElement("button");
      btn.type = "button";
      const isActive =
        filterInfinitive === verb.infinitive ||
        (filterInfinitive === null &&
          current &&
          current.verb.infinitive === verb.infinitive);
      btn.className = "verb-btn" + (isActive ? " active" : "");
      btn.innerHTML =
        "<span>" +
        verb.infinitive +
        '</span><span class="meta">' +
        (verb.translation || "") +
        "</span>";
      btn.addEventListener("click", () => {
        if (advancing) return;
        startQueue({ infinitive: verb.infinitive });
      });
      list.appendChild(btn);
    });

    navEl.appendChild(list);
  }

  function goNext() {
    advancing = false;
    if (queueIndex < queue.length - 1) {
      queueIndex += 1;
      renderNav();
      renderQuestion();
      return;
    }
    renderDone();
  }

  function renderDone() {
    mainEl.innerHTML = "";
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.innerHTML =
      '<h2 class="panel-title">Готово</h2>' +
      "<p>Все предложения пройдены. Правильно: <strong>" +
      correctCount +
      "</strong> из <strong>" +
      answeredCount +
      "</strong>.</p>";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "primary-btn";
    btn.textContent = "Начать сначала";
    btn.addEventListener("click", () => startQueue({}));
    panel.appendChild(btn);
    mainEl.appendChild(panel);
  }

  function renderQuestion() {
    const item = currentItem();
    if (!item) {
      renderDone();
      return;
    }

    const verb = item.verb;
    const sentence = item.sentence;

    const panel = document.createElement("div");
    panel.className = "panel";

    const title = document.createElement("h2");
    title.className = "panel-title";
    const tenseLabel = TENSE_LABELS[verb.tense] || verb.tense || "—";
    title.innerHTML =
      "<em>" +
      verb.infinitive +
      "</em>" +
      '<span class="badge">' +
      tenseLabel +
      "</span>" +
      (verb.regular === false
        ? '<span class="badge">неправильный</span>'
        : verb.regular === true
          ? '<span class="badge">правильный</span>'
          : "") +
      (verb.translation
        ? '<span class="badge translation">' + verb.translation + "</span>"
        : "") +
      '<span class="badge progress">' +
      (queueIndex + 1) +
      " / " +
      queue.length +
      "</span>";
    panel.appendChild(title);

    const card = document.createElement("div");
    card.className = "sentence-card single";

    const text = document.createElement("div");
    text.className = "sentence-text";

    const select = document.createElement("select");
    select.setAttribute("aria-label", "форма глагола");

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "—";
    placeholder.disabled = true;
    placeholder.selected = true;
    select.appendChild(placeholder);

    shuffle(sentence.options || []).forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });

    const feedback = document.createElement("p");
    feedback.className = "feedback";

    const translationEl = document.createElement("p");
    translationEl.className = "sentence-translation";
    const ru = sentence.translation || sentence.hint;
    if (ru) {
      translationEl.innerHTML = "<strong>Перевод:</strong> " + ru;
    } else {
      translationEl.hidden = true;
    }

    function fullSentence(filled) {
      return (sentence.parts || [])
        .map((part) => (part === null ? filled : part))
        .join("");
    }

    select.addEventListener("change", () => {
      const value = select.value;
      if (!value || advancing) return;

      advancing = true;
      select.disabled = true;
      answeredCount += 1;
      const ok = value === sentence.answer;

      if (ok) {
        correctCount += 1;
        select.classList.add("correct");
        feedback.classList.add("ok");
        feedback.textContent = "Верно";
      } else {
        select.classList.add("wrong");
        feedback.classList.add("bad");
        feedback.textContent = "Неверно — правильный ответ: " + sentence.answer;
        select.value = sentence.answer;
      }

      if (ru) {
        translationEl.innerHTML =
          "<strong>Перевод:</strong> " +
          ru +
          '<br><span class="full-es">' +
          fullSentence(sentence.answer) +
          "</span>";
      }

      updateScore();
      setTimeout(goNext, 1800);
    });

    (sentence.parts || []).forEach((part) => {
      if (part === null) {
        text.appendChild(select);
      } else {
        text.appendChild(document.createTextNode(part));
      }
    });

    card.appendChild(text);
    card.appendChild(translationEl);
    card.appendChild(feedback);
    panel.appendChild(card);

    mainEl.innerHTML = "";
    mainEl.appendChild(panel);
  }

  function init() {
    const data = window.VERBS_DATA;
    if (!data || !data.verbs || !data.verbs.length) {
      mainEl.innerHTML =
        '<p class="error">Нет данных: проверь, что verbs-data.js подключён перед app.js.</p>';
      return;
    }
    verbs = data.verbs;
    if (loadingEl) loadingEl.remove();
    startQueue({ infinitive: null, tense: null });
  }

  init();
})();
