export const QUESTIONS = [
  { sentence: "Je vois le roman que je lis.", answer: true },
  {
    sentence: "Les filles mange une pomme.",
    answer: false,
    errorCategory: "verb-conjugation",
  },
  { sentence: "Le livre que je lis est intéressant.", answer: true },
  { sentence: "Je vois le roman que je lis dans un cahier.", answer: true },
  {
    sentence: "Le garçon regarde fille la.",
    answer: false,
    errorCategory: "word-order",
  },
  { sentence: "La bibliothèque que je fréquente est près de chez moi.", answer: true },
  {
    sentence: "Chaque jour, ami fréquente la bibliothèque.",
    answer: false,
    errorCategory: "lexical",
  },
  {
    sentence: "Le magasin que la ville le propose est fermé.",
    answer: false,
    errorCategory: "pronoun-reference",
  },
];

export const DIAGNOSIS_OPTIONS = [
  {
    value: "verb-conjugation",
    label: "动词变位",
    description: "动词的人称、数或时态形式不正确",
  },
  {
    value: "pronoun-reference",
    label: "代词或指代",
    description: "代词重复、缺失，或指向关系不清楚",
  },
  {
    value: "word-order",
    label: "词序或句法结构",
    description: "句子成分的位置或组合方式不正确",
  },
  {
    value: "lexical",
    label: "词汇或限定词",
    description: "单词、冠词或限定词的使用有问题",
  },
  {
    value: "unknown",
    label: "不知道",
    description: "只感觉句子有问题，但无法确定原因",
  },
];

export function isCorrectJudgment(judgment, answer) {
  return (judgment === "correct") === answer;
}

export function isCorrectDiagnosis(diagnosis, diagnosisKey) {
  return diagnosisKey ? diagnosis === diagnosisKey : null;
}

export function formatReactionTime(milliseconds) {
  return `${Math.round(milliseconds)} ms`;
}

export function normalizeParticipantId(value) {
  return String(value ?? "").trim();
}

export function canStartSession({ consentAccepted, participantId }) {
  return Boolean(consentAccepted && normalizeParticipantId(participantId));
}

export function selectJudgment(currentSelection, judgment, elapsedTime) {
  return {
    judgment,
    reactionTime: currentSelection?.reactionTime ?? elapsedTime,
  };
}

export function createTestParticipantId(date = new Date(), randomValue = Math.random()) {
  const datePart = date.toISOString().slice(0, 10).replaceAll("-", "");
  const randomPart = Math.floor(randomValue * 36 ** 4)
    .toString(36)
    .padStart(4, "0")
    .toUpperCase();

  return `TEST-${datePart}-${randomPart}`;
}

export function summarizeResults(results, totalQuestions) {
  const completedCount = results.length;
  if (completedCount === 0) {
    return {
      completedCount,
      accuracyPercent: null,
      averageReactionTime: null,
      totalQuestions,
    };
  }

  const correctCount = results.filter((result) => result.isCorrect).length;
  const totalReactionTime = results.reduce(
    (sum, result) => sum + result.reactionTime,
    0,
  );

  return {
    completedCount,
    accuracyPercent: Math.round((correctCount / completedCount) * 100),
    averageReactionTime: totalReactionTime / completedCount,
    totalQuestions,
  };
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function resultsToCsv(results) {
  const header =
    "participant_id,session_mode,trial,sentence,judgment,answer_key,is_correct,reaction_time_ms,diagnosis,diagnosis_key,diagnosis_is_correct,diagnosis_reaction_time_ms";
  const rows = results.map((result) =>
    [
      result.participantId,
      result.sessionMode,
      result.trial,
      result.sentence,
      result.judgment,
      result.answer,
      result.isCorrect,
      Math.round(result.reactionTime),
      result.diagnosis,
      result.diagnosisKey,
      result.diagnosisIsCorrect,
      result.diagnosisReactionTime == null
        ? ""
        : Math.round(result.diagnosisReactionTime),
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
