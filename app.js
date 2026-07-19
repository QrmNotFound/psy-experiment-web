import {
  DIAGNOSIS_OPTIONS,
  QUESTIONS,
  formatReactionTime,
  isCorrectDiagnosis,
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
  answerArea: document.querySelector(".answer-area"),
  diagnosisPanel: document.querySelector("#diagnosis-panel"),
  diagnosisOptions: document.querySelector("#diagnosis-options"),
  diagnosisStatus: document.querySelector("#diagnosis-status"),
  diagnosisSubmit: document.querySelector("#diagnosis-submit"),
  downloadButton: document.querySelector("#download-button"),
  restartButton: document.querySelector("#restart-button"),
  progressLabel: document.querySelector("#progress-label"),
  progressBar: document.querySelector("#progress-bar"),
  sentence: document.querySelector("#trial-heading"),
  timerLabel: document.querySelector("#timer-label"),
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
  phase: "judgment",
  pendingResult: null,
  selectedDiagnosis: null,
};

const diagnosisLabels = new Map(
  DIAGNOSIS_OPTIONS.map((option) => [option.value, option.label]),
);

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
  state.phase = "judgment";
  state.pendingResult = null;
  state.selectedDiagnosis = null;
  elements.answerArea.hidden = false;
  elements.diagnosisPanel.hidden = true;
  elements.timerLabel.textContent = "首次判断用时";
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

function advanceQuestion() {
  state.currentIndex += 1;
  if (state.currentIndex === QUESTIONS.length) {
    showResults();
  } else {
    renderQuestion();
  }
}

function showDiagnosis() {
  state.phase = "diagnosis";
  state.selectedDiagnosis = null;
  elements.answerArea.hidden = true;
  elements.diagnosisPanel.hidden = false;
  elements.diagnosisSubmit.disabled = true;
  elements.diagnosisStatus.textContent = "请选择一个选项";
  elements.timerLabel.textContent = "附加判断用时";
  elements.diagnosisOptions
    .querySelectorAll(".diagnosis-option")
    .forEach((button) => button.setAttribute("aria-pressed", "false"));
  startTimer();
  elements.diagnosisOptions.querySelector(".diagnosis-option")?.focus();
}

function answerCurrentQuestion(judgment) {
  if (state.answerLocked || state.phase !== "judgment") return;

  state.answerLocked = true;
  stopTimer();

  const question = QUESTIONS[state.currentIndex];
  const reactionTime = performance.now() - state.trialStartedAt;
  const result = {
    trial: state.currentIndex + 1,
    sentence: question.sentence,
    judgment,
    answer: question.answer,
    isCorrect: isCorrectJudgment(judgment, question.answer),
    reactionTime,
  };

  if (judgment === "incorrect") {
    state.pendingResult = result;
    showDiagnosis();
  } else {
    state.results.push({
      ...result,
      diagnosis: null,
      diagnosisKey: question.errorCategory ?? null,
      diagnosisIsCorrect: null,
      diagnosisReactionTime: null,
    });
    advanceQuestion();
  }
}

function selectDiagnosis(value, selectedButton) {
  if (state.phase !== "diagnosis") return;

  state.selectedDiagnosis = value;
  elements.diagnosisOptions
    .querySelectorAll(".diagnosis-option")
    .forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button === selectedButton),
      ),
    );
  elements.diagnosisSubmit.disabled = false;
  elements.diagnosisStatus.textContent = `已选择：${diagnosisLabels.get(value)}`;
}

function submitDiagnosis() {
  if (
    state.phase !== "diagnosis" ||
    !state.selectedDiagnosis ||
    !state.pendingResult
  ) {
    return;
  }

  stopTimer();
  const question = QUESTIONS[state.currentIndex];
  const diagnosisReactionTime = performance.now() - state.trialStartedAt;
  state.results.push({
    ...state.pendingResult,
    diagnosis: state.selectedDiagnosis,
    diagnosisKey: question.errorCategory ?? null,
    diagnosisIsCorrect: isCorrectDiagnosis(
      state.selectedDiagnosis,
      question.errorCategory ?? null,
    ),
    diagnosisReactionTime,
  });
  advanceQuestion();
}

function renderDiagnosisOptions() {
  DIAGNOSIS_OPTIONS.forEach((option, index) => {
    const button = document.createElement("button");
    const letter = document.createElement("span");
    const copy = document.createElement("span");
    const title = document.createElement("span");
    const description = document.createElement("span");

    button.type = "button";
    button.className = "diagnosis-option";
    button.setAttribute("aria-pressed", "false");
    letter.className = "option-letter";
    letter.textContent = String.fromCharCode(65 + index);
    letter.setAttribute("aria-hidden", "true");
    copy.className = "option-copy";
    title.className = "option-title";
    title.textContent = option.label;
    description.className = "option-description";
    description.textContent = option.description;
    copy.append(title, description);
    button.append(letter, copy);
    button.addEventListener("click", () =>
      selectDiagnosis(option.value, button),
    );
    elements.diagnosisOptions.append(button);
  });
}

function addResultRow(result) {
  const row = document.createElement("tr");
  const values = [
    result.trial,
    result.sentence,
    result.judgment === "correct" ? "正确" : "不正确",
    result.diagnosis ? diagnosisLabels.get(result.diagnosis) : "—",
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
  stopTimer();
  state.phase = "complete";
  state.pendingResult = null;
  state.answerLocked = true;

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
elements.diagnosisSubmit.addEventListener("click", submitDiagnosis);
elements.downloadButton.addEventListener("click", downloadResults);
elements.restartButton.addEventListener("click", beginExperiment);
renderDiagnosisOptions();

document.addEventListener("keydown", (event) => {
  if (elements.experimentScreen.hidden || state.phase !== "judgment") return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    answerCurrentQuestion("correct");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    answerCurrentQuestion("incorrect");
  }
});
