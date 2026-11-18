const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export const initialMemory = {
  repetitions: 0,
  correctStreak: 0,
  lapses: 0,
  intervalDays: 0,
  ease: 2.5,
  dueAt: null,
  lastReviewedAt: null,
  status: "new",
};

export function getWordMemory(progress, wordId) {
  const memory = progress.memory?.[wordId] || initialMemory;
  if (progress.mastered?.includes(wordId) || memory.status === "mastered") {
    return { ...memory, status: "mastered" };
  }
  if (memory.repetitions > 0) {
    return { ...memory, status: "review" };
  }
  return { ...memory, status: "new" };
}

export function isWordDue(progress, wordId, now = Date.now()) {
  const memory = getWordMemory(progress, wordId);
  return memory.status === "review" && Number(memory.dueAt) <= now;
}

function roundInterval(value) {
  if (value >= 14) return Math.round(value);
  if (value >= 3) return Math.round(value * 2) / 2;
  return Math.round(value * 4) / 4;
}

export function applyReview(previousMemory, result, now = Date.now()) {
  const previous = { ...initialMemory, ...previousMemory };

  if (result === "known") {
    const repetitions = previous.repetitions + 1;
    const correctStreak = previous.correctStreak + 1;
    let baseInterval;

    if (repetitions === 1) baseInterval = 1;
    else if (repetitions === 2) baseInterval = 3;
    else if (repetitions === 3) baseInterval = 7;
    else baseInterval = previous.intervalDays * previous.ease;

    const lapsePenalty = Math.max(0.58, 1 - previous.lapses * 0.065);
    const streakBoost = correctStreak >= 3 ? 1.12 : 1;
    const intervalDays = Math.min(
      180,
      roundInterval(Math.max(0.75, baseInterval * lapsePenalty * streakBoost)),
    );
    const mastered = intervalDays >= 21 && correctStreak >= 3;

    return {
      repetitions,
      correctStreak,
      lapses: Math.max(0, previous.lapses - 1),
      intervalDays,
      ease: Math.min(3.25, previous.ease + 0.06),
      dueAt: now + intervalDays * DAY,
      lastReviewedAt: now,
      status: mastered ? "mastered" : "review",
    };
  }

  const lapses = previous.lapses + 1;
  const intervalDays = Math.max(
    0.01,
    Math.min(0.75, previous.intervalDays * Math.max(0.12, 0.45 - lapses * 0.055)),
  );
  const recheckMinutes = Math.max(2, Math.round(15 / 1.65 ** (lapses - 1)));

  return {
    repetitions: previous.repetitions + 1,
    correctStreak: 0,
    lapses,
    intervalDays,
    ease: Math.max(1.3, previous.ease - 0.18),
    dueAt: now + recheckMinutes * MINUTE,
    lastReviewedAt: now,
    status: "review",
  };
}

export function getDueWords(words, progress, now = Date.now()) {
  return words
    .filter((word) => isWordDue(progress, word.id, now))
    .sort((a, b) => {
      const aMemory = getWordMemory(progress, a.id);
      const bMemory = getWordMemory(progress, b.id);
      return (
        bMemory.lapses - aMemory.lapses ||
        Number(aMemory.dueAt) - Number(bMemory.dueAt)
      );
    });
}

export function getWordStatus(progress, wordId) {
  return getWordMemory(progress, wordId).status;
}

export function formatInterval(intervalDays) {
  if (intervalDays < 1) return `${Math.max(1, Math.round(intervalDays * 24 * 60))} 分钟`;
  if (intervalDays < 14) return `${Math.round(intervalDays)} 天`;
  return `${Math.round(intervalDays / 7)} 周`;
}
