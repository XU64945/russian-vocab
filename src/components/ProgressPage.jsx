import { useMemo } from "react";
import {
  ArrowUpRight,
  CalendarClock,
  CalendarDays,
  Check,
  Flame,
  Gauge,
  Layers3,
  RotateCcw,
  Target,
  Volume2,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";

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
}) {
  const { topicMap, topics } = useWordbook();
  const weekDays = useMemo(() => getWeekDays(progress.history), [progress.history]);
  const maxWeekCount = Math.max(8, ...weekDays.map((day) => day.count));
  const masteredSet = useMemo(() => new Set(progress.mastered), [progress.mastered]);
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
          <h1>每一次回忆，都算数。</h1>
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
            <strong className="progress-big-number">{completion}%</strong>
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
          <strong>{progress.streak}</strong>
          <small>天</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon green">
            <Check size={19} />
          </span>
          <span>已掌握</span>
          <strong>{progress.mastered.length}</strong>
          <small>个词</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon amber">
            <CalendarClock size={19} />
          </span>
          <span>到期复习</span>
          <strong>{dueCount}</strong>
          <small>个词</small>
        </article>
        <article className="metric-card">
          <span className="metric-icon">
            <RotateCcw size={19} />
          </span>
          <span>总复习次数</span>
          <strong>{progress.totalReviews}</strong>
          <small>次</small>
        </article>
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

      <section className="srs-band">
        <div className="srs-band-heading">
          <div>
            <span className="eyebrow-text">АДАПТИВНЫЙ ИНТЕРВАЛ</span>
            <h2>在遗忘临界点推送</h2>
            <p>不按固定日历；每个词根据你的回答独立调整下一次出现的时间。</p>
          </div>
          <span className="srs-live">
            <span />
            动态计算中
          </span>
        </div>

        <div className="srs-steps">
          <article>
            <span className="srs-step-icon">
              <CalendarClock size={19} />
            </span>
            <div>
              <small>01 · ОЧЕРЕДЬ</small>
              <h3>到期复习优先</h3>
              <p>每日任务先加载已到期的词；复习清完，才放出当天的新词额度。</p>
            </div>
          </article>
          <article>
            <span className="srs-step-icon">
              <Gauge size={19} />
            </span>
            <div>
              <small>02 · ИНТЕРВАЛ</small>
              <h3>答对后拉长</h3>
              <p>连续答对会逐步延长间隔；形成长期记忆后进入“已掌握”。</p>
            </div>
          </article>
          <article>
            <span className="srs-step-icon">
              <Layers3 size={19} />
            </span>
            <div>
              <small>03 · ВОЗВРАТ</small>
              <h3>答错后回补</h3>
              <p>薄弱词缩短间隔、优先插队；错得越多，在本轮和队列中出现得越频繁。</p>
            </div>
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
    </div>
  );
}
