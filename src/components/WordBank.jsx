import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Star,
  Volume2,
  X,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import { getWordStatus } from "../lib/srs";

const PAGE_SIZE = 12;
const RUSSIAN_INDEX = [..."абвгдеёжзийклмнопрстуфхцчшщъыьэюя"];
const searchScopes = [
  { id: "all", label: "全部字段" },
  { id: "ru", label: "俄语" },
  { id: "zh", label: "中文" },
  { id: "examples", label: "例句" },
  { id: "derived", label: "派生" },
  { id: "synonyms", label: "同义" },
  { id: "phrases", label: "短语" },
];

function normalizeSearch(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLocaleLowerCase("ru")
    .replace(/ё/g, "е")
    .replace(/[‐‑‒–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightedText({ text, query }) {
  const term = query.trim();
  if (!term) return text;
  const parts = String(text).split(
    new RegExp(`(${escapeRegExp(term)})`, "giu"),
  );
  return parts.map((part, index) =>
    part.toLocaleLowerCase("ru") === term.toLocaleLowerCase("ru") ? (
      <mark key={`${part}-${index}`}>{part}</mark>
    ) : (
      part
    ),
  );
}

export function WordBank({
  words,
  progress,
  allTopics = [],
  allTopicMap = {},
  books = [],
  loading = false,
  loadError = false,
  onRetry,
  onSpeak,
  onOpenWord,
  favoriteIds,
  passedIds,
  onToggleFavorite,
  onRestorePassed,
}) {
  const { topicMap: activeTopicMap, topics: activeTopics } = useWordbook();
  const topicMap = allTopics.length ? allTopicMap : activeTopicMap;
  const topics = allTopics.length ? allTopics : activeTopics;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchScope, setSearchScope] = useState("all");
  const [activeBook, setActiveBook] = useState("all");
  const [activeLetter, setActiveLetter] = useState("all");
  const [activeTopic, setActiveTopic] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const searchInputRef = useRef(null);

  const searchDocuments = useMemo(
    () =>
      words.map((word) => {
        const examples = word.examples
          .flatMap((example) => [example.ru, example.zh])
          .join(" ");
        const fields = {
          ru: normalizeSearch(
            [word.ru, word.transliteration, word.number].join(" "),
          ),
          zh: normalizeSearch(
            [word.zh, word.pos, word.level, word.unitLabel].join(" "),
          ),
          examples: normalizeSearch(examples),
          derived: normalizeSearch(word.derived),
          synonyms: normalizeSearch(word.synonyms),
          phrases: normalizeSearch(word.phrases),
        };
        return {
          word,
          fields: {
            ...fields,
            all: Object.values(fields).join(" "),
          },
        };
      }),
    [words],
  );

  const letterCounts = useMemo(() => {
    const counts = new Map();
    for (const word of words) {
      const letter = word.ru.slice(0, 1).toLocaleLowerCase("ru");
      counts.set(letter, (counts.get(letter) || 0) + 1);
    }
    return counts;
  }, [words]);

  const filteredWords = useMemo(() => {
    const normalizedQuery = normalizeSearch(deferredQuery);
    const numberQuery = deferredQuery.trim().match(/^#?(\d{1,4})$/)?.[1];
    const matches = searchDocuments.filter(({ word, fields }) => {
      if (activeBook !== "all" && word.bookId !== activeBook) return false;
      if (activeTopic !== "all" && word.topic !== activeTopic) return false;
      const wordStatus = passedIds.has(word.id)
        ? "passed"
        : getWordStatus(progress, word.id);
      if (status === "new" && wordStatus !== "new") return false;
      if (status === "review" && wordStatus !== "review") return false;
      if (status === "mastered" && wordStatus !== "mastered") return false;
      if (status === "passed" && wordStatus !== "passed") return false;
      if (
        activeLetter !== "all" &&
        word.ru.slice(0, 1).toLocaleLowerCase("ru") !== activeLetter
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      if (numberQuery) return String(word.number) === numberQuery;
      return fields[searchScope].includes(normalizedQuery);
    });

    if (!normalizedQuery) return matches.map(({ word }) => word);
    return [...matches]
      .sort((left, right) => {
        const score = ({ word, fields }) => {
          if (numberQuery && String(word.number) === numberQuery) return 0;
          const normalizedRu = normalizeSearch(word.ru);
          if (normalizedRu === normalizedQuery) return 1;
          if (normalizedRu.startsWith(normalizedQuery)) return 2;
          if (normalizeSearch(word.zh).startsWith(normalizedQuery)) return 3;
          if (fields[searchScope].startsWith(normalizedQuery)) return 4;
          return 5;
        };
        return score(left) - score(right) || left.word.number - right.word.number;
      })
      .map(({ word }) => word);
  }, [
    activeBook,
    activeLetter,
    activeTopic,
    deferredQuery,
    passedIds,
    progress,
    searchDocuments,
    searchScope,
    status,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleWords = filteredWords.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function updateFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function clearFilters() {
    setQuery("");
    setSearchScope("all");
    setActiveBook("all");
    setActiveLetter("all");
    setActiveTopic("all");
    setStatus("all");
    setPage(1);
    searchInputRef.current?.focus();
  }

  useEffect(() => {
    const focusSearch = (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (
        ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !isTyping)
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    if (sessionStorage.getItem("slovo-focus-search") === "1") {
      sessionStorage.removeItem("slovo-focus-search");
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    }
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  const visibleTopics =
    activeBook === "all"
      ? []
      : topics.filter((topic) => topic.bookId === activeBook);

  if (loading) {
    return (
      <div className="page library-page">
        <section className="library-loading-panel" aria-live="polite">
          <span className="library-loading-mark">С</span>
          <div>
            <p className="intro-ru">СЛОВАРЬ · 4000</p>
            <h1>正在整理全部词书</h1>
            <p>载入 8 本词书、4000 个词条和学习状态。</p>
          </div>
        </section>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page library-page">
        <section className="library-loading-panel">
          <div>
            <p className="intro-ru">СЛОВАРЬ</p>
            <h1>完整词库暂时未载入</h1>
            <p>已登录，但 4000 词数据没有成功加载。</p>
            <button className="primary-button" onClick={onRetry}>
              重新载入词库
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page library-page">
      <section className="library-intro">
        <div>
          <p className="intro-ru">СЛОВАРЬ</p>
          <h1>你的俄语词库</h1>
          <p>
            {words.length} 个高频词，来自 {books.length || 8} 本词书。可按词书、
            俄语字母、学习状态和全部词条字段检索。
          </p>
        </div>
        <div className="library-count">
          <strong>{filteredWords.length}</strong>
          <span>个词符合条件</span>
        </div>
      </section>

      <section className="library-toolbar">
        <div className="library-search-block">
          <label className="search-field">
            <Search size={18} />
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(event) => updateFilter(setQuery, event.target.value)}
              placeholder="搜索词、释义、例句或编号"
            />
            {query ? (
              <button
                type="button"
                className="search-clear"
                onClick={() => updateFilter(setQuery, "")}
                aria-label="清除搜索"
              >
                <X size={15} />
              </button>
            ) : null}
            <kbd><Command size={11} /> K</kbd>
          </label>
          <div className="search-scope-bar" aria-label="搜索字段">
            <span>检索范围</span>
            {searchScopes.map((scope) => (
              <button
                className={searchScope === scope.id ? "active" : ""}
                key={scope.id}
                onClick={() => updateFilter(setSearchScope, scope.id)}
              >
                {scope.label}
              </button>
            ))}
          </div>
        </div>
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

      <section className="library-index-panel">
        <div className="library-index-heading">
          <div>
            <span>俄语首字母索引</span>
            <small>按第一个字母快速定位，数字编号可直接搜索，如 4000</small>
          </div>
          <button
            className="text-button"
            onClick={clearFilters}
            disabled={
              !query &&
              searchScope === "all" &&
              activeBook === "all" &&
              activeLetter === "all" &&
              activeTopic === "all" &&
              status === "all"
            }
          >
            清除全部筛选
          </button>
        </div>
        <div className="letter-index" aria-label="俄语字母索引">
          <button
            className={activeLetter === "all" ? "active" : ""}
            onClick={() => updateFilter(setActiveLetter, "all")}
          >
            全部
            <small>{words.length}</small>
          </button>
          {RUSSIAN_INDEX.map((letter) => {
            const count = letterCounts.get(letter) || 0;
            return (
              <button
                className={activeLetter === letter ? "active" : ""}
                disabled={!count}
                key={letter}
                onClick={() => updateFilter(setActiveLetter, letter)}
                aria-label={`${letter} 开头，${count} 个词`}
              >
                {letter}
                <small>{count}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className="index-result-summary">
        <span>
          {activeBook === "all"
            ? "全部词书"
            : books.find((book) => book.id === activeBook)?.title}
          {" · "}
          {activeLetter === "all" ? "全部字母" : `${activeLetter.toUpperCase()} 开头`}
          {activeTopic !== "all" ? ` · ${topicMap[activeTopic]?.label}` : ""}
          {searchScope !== "all"
            ? ` · ${searchScopes.find((item) => item.id === searchScope)?.label}`
            : ""}
        </span>
        <strong>{filteredWords.length} 个结果</strong>
      </div>

      <div className="library-book-filter" aria-label="词书筛选">
        <button
          className={activeBook === "all" ? "active" : ""}
          onClick={() => {
            updateFilter(setActiveBook, "all");
            setActiveTopic("all");
          }}
        >
          全部词书
          <small>{words.length}</small>
        </button>
        {books.map((book) => (
          <button
            className={activeBook === book.id ? "active" : ""}
            key={book.id}
            onClick={() => {
              updateFilter(setActiveBook, book.id);
              setActiveTopic("all");
            }}
          >
            {book.title.replace("俄语高频词精讲 · ", "")}
            <small>{book.words?.length || book.wordCount || 500}</small>
          </button>
        ))}
      </div>

      {activeBook !== "all" ? (
        <div className="topic-filters">
          <button
            className={activeTopic === "all" ? "active" : ""}
            onClick={() => updateFilter(setActiveTopic, "all")}
          >
            所有单元
          </button>
          {visibleTopics.map((topic) => (
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
      ) : (
        <div className="library-unit-hint">
          选择一本词书后，可继续按该册的 10 个学习单元筛选
        </div>
      )}

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
            const topic = word.topicMeta || topicMap[word.topic];
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
                    <strong><HighlightedText text={word.ru} query={query} /></strong>
                    <small>№{word.number} · {word.transliteration}</small>
                  </span>
                </div>
                <div className="table-translation">
                  <strong><HighlightedText text={word.zh} query={query} /></strong>
                  <small>
                    <HighlightedText text={word.examples[0]?.zh || ""} query={query} />
                  </small>
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
              onClick={clearFilters}
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
