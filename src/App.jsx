import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { Dashboard } from "./components/Dashboard";
import { FavoritesPage } from "./components/FavoritesPage";
import { LoginScreen, AuthLoading } from "./components/LoginScreen";
import { PasswordChangeModal } from "./components/PasswordChangeModal";
import {
  PracticeSetupModal,
  getDifficultyWords,
} from "./components/PracticeSetupModal";
import { ProgressPage } from "./components/ProgressPage";
import { QuizSession } from "./components/QuizSession";
import { ReviewPage } from "./components/ReviewPage";
import { ReviewSession } from "./components/ReviewSession";
import { SettingsDrawer } from "./components/SettingsDrawer";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { WordBank } from "./components/WordBank";
import { WordDetailDrawer } from "./components/WordDetailDrawer";
import { WrongBookPage } from "./components/WrongBookPage";
import { WordbookProvider } from "./context/WordbookContext";
import { api } from "./lib/api";
import {
  dateLabel,
  defaultProgress,
  loadSettings,
  saveSettings,
  todayKey,
} from "./lib/storage";
import {
  applyReview,
  getDueWords,
  getWordMemory,
  getWordStatus,
  markMistake,
  recordPracticeComplete,
} from "./lib/srs";

function previousDateKey() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function freshProgress() {
  return {
    ...defaultProgress,
    mastered: [],
    difficult: [],
    history: [],
    memory: {},
    reviewPool: [],
    favorites: [],
    passed: [],
    wrongBook: [],
    activeQuiz: null,
    studyPlan: {
      groupsPerDay: 1,
      groupSize: 10,
    },
    learningCursors: {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    },
  };
}

function interleavePracticeWords(baseWords, insertedWords, size) {
  const reserve = Math.min(
    insertedWords.length,
    Math.max(1, Math.round(size / 3)),
  );
  const base = baseWords.slice(0, Math.max(0, size - reserve));
  const insertions = insertedWords.slice(0, reserve);
  const queue = [];
  let insertionIndex = 0;
  for (let index = 0; index < base.length; index += 1) {
    queue.push(base[index]);
    if ((index + 1) % 3 === 0 && insertionIndex < insertions.length) {
      queue.push(insertions[insertionIndex]);
      insertionIndex += 1;
    }
  }
  queue.push(...insertions.slice(insertionIndex));
  return queue.slice(0, size);
}

function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [loginMessage, setLoginMessage] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [progress, setProgress] = useState(freshProgress);
  const [view, setView] = useState("home");
  const [settings, setSettings] = useState(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [cloudSyncedAt, setCloudSyncedAt] = useState(null);
  const [detailWord, setDetailWord] = useState(null);
  const [practiceSetupOpen, setPracticeSetupOpen] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState({
    size: 10,
    difficulty: "beginner",
    groupsPerDay: 1,
    spellingDifficulty: "easy",
  });
  const [studySession, setStudySession] = useState({
    mode: "practice",
    topic: null,
    queue: [],
    run: 0,
    size: 10,
    difficulty: "beginner",
    savedState: null,
    spellingDifficulty: "easy",
  });
  const [reviewConfig, setReviewConfig] = useState({
    spellingDifficulty: "easy",
  });
  const [reviewSession, setReviewSession] = useState({
    queue: [],
    run: 0,
    spellingDifficulty: "easy",
  });
  const [toast, setToast] = useState("");
  const [now, setNow] = useState(Date.now);
  const previousFocusRef = useRef(null);

  const book = workspace?.book || null;
  const words = useMemo(() => book?.words || [], [book]);
  const topics = useMemo(() => book?.topics || [], [book]);
  const topicMap = useMemo(
    () => Object.fromEntries(topics.map((topic) => [topic.id, topic])),
    [topics],
  );
  const wordMap = useMemo(
    () => new Map(words.map((word) => [word.id, word])),
    [words],
  );

  const loadWorkspace = useCallback(async (bookId) => {
    const data = await api.bootstrap(bookId);
    setUser(data.user);
    setWorkspace({
      book: data.book,
      wordbooks: data.wordbooks,
      activeBookId: data.activeBookId,
    });
    const nextProgress = {
      ...freshProgress(),
      ...data.progress,
    };
    nextProgress.mastered = (data.progress.mastered || []).filter((wordId) => {
      const memory = data.progress.memory?.[wordId];
      return memory?.status === "mastered" && Number(memory.reviewPasses) >= 2;
    });
    setProgress(nextProgress);
    setPracticeConfig({
      size: data.progress.studyPlan?.groupSize || 10,
      difficulty: "beginner",
      groupsPerDay: data.progress.studyPlan?.groupsPerDay || 1,
      spellingDifficulty: data.progress.studyPlan?.spellingDifficulty || "easy",
    });
    setCloudSyncedAt(data.progressUpdatedAt || null);
    setView("home");
    setStudySession((current) => ({ ...current, queue: [] }));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (sessionStorage.getItem("slovo-signed-out") === "1") {
          await api.logout();
          sessionStorage.removeItem("slovo-signed-out");
        }
        await api.me();
        if (!active) return;
        await loadWorkspace();
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!settingsOpen && !detailWord && !practiceSetupOpen && !passwordOpen) {
      return undefined;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailWord, passwordOpen, practiceSetupOpen, settingsOpen]);

  useEffect(() => {
    const activeDialog = passwordOpen
      ? ".password-modal"
      : practiceSetupOpen
        ? ".practice-setup-modal"
        : detailWord
          ? ".word-detail-drawer"
          : settingsOpen
            ? ".settings-drawer"
            : null;
    if (!activeDialog) return undefined;

    previousFocusRef.current = document.activeElement;
    const dialog = document.querySelector(activeDialog);
    if (!dialog) return undefined;
    const getFocusable = () =>
      Array.from(
        dialog.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
    const focusTimer = window.setTimeout(() => {
      const focusable = getFocusable();
      (dialog.querySelector("[autofocus]") || focusable[0] || dialog).focus?.();
    }, 40);

    const handleKeydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (passwordOpen) setPasswordOpen(false);
        else if (practiceSetupOpen) setPracticeSetupOpen(false);
        else if (detailWord) setDetailWord(null);
        else if (settingsOpen) setSettingsOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeydown);
      const previous = previousFocusRef.current;
      if (previous instanceof HTMLElement && previous.isConnected) {
        window.setTimeout(() => previous.focus(), 0);
      }
    };
  }, [detailWord, passwordOpen, practiceSetupOpen, settingsOpen]);

  useEffect(() => {
    let midnightTimer = null;
    const refreshNow = () => setNow(Date.now());
    const scheduleMidnight = () => {
      const nextMidnight = new Date();
      nextMidnight.setHours(24, 0, 0, 40);
      midnightTimer = window.setTimeout(() => {
        refreshNow();
        scheduleMidnight();
      }, Math.max(1000, nextMidnight.getTime() - Date.now()));
    };
    const interval = window.setInterval(refreshNow, 30_000);
    scheduleMidnight();
    return () => {
      window.clearInterval(interval);
      if (midnightTimer) window.clearTimeout(midnightTimer);
    };
  }, []);

  useEffect(() => {
    if (!user || !workspace?.activeBookId) return undefined;
    const timeout = window.setTimeout(() => {
      api
        .saveProgress(workspace.activeBookId, progress)
        .then((result) => {
          if (result.updatedAt) setCloudSyncedAt(result.updatedAt);
        })
        .catch((error) => setToast(error.message || "进度保存失败"));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [progress, user, workspace?.activeBookId]);

  useEffect(() => {
    if (!user || !workspace?.activeBookId) return undefined;
    const flush = () => {
      fetch("/api/progress", {
        method: "PUT",
        credentials: "same-origin",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: workspace.activeBookId,
          progress,
        }),
      }).catch(() => {});
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [progress, user, workspace?.activeBookId]);

  const difficultIds = useMemo(
    () => new Set(progress.difficult),
    [progress.difficult],
  );
  const passedIds = useMemo(() => new Set(progress.passed), [progress.passed]);
  const favoriteIds = useMemo(
    () => new Set(progress.favorites),
    [progress.favorites],
  );
  const currentDateKey = useMemo(() => todayKey(), [now]);
  const todayHistory = useMemo(
    () => progress.history.filter((entry) => entry.date === currentDateKey),
    [currentDateKey, progress.history],
  );
  const todayNewWordIds = useMemo(
    () =>
      new Set(
        todayHistory
          .filter((entry) => entry.kind === "new")
          .map((entry) => entry.wordId),
      ),
    [todayHistory],
  );
  const todayNewCount = todayHistory.filter((entry) => entry.kind === "new").length;
  const todayReviewCount = todayHistory.filter((entry) => entry.kind === "review").length;
  const dueWords = useMemo(
    () => getDueWords(words, progress, now).filter((word) => !passedIds.has(word.id)),
    [now, passedIds, progress, words],
  );
  const todayWord =
    dueWords[0] ||
    words.find(
      (word) =>
        !passedIds.has(word.id) && getWordStatus(progress, word.id) === "new",
    ) ||
    words.find((word) => !passedIds.has(word.id)) ||
    null;
  const recentWords = useMemo(
    () =>
      [...words]
        .sort((a, b) => {
          const aIndex = progress.history.findLastIndex((entry) => entry.wordId === a.id);
          const bIndex = progress.history.findLastIndex((entry) => entry.wordId === b.id);
          return bIndex - aIndex;
        })
        .slice(0, 3),
    [progress.history, words],
  );
  const difficultWords = useMemo(
    () =>
      words.filter(
        (word) => difficultIds.has(word.id) && !passedIds.has(word.id),
      ),
    [difficultIds, passedIds, words],
  );
  const reviewWords = useMemo(
    () =>
      progress.reviewPool
        .map((wordId) => wordMap.get(wordId))
        .filter((word) => word && !passedIds.has(word.id)),
    [passedIds, progress.reviewPool, wordMap],
  );
  const favoriteWords = useMemo(
    () => words.filter((word) => favoriteIds.has(word.id)),
    [favoriteIds, words],
  );
  const wrongWords = useMemo(
    () =>
      progress.wrongBook
        .map((wordId) => wordMap.get(wordId))
        .filter(Boolean),
    [progress.wrongBook, wordMap],
  );
  const learnedCount = useMemo(
    () =>
      new Set([
        ...progress.reviewPool,
        ...progress.mastered,
        ...progress.passed,
      ]).size,
    [progress.mastered, progress.passed, progress.reviewPool],
  );

  const buildPracticeQueue = useCallback(
    ({ topic = null, seedWord = null, size = 10, difficulty = "beginner", excludeIds = [] }) => {
      if (seedWord) return [seedWord];
      const difficultyWords = getDifficultyWords(words, difficulty);
      const scopedWords =
        topic && topic !== "difficult"
          ? words.filter((word) => word.topic === topic)
          : difficultyWords;

      if (topic === "difficult") {
        const difficultQueue = words.filter(
          (word) => difficultIds.has(word.id) && !progress.passed.includes(word.id),
        );
        if (difficultQueue.length) return difficultQueue;
      }

      const excluded = new Set([
        ...excludeIds,
        ...progress.reviewPool,
        ...progress.passed,
        ...todayNewWordIds,
      ]);
      const candidates = scopedWords.filter(
        (word) =>
          !excluded.has(word.id) &&
          getWordStatus(progress, word.id) !== "mastered",
      );
      const cursor =
        topic || seedWord
          ? 0
          : Number(progress.learningCursors?.[difficulty] || 0);
      const difficultyIndex = new Map(
        difficultyWords.map((word, index) => [word.id, index]),
      );
      const orderedCandidates = candidates.filter(
        (word) => (difficultyIndex.get(word.id) ?? 0) >= cursor,
      );
      const dueInScope = dueWords.filter((word) =>
        candidates.some((candidate) => candidate.id === word.id),
      );
      const dueIds = new Set(dueInScope.map((word) => word.id));
      const baseQueue = [
        ...dueInScope,
        ...orderedCandidates.filter((word) => !dueIds.has(word.id)),
      ];
      const wrongQueue = words.filter(
        (word) =>
          progress.wrongBook.includes(word.id) &&
          !progress.passed.includes(word.id) &&
          !excludeIds.includes(word.id) &&
          !baseQueue.some((item) => item.id === word.id),
      );
      return interleavePracticeWords(baseQueue, wrongQueue, size);
    },
    [difficultIds, dueWords, progress, todayNewWordIds, words],
  );

  const startStudy = useCallback(
    (topic = null, seedWord = null) => {
      if (progress.activeQuiz) {
        const savedState = progress.activeQuiz;
        const queue = (savedState.wordMapIds || [])
          .map((wordId) => wordMap.get(wordId))
          .filter(Boolean);
        if (queue.length) {
          setStudySession((current) => ({
            mode: "practice",
            topic: savedState.practiceMeta?.topic || null,
            queue,
            run: current.run + 1,
            size: savedState.practiceMeta?.size || queue.length,
            difficulty: savedState.practiceMeta?.difficulty || "beginner",
            savedState,
            spellingDifficulty:
              savedState.practiceMeta?.spellingDifficulty || "easy",
          }));
          setView("study");
          return;
        }
      }
      const queue = buildPracticeQueue({
        topic,
        seedWord,
        size: seedWord ? 1 : practiceConfig.size,
        difficulty: practiceConfig.difficulty,
        excludeIds: seedWord ? [] : progress.reviewPool,
      });
      if (!queue.length) {
        setToast("当前难度暂时没有可练习的新词。");
        return;
      }
      setStudySession((current) => ({
        mode: "practice",
        topic,
        queue,
        run: current.run + 1,
        size: seedWord ? 1 : practiceConfig.size,
        difficulty: practiceConfig.difficulty,
        savedState: null,
        spellingDifficulty: practiceConfig.spellingDifficulty || "easy",
      }));
      setView("study");
    },
    [buildPracticeQueue, practiceConfig, progress.activeQuiz, progress.reviewPool, wordMap],
  );

  const handlePracticeSetup = useCallback(
    (nextConfig) => {
      const normalized = {
        size: nextConfig.size,
        difficulty: nextConfig.difficulty,
        groupsPerDay: Number(nextConfig.groupsPerDay || 1),
        spellingDifficulty: nextConfig.spellingDifficulty || "easy",
      };
      setPracticeConfig(normalized);
      setProgress((current) => ({
        ...current,
        studyPlan: {
          groupsPerDay: normalized.groupsPerDay,
          groupSize: normalized.size,
          spellingDifficulty: normalized.spellingDifficulty,
        },
        dailyGoal: normalized.groupsPerDay * normalized.size,
      }));
      if (nextConfig.commitOnly) return;
      if (progress.activeQuiz) {
        startStudy();
        setPracticeSetupOpen(false);
        return;
      }

      const queue = buildPracticeQueue({
        ...normalized,
        excludeIds: progress.reviewPool,
      });
      if (!queue.length) {
        setToast("这个难度暂时没有可练习的新词，可以换一个难度。");
        return;
      }
      setPracticeSetupOpen(false);
      setStudySession((current) => ({
        mode: "practice",
        topic: null,
        queue,
        run: current.run + 1,
        ...normalized,
        savedState: null,
      }));
      setView("study");
    },
    [buildPracticeQueue, progress.activeQuiz, progress.reviewPool, startStudy],
  );

  const addNextPracticeGroup = useCallback(() => {
    const queue = buildPracticeQueue({
      size: studySession.size,
      difficulty: studySession.difficulty,
      excludeIds: [
        ...progress.reviewPool,
        ...studySession.queue.map((word) => word.id),
      ],
    });
    if (!queue.length) {
      setToast("这个难度的词已经练习完了，可以切换难度。");
      setPracticeSetupOpen(true);
      return;
    }
    setStudySession((current) => ({
      ...current,
      queue,
      run: current.run + 1,
      savedState: null,
    }));
    setView("study");
  }, [buildPracticeQueue, progress.reviewPool, studySession]);

  const saveActiveQuiz = useCallback(
    (snapshot) => {
      setProgress((current) => ({
        ...current,
        activeQuiz: snapshot
          ? {
              ...snapshot,
              practiceMeta: {
                topic: studySession.topic,
                size: studySession.size,
                difficulty: studySession.difficulty,
                spellingDifficulty: studySession.spellingDifficulty || "easy",
              },
            }
          : null,
      }));
    },
    [studySession],
  );

  const completePracticeGroup = useCallback(
    (passedIds = [], wrongIds = []) => {
      const passedSet = new Set(passedIds);
      const wrongSet = new Set(wrongIds);
      const now = Date.now();
      const date = todayKey();
      setProgress((current) => {
        const reviewPool = new Set(current.reviewPool);
        const mastered = new Set(current.mastered);
        const difficult = new Set(current.difficult);
        const wrongBook = new Set(current.wrongBook);
        const memory = { ...current.memory };
        const history = [...current.history];

        for (const word of studySession.queue) {
          if (passedSet.has(word.id)) continue;
          const previous = getWordMemory(current, word.id);
          const wrong = wrongSet.has(word.id);
          memory[word.id] = recordPracticeComplete(previous, { wrong, now });
          reviewPool.add(word.id);
          mastered.delete(word.id);
          if (wrong) {
            difficult.add(word.id);
            wrongBook.add(word.id);
          }
          history.push({
            date,
            wordId: word.id,
            result: wrong ? "again" : "known",
            kind: previous.status === "new" ? "new" : "review",
            phase: "practice",
            topic: word.topic,
          });
        }

        const learningCursors = { ...current.learningCursors };
        if (!studySession.topic && studySession.queue.length) {
          const difficultyWords = getDifficultyWords(
            words,
            studySession.difficulty,
          );
          const completedIndexes = studySession.queue
            .map((word) =>
              difficultyWords.findIndex((item) => item.id === word.id),
            )
            .filter((index) => index >= 0);
          const nextCursor = completedIndexes.length
            ? Math.max(...completedIndexes) + 1
            : learningCursors[studySession.difficulty] || 0;
          learningCursors[studySession.difficulty] = Math.max(
            learningCursors[studySession.difficulty] || 0,
            nextCursor,
          );
        }

        let streak = current.streak;
        if (current.lastStudyDate !== date) {
          streak =
            current.lastStudyDate === previousDateKey()
              ? current.streak + 1
              : current.streak;
        }

        return {
          ...current,
          activeQuiz: null,
          reviewPool: Array.from(reviewPool),
          mastered: Array.from(mastered),
          difficult: Array.from(difficult),
          wrongBook: Array.from(wrongBook),
          memory,
          history: history.slice(-1500),
          learningCursors,
          totalReviews: current.totalReviews + studySession.queue.length,
          lastStudyDate: date,
          streak,
        };
      });
      const topicName =
        studySession.topic === "difficult"
          ? "错题本"
          : topicMap[studySession.topic]?.label;
      setToast(
        topicName
          ? `${topicName}已完成，并加入复习池。`
          : `本组 ${studySession.queue.length} 个词已完成三轮，并加入复习池。`,
      );
    },
    [studySession, topicMap, words],
  );

  const startReview = useCallback(() => {
    if (!reviewWords.length) {
      setToast("复习池还是空的，先完成一组练习。");
      return;
    }
    setReviewSession((current) => ({
      queue: reviewWords,
      spellingDifficulty: reviewConfig.spellingDifficulty,
      run: current.run + 1,
    }));
    setView("reviewSession");
  }, [reviewConfig.spellingDifficulty, reviewWords]);

  const completeReview = useCallback((reviewedIds, wrongIds = []) => {
    const reviewed = [...new Set(reviewedIds)];
    const wrongSet = new Set(wrongIds);
    const now = Date.now();
    const date = todayKey();
    setProgress((current) => {
      const memory = { ...current.memory };
      const mastered = new Set(current.mastered);
      const difficult = new Set(current.difficult);
      const wrongBook = new Set(current.wrongBook);
      const reviewPool = new Set(current.reviewPool);
      const history = [...current.history];
      for (const wordId of reviewed) {
        const wrong = wrongSet.has(wordId);
        const previous = getWordMemory(current, wordId);
        const next = applyReview(previous, wrong ? "again" : "known", now);
        memory[wordId] = next;
        reviewPool.add(wordId);
        if (next.status === "mastered") mastered.add(wordId);
        else mastered.delete(wordId);
        if (wrong) {
          difficult.add(wordId);
          wrongBook.add(wordId);
        } else if (next.status === "mastered") {
          difficult.delete(wordId);
        }
        history.push({
          date,
          wordId,
          result: wrong ? "again" : "known",
          kind: "review",
          phase: "review",
          topic: wordMap.get(wordId)?.topic,
        });
      }
      return {
        ...current,
        memory,
        reviewPool: Array.from(reviewPool),
        mastered: Array.from(mastered),
        difficult: Array.from(difficult),
        wrongBook: Array.from(wrongBook),
        history: history.slice(-1500),
        totalReviews: current.totalReviews + reviewed.length,
        lastStudyDate: date,
      };
    });
    setToast("本次复习完成，已根据答题表现重新安排复习间隔。");
  }, [wordMap]);

  const navigate = useCallback((nextView) => {
    if (nextView === "study") {
      setPracticeSetupOpen(true);
      return;
    }
    setView(nextView);
  }, []);

  const openWordDetail = useCallback((word) => {
    setSettingsOpen(false);
    setDetailWord(word);
  }, []);

  const openSettings = useCallback(() => {
    setDetailWord(null);
    setPracticeSetupOpen(false);
    setSettingsOpen(true);
  }, []);

  const syncNow = useCallback(async () => {
    if (!workspace?.activeBookId) return;
    try {
      const result = await api.saveProgress(workspace.activeBookId, progress);
      setCloudSyncedAt(result.updatedAt || new Date().toISOString());
      setToast("学习进度已同步到云端。");
    } catch (error) {
      setToast(error.message || "云端同步失败");
    }
  }, [progress, workspace?.activeBookId]);

  const toggleFavorite = useCallback((wordId) => {
    const removing = favoriteIds.has(wordId);
    setProgress((current) => {
      const favorites = new Set(current.favorites || []);
      if (removing) favorites.delete(wordId);
      else favorites.add(wordId);
      return { ...current, favorites: Array.from(favorites) };
    });
    setToast(removing ? "已移出收藏夹。" : "已加入收藏夹。");
  }, [favoriteIds]);

  const passWord = useCallback((wordId) => {
    setProgress((current) => {
      const passed = new Set(current.passed || []);
      passed.add(wordId);
      return {
        ...current,
        passed: Array.from(passed),
        reviewPool: current.reviewPool.filter((id) => id !== wordId),
        difficult: current.difficult.filter((id) => id !== wordId),
        mastered: current.mastered.filter((id) => id !== wordId),
      };
    });
    setToast("已跳过这个单词，它不会再进入练习和复习池。");
  }, []);

  const restorePassed = useCallback((wordId) => {
    setProgress((current) => ({
      ...current,
      passed: current.passed.filter((id) => id !== wordId),
    }));
    setToast("已恢复到学习队列。");
  }, []);

  const submitCorrection = useCallback(
    async ({ wordId, category, message }) => {
      if (!workspace?.activeBookId) throw new Error("当前词书不可用");
      await api.submitCorrection({
        bookId: workspace.activeBookId,
        wordId,
        category,
        message,
      });
      setToast("纠错已发送给管理员。");
    },
    [workspace?.activeBookId],
  );

  const updateWord = useCallback(
    async (bookId, wordId, word) => {
      await api.updateWord(bookId, wordId, word);
      const data = await api.bootstrap(workspace?.activeBookId);
      setWorkspace({
        book: data.book,
        wordbooks: data.wordbooks,
        activeBookId: data.activeBookId,
      });
      setToast("词条已更新，用户重新加载后即可看到修订内容。");
    },
    [workspace?.activeBookId],
  );

  const speak = useCallback(
    (text) => {
      if (!("speechSynthesis" in window)) {
        setToast("当前浏览器不支持语音合成。");
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "ru-RU";
      utterance.rate = settings.speechRate;
      utterance.pitch = 1;
      const voices = window.speechSynthesis.getVoices();
      const russianVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith("ru"));
      if (russianVoice) utterance.voice = russianVoice;
      window.speechSynthesis.speak(utterance);
    },
    [settings.speechRate],
  );

  const answerWord = useCallback((wordId, result) => {
    if (result !== "again") return;
    const date = todayKey();
    setProgress((current) => {
      const previousMemory = getWordMemory(current, wordId);
      const nextMemory = markMistake(previousMemory);
      const mastered = new Set(current.mastered);
      const difficult = new Set(current.difficult);
      const wrongBook = new Set(current.wrongBook);

      mastered.delete(wordId);
      difficult.add(wordId);
      wrongBook.add(wordId);

      let streak = current.streak;
      if (current.lastStudyDate !== date) {
        streak =
          current.lastStudyDate === previousDateKey()
            ? current.streak + 1
            : current.streak;
      }

      return {
        ...current,
        mastered: Array.from(mastered),
        difficult: Array.from(difficult),
        wrongBook: Array.from(wrongBook),
        memory: { ...current.memory, [wordId]: nextMemory },
        totalReviews: current.totalReviews + 1,
        lastStudyDate: date,
        streak,
        history: [
          ...current.history,
          {
            date,
            wordId,
            result,
            kind: previousMemory.status === "new" ? "new" : "review",
            topic: wordMap.get(wordId)?.topic,
          },
        ].slice(-1500),
      };
    });
  }, [wordMap]);

  const login = useCallback(
    async (username, password) => {
      await api.login(username, password);
      setLoginMessage("");
      await loadWorkspace();
    },
    [loadWorkspace],
  );

  const register = useCallback(
    async (username, password, confirmPassword) => {
      await api.register(username, password, confirmPassword);
      setLoginMessage("");
      await loadWorkspace();
    },
    [loadWorkspace],
  );

  const logout = useCallback(async () => {
    sessionStorage.setItem("slovo-signed-out", "1");
    setUser(null);
    setWorkspace(null);
    setSettingsOpen(false);
    setPasswordOpen(false);
    setView("home");
    setLoginMessage("");
    const [saveResult, logoutResult] = await Promise.allSettled([
      workspace?.activeBookId
        ? api.saveProgress(workspace.activeBookId, progress)
        : Promise.resolve(),
      api.logout(),
    ]);
    if (saveResult.status === "rejected") {
      setToast("云端进度保存失败，下次登录会自动重新同步。");
    }
    if (logoutResult.status === "fulfilled") {
      sessionStorage.removeItem("slovo-signed-out");
    } else {
      setLoginMessage("已退出当前页面，请刷新以完成安全退出。");
    }
  }, [progress, workspace?.activeBookId]);

  const changeBook = useCallback(
    async (bookId) => {
      if (!bookId || bookId === workspace?.activeBookId) return;
      try {
        await api.saveProgress(workspace.activeBookId, progress);
        await loadWorkspace(bookId);
        setPracticeSetupOpen(true);
        setToast("词书已切换，请设置每天学习组数。");
      } catch (error) {
        setToast(error.message || "切换词书失败");
      }
    },
    [loadWorkspace, progress, workspace?.activeBookId],
  );

  const changePassword = useCallback(
    async (values) => {
      await api.changePassword(
        values.currentPassword,
        values.newPassword,
        values.confirmPassword,
      );
      setUser(null);
      setWorkspace(null);
      setPasswordOpen(false);
      setSettingsOpen(false);
      setLoginMessage("密码已修改，请使用新密码重新登录。");
    },
    [],
  );

  const createWordbook = useCallback(
    async (wordbook) => {
      const result = await api.createWordbook(wordbook);
      const data = await api.bootstrap(workspace.activeBookId);
      setWorkspace((current) => ({
        ...current,
        wordbooks: data.wordbooks,
      }));
      setToast(`词书《${result.book.title}》已发布。`);
      return result.book;
    },
    [workspace?.activeBookId],
  );

  const resetProgress = useCallback(() => {
    setProgress(freshProgress());
    setSettingsOpen(false);
    setToast("当前账号的学习进度已重置。");
  }, []);

  useEffect(() => {
    const handleGlobalShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        sessionStorage.setItem("slovo-focus-search", "1");
        setView("library");
      }
    };
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  if (authLoading) return <AuthLoading />;
  if (!user) {
    return (
      <LoginScreen
        onLogin={login}
        onRegister={register}
        message={loginMessage}
      />
    );
  }
  if (!workspace) return <AuthLoading />;

  const pageName = {
    home: "今日学习",
    study: "闪卡训练",
    library: "我的词库",
    favorites: "收藏夹",
    wrongbook: "错题本",
    review: "复习",
    reviewSession: "复习",
    progress: "学习记录",
    admin: "词书管理",
  }[view];

  return (
    <WordbookProvider book={book}>
      <div
        className={`app-shell ${
          view === "study" || view === "reviewSession" ? "is-immersive" : ""
        }`}
      >
        <Sidebar
          activeView={view === "reviewSession" ? "review" : view}
          onNavigate={navigate}
          onOpenSettings={openSettings}
          masteredCount={progress.mastered.length}
          totalWords={words.length}
          streak={progress.streak}
          reviewCount={reviewWords.length}
          user={user}
        />

        <main className="main-shell">
          <TopBar
            date={dateLabel()}
            pageName={pageName}
            onOpenSettings={openSettings}
            wordbooks={workspace.wordbooks}
            activeBookId={workspace.activeBookId}
            onBookChange={changeBook}
          />
          <div className="mobile-page-title">{pageName}</div>

          {view === "home" && todayWord ? (
            <Dashboard
              dailyCount={todayHistory.length}
              dailyGoal={progress.dailyGoal}
              groupSize={practiceConfig.size}
              groupsPerDay={practiceConfig.groupsPerDay || 1}
              activeQuiz={Boolean(progress.activeQuiz)}
              masteredCount={progress.mastered.length}
              totalWords={words.length}
              streak={progress.streak}
              dueCount={dueWords.length}
              todayNewCount={todayNewCount}
              todayReviewCount={todayReviewCount}
              newQuota={Math.max(
                0,
                progress.dailyGoal - todayNewCount - dueWords.length,
              )}
              word={todayWord}
              onStartStudy={startStudy}
              onOpenPracticeSetup={() =>
                progress.activeQuiz
                  ? startStudy()
                  : setPracticeSetupOpen(true)
              }
              onSpeak={speak}
              onOpenLibrary={() => setView("library")}
              onOpenWord={openWordDetail}
              recentWords={recentWords}
            />
          ) : null}

          {view === "study" ? (
            <QuizSession
              key={studySession.run}
              queue={studySession.queue}
              allWords={words}
              onAnswer={answerWord}
              spellingDifficulty={studySession.spellingDifficulty || "easy"}
              savedState={studySession.savedState}
              onSessionChange={saveActiveQuiz}
              onExit={() => setView("home")}
              onSpeak={speak}
              autoPlay={settings.autoPlay}
              onOpenWord={openWordDetail}
              onPassWord={(wordId) => passWord(wordId)}
              onQueueComplete={completePracticeGroup}
              onNextGroup={addNextPracticeGroup}
            />
          ) : null}

          {view === "library" ? (
            <WordBank
              words={words}
              progress={progress}
              onSpeak={speak}
              onOpenWord={openWordDetail}
              favoriteIds={favoriteIds}
              passedIds={passedIds}
              onToggleFavorite={toggleFavorite}
              onRestorePassed={restorePassed}
            />
          ) : null}

          {view === "favorites" ? (
            <FavoritesPage
              words={favoriteWords}
              onOpenWord={openWordDetail}
              onSpeak={speak}
              onRemoveFavorite={toggleFavorite}
            />
          ) : null}

          {view === "wrongbook" ? (
            <WrongBookPage
              words={wrongWords}
              progress={progress}
              onOpenWord={openWordDetail}
              onSpeak={speak}
            />
          ) : null}

          {view === "review" ? (
            <ReviewPage
              words={reviewWords}
              progress={progress}
              spellingDifficulty={reviewConfig.spellingDifficulty}
              onSpellingDifficultyChange={(spellingDifficulty) =>
                setReviewConfig({ spellingDifficulty })
              }
              onStartReview={startReview}
              onSpeak={speak}
            />
          ) : null}

          {view === "reviewSession" ? (
            <ReviewSession
              key={reviewSession.run}
              queue={reviewSession.queue}
              allWords={words}
              spellingDifficulty={reviewSession.spellingDifficulty}
              onExit={() => setView("review")}
              onComplete={completeReview}
              onSpeak={speak}
              onOpenWord={openWordDetail}
            />
          ) : null}

          {view === "progress" ? (
            <ProgressPage
              progress={progress}
              totalWords={words.length}
              words={words}
              dueCount={dueWords.length}
              difficultWords={difficultWords}
              onSpeak={speak}
              onStartStudy={() => setPracticeSetupOpen(true)}
            />
          ) : null}

          {view === "admin" && user.role === "admin" ? (
            <AdminPage
              user={user}
              wordbooks={workspace.wordbooks}
              onCreateWordbook={createWordbook}
              onUpdateWord={updateWord}
              onListCorrections={api.listCorrections}
              onResolveCorrection={(id, status) =>
                api.resolveCorrection(id, status)
              }
              onListUsers={api.listUsers}
              onSetUserFrozen={api.setUserFrozen}
            />
          ) : null}
        </main>

        <SettingsDrawer
          open={settingsOpen}
          settings={settings}
          user={user}
          onChange={(change) =>
            setSettings((current) => ({ ...current, ...change }))
          }
          onClose={() => setSettingsOpen(false)}
          onTestVoice={() => speak("Путешествие")}
          onReset={resetProgress}
          onChangePassword={() => {
            setSettingsOpen(false);
            setPasswordOpen(true);
          }}
          onLogout={logout}
          cloudSyncedAt={cloudSyncedAt}
          onSyncNow={syncNow}
        />

        <WordDetailDrawer
          word={detailWord}
          open={Boolean(detailWord)}
          onClose={() => setDetailWord(null)}
          onSpeak={speak}
          favorite={detailWord ? favoriteIds.has(detailWord.id) : false}
          onToggleFavorite={() => {
            if (detailWord) toggleFavorite(detailWord.id);
          }}
          onSubmitCorrection={submitCorrection}
        />

        <PracticeSetupModal
          open={practiceSetupOpen}
          config={practiceConfig}
          totalWords={words.length}
          learnedCount={learnedCount}
          onStart={handlePracticeSetup}
          onClose={() => setPracticeSetupOpen(false)}
        />

        <PasswordChangeModal
          open={passwordOpen}
          onClose={() => setPasswordOpen(false)}
          onSubmit={changePassword}
        />

        <div className={`toast ${toast ? "visible" : ""}`} role="status" aria-live="polite">
          {toast}
        </div>
      </div>
    </WordbookProvider>
  );
}

export default App;
