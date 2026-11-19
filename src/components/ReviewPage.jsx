import {
  ArrowRight,
  AudioLines,
  Brain,
  Check,
  Layers3,
  PenLine,
  Sparkles,
  Volume2,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import { getWordMemory } from "../lib/srs";

export function ReviewPage({
  words,
  progress,
  spellingDifficulty,
  onSpellingDifficultyChange,
  onStartReview,
  onSpeak,
}) {
  const { topicMap } = useWordbook();
  return (
    <div className="page review-page">
      <section className="page-intro review-intro">
        <div>
          <p className="intro-ru">ПОВТОРЕНИЕ</p>
          <h1>练习过的词，会在这里再见。</h1>
          <p className="intro-subtitle">
            新词完成三轮后会按 1、2、4、15 天节点推送复习。每次复习包含词义与拼写两轮。
          </p>
        </div>
        <div className="review-count-card">
          <strong>{words.length}</strong>
          <span>个词等待复习</span>
        </div>
      </section>

      {words.length ? (
        <>
          <section className="review-start-panel">
            <div className="review-mode-copy">
              <span className="eyebrow-text dark">СЛОЖНОСТЬ ПИСЬМА</span>
              <h2>选择拼写难度</h2>
              <p>普通模式混合正确字母与 4 个同样式干扰字母；困难模式使用完整俄语键盘。</p>
            </div>
            <div className="spelling-mode-options">
              <button
                className={spellingDifficulty === "easy" ? "active" : ""}
                onClick={() => onSpellingDifficultyChange("easy")}
              >
                <span>
                  <PenLine size={18} />
                </span>
                <div>
                  <strong>普通模式</strong>
                  <small>正确字母加 4 个同样式干扰字母</small>
                </div>
                {spellingDifficulty === "easy" ? <Check size={17} /> : null}
              </button>
              <button
                className={spellingDifficulty === "hard" ? "active" : ""}
                onClick={() => onSpellingDifficultyChange("hard")}
              >
                <span>
                  <Sparkles size={18} />
                </span>
                <div>
                  <strong>困难模式</strong>
                  <small>使用完整俄语键盘输入</small>
                </div>
                {spellingDifficulty === "hard" ? <Check size={17} /> : null}
              </button>
            </div>
            <button className="primary-button review-start-button" onClick={onStartReview}>
              <Brain size={17} />
              开始两轮复习
              <ArrowRight size={16} />
            </button>
          </section>

          <section className="review-word-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow-text dark">В ОЧЕРЕДИ</span>
                <h2>复习池</h2>
              </div>
              <span className="review-pool-note">
                <Layers3 size={15} />
                完成后按复习结果重新安排间隔
              </span>
            </div>
            <div className="review-word-grid">
              {words.map((word) => {
                const topic = topicMap[word.topic];
                const memory = getWordMemory(progress, word.id);
                const due = memory.dueAt
                  ? new Intl.DateTimeFormat("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                    }).format(new Date(memory.dueAt))
                  : "待安排";
                return (
                  <article className="review-word-card" key={word.id}>
                    <button onClick={() => onSpeak(word.ru)} aria-label={`朗读 ${word.ru}`}>
                      <Volume2 size={17} />
                    </button>
                    <div>
                      <strong>{word.ru}</strong>
                      <span>{word.zh}</span>
                    </div>
                    <small style={{ background: topic.soft, color: topic.color }}>
                      {topic.label}
                    </small>
                    <em>下次 {due}</em>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : (
        <section className="review-empty">
          <span>
            <AudioLines size={29} />
          </span>
          <h2>复习池还是空的</h2>
          <p>先完成一组三轮练习，整组单词会自动归类到这里。</p>
        </section>
      )}
    </div>
  );
}
