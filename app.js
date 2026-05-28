"use strict";

function shuffle(array) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Question {
  constructor({ id, text, options, correctIndex }) {
    this.id           = id;
    this.text         = text;
    this.options      = options;
    this.correctIndex = correctIndex;
  }

  isCorrect(selectedIndex) {
    return selectedIndex === this.correctIndex;
  }

  shuffled() {
    const correctValue = this.options[this.correctIndex];
    const newOptions   = shuffle(this.options);
    return new Question({
      id           : this.id,
      text         : this.text,
      options      : newOptions,
      correctIndex : newOptions.indexOf(correctValue),
    });
  }
}

class QuizEngine {
  constructor(data, { shuffle: doShuffle = false } = {}) {
    this.title         = data.title;
    this.timeLimitSec  = data.timeLimitSec;
    this.passThreshold = data.passThreshold;
    this.currentIndex  = 0;
    this.answers       = {};
    this.timeLeft      = data.timeLimitSec;

    let questions = data.questions.map(q => new Question(q));
    if (doShuffle) {
      questions = shuffle(questions).map(q => q.shuffled());
    }
    this.questions = questions;
  }

  get currentQuestion() {
    return this.questions[this.currentIndex];
  }

  get total() {
    return this.questions.length;
  }

  get isLast() {
    return this.currentIndex === this.total - 1;
  }

  selectAnswer(index) {
    this.answers[this.currentQuestion.id] = index;
  }

  getAnswer(questionId) {
    const val = this.answers[questionId];
    return val !== undefined ? val : null;
  }

  next() {
    if (this.currentIndex < this.total - 1) {
      this.currentIndex++;
      return true;
    }
    return false;
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return true;
    }
    return false;
  }

  calcResult() {
    let correct = 0;
    for (const q of this.questions) {
      const selected = this.answers[q.id];
      if (selected !== null && selected !== undefined && q.isCorrect(selected)) {
        correct++;
      }
    }
    const percent = correct / this.total;
    return { correct, total: this.total, percent, passed: percent >= this.passThreshold };
  }

  save() {
    localStorage.setItem("quizState", JSON.stringify({
      currentIndex : this.currentIndex,
      answers      : this.answers,
      timeLeft     : this.timeLeft,
      questions    : this.questions,
    }));
  }

  restore() {
    const raw = localStorage.getItem("quizState");
    if (!raw) return false;
    try {
      const state       = JSON.parse(raw);
      this.currentIndex = state.currentIndex ?? 0;
      this.answers      = state.answers      ?? {};
      this.timeLeft     = state.timeLeft      ?? this.timeLimitSec;
      if (Array.isArray(state.questions) && state.questions.length) {
        this.questions = state.questions.map(q => new Question(q));
      }
      return true;
    } catch {
      return false;
    }
  }

  clearSave() {
    localStorage.removeItem("quizState");
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { Question, QuizEngine, shuffle };
}

if (typeof document !== "undefined") {
  const $ = id => document.getElementById(id);

  let engine      = null;
  let timerHandle = null;

  const showScreen = id => {
    document.querySelectorAll(".screen").forEach(el => el.classList.remove("active"));
    $(id).classList.add("active");
  };

  const startTimer = () => {
    clearInterval(timerHandle);
    renderTimer();
    timerHandle = setInterval(() => {
      engine.timeLeft--;
      engine.save();
      renderTimer();
      if (engine.timeLeft <= 0) {
        clearInterval(timerHandle);
        finishQuiz();
      }
    }, 1000);
  };

  const renderTimer = () => {
    const m  = Math.floor(engine.timeLeft / 60).toString().padStart(2, "0");
    const s  = (engine.timeLeft % 60).toString().padStart(2, "0");
    const el = $("timer");
    el.textContent = `${m}:${s}`;
    el.classList.toggle("timer-warning", engine.timeLeft <= 30);
  };

  const renderQuestion = () => {
    const q     = engine.currentQuestion;
    const saved = engine.getAnswer(q.id);

    $("progress-text").textContent = `Вопрос ${engine.currentIndex + 1} из ${engine.total}`;
    $("progress-fill").style.width = `${((engine.currentIndex + 1) / engine.total) * 100}%`;
    $("question-text").textContent = q.text;

    const list = $("options-list");
    list.innerHTML = "";

    q.options.forEach((text, i) => {
      const li  = document.createElement("li");
      const btn = document.createElement("button");

      btn.type        = "button";
      btn.className   = "option-btn" + (saved === i ? " selected" : "");
      btn.textContent = text;
      btn.setAttribute("aria-pressed", saved === i ? "true" : "false");

      btn.addEventListener("click", () => {
        engine.selectAnswer(i);
        engine.save();
        list.querySelectorAll(".option-btn").forEach((b, j) => {
          b.classList.toggle("selected", j === i);
          b.setAttribute("aria-pressed", j === i ? "true" : "false");
        });
      });

      btn.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      });

      li.appendChild(btn);
      list.appendChild(li);
    });

    $("btn-prev").style.display   = engine.currentIndex === 0 ? "none" : "inline-flex";
    $("btn-next").style.display   = engine.isLast ? "none" : "inline-flex";
    $("btn-finish").style.display = engine.isLast ? "inline-flex" : "none";
  };

  const finishQuiz = () => {
    clearInterval(timerHandle);
    engine.clearSave();

    const { correct, total, percent, passed } = engine.calcResult();

    showScreen("screen-result");

    $("result-status").textContent  = passed ? "Тест пройден" : "Тест не пройден";
    $("result-status").className     = "result-status " + (passed ? "passed" : "failed");
    $("result-score").textContent    = `Правильных ответов: ${correct} из ${total}`;
    $("result-percent").textContent  = `Результат: ${Math.round(percent * 100)}%`;

    $("btn-review").addEventListener("click", renderReview, { once: true });
    $("btn-restart").addEventListener("click", () => {
      engine.clearSave();
      location.reload();
    }, { once: true });
  };

  const renderReview = () => {
    const section = $("review-section");
    const list    = $("review-list");
    list.innerHTML = "";
    section.hidden = false;

    engine.questions.forEach((q, i) => {
      const selected = engine.getAnswer(q.id);
      const isRight  = q.isCorrect(selected);

      const li = document.createElement("li");
      li.className = "review-item " + (isRight ? "review-correct" : "review-wrong");

      const header = document.createElement("p");
      header.className   = "review-question";
      header.textContent = `${i + 1}. ${q.text}`;

      const opts = document.createElement("ul");
      opts.className = "review-options";

      q.options.forEach((opt, j) => {
        const item = document.createElement("li");
        if (j === q.correctIndex)            item.classList.add("is-correct");
        if (j === selected && !isRight)      item.classList.add("is-wrong");
        item.textContent = opt;
        if (j === q.correctIndex)            item.textContent += " (правильный)";
        else if (j === selected && !isRight) item.textContent += " (ваш ответ)";
        opts.appendChild(item);
      });

      li.appendChild(header);
      li.appendChild(opts);
      list.appendChild(li);
    });

    section.scrollIntoView({ behavior: "smooth" });
  };

  const startQuiz = () => {
    $("quiz-title").textContent = engine.title;
    const restored = engine.restore();
    showScreen("screen-quiz");
    renderQuestion();
    startTimer();

    if (restored) {
      const banner = document.createElement("div");
      banner.className   = "restore-banner";
      banner.textContent = "Прогресс восстановлен";
      $("screen-quiz").prepend(banner);
      setTimeout(() => banner.remove(), 3000);
    }
  };

  $("btn-prev").addEventListener("click", () => {
    engine.prev();
    engine.save();
    renderQuestion();
  });

  $("btn-next").addEventListener("click", () => {
    engine.next();
    engine.save();
    renderQuestion();
  });

  $("btn-finish").addEventListener("click", () => finishQuiz());

  fetch("data/questions.json")
    .then(res => {
      if (!res.ok) throw new Error("Не удалось загрузить вопросы");
      return res.json();
    })
    .then(data => {
      engine = new QuizEngine(data, { shuffle: true });
      startQuiz();
    })
    .catch(err => {
      $("screen-loading").innerHTML = `<div class="loader-wrap"><p class="error">${err.message}</p></div>`;
    });
}
