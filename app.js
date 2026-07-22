import {
  DIAGNOSIS_OPTIONS,
  QUESTIONS,
  canStartSession,
  createTestParticipantId,
  formatReactionTime,
  isCorrectDiagnosis,
  isCorrectJudgment,
  normalizeParticipantId,
  resultsToCsv,
  selectJudgment,
  summarizeResults,
} from "./experiment.js";

const elements = {
  startScreen: document.querySelector("#start-screen"),
  experimentScreen: document.querySelector("#experiment-screen"),
  resultScreen: document.querySelector("#result-screen"),
  consentForm: document.querySelector("#consent-form"),
  participantId: document.querySelector("#participant-id"),
  consentCheckbox: document.querySelector("#consent-checkbox"),
  startStatus: document.querySelector("#start-status"),
  testModeButton: document.querySelector("#test-mode-button"),
  testBanner: document.querySelector("#test-banner"),
  testParticipantLabel: document.querySelector("#test-participant-label"),
  modeBadge: document.querySelector("#mode-badge"),
  correctButton: document.querySelector("#correct-button"),
  incorrectButton: document.querySelector("#incorrect-button"),
  answerConfirm: document.querySelector("#answer-confirm"),
  answerArea: document.querySelector(".answer-area"),
  diagnosisPanel: document.querySelector("#diagnosis-panel"),
  diagnosisOptions: document.querySelector("#diagnosis-options"),
  diagnosisStatus: document.querySelector("#diagnosis-status"),
  diagnosisSubmit: document.querySelector("#diagnosis-submit"),
  finishButton: document.querySelector("#finish-button"),
  finishDialog: document.querySelector("#finish-dialog"),
  finishDialogDescription: document.querySelector("#finish-dialog-description"),
  continueButton: document.querySelector("#continue-button"),
  confirmFinishButton: document.querySelector("#confirm-finish-button"),
  downloadButton: document.querySelector("#download-button"),
  restartButton: document.querySelector("#restart-button"),
  progressLabel: document.querySelector("#progress-label"),
  progressBar: document.querySelector("#progress-bar"),
  sentence: document.querySelector("#trial-heading"),
  timerLabel: document.querySelector("#timer-label"),
  trialStatus: document.querySelector("#trial-status"),
  resultTitle: document.querySelector("#result-title"),
  resultLead: document.querySelector("#result-lead"),
  resultCaption: document.querySelector("#result-caption"),
  accuracyValue: document.querySelector("#accuracy-value"),
  averageTimeValue: document.querySelector("#average-time-value"),
  completedValue: document.querySelector("#completed-value"),
  participantCompletedValue: document.querySelector("#participant-completed-value"),
  resultParticipantId: document.querySelector("#result-participant-id"),
  resultSessionMode: document.querySelector("#result-session-mode"),
  researcherDetails: document.querySelector("#researcher-details"),
  resultRows: document.querySelector("#result-rows"),
};

const state = {
  currentIndex: 0,
  results: [],
  trialStartedAt: 0,
  phase: "judgment",
  pendingResult: null,
  selectedDiagnosis: null,
  selectedJudgment: null,
  participantId: "",
  sessionMode: "formal",
  consentAccepted: false,
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

function startTimer() {
  state.trialStartedAt = performance.now();
}

function renderQuestion() {
  const question = QUESTIONS[state.currentIndex];
  const questionNumber = String(state.currentIndex + 1).padStart(2, "0");

  state.phase = "judgment";
  state.pendingResult = null;
  state.selectedDiagnosis = null;
  state.selectedJudgment = null;
  elements.answerArea.hidden = false;
  elements.diagnosisPanel.hidden = true;
  elements.timerLabel.textContent = "正在记录反应时间";
  elements.progressLabel.textContent = `第 ${questionNumber} / ${String(QUESTIONS.length).padStart(2, "0")} 题`;
  elements.progressBar.style.width = `${((state.currentIndex + 1) / QUESTIONS.length) * 100}%`;
  elements.sentence.textContent = question.sentence;
  elements.trialStatus.textContent = "请选择一个答案";
  elements.answerConfirm.disabled = true;
  [elements.correctButton, elements.incorrectButton].forEach((button) =>
    button.setAttribute("aria-pressed", "false"),
  );
  startTimer();
  elements.correctButton.focus();
}

function beginExperiment(event) {
  event?.preventDefault();
  const participantId = normalizeParticipantId(elements.participantId.value);
  const consentAccepted = elements.consentCheckbox.checked;

  if (!canStartSession({ consentAccepted, participantId })) {
    elements.startStatus.textContent = participantId
      ? "请勾选知情同意后再开始。"
      : "请输入匿名参与者编号。";
    (participantId ? elements.consentCheckbox : elements.participantId).focus();
    return;
  }

  if (elements.finishDialog.open) {
    elements.finishDialog.close();
  }
  state.participantId = participantId;
  state.consentAccepted = consentAccepted;
  state.currentIndex = 0;
  state.results = [];
  elements.startStatus.textContent = "";
  elements.researcherDetails.open = false;
  elements.testModeButton.hidden = true;
  showScreen(elements.experimentScreen);
  renderQuestion();
}

function setSessionMode(mode) {
  state.sessionMode = mode;
  const isTest = mode === "test";

  if (isTest) {
    state.participantId = createTestParticipantId();
    elements.participantId.value = state.participantId;
  } else {
    state.participantId = "";
    elements.participantId.value = "";
  }

  elements.participantId.readOnly = isTest;
  elements.testBanner.hidden = !isTest;
  elements.testParticipantLabel.textContent = isTest
    ? `编号：${state.participantId}`
    : "";
  elements.modeBadge.innerHTML = `<span aria-hidden="true">●</span> ${isTest ? "测试模式" : "正式实验"}`;
  elements.testModeButton.textContent = isTest ? "退出测试模式" : "进入测试模式";
  elements.startStatus.textContent = "";
}

function toggleTestMode() {
  setSessionMode(state.sessionMode === "formal" ? "test" : "formal");
  elements.participantId.focus();
}

function returnToStart() {
  state.results = [];
  state.consentAccepted = false;
  state.selectedJudgment = null;
  elements.consentCheckbox.checked = false;
  elements.researcherDetails.open = false;

  if (state.sessionMode === "test") {
    setSessionMode("test");
  } else {
    elements.participantId.value = "";
  }

  elements.testModeButton.hidden = false;
  showScreen(elements.startScreen);
  elements.participantId.focus();
}

function advanceQuestion() {
  state.currentIndex += 1;
  if (state.currentIndex === QUESTIONS.length) {
    showResults(false);
  } else {
    renderQuestion();
  }
}

function openFinishDialog() {
  const pendingDiagnosis = state.phase === "diagnosis" && state.pendingResult;
  const recordedCount = state.results.length;

  if (pendingDiagnosis) {
    elements.finishDialogDescription.textContent = `目前已完成 ${recordedCount} 题。当前题的“不正确”判断会保留，但尚未选择的错误定位会留空；其余未作答题目不会计入结果。`;
  } else if (state.phase === "judgment" && state.selectedJudgment) {
    elements.finishDialogDescription.textContent = `目前已完成 ${recordedCount} 题。当前题尚未确认，因此不会计入结果；其余未作答题目也不会计入。`;
  } else {
    elements.finishDialogDescription.textContent = `目前已完成 ${recordedCount} 题，其余未作答题目不会计入结果。`;
  }
  elements.finishDialog.showModal();
}

function closeFinishDialog() {
  elements.finishDialog.close();
  elements.finishButton.focus();
}

function recordPendingDiagnosisAsIncomplete() {
  if (state.phase !== "diagnosis" || !state.pendingResult) return;

  const question = QUESTIONS[state.currentIndex];
  state.results.push({
    ...state.pendingResult,
    diagnosis: null,
    diagnosisKey: question.errorCategory ?? null,
    diagnosisIsCorrect: null,
    diagnosisReactionTime: null,
  });
  state.pendingResult = null;
}

function finishExperimentEarly() {
  if (elements.finishDialog.open) {
    elements.finishDialog.close();
  }
  recordPendingDiagnosisAsIncomplete();
  showResults(true);
}

function showDiagnosis() {
  state.phase = "diagnosis";
  state.selectedDiagnosis = null;
  elements.answerArea.hidden = true;
  elements.diagnosisPanel.hidden = false;
  elements.diagnosisSubmit.disabled = true;
  elements.diagnosisStatus.textContent = "请选择一个选项";
  elements.timerLabel.textContent = "正在记录附加判断时间";
  elements.diagnosisOptions
    .querySelectorAll(".diagnosis-option")
    .forEach((button) => button.setAttribute("aria-pressed", "false"));
  startTimer();
  elements.diagnosisOptions.querySelector(".diagnosis-option")?.focus();
}

function selectCurrentJudgment(judgment) {
  if (state.phase !== "judgment") return;

  state.selectedJudgment = selectJudgment(
    state.selectedJudgment,
    judgment,
    performance.now() - state.trialStartedAt,
  );
  elements.correctButton.setAttribute(
    "aria-pressed",
    String(judgment === "correct"),
  );
  elements.incorrectButton.setAttribute(
    "aria-pressed",
    String(judgment === "incorrect"),
  );
  elements.answerConfirm.disabled = false;
  elements.trialStatus.textContent = `已选择：${judgment === "correct" ? "正确" : "不正确"}`;
}

function confirmCurrentJudgment() {
  if (state.phase !== "judgment" || !state.selectedJudgment) return;

  const question = QUESTIONS[state.currentIndex];
  const { judgment, reactionTime } = state.selectedJudgment;
  const result = {
    participantId: state.participantId,
    sessionMode: state.sessionMode,
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

function showResults(endedEarly) {
  state.phase = "complete";
  state.pendingResult = null;
  state.selectedJudgment = null;

  const summary = summarizeResults(state.results, QUESTIONS.length);

  elements.resultTitle.textContent = endedEarly ? "本次已结束。" : "判断完成。";
  elements.resultLead.textContent = endedEarly
    ? "本次实验已提前结束。已完成题目会保留，未作答题目不会计入结果。"
    : "感谢你的参与。本次实验记录已经在当前页面完成。";
  elements.resultCaption.textContent = summary.completedCount
    ? "逐题记录"
    : "尚未完成任何题目";
  elements.accuracyValue.textContent = summary.accuracyPercent == null
    ? "—"
    : `${summary.accuracyPercent}%`;
  elements.averageTimeValue.textContent = summary.averageReactionTime == null
    ? "—"
    : formatReactionTime(summary.averageReactionTime);
  elements.completedValue.textContent = `${summary.completedCount} / ${summary.totalQuestions}`;
  elements.participantCompletedValue.textContent = `${summary.completedCount} / ${summary.totalQuestions}`;
  elements.resultParticipantId.textContent = state.participantId;
  elements.resultSessionMode.textContent = state.sessionMode === "test" ? "测试" : "正式";
  elements.researcherDetails.open = false;
  elements.resultRows.replaceChildren();
  if (summary.completedCount === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "本次没有完成任何题目，因此没有可供汇总的判断数据。";
    row.className = "empty-result-row";
    row.append(cell);
    elements.resultRows.append(row);
  } else {
    state.results.forEach(addResultRow);
  }
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
  link.download = `french-judgment-${state.participantId}-${date}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

elements.consentForm.addEventListener("submit", beginExperiment);
elements.testModeButton.addEventListener("click", toggleTestMode);
elements.correctButton.addEventListener("click", () => selectCurrentJudgment("correct"));
elements.incorrectButton.addEventListener("click", () => selectCurrentJudgment("incorrect"));
elements.answerConfirm.addEventListener("click", confirmCurrentJudgment);
elements.diagnosisSubmit.addEventListener("click", submitDiagnosis);
elements.finishButton.addEventListener("click", openFinishDialog);
elements.continueButton.addEventListener("click", closeFinishDialog);
elements.confirmFinishButton.addEventListener("click", finishExperimentEarly);
elements.downloadButton.addEventListener("click", downloadResults);
elements.restartButton.addEventListener("click", returnToStart);
renderDiagnosisOptions();

document.addEventListener("keydown", (event) => {
  if (elements.experimentScreen.hidden || state.phase !== "judgment") return;

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectCurrentJudgment("correct");
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    selectCurrentJudgment("incorrect");
  }

  if (event.key === "Enter" && state.selectedJudgment) {
    event.preventDefault();
    confirmCurrentJudgment();
  }
});
