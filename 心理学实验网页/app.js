import {
  QUESTIONS,
  formatReactionTime,
  isCorrectJudgment,
  resultsToCsv,
} from "./experiment.js";

const elements = {
  startScreen: document.querySelector("#start-screen"),
  experimentScreen: document.querySelector("#experiment-screen"),
  resultScreen: document.querySelector("#result-screen"),
  startButton: document.querySelector("#start-button"),
  correctButton: document.querySelector("#correct-button"),
  incorrectButton: document.querySelector("#incorrect-button"),
  downloadButton: document.querySelector("#download-button"),
  restartButton: document.querySelector("#restart-button"),
  progressLabel: document.querySelector("#progress-label"),
  progressBar: document.querySelector("#progress-bar"),
  sentence: document.querySelector("#trial-heading"),
  timerValue: document.querySelector("#timer-value"),
  trialStatus: document.querySelector("#trial-status"),
  resultTitle: document.querySelector("#result-title"),
  accuracyValue: document.querySelector("#accuracy-value"),
  averageTimeValue: document.querySelector("#average-time-value"),
  completedValue: document.querySelector("#completed-value"),
  resultRows: document.querySelector("#result-rows"),
};

const state = {
  currentIndex: 0,
  results: [],
  trialStartedAt: 0,
  timerId: null,
  answerLocked: false,
};

function showScreen(screenToShow) {
  [elements.startScreen, elements.experimentScreen, elements.resultScreen].forEach(
    (screen) => {
      screen.hidden = screen !== screenToShow;
    },
  );
}

function updateTimer() {
  const elapsed = performance.now() - state.trialStartedAt;
  elements.timerValue.textContent = `${(elapsed / 1000).toFixed(1)} s`;
}

function stopTimer() {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function startTimer() {
  stopTimer();
  state.trialStartedAt = performance.now();
  updateTimer();
  state.timerId = window.setInterval(updateTimer, 100);
}

function renderQuestion() {
  const question = QUESTIONS[state.currentIndex];
  const questionNumber = String(state.currentIndex + 1).padStart(2, "0");

  state.answerLocked = false;
  elements.progressLabel.textContent = `第 ${questionNumber} / ${String(QUESTIONS.length).padStart(2, "0")} 题`;
  elements.progressBar.style.width = `${((state.currentIndex + 1) / QUESTIONS.length) * 100}%`;
  elements.sentence.textContent = question.sentence;
  elements.timerValue.textContent = "0.0 s";
  elements.trialStatus.textContent = "";
  startTimer();
  elements.correctButton.focus();
}

function beginExperiment() {
  state.currentIndex = 0;
  state.results = [];
  showScreen(elements.experimentScreen);
  renderQuestion();
}

function answerCurrentQuestion(judgment) {
  if (state.answerLocked) return;

  state.answerLocked = true;
  stopTimer();

  const question = QUESTIONS[state.currentIndex];
  const reactionTime = performance.now() - state.trialStartedAt;
  state.results.push({
    trial: state.currentIndex + 1,
    sentence: question.sentence,
    judgment,
    answer: question.answer,
    isCorrect: isCorrectJudgment(judgment, question.answer),
    reactionTime,
  });

  state.currentIndex += 1;
  if (state.currentIndex === QUESTIONS.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function addResultRow(result) {
  const row = document.createElement("tr");
  const values = [
    result.trial,
    result.sentence,
    result.judgment === "correct" ? "正确" : "不正确",
    formatReactionTime(result.reactionTime),
  ];

  values.forEach((value) => {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  });

  elements.resultRows.append(row);
}

function showResults() {
  const correctCount = state.results.filter((result) => result.isCorrect).length;
  const averageTime =
    state.results.reduce((sum, result) => sum + result.reactionTime, 0) /
    state.results.length;

  elements.accuracyValue.textContent = `${Math.round((correctCount / state.results.length) * 100)}%`;
  elements.averageTimeValue.textContent = formatReactionTime(averageTime);
  elements.completedValue.textContent = `${state.results.length} / ${QUESTIONS.length}`;
  elements.resultRows.replaceChildren();
  state.results.forEach(addResultRow);
  showScreen(elements.resultScreen);
  elements.resultTitle.tabIndex = -1;
  elements.resultTitle.focus();
}

function downloadResults() {
  const csv = `\ufeff${resultsToCsv(state.results)}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `french-judgment-results-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.startButton.addEventListener("click", beginExperiment);
elements.correctButton.addEventListener("click", () => answerCurrentQuestion("correct"));
elements.incorrectButton.addEventListener("click", () => answerCurrentQuestion("incorrect"));
elements.downloadButton.addEventListener("click", downloadResults);
elements.restartButton.addEventListener("click", beginExperiment);

document.addEventListener("keydown", (event) => {
  if (elements.experimentScreen.hidden) return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    answerCurrentQuestion("correct");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    answerCurrentQuestion("incorrect");
  }
});
