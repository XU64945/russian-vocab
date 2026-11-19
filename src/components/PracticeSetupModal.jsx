import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  Gauge,
  Keyboard,
  ListChecks,
  PenLine,
  X,
} from "lucide-react";

const groupSizes = [5, 10, 15, 20];

export const difficultyOptions = [
  {
    id: "beginner",
    title: "核心入门",
    range: "本册前 1/3",
    description: "从本册最前面的基础词开始，先稳固句法和常用搭配。",
    color: "#1d5fae",
    soft: "#e3efff",
  },
  {
    id: "intermediate",
    title: "高频进阶",
    range: "本册中段",
    description: "进入本册中间部分，增加词义辨析和语境使用。",
    color: "#315d94",
    soft: "#e8f1fb",
  },
  {
    id: "advanced",
    title: "综合挑战",
    range: "本册后 1/3",
    description: "练习本册靠后的进阶词，强化长句和抽象表达。",
    color: "#173f72",
    soft: "#dfeafb",
  },
];

export function getDifficultyWords(words, difficulty) {
  const firstBreak = Math.floor(words.length / 3);
  const secondBreak = Math.floor((words.length * 2) / 3);
  if (difficulty === "advanced") return words.slice(secondBreak);
  if (difficulty === "intermediate") return words.slice(firstBreak, secondBreak);
  return words.slice(0, firstBreak);
}

export function PracticeSetupModal({
  open,
  config,
  totalWords = 500,
  learnedCount = 0,
  onStart,
  onClose,
}) {
  const groupsPerDay = Number(config.groupsPerDay || 1);
  const dailyWords = config.size * groupsPerDay;
  const remainingWords = Math.max(0, totalWords - learnedCount);
  const remainingDays = Math.max(1, Math.ceil(remainingWords / dailyWords));
  const finishDate = new Date();
  finishDate.setDate(finishDate.getDate() + remainingDays);
  const estimatedMinutes = Math.max(1, Math.ceil(dailyWords * 0.4));

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
            <h2 id="practice-setup-title">制定学习计划</h2>
            <p>选择每日组数和每组词数，预计时间与完成日期会同步计算。</p>
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
            <CalendarDays size={17} />
            <span>每天学习组数</span>
          </div>
          <div className="size-options daily-group-options">
            {[1, 2, 3, 4].map((groups) => (
              <button
                className={groupsPerDay === groups ? "active" : ""}
                key={groups}
                onClick={() =>
                  onStart({
                    ...config,
                    groupsPerDay: groups,
                    commitOnly: true,
                  })
                }
              >
                <strong>{groups}</strong>
                <span>组</span>
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

        <div className="setup-section">
          <div className="setup-label">
            <Keyboard size={17} />
            <span>拼写模式</span>
          </div>
          <div className="spelling-mode-options practice-spelling-options">
            <button
              className={(config.spellingDifficulty || "easy") === "easy" ? "active" : ""}
              onClick={() =>
                onStart({
                  ...config,
                  spellingDifficulty: "easy",
                  commitOnly: true,
                })
              }
            >
              <span><PenLine size={17} /></span>
              <div>
                <strong>普通模式</strong>
                <small>字母卡含 4 个同样式干扰字母</small>
              </div>
            </button>
            <button
              className={config.spellingDifficulty === "hard" ? "active" : ""}
              onClick={() =>
                onStart({
                  ...config,
                  spellingDifficulty: "hard",
                  commitOnly: true,
                })
              }
            >
              <span><Keyboard size={17} /></span>
              <div>
                <strong>困难模式</strong>
                <small>使用完整俄语键盘输入</small>
              </div>
            </button>
          </div>
        </div>

        <footer>
          <div className="plan-estimate">
            <span>
              <Clock3 size={14} />
              每天 {dailyWords} 词 · 预计 {estimatedMinutes} 分钟
            </span>
            <span>
              预计 {remainingDays} 天完成 ·{" "}
              {new Intl.DateTimeFormat("zh-CN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              }).format(finishDate)}
            </span>
          </div>
          <button className="primary-button" onClick={() => onStart(config)}>
            <BookOpen size={17} />
            保存计划并开始
            <ArrowRight size={16} />
          </button>
        </footer>
      </section>
    </div>
  );
}
