const DAY = 24 * 60 * 60 * 1000;

export const REVIEW_SCHEDULE_DAYS = [1, 2, 4, 15, 30, 60, 120, 180];

export const initialMemory = {
  repetitions: 0,
  correctStreak: 0,
  lapses: 0,
  intervalDays: 0,
  ease: 2.5,
  dueAt: null,
  lastReviewedAt: null,
  learnedAt: null,
  reviewStage: -1,
  reviewPasses: 0,
  status: "new",
};

export function getWordMemory(progress, wordId) {
  const memory = {
    ...initialMemory,
    ...(progress.memory?.[wordId] || {}),
  };
  if (memory.status === "mastered" && memory.reviewPasses < 2) {
    return { ...memory, status: "review" };
  }
  return memory;
}

export function isWordDue(progress, wordId, now = Date.now()) {
  const memory = getWordMemory(progress, wordId);
  return (
    (memory.status === "review" || memory.status === "mastered") &&
    Number(memory.dueAt) > 0 &&
    Number(memory.dueAt) <= now
  );
}

function nextNodeDue(learnedAt, reviewStage, now) {
  const nodeIndex = Math.min(
    Math.max(0, reviewStage),
    REVIEW_SCHEDULE_DAYS.length - 1,
  );
  const scheduled = learnedAt + REVIEW_SCHEDULE_DAYS[nodeIndex] * DAY;
  return Math.max(scheduled, now + DAY);
}

export function recordPracticeComplete(
  previousMemory,
  { wrong = false, now = Date.now() } = {},
) {
  const previous = { ...initialMemory, ...previousMemory };
  if (previous.learnedAt) {
    return {
      ...previous,
      repetitions: previous.repetitions + 1,
      correctStreak: 0,
      lapses: previous.lapses + (wrong ? 1 : 0),
      intervalDays: 1,
      dueAt: now + DAY,
      lastReviewedAt: now,
      reviewStage: Math.max(0, previous.reviewStage),
      status: "review",
    };
  }
  const learnedAt = previous.learnedAt || now;
  return {
    ...previous,
    repetitions: Math.max(1, previous.repetitions),
    correctStreak: 0,
    lapses: previous.lapses + (wrong ? 1 : 0),
    intervalDays: 1,
    dueAt: learnedAt + REVIEW_SCHEDULE_DAYS[0] * DAY,
    lastReviewedAt: now,
    learnedAt,
    reviewStage: 0,
    reviewPasses: 0,
    status: "review",
  };
}

export function markMistake(previousMemory, now = Date.now()) {
  const previous = { ...initialMemory, ...previousMemory };
  const learnedAt =
    previous.learnedAt ||
    previous.lastReviewedAt ||
    (previous.repetitions ? now - DAY : null);
  return {
    ...previous,
    correctStreak: 0,
    lapses: previous.lapses + 1,
    intervalDays: 1,
    dueAt: now + DAY,
    lastReviewedAt: now,
    learnedAt,
    reviewStage:
      previous.reviewStage >= 0 ? previous.reviewStage : learnedAt ? 0 : -1,
    status: learnedAt ? "review" : previous.status,
  };
}

export function applyReview(previousMemory, result, now = Date.now()) {
  if (result === "again") return markMistake(previousMemory, now);

  const previous = { ...initialMemory, ...previousMemory };
  const learnedAt = previous.learnedAt || now;
  const reviewStage = Math.min(
    Math.max(0, previous.reviewStage + 1),
    REVIEW_SCHEDULE_DAYS.length - 1,
  );
  const reviewPasses = previous.reviewPasses + 1;
  const nextDueAt = nextNodeDue(learnedAt, reviewStage, now);

  return {
    ...previous,
    repetitions: previous.repetitions + 1,
    correctStreak: previous.correctStreak + 1,
    intervalDays: Math.max(
      1,
      Math.round((nextDueAt - now) / DAY),
    ),
    dueAt: nextDueAt,
    lastReviewedAt: now,
    learnedAt,
    reviewStage,
    reviewPasses,
    status: reviewPasses >= 2 ? "mastered" : "review",
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
  if (intervalDays < 1) {
    return `${Math.max(1, Math.round(intervalDays * 24 * 60))} 分钟`;
  }
  if (intervalDays < 14) return `${Math.round(intervalDays)} 天`;
  return `${Math.round(intervalDays / 7)} 周`;
}
