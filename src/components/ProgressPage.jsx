import { useMemo } from "react";
import {
  ArrowUpRight,
  BookMarked,
  CalendarClock,
  CalendarDays,
  Check,
  Flame,
  Info,
  RotateCcw,
  Target,
  Volume2,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import { getWordMemory } from "../lib/srs";
import { todayKey } from "../lib/storage";
import { AnimatedNumber } from "./ui/AnimatedNumber";

function getWeekDays(history) {
  const formatter = new Intl.DateTimeFormat("zh-CN", { weekday: "short" });
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate(),
    ).padStart(2, "0")}`;
    return {
      key,
      label: formatter.format(date).replace("周", ""),
      count: history.filter((item) => item.date === key).length,
      today: index === 6,
    };
  });
}

export function ProgressPage({
  progress,
  totalWords,
  words,
  dueCount,
  difficultWords,
  onSpeak,
  onStartStudy,
  onOpenWord,
}) {
  const { topicMap, topics } = useWordbook();
  const weekDays = useMemo(() => getWeekDays(progress.history), [progress.history]);
  const maxWeekCount = Math.max(8, ...weekDays.map((day) => day.count));
  const masteredSet = useMemo(() => new Set(progress.mastered), [progress.mastered]);
  const wordMap = useMemo(
    () => new Map(words.map((word) => [word.id, word])),
    [words],
  );
  const currentDateKey = todayKey();
  const todayLearnedWords = useMemo(() => {
    const groups = new Map();
    for (const entry of progress.history) {
      if (entry.date !== currentDateKey) continue;
      const word = wordMap.get(entry.wordId);
      if (!word) continue;
      const current = groups.get(entry.wordId) || {
        word,
        attempts: 0,
        hadMistake: false,
        kind: entry.kind || "review",
      };
      current.attempts += 1;
      current.hadMistake ||= entry.result === "again";
      if (entry.kind === "new") current.kind = "new";
      groups.set(entry.wordId, current);
    }
    return Array.from(groups.values());
  }, [currentDateKey, progress.history, wordMap]);
  const masteredWords = useMemo(
    () =>
      progress.mastered
        .map((wordId) => {
          const word = wordMap.get(wordId);
          if (!word) return null;
          return {
            word,
            memory: getWordMemory(progress, wordId),
          };
        })
        .filter(Boolean)
        .sort(
          (left, right) =>
            Number(right.memory.lastReviewedAt || 0) -
              Number(left.memory.lastReviewedAt || 0) ||
            left.word.number - right.word.number,
        ),
    [progress, wordMap],
  );
  const topicTotals = useMemo(
    () =>
      Object.fromEntries(
        topics.map((topic) => [
          topic.id,
          words.filter((word) => word.topic === topic.id).length,
        ]),
      ),
    [words],
  );
  const completion = Math.round((progress.mastered.length / totalWords) * 100);

  return (
    <div className="page progress-page">
      <section className="page-intro progress-intro">
        <div>
          <p className="intro-ru">ПРОГРЕСС</p>
          <h1>每一次回忆，都算数</h1>
          <p className="intro-subtitle">这里记录你真正练过的词，而不是看起来很漂亮的数字。</p>
        </div>
        <button className="primary-button" onClick={onStartStudy}>
          继续训练
          <ArrowUpRight size={18} />
        </button>
      </section>

      <section className="progress-summary-grid">
        <article className="progress-hero">
          <div className="progress-hero-copy">
            <span className="eyebrow-text">ОБЩИЙ ПРОГРЕСС</span>
            <strong className="progress-big-number">
              <AnimatedNumber value={completion} suffix="%" />
            </strong>
            <p>
              已掌握 {progress.mastered.length} / {totalWords} 个词。下一小步比一次学很多更重要。
            </p>
          </div>
          <div className="progress-letter" aria-hidden="true">
            Я
          </div>
          <div className="progress-hero-bar">
            <span style={{ width: `${completion}%` }} />
          </div>
        </article>

        <article className="metric-card">
          <span className="metric-icon">
            <Flame size={19} />
          </span>
          <span>连续学习</span>
          <strong><AnimatedNumber value={progress.streak} /></strong>
          <small>天</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <Check size={19} />
          </span>
          <span>已掌握</span>
          <strong><AnimatedNumber value={progress.mastered.length} /></strong>
          <small>个词</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon amber">
            <CalendarClock size={19} />
          </span>
          <span>到期复习</span>
          <strong><AnimatedNumber value={dueCount} /></strong>
          <small>个词</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <RotateCcw size={19} />
          </span>
          <span>总复习次数</span>
          <strong><AnimatedNumber value={progress.totalReviews} /></strong>
          <small>次</small>
        </article>
      </section>

      <section className="word-ledger-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow-text dark">СЛОВА · ИСТОРИЯ</span>
            <h2>学习清单</h2>
            <p>今天实际接触过的词，以及当前学习计划开始以来已经掌握的词。</p>
          </div>
        </div>

        <div className="word-ledger-grid">
          <article className="word-ledger-card">
            <header>
              <div>
                <span className="ledger-icon">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <small>СЕГОДНЯ</small>
                  <h3>今天学了什么</h3>
                </div>
              </div>
              <strong><AnimatedNumber value={todayLearnedWords.length} /></strong>
            </header>

            {todayLearnedWords.length ? (
              <div className="ledger-list">
                {todayLearnedWords.map(({ word, attempts, hadMistake, kind }) => {
                  const memory = getWordMemory(progress, word.id);
                  const topic = topicMap[word.topic];
                  const statusLabel =
                    memory.status === "mastered"
                      ? "已掌握"
                      : hadMistake
                        ? "需巩固"
                        : kind === "new"
                          ? "今日新学"
                          : "今日复习";
                  return (
                    <article className="ledger-word" key={word.id}>
                      <button
                        className="ledger-word-main"
                        onClick={() => onOpenWord(word)}
                      >
                        <span className="ledger-letter">
                          {word.ru.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{word.ru}</strong>
                          <small>{word.zh}</small>
                        </span>
                      </button>
                      <span className={`ledger-status ${hadMistake ? "attention" : kind}`}>
                        {statusLabel}
                      </span>
                      <span className="ledger-topic">{topic?.label}</span>
                      <small className="ledger-count">{attempts} 次</small>
                      <button
                        className="ledger-sound"
                        onClick={() => onSpeak(word.ru)}
                        aria-label={`朗读 ${word.ru}`}
                      >
                        <Volume2 size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ledger-empty">
                <BookMarked size={22} />
                <p>今天还没有学习记录。完成一组练习或复习后，词会出现在这里。</p>
              </div>
            )}
          </article>

          <article className="word-ledger-card mastered-ledger">
            <header>
              <div>
                <span className="ledger-icon">
                  <Check size={18} />
                </span>
                <div>
                  <small>ЗА ПЛАН</small>
                  <h3>学习计划内已掌握</h3>
                </div>
              </div>
              <strong><AnimatedNumber value={masteredWords.length} /></strong>
            </header>

            {masteredWords.length ? (
              <div className="ledger-list">
                {masteredWords.map(({ word, memory }) => {
                  const topic = topicMap[word.topic];
                  const masteredAt = memory.lastReviewedAt
                    ? new Intl.DateTimeFormat("zh-CN", {
                        month: "numeric",
                        day: "numeric",
                      }).format(new Date(memory.lastReviewedAt))
                    : null;
                  return (
                    <article className="ledger-word mastered" key={word.id}>
                      <button
                        className="ledger-word-main"
                        onClick={() => onOpenWord(word)}
                      >
                        <span className="ledger-letter">
                          {word.ru.slice(0, 1).toUpperCase()}
                        </span>
                        <span>
                          <strong>{word.ru}</strong>
                          <small>{word.zh}</small>
                        </span>
                      </button>
                      <span className="ledger-status mastered">已掌握</span>
                      <span className="ledger-topic">{topic?.label}</span>
                      <small className="ledger-count">
                        {masteredAt ? `掌握于 ${masteredAt}` : "已掌握"}
                      </small>
                      <button
                        className="ledger-sound"
                        onClick={() => onSpeak(word.ru)}
                        aria-label={`朗读 ${word.ru}`}
                      >
                        <Volume2 size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="ledger-empty">
                <Check size={22} />
                <p>当前学习计划还没有已掌握词。完成三轮练习并通过两次复习后会进入这里。</p>
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="difficult-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow-text dark">ПОВТОРИТЬ</span>
            <h2>值得再看一眼的词</h2>
          </div>
          <button className="text-button" onClick={() => onStartStudy("difficult")}>
            复习这些词
            <ArrowUpRight size={16} />
          </button>
        </div>

        <aside className="module-annotation difficult-explainer">
          <Info size={17} />
          <div>
            <strong>这里不是完整复习池</strong>
            <p>
              这里只集中答错或标记不熟的薄弱词。“复习这些词”会进行三轮强化练习，而复习模块使用独立的词义与拼写两轮流程。
            </p>
          </div>
        </aside>

        {difficultWords.length ? (
          <div className="difficult-grid">
            {difficultWords.slice(0, 6).map((word) => (
              <article className="difficult-word" key={word.id}>
                <button onClick={() => onSpeak(word.ru)} aria-label={`朗读 ${word.ru}`}>
                  <Volume2 size={17} />
                </button>
                <div>
                  <strong>{word.ru}</strong>
                  <span>{word.zh}</span>
                </div>
                <small>{topicMap[word.topic]?.label}</small>
              </article>
            ))}
          </div>
        ) : (
          <div className="difficult-empty">
            <Check size={20} />
            <p>还没有标记“不熟”的单词。训练时点一下“还不熟”，它就会出现在这里。</p>
          </div>
        )}
      </section>

      <section className="progress-lower-grid">
        <article className="weekly-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow-text dark">7 ДНЕЙ</span>
              <h2>本周学习节奏</h2>
            </div>
            <span className="calendar-chip">
              <CalendarDays size={16} />
              近 7 天
            </span>
          </div>

          <div className="week-chart">
            {weekDays.map((day) => (
              <div className={`week-day ${day.today ? "today" : ""}`} key={day.key}>
                <span className="week-count">{day.count > 0 ? day.count : ""}</span>
                <div className="week-bar-track">
                  <span style={{ height: `${Math.max(8, (day.count / maxWeekCount) * 100)}%` }} />
                </div>
                <small>{day.label}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="topic-progress-card">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow-text dark">ПО ТЕМАМ</span>
              <h2>单元掌握度</h2>
            </div>
            <Target size={20} />
          </div>

          <div className="topic-progress-list">
            {topics.map((topic) => {
              const unique = words.filter(
                (word) => word.topic === topic.id && masteredSet.has(word.id),
              ).length;
              const percent = topicTotals[topic.id]
                ? Math.round((unique / topicTotals[topic.id]) * 100)
                : 0;
              return (
                <div className="topic-progress-row" key={topic.id}>
                  <div>
                    <span className="filter-topic-dot" style={{ background: topic.color }} />
                    <strong>{topic.label}</strong>
                  </div>
                  <span className="topic-mini-track">
                    <i style={{ width: `${percent}%`, background: topic.color }} />
                  </span>
                  <span>{percent}%</span>
                </div>
              );
            })}
          </div>
        </article>
      </section>

    </div>
  );
}
