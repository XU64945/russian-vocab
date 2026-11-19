import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Flame,
  Headphones,
  Volume2,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import { AnimatedNumber } from "./ui/AnimatedNumber";
import { BorderBeam } from "./ui/BorderBeam";

function ProgressRing({ value }) {
  return (
    <div className="progress-ring" style={{ "--progress": `${value * 3.6}deg` }}>
      <div className="progress-ring-inner">
        <strong><AnimatedNumber value={value} suffix="%" /></strong>
        <span>今日</span>
      </div>
    </div>
  );
}

function WordCardFace({
  slide,
  index,
  total,
  topic,
  slides,
  isActive,
  onSpeak,
  onOpenWord,
  onNavigate,
}) {
  const example = slide.examples[0];
  const buttonTabIndex = isActive ? 0 : -1;

  return (
    <div className="word-card-content">
      <span className="word-card-peek-word" aria-hidden="true">
        {slide.ru}
      </span>
      <div className="word-card-header">
        <div>
          <span className="eyebrow-text">СЛОВО ДНЯ · 今日单词</span>
          <span className="word-level">{slide.level}</span>
        </div>
        <div className="word-card-header-actions">
          <span className="word-card-position">
            {String(index + 1).padStart(2, "0")} /{" "}
            {String(total).padStart(2, "0")}
          </span>
          <button
            type="button"
            className="round-audio-button light"
            tabIndex={buttonTabIndex}
            onClick={() => onSpeak(slide.ru)}
          >
            <Volume2 size={20} strokeWidth={1.8} />
            <span>听发音</span>
          </button>
        </div>
      </div>

      <div className="word-focus-body">
        <span className="ghost-letter" aria-hidden="true">
          {slide.ru.slice(0, 1).toUpperCase()}
        </span>
        <div className="word-pronunciation">{slide.transliteration}</div>
        <h2>{slide.ru}</h2>
        <p className="word-translation">{slide.zh}</p>
      </div>

      <blockquote className="example-quote">
        <p>{example.ru}</p>
        <footer>{example.zh}</footer>
      </blockquote>

      <div className="word-focus-footer">
        <div className="word-tags">
          <span style={{ background: topic.soft, color: topic.color }}>
            {topic.label}
          </span>
          <span>{slide.pos}</span>
        </div>
        <div className="word-focus-actions">
          <button
            type="button"
            className="text-button"
            tabIndex={buttonTabIndex}
            onClick={() => onOpenWord(slide)}
          >
            完整词条
            <BookOpen size={16} />
          </button>
        </div>
      </div>

      <div className="word-swipe-controls" data-no-swipe>
        <span>点按、拖拽或横向滑动切换</span>
        <div className="word-swipe-dots" aria-hidden="true">
          {slides.slice(0, 8).map((item, dotIndex) => (
            <i
              className={dotIndex === index % 8 ? "active" : ""}
              key={item.id}
            />
          ))}
        </div>
        <div className="word-swipe-buttons">
          <button
            type="button"
            tabIndex={buttonTabIndex}
            onClick={() => onNavigate(-1)}
            aria-label="上一个单词"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            tabIndex={buttonTabIndex}
            onClick={() => onNavigate(1)}
            aria-label="下一个单词"
          >
            <ChevronRight size={16} />
          </button>
        </div>
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
  featuredWords = [],
  onStartStudy,
  onOpenPracticeSetup,
  onSpeak,
  onOpenLibrary,
  onOpenWord,
  recentWords,
}) {
  const { topicMap, topics } = useWordbook();
  const slides = featuredWords.length ? featuredWords : word ? [word] : [];
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardShellRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);
  const currentWord = slides[activeIndex] || word;
  const hasMultipleWords = slides.length > 1;
  const dailyPercent = Math.min(100, Math.round((dailyCount / dailyGoal) * 100));

  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0);
  }, [activeIndex, slides.length]);

  function getCardPosition(index) {
    const total = slides.length;
    const offset = (index - activeIndex + total) % total;
    if (offset === 0) return "is-active";
    if (offset === 1) return "is-next";
    if (offset === total - 1) return "is-prev";
    return "is-hidden";
  }

  function showAdjacentWord(direction) {
    if (!hasMultipleWords) return;
    setActiveIndex((current) => {
      return (current + direction + slides.length) % slides.length;
    });
  }

  function handlePointerDown(event) {
    if (
      event.button !== 0 ||
      event.target.closest("button, a, input, select, textarea, [data-no-swipe]")
    ) {
      return;
    }
    const shell = cardShellRef.current;
    if (!shell) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      axis: null,
      dragged: false,
    };
    suppressClickRef.current = false;
    shell.style.transition = "none";
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - gesture.startX;
    const deltaY = event.clientY - gesture.startY;
    if (!gesture.axis) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      gesture.axis = Math.abs(deltaX) > Math.abs(deltaY) ? "x" : "y";
    }
    if (gesture.axis !== "x") return;
    event.preventDefault();
    gesture.deltaX = deltaX;
    gesture.dragged ||= Math.abs(deltaX) > 8;
    const width = cardShellRef.current?.offsetWidth || 480;
    const resisted =
      Math.sign(deltaX) *
      Math.min(Math.abs(deltaX) * 0.72, width * 0.22);
    if (cardShellRef.current) {
      cardShellRef.current.style.transform = `translate3d(${resisted}px, 0, 0)`;
    }
  }

  function finishGesture(event) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    const shell = cardShellRef.current;
    setIsDragging(false);
    if (shell) {
      shell.style.transition = "";
      shell.style.transform = "";
      if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    }
    if (gesture.dragged || gesture.axis === "y") {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    if (gesture.axis === "x" && Math.abs(gesture.deltaX) >= 52) {
      showAdjacentWord(gesture.deltaX < 0 ? 1 : -1);
    }
  }

  function handleCardClick(event) {
    if (event.target.closest("button, a, input, select, textarea, [data-no-swipe]")) {
      return;
    }
    if (suppressClickRef.current) return;
    showAdjacentWord(1);
  }

  function handleCardKeyDown(event) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showAdjacentWord(-1);
    } else if (event.key === "ArrowRight" || event.key === " ") {
      event.preventDefault();
      showAdjacentWord(1);
    }
  }

  return (
    <div className="page home-page">
      <section className="page-intro">
        <div>
          <p className="intro-ru">Доброе утро</p>
          <h1>
            {activeQuiz
              ? "从上次停下的地方继续"
              : `今天，和 ${groupSize * groupsPerDay} 个俄语词见面`}
          </h1>
          <p className="intro-subtitle">
            {activeQuiz
              ? "轮次、题目和学习位置已经保存在当前账号。"
              : `${groupsPerDay} 组短练习，先清到期复习，再认识今天的新词。`}
          </p>
        </div>
        <button className="primary-button intro-cta" onClick={onOpenPracticeSetup}>
          <span>{activeQuiz ? "继续今日学习" : "开始今日学习"}</span>
          <ArrowUpRight size={18} strokeWidth={1.9} />
        </button>
      </section>

      <section className="dashboard-top">
        <div
          className={`word-swipe-shell ${hasMultipleWords ? "is-interactive" : ""} ${isDragging ? "is-dragging" : ""}`}
          ref={cardShellRef}
          role="group"
          aria-roledescription="carousel"
          tabIndex={0}
          draggable={false}
          aria-label={`今日单词卡，第 ${activeIndex + 1} 个，共 ${slides.length} 个`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishGesture}
          onPointerCancel={finishGesture}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          onDragStart={(event) => event.preventDefault()}
        >
          <div className="word-carousel-stage">
            {slides.map((slide, index) => {
              const position = getCardPosition(index);
              const isActive = position === "is-active";
              return (
                <div
                  className={`word-carousel-card ${position}`}
                  key={slide.id}
                  aria-hidden={!isActive}
                  inert={!isActive}
                >
                  <BorderBeam className="word-beam" active={isActive}>
                    <article className="word-focus-card">
                      <WordCardFace
                        slide={slide}
                        index={index}
                        total={slides.length}
                        topic={topicMap[slide.topic]}
                        slides={slides}
                        isActive={isActive}
                        onSpeak={onSpeak}
                        onOpenWord={onOpenWord}
                        onNavigate={showAdjacentWord}
                      />
                    </article>
                  </BorderBeam>
                </div>
              );
            })}
          </div>
          <span className="sr-only" aria-live="polite">
            当前单词：{currentWord.ru}，{currentWord.zh}
          </span>
        </div>

        <aside className="goal-card">
          <div className="goal-card-heading">
            <div>
              <span className="eyebrow-text dark">СЕГОДНЯ</span>
              <h2>今日节奏</h2>
            </div>
            <span className="streak-number">
              <Flame size={16} />
              <AnimatedNumber value={streak} />
              <small>天</small>
            </span>
          </div>

          <div className="goal-ring-row">
            <ProgressRing value={dailyPercent} />
            <div className="goal-copy">
              <strong>
                <AnimatedNumber value={dailyCount} /> <span>/ {dailyGoal} 词</span>
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
              <strong><AnimatedNumber value={masteredCount} /></strong>
              <small>/ {totalWords}</small>
            </div>
          </div>

          <div className="goal-queue-line">
            <span>今日已完成</span>
            <strong>{todayReviewCount} 个复习词 · {todayNewCount} 个新词</strong>
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

      <section className="dashboard-bottom is-single">
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

      </section>
    </div>
  );
}
