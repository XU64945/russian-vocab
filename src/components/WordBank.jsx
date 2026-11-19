import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Volume2,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import { getWordStatus } from "../lib/srs";

const PAGE_SIZE = 12;

export function WordBank({
  words,
  progress,
  onSpeak,
  onOpenWord,
  onStudyWord,
  favoriteIds,
  passedIds,
  onToggleFavorite,
  onRestorePassed,
}) {
  const { topicMap, topics } = useWordbook();
  const [query, setQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const filteredWords = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("ru");
    return words.filter((word) => {
      if (activeTopic !== "all" && word.topic !== activeTopic) return false;
      const wordStatus = passedIds.has(word.id)
        ? "passed"
        : getWordStatus(progress, word.id);
      if (status === "new" && wordStatus !== "new") return false;
      if (status === "review" && wordStatus !== "review") return false;
      if (status === "mastered" && wordStatus !== "mastered") return false;
      if (status === "passed" && wordStatus !== "passed") return false;
      if (!normalizedQuery) return true;
      return [
        word.ru,
        word.zh,
        word.transliteration,
        word.pos,
        word.derived,
        word.synonyms,
        word.phrases,
        ...word.examples.flatMap((example) => [example.ru, example.zh]),
      ].some((value) =>
        value.toLocaleLowerCase("ru").includes(normalizedQuery),
      );
    });
  }, [activeTopic, passedIds, progress, query, status, words]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleWords = filteredWords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="page library-page">
      <section className="library-intro">
        <div>
          <p className="intro-ru">СЛОВАРЬ</p>
          <h1>你的俄语词库</h1>
          <p>
            {words.length} 个高频词，分成 {topics.length} 个学习单元。每个词条都包含双例句、
            派生变化、同义替换和延展短语。
          </p>
        </div>
        <div className="library-count">
          <strong>{filteredWords.length}</strong>
          <span>个词符合条件</span>
        </div>
      </section>

      <section className="library-toolbar">
        <label className="search-field">
          <Search size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => updateFilter(setQuery, event.target.value)}
            placeholder="搜索俄语、中文、例句或搭配…"
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="status-toggle" aria-label="掌握状态筛选">
          {[
            { id: "all", label: "全部" },
            { id: "new", label: "新词" },
            { id: "review", label: "待复习" },
            { id: "mastered", label: "已掌握" },
            { id: "passed", label: "已跳过" },
          ].map((item) => (
            <button
              className={status === item.id ? "active" : ""}
              key={item.id}
              onClick={() => updateFilter(setStatus, item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <div className="topic-filters">
        <button
          className={activeTopic === "all" ? "active" : ""}
          onClick={() => updateFilter(setActiveTopic, "all")}
        >
          所有单元
        </button>
        {topics.map((topic) => (
          <button
            className={activeTopic === topic.id ? "active" : ""}
            key={topic.id}
            onClick={() => updateFilter(setActiveTopic, topic.id)}
          >
            <span className="filter-topic-dot" style={{ background: topic.color }} />
            {topic.label}
          </button>
        ))}
      </div>

      <section className="word-table" aria-live="polite">
        <div className="word-table-head">
          <span>俄语单词</span>
          <span>中文释义</span>
          <span>场景</span>
          <span>状态</span>
          <span />
        </div>

        {visibleWords.length ? (
          visibleWords.map((word) => {
            const topic = topicMap[word.topic];
            const wordStatus = passedIds.has(word.id)
              ? "passed"
              : getWordStatus(progress, word.id);
            const favorite = favoriteIds.has(word.id);
            return (
              <article className="word-row" key={word.id}>
                <div className="table-word">
                  <button
                    className="table-sound-button"
                    onClick={() => onSpeak(word.ru)}
                    aria-label={`朗读 ${word.ru}`}
                  >
                    <Volume2 size={17} />
                  </button>
                  <button
                    className={`table-favorite-button ${favorite ? "active" : ""}`}
                    onClick={() => onToggleFavorite(word.id)}
                    aria-label={favorite ? `取消收藏 ${word.ru}` : `收藏 ${word.ru}`}
                  >
                    <Star size={16} fill={favorite ? "currentColor" : "none"} />
                  </button>
                  <span>
                    <strong>{word.ru}</strong>
                    <small>{word.transliteration}</small>
                  </span>
                </div>
                <div className="table-translation">
                  <strong>{word.zh}</strong>
                  <small>{word.examples[0]?.zh}</small>
                </div>
                <div className="table-topic">
                  <span style={{ background: topic.soft, color: topic.color }}>{topic.label}</span>
                  <small>{word.level}</small>
                </div>
                <div className={`table-status ${wordStatus}`}>
                  {wordStatus === "mastered" ? (
                    <Check size={14} />
                  ) : wordStatus === "passed" ? (
                    <span className="status-dash">—</span>
                  ) : wordStatus === "review" ? (
                    <RotateCcw size={14} />
                  ) : (
                    <span className="status-dot" />
                  )}
                  {wordStatus === "mastered"
                    ? "已掌握"
                    : wordStatus === "passed"
                      ? "已跳过"
                    : wordStatus === "review"
                      ? "待复习"
                      : "新词"}
                </div>
                <div className="row-actions">
                  {wordStatus === "passed" ? (
                    <button
                      className="row-detail-button"
                      onClick={() => onRestorePassed(word.id)}
                    >
                      恢复
                    </button>
                  ) : null}
                  <button className="row-detail-button" onClick={() => onOpenWord(word)}>
                    详情
                  </button>
                  {wordStatus !== "passed" ? (
                    <button className="row-study-button" onClick={() => onStudyWord(word)}>
                      练习
                      <ArrowRight size={15} />
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-library">
            <SlidersHorizontal size={28} strokeWidth={1.5} />
            <h2>没有找到这个词</h2>
            <p>换一个关键词，或者清除筛选条件再试一次。</p>
            <button
              className="secondary-button"
              onClick={() => {
                setQuery("");
                setActiveTopic("all");
                setStatus("all");
              }}
            >
              清除筛选
            </button>
          </div>
        )}
      </section>

      <footer className="pagination-bar">
        <span>
          第 {safePage} / {totalPages} 页
        </span>
        <div className="pagination-buttons">
          <button
            className="icon-button"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            aria-label="上一页"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            disabled={safePage === totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            aria-label="下一页"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
