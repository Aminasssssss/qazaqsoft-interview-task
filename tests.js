"use strict";

const assert = require("assert");
const { Question, QuizEngine, shuffle } = require("./app.js");

const data = {
  title: "Test",
  timeLimitSec: 300,
  passThreshold: 0.7,
  questions: [
    { id: "q1", text: "a", options: ["1", "2", "3", "4"], correctIndex: 0 },
    { id: "q2", text: "b", options: ["1", "2", "3", "4"], correctIndex: 1 },
    { id: "q3", text: "c", options: ["1", "2", "3", "4"], correctIndex: 2 },
    { id: "q4", text: "d", options: ["1", "2", "3", "4"], correctIndex: 3 },
    { id: "q5", text: "e", options: ["1", "2", "3", "4"], correctIndex: 0 },
    { id: "q6", text: "f", options: ["1", "2", "3", "4"], correctIndex: 1 },
    { id: "q7", text: "g", options: ["1", "2", "3", "4"], correctIndex: 2 },
    { id: "q8", text: "h", options: ["1", "2", "3", "4"], correctIndex: 3 },
    { id: "q9", text: "i", options: ["1", "2", "3", "4"], correctIndex: 0 },
    { id: "q10", text: "j", options: ["1", "2", "3", "4"], correctIndex: 1 },
  ],
};

let passed = 0;
const test = (name, fn) => {
  try { fn(); passed++; console.log("  ok  " + name); }
  catch (e) { console.log("FAIL  " + name + " -> " + e.message); process.exitCode = 1; }
};

test("Question.isCorrect возвращает true для верного индекса", () => {
  const q = new Question(data.questions[0]);
  assert.strictEqual(q.isCorrect(0), true);
  assert.strictEqual(q.isCorrect(1), false);
});

test("total равен числу вопросов", () => {
  const e = new QuizEngine(data);
  assert.strictEqual(e.total, 10);
});

test("все верные ответы дают 100% и passed=true", () => {
  const e = new QuizEngine(data);
  e.questions.forEach(q => { e.answers[q.id] = q.correctIndex; });
  const r = e.calcResult();
  assert.strictEqual(r.correct, 10);
  assert.strictEqual(r.percent, 1);
  assert.strictEqual(r.passed, true);
});

test("пустые ответы дают 0% и passed=false", () => {
  const e = new QuizEngine(data);
  const r = e.calcResult();
  assert.strictEqual(r.correct, 0);
  assert.strictEqual(r.passed, false);
});

test("ровно 70% (7 из 10) проходит порог", () => {
  const e = new QuizEngine(data);
  e.questions.slice(0, 7).forEach(q => { e.answers[q.id] = q.correctIndex; });
  const r = e.calcResult();
  assert.strictEqual(r.correct, 7);
  assert.strictEqual(r.passed, true);
});

test("60% (6 из 10) не проходит порог", () => {
  const e = new QuizEngine(data);
  e.questions.slice(0, 6).forEach(q => { e.answers[q.id] = q.correctIndex; });
  const r = e.calcResult();
  assert.strictEqual(r.passed, false);
});

test("prev на первом вопросе возвращает false", () => {
  const e = new QuizEngine(data);
  assert.strictEqual(e.prev(), false);
  assert.strictEqual(e.currentIndex, 0);
});

test("next на последнем вопросе возвращает false", () => {
  const e = new QuizEngine(data);
  e.currentIndex = e.total - 1;
  assert.strictEqual(e.next(), false);
  assert.strictEqual(e.isLast, true);
});

test("getAnswer неотвеченного вопроса возвращает null", () => {
  const e = new QuizEngine(data);
  assert.strictEqual(e.getAnswer("q1"), null);
});

test("selectAnswer сохраняет ответ по id текущего вопроса", () => {
  const e = new QuizEngine(data);
  e.selectAnswer(2);
  assert.strictEqual(e.getAnswer(e.currentQuestion.id), 2);
});

test("shuffle сохраняет все элементы", () => {
  const arr = [1, 2, 3, 4, 5];
  const s = shuffle(arr);
  assert.strictEqual(s.length, arr.length);
  assert.deepStrictEqual(s.slice().sort(), arr.slice().sort());
});

test("shuffle не мутирует исходный массив", () => {
  const arr = [1, 2, 3, 4, 5];
  shuffle(arr);
  assert.deepStrictEqual(arr, [1, 2, 3, 4, 5]);
});

test("Question.shuffled сохраняет правильный ответ после перемешивания", () => {
  const q = new Question({ id: "x", text: "t", options: ["A", "B", "C", "D"], correctIndex: 2 });
  const correctValue = q.options[q.correctIndex];
  for (let i = 0; i < 50; i++) {
    const sh = q.shuffled();
    assert.strictEqual(sh.options[sh.correctIndex], correctValue);
    assert.strictEqual(sh.options.length, 4);
  }
});

console.log("\n" + passed + " тестов пройдено");
