import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Headphones,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";

function ProgressRing({ value }) {
  return (
    <div className="progress-ring" style={{ "--progress": `${value * 3.6}deg` }}>
      <div className="progress-ring-inner">
        <strong>{value}%</strong>
        <span>今日</span>
      </div>
    </div>
  );
}

export function Dashboard({
  dailyCount,
  dailyGoal,
  groupSize,
  groupsPerDay,
  activeQuiz,
  masteredCount,
  totalWords,
  streak,
  dueCount,
  todayNewCount,
  todayReviewCount,
  newQuota,
  word,
  onStartStudy,
  onOpenPracticeSetup,
  onSpeak,
  onOpenLibrary,
  onOpenWord,
  recentWords,
}) {
  const { topicMap, topics } = useWordbook();
  const dailyPercent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));
  const topic = topicMap[word.topic];
  const example = word.examples[0];

  return (
    <div className="page home-page">
      <section className="page-intro">
        <div>
          <p className="intro-ru">Доброе утро</p>
          <h1>
            {activeQuiz
              ? "继续上次未完成的练习。"
              : `今天计划 ${groupsPerDay} 组，共 ${groupSize * groupsPerDay} 个俄语词。`}
          </h1>
          <p className="intro-subtitle">
            {activeQuiz
              ? "学习位置已经保存，会从上次离开的轮次和题目继续。"
              : "一组短练习，一点声音记忆。先完成今天的小目标，再去做别的。"}
          </p>
        </div>
        <button className="primary-button intro-cta" onClick={onOpenPracticeSetup}>
          <span>{activeQuiz ? "继续上次练习" : "开始今日训练"}</span>
          <ArrowUpRight size={18} strokeWidth={1.9} />
        </button>
      </section>

      <section className="dashboard-top">
        <article className="word-focus-card">
          <div className="word-card-header">
            <div>
              <span className="eyebrow-text">СЛОВО ДНЯ</span>
              <span className="word-level">{word.level}</span>
            </div>
            <button className="round-audio-button light" onClick={() => onSpeak(word.ru)}>
              <Volume2 size={20} strokeWidth={1.8} />
              <span>听发音</span>
            </button>
          </div>

          <div className="word-focus-body">
            <span className="ghost-letter" aria-hidden="true">
              П
            </span>
            <div className="word-pronunciation">{word.transliteration}</div>
            <h2>{word.ru}</h2>
            <p className="word-translation">{word.zh}</p>
          </div>

          <blockquote className="example-quote">
            <p>{example.ru}</p>
            <footer>{example.zh}</footer>
          </blockquote>

          <div className="word-focus-footer">
            <div className="word-tags">
              <span style={{ background: topic.soft, color: topic.color }}>{topic.label}</span>
              <span>{word.pos}</span>
            </div>
            <div className="word-focus-actions">
              <button className="text-button" onClick={() => onOpenWord(word)}>
                完整词条
                <BookOpen size={16} />
              </button>
            </div>
          </div>
        </article>

        <aside className="goal-card">
          <div className="goal-card-heading">
            <div>
              <span className="eyebrow-text dark">СЕГОДНЯ</span>
              <h2>今日节奏</h2>
            </div>
            <span className="streak-number">{streak}</span>
          </div>

          <div className="goal-ring-row">
            <ProgressRing value={dailyPercent} />
            <div className="goal-copy">
              <strong>
                {dailyCount} <span>/ {dailyGoal} 词</span>
              </strong>
              <p>
                {dailyPercent >= 100
                  ? "今日目标完成，保持这个手感。"
                  : dueCount > 0
                    ? `先清 ${dueCount} 个到期复习，再解锁新词。`
                    : `复习已排完，今天还可以加入 ${newQuota} 个新词。`}
              </p>
            </div>
          </div>

          <div className="goal-stats">
            <div>
              <span>到期复习</span>
              <strong>{dueCount}</strong>
              <small>个词</small>
            </div>
            <div>
              <span>已掌握</span>
              <strong>{masteredCount}</strong>
              <small>/ {totalWords}</small>
            </div>
          </div>

          <div className="goal-queue-line">
            <span>今日已完成</span>
            <strong>{todayReviewCount} 次复习 · {todayNewCount} 个新词</strong>
          </div>

          <button className="goal-action" onClick={onOpenPracticeSetup}>
            <Headphones size={18} />
            专注练习 5 分钟
          </button>
        </aside>
      </section>

      <section className="section-block topic-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow-text dark">СЦЕНАРИИ</span>
            <h2>按单元学</h2>
          </div>
          <button className="text-button" onClick={onOpenLibrary}>
            全部词库
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="topic-strip">
          {topics.map((topicItem, index) => (
            <button
              className={`topic-tile ${index === 0 ? "featured" : ""}`}
              key={topicItem.id}
              onClick={() => onStartStudy(topicItem.id)}
              style={{
                "--topic-color": topicItem.color,
                "--topic-soft": topicItem.soft,
              }}
            >
              <span className="topic-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="topic-ru">{topicItem.ru}</span>
              <span className="topic-label">{topicItem.label}</span>
              <span className="topic-arrow">
                <ArrowUpRight size={18} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="dashboard-bottom">
        <div className="recent-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow-text dark">НЕДАВНО</span>
              <h2>最近学习</h2>
            </div>
            <button className="icon-button" onClick={onOpenLibrary} aria-label="打开完整词库">
              <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="recent-list">
            {recentWords.map((recentWord) => (
              <button
                className="recent-word"
                key={recentWord.id}
                onClick={() => onOpenWord(recentWord)}
              >
                <span className="recent-word-letter">{recentWord.ru.slice(0, 1).toUpperCase()}</span>
                <span className="recent-word-copy">
                  <strong>{recentWord.ru}</strong>
                  <small>{recentWord.zh}</small>
                </span>
                <span className="recent-word-topic">{topicMap[recentWord.topic].label}</span>
                <Volume2
                  size={17}
                  className="recent-speak"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSpeak(recentWord.ru);
                  }}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="method-panel">
          <Sparkles size={22} strokeWidth={1.6} />
          <div>
            <span className="eyebrow-text dark">АЛГОРИТМ</span>
            <h2>根据记忆状态安排。</h2>
            <p>
              到期复习先出现；错词每隔三词穿插一次，未完成的轮次和题目会自动保存到账号。
            </p>
          </div>
          <div className="method-icons" aria-hidden="true">
            <span>
              <Volume2 size={18} />
            </span>
            <span>
              <BookOpen size={18} />
            </span>
            <span>
              <RotateCcw size={18} />
            </span>
          </div>
          <button className="method-button" onClick={onOpenPracticeSetup}>
            <Play size={16} fill="currentColor" />
            开始 5 分钟练习
          </button>
        </div>
      </section>
    </div>
  );
}
