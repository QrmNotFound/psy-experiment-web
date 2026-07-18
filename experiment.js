export const QUESTIONS = [
  { sentence: "Je vois le roman que je lis.", answer: true },
  { sentence: "La fille mange une pomme.", answer: true },
  { sentence: "Le livre que je lis est intéressant.", answer: true },
  { sentence: "Je vois le roman que je lis dans un cahier.", answer: true },
  { sentence: "Le garçon les fille regarde.", answer: false },
  { sentence: "La bibliothèque que je fréquente est près de chez moi.", answer: true },
  { sentence: "Chaque jour, ami fréquente la bibliothèque.", answer: false },
  { sentence: "Le magasin que la ville propose est fermé.", answer: false },
];

export function isCorrectJudgment(judgment, answer) {
  return (judgment === "correct") === answer;
}

export function formatReactionTime(milliseconds) {
  return `${Math.round(milliseconds)} ms`;
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function resultsToCsv(results) {
  const header = "trial,sentence,judgment,answer_key,is_correct,reaction_time_ms";
  const rows = results.map((result) =>
    [
      result.trial,
      result.sentence,
      result.judgment,
      result.answer,
      result.isCorrect,
      Math.round(result.reactionTime),
    ]
      .map(escapeCsvValue)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
