import test from "node:test";
import assert from "node:assert/strict";

import {
  formatReactionTime,
  isCorrectDiagnosis,
  isCorrectJudgment,
  resultsToCsv,
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

test("diagnosis is scored only when the sentence has a known error category", () => {
  assert.equal(isCorrectDiagnosis("verb-conjugation", "verb-conjugation"), true);
  assert.equal(isCorrectDiagnosis("word-order", "verb-conjugation"), false);
  assert.equal(isCorrectDiagnosis("unknown", null), null);
});

test("results are exported as a CSV with a header row", () => {
  const csv = resultsToCsv([
    {
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
      "trial,sentence,judgment,answer_key,is_correct,reaction_time_ms,diagnosis,diagnosis_key,diagnosis_is_correct,diagnosis_reaction_time_ms",
      "1,Les filles mange une pomme.,incorrect,false,true,842,verb-conjugation,verb-conjugation,true,615",
    ].join("\n"),
  );
});
