const STORAGE_KEY = "slovo-progress-v2";

export const defaultProgress = {
  mastered: [],
  difficult: [],
  history: [],
  memory: {},
  reviewPool: [],
  favorites: [],
  passed: [],
  learningCursors: {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  },
  streak: 0,
  lastStudyDate: null,
  totalReviews: 0,
  dailyGoal: 12,
};

export function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return defaultProgress;
    return {
      ...defaultProgress,
      ...stored,
      mastered: Array.isArray(stored.mastered) ? stored.mastered : [],
      difficult: Array.isArray(stored.difficult) ? stored.difficult : [],
      history: Array.isArray(stored.history) ? stored.history : [],
      reviewPool: Array.isArray(stored.reviewPool) ? stored.reviewPool : [],
      favorites: Array.isArray(stored.favorites) ? stored.favorites : [],
      passed: Array.isArray(stored.passed) ? stored.passed : [],
      learningCursors:
        stored.learningCursors && typeof stored.learningCursors === "object"
          ? { beginner: 0, intermediate: 0, advanced: 0, ...stored.learningCursors }
          : { beginner: 0, intermediate: 0, advanced: 0 },
      memory:
        stored.memory && typeof stored.memory === "object" && !Array.isArray(stored.memory)
          ? stored.memory
          : {},
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

export function dateLabel(date = new Date()) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

export function loadSettings() {
  try {
    return {
      speechRate: 0.9,
      autoPlay: true,
      reducedMotion: false,
      ...JSON.parse(localStorage.getItem("slovo-settings-v1")),
    };
  } catch {
    return { speechRate: 0.9, autoPlay: true, reducedMotion: false };
  }
}

export function saveSettings(settings) {
  localStorage.setItem("slovo-settings-v1", JSON.stringify(settings));
}
