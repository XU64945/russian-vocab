import { ArrowRight, BookOpen, Gauge, ListChecks, X } from "lucide-react";

const groupSizes = [5, 10, 15, 20];

export const difficultyOptions = [
  {
    id: "beginner",
    title: "核心入门",
    range: "本册前 1/3",
    description: "从本册最前面的基础词开始，先稳固句法和常用搭配。",
    color: "#2f5f50",
    soft: "#dce9e3",
  },
  {
    id: "intermediate",
    title: "高频进阶",
    range: "本册中段",
    description: "进入本册中间部分，增加词义辨析和语境使用。",
    color: "#596b8c",
    soft: "#e1e5ee",
  },
  {
    id: "advanced",
    title: "综合挑战",
    range: "本册后 1/3",
    description: "练习本册靠后的进阶词，强化长句和抽象表达。",
    color: "#8a5a72",
    soft: "#f0dfe7",
  },
];

export function getDifficultyWords(words, difficulty) {
  const firstBreak = Math.floor(words.length / 3);
  const secondBreak = Math.floor((words.length * 2) / 3);
  if (difficulty === "advanced") return words.slice(secondBreak);
  if (difficulty === "intermediate") return words.slice(firstBreak, secondBreak);
  return words.slice(0, firstBreak);
}

export function PracticeSetupModal({ open, config, onStart, onClose }) {
  return (
    <div className={`practice-setup-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button
        className="practice-setup-scrim"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="关闭练习设置"
      />
      <section
        className="practice-setup-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-setup-title"
      >
        <header>
          <div>
            <span className="eyebrow-text dark">НОВАЯ ГРУППА</span>
            <h2 id="practice-setup-title">安排这一组练习</h2>
            <p>每组完成三轮后会自动加入复习池。</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭练习设置">
            <X size={19} />
          </button>
        </header>

        <div className="setup-section">
          <div className="setup-label">
            <ListChecks size={17} />
            <span>本组词数</span>
          </div>
          <div className="size-options">
            {groupSizes.map((size) => (
              <button
                className={config.size === size ? "active" : ""}
                key={size}
                onClick={() => onStart({ ...config, size, commitOnly: true })}
              >
                <strong>{size}</strong>
                <span>个词</span>
              </button>
            ))}
          </div>
        </div>

        <div className="setup-section">
          <div className="setup-label">
            <Gauge size={17} />
            <span>单词难度</span>
          </div>
          <div className="difficulty-options">
            {difficultyOptions.map((option) => (
              <button
                className={config.difficulty === option.id ? "active" : ""}
                key={option.id}
                onClick={() =>
                  onStart({
                    ...config,
                    difficulty: option.id,
                    commitOnly: true,
                  })
                }
                style={{ "--difficulty-color": option.color, "--difficulty-soft": option.soft }}
              >
                <span className="difficulty-dot" />
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.range}</small>
                  <p>{option.description}</p>
                </span>
              </button>
            ))}
          </div>
        </div>

        <footer>
          <span>本组将练习 {config.size} 个词</span>
          <button className="primary-button" onClick={() => onStart(config)}>
            <BookOpen size={17} />
            开始本组练习
            <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </div>
  );
}
