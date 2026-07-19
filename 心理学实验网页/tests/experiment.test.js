import test from "node:test";
import assert from "node:assert/strict";

import {
  formatReactionTime,
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

test("results are exported as a CSV with a header row", () => {
  const csv = resultsToCsv([
    {
      trial: 1,
      sentence: "Je lis un livre.",
      judgment: "correct",
      answer: true,
      isCorrect: true,
      reactionTime: 842,
    },
  ]);

  assert.equal(
    csv,
    [
      "trial,sentence,judgment,answer_key,is_correct,reaction_time_ms",
      "1,Je lis un livre.,correct,true,true,842",
    ].join("\n"),
  );
});
