import test from "node:test";
import assert from "node:assert/strict";

import {
  canStartSession,
  createTestParticipantId,
  formatAnswer,
  formatJudgmentOutcome,
  formatReactionTime,
  getPostTrialAction,
  isCorrectDiagnosis,
  isCorrectJudgment,
  normalizeParticipantId,
  resultsToCsv,
  selectJudgment,
  summarizeResults,
} from "../experiment.js";

test("judgment is correct when the participant matches the answer key", () => {
  assert.equal(isCorrectJudgment("correct", true), true);
  assert.equal(isCorrectJudgment("incorrect", false), true);
});

test("judgment is incorrect when the participant disagrees with the answer key", () => {
  assert.equal(isCorrectJudgment("correct", false), false);
  assert.equal(isCorrectJudgment("incorrect", true), false);
});

test("reaction time is displayed in milliseconds", () => {
  assert.equal(formatReactionTime(842.7), "843 ms");
});

test("researcher results clearly label the answer key and judgment outcome", () => {
  assert.equal(formatAnswer(true), "正确");
  assert.equal(formatAnswer(false), "不正确");
  assert.equal(formatJudgmentOutcome(true), "✓ 判断正确");
  assert.equal(formatJudgmentOutcome(false), "× 判断错误");
});

test("formal participant identifiers are trimmed", () => {
  assert.equal(normalizeParticipantId("  P-018  "), "P-018");
});

test("test participant identifiers are recognizable and deterministic", () => {
  assert.equal(
    createTestParticipantId(new Date("2026-07-22T08:00:00Z"), 0.25),
    "TEST-20260722-9000",
  );
});

test("formal sessions require consent and a non-empty participant identifier", () => {
  assert.equal(
    canStartSession({ consentAccepted: true, participantId: " P-018 " }),
    true,
  );
  assert.equal(
    canStartSession({ consentAccepted: false, participantId: "P-018" }),
    false,
  );
  assert.equal(
    canStartSession({ consentAccepted: true, participantId: "   " }),
    false,
  );
});

test("the first judgment is locked with its original reaction time", () => {
  const firstSelection = selectJudgment(null, "correct", 842);
  const repeatedSelection = selectJudgment(firstSelection, "incorrect", 1200);

  assert.deepEqual(repeatedSelection, {
    judgment: "correct",
    reactionTime: 842,
  });
});

test("completed trials advance until the final trial is ready to submit", () => {
  assert.equal(getPostTrialAction(0, 8), "advance");
  assert.equal(getPostTrialAction(6, 8), "advance");
  assert.equal(getPostTrialAction(7, 8), "submit");
});

test("diagnosis is scored only when the sentence has a known error category", () => {
  assert.equal(isCorrectDiagnosis("verb-conjugation", "verb-conjugation"), true);
  assert.equal(isCorrectDiagnosis("word-order", "verb-conjugation"), false);
  assert.equal(isCorrectDiagnosis("unknown", null), null);
});

test("empty results produce an unfinished but valid session summary", () => {
  assert.deepEqual(summarizeResults([], 8), {
    completedCount: 0,
    accuracyPercent: null,
    averageReactionTime: null,
    totalQuestions: 8,
  });
});

test("session summary uses only completed trials", () => {
  const summary = summarizeResults(
    [
      { isCorrect: true, reactionTime: 500 },
      { isCorrect: false, reactionTime: 900 },
    ],
    8,
  );

  assert.deepEqual(summary, {
    completedCount: 2,
    accuracyPercent: 50,
    averageReactionTime: 700,
    totalQuestions: 8,
  });
});

test("results are exported as a CSV with a header row", () => {
  const csv = resultsToCsv([
    {
      participantId: "P-018",
      sessionMode: "formal",
      trial: 1,
      sentence: "Les filles mange une pomme.",
      judgment: "incorrect",
      answer: false,
      isCorrect: true,
      reactionTime: 842,
      diagnosis: "verb-conjugation",
      diagnosisKey: "verb-conjugation",
      diagnosisIsCorrect: true,
      diagnosisReactionTime: 615,
    },
  ]);

  assert.equal(
    csv,
    [
      "participant_id,session_mode,trial,sentence,judgment,answer_key,is_correct,reaction_time_ms,diagnosis,diagnosis_key,diagnosis_is_correct,diagnosis_reaction_time_ms",
      "P-018,formal,1,Les filles mange une pomme.,incorrect,false,true,842,verb-conjugation,verb-conjugation,true,615",
    ].join("\n"),
  );
});
