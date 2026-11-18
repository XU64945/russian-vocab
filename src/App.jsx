import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminPage } from "./components/AdminPage";
import { Dashboard } from "./components/Dashboard";
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
    learningCursors: {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    },
  };
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
  const [detailWord, setDetailWord] = useState(null);
  const [practiceSetupOpen, setPracticeSetupOpen] = useState(false);
  const [practiceConfig, setPracticeConfig] = useState({
    size: 10,
    difficulty: "beginner",
  });
  const [studySession, setStudySession] = useState({
    mode: "practice",
    topic: null,
    queue: [],
    run: 0,
    size: 10,
    difficulty: "beginner",
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
    setProgress({
      ...freshProgress(),
      ...data.progress,
    });
    setView("home");
    setStudySession((current) => ({ ...current, queue: [] }));
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
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
        .catch((error) => setToast(error.message || "进度保存失败"));
    }, 450);
    return () => window.clearTimeout(timeout);
  }, [progress, user, workspace?.activeBookId]);

  const difficultIds = useMemo(
    () => new Set(progress.difficult),
    [progress.difficult],
  );
  const currentDateKey = useMemo(() => todayKey(), [now]);
  const todayHistory = useMemo(
    () => progress.history.filter((entry) => entry.date === currentDateKey),
    [currentDateKey, progress.history],
  );
  const todayNewCount = todayHistory.filter((entry) => entry.kind === "new").length;
  const todayReviewCount = todayHistory.filter((entry) => entry.kind === "review").length;
  const dueWords = useMemo(
    () => getDueWords(words, progress, now),
    [now, progress, words],
  );
  const todayWord =
    dueWords[0] ||
    words.find((word) => getWordStatus(progress, word.id) === "new") ||
    words[0];
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
    () => words.filter((word) => difficultIds.has(word.id)),
    [difficultIds, words],
  );
  const reviewWords = useMemo(
    () =>
      progress.reviewPool
        .map((wordId) => wordMap.get(wordId))
        .filter(Boolean),
    [progress.reviewPool, wordMap],
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
        const difficultQueue = words.filter((word) => difficultIds.has(word.id));
        if (difficultQueue.length) return difficultQueue;
      }

      const excluded = new Set([...excludeIds, ...progress.reviewPool]);
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
      return [
        ...dueInScope,
        ...orderedCandidates.filter((word) => !dueIds.has(word.id)),
      ].slice(0, size);
    },
    [difficultIds, dueWords, progress, words],
  );

  const startStudy = useCallback(
    (topic = null, seedWord = null) => {
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
      }));
      setView("study");
    },
    [buildPracticeQueue, practiceConfig, progress.reviewPool],
  );

  const handlePracticeSetup = useCallback(
    (nextConfig) => {
      const normalized = {
        size: nextConfig.size,
        difficulty: nextConfig.difficulty,
      };
      setPracticeConfig(normalized);
      if (nextConfig.commitOnly) return;

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
      }));
      setView("study");
    },
    [buildPracticeQueue, progress.reviewPool],
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
    }));
    setView("study");
  }, [buildPracticeQueue, progress.reviewPool, studySession]);

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

  const completeReview = useCallback((reviewedIds) => {
    const reviewed = new Set(reviewedIds);
    setProgress((current) => ({
      ...current,
      reviewPool: current.reviewPool.filter((wordId) => !reviewed.has(wordId)),
    }));
    setView("review");
    setToast("两轮复习完成，这批词已重新安排间隔。");
  }, []);

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
    const date = todayKey();
    setProgress((current) => {
      const previousMemory = getWordMemory(current, wordId);
      const nextMemory = applyReview(previousMemory, result);
      const mastered = new Set(current.mastered);
      const difficult = new Set(current.difficult);

      if (nextMemory.status === "mastered") {
        mastered.add(wordId);
      } else if (result === "again") {
        mastered.delete(wordId);
      }
      if (result === "known" && nextMemory.correctStreak >= 2) {
        difficult.delete(wordId);
      } else if (result === "again") {
        difficult.add(wordId);
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
        mastered: Array.from(mastered),
        difficult: Array.from(difficult),
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

  const logout = useCallback(async () => {
    try {
      if (workspace?.activeBookId) {
        await api.saveProgress(workspace.activeBookId, progress);
      }
      await api.logout();
    } finally {
      setUser(null);
      setWorkspace(null);
      setSettingsOpen(false);
      setPasswordOpen(false);
      setView("home");
      setLoginMessage("");
    }
  }, [progress, workspace?.activeBookId]);

  const changeBook = useCallback(
    async (bookId) => {
      if (!bookId || bookId === workspace?.activeBookId) return;
      try {
        await api.saveProgress(workspace.activeBookId, progress);
        await loadWorkspace(bookId);
        setToast("已切换词书。");
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
        setView("library");
      }
    };
    window.addEventListener("keydown", handleGlobalShortcut);
    return () => window.removeEventListener("keydown", handleGlobalShortcut);
  }, []);

  if (authLoading) return <AuthLoading />;
  if (!user) return <LoginScreen onLogin={login} message={loginMessage} />;
  if (!workspace) return <AuthLoading />;

  const pageName = {
    home: "今日学习",
    study: "闪卡训练",
    library: "我的词库",
    review: "复习",
    reviewSession: "复习",
    progress: "学习记录",
    admin: "词书管理",
  }[view];

  return (
    <WordbookProvider book={book}>
      <div className="app-shell">
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
              onOpenPracticeSetup={() => setPracticeSetupOpen(true)}
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
              onExit={() => setView("home")}
              onSpeak={speak}
              autoPlay={settings.autoPlay}
              onOpenWord={openWordDetail}
              onQueueComplete={() => {
                setProgress((current) => {
                  const existing = new Set(current.reviewPool);
                  const additions = studySession.queue
                    .map((word) => word.id)
                    .filter((wordId) => !existing.has(wordId));
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
                  return {
                    ...current,
                    reviewPool: [...current.reviewPool, ...additions],
                    learningCursors,
                  };
                });
                const topicName =
                  studySession.topic === "difficult"
                    ? "需复习词组"
                    : topicMap[studySession.topic]?.label;
                setToast(
                  topicName
                    ? `${topicName}已完成，并加入复习池。`
                    : `本组 ${studySession.queue.length} 个词已加入复习池。`,
                );
              }}
              onNextGroup={addNextPracticeGroup}
            />
          ) : null}

          {view === "library" ? (
            <WordBank
              words={words}
              progress={progress}
              onSpeak={speak}
              onOpenWord={openWordDetail}
              onStudyWord={(word) => startStudy(null, word)}
            />
          ) : null}

          {view === "review" ? (
            <ReviewPage
              words={reviewWords}
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
              onAnswer={answerWord}
              onExit={() => setView("review")}
              onComplete={completeReview}
              onSpeak={speak}
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
        />

        <WordDetailDrawer
          word={detailWord}
          open={Boolean(detailWord)}
          onClose={() => setDetailWord(null)}
          onSpeak={speak}
          onStudy={(word) => startStudy(word.topic, word)}
        />

        <PracticeSetupModal
          open={practiceSetupOpen}
          config={practiceConfig}
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
