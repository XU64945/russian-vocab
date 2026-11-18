import {
  ArrowRight,
  BookOpen,
  GitBranch,
  Layers3,
  Quote,
  Repeat2,
  Volume2,
  X,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";

function splitPhrases(value) {
  return value
    .split("；")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function WordDetailDrawer({ word, open, onClose, onSpeak, onStudy }) {
  const { topicMap } = useWordbook();
  if (!word) return null;

  const topic = topicMap[word.topic];
  const phrases = splitPhrases(word.phrases);

  return (
    <div className={`drawer-layer detail-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button
        className="drawer-scrim"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
        aria-label="关闭词条详情"
      />
      <aside
        className="word-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="word-detail-title"
      >
        <header className="detail-header">
          <div>
            <span className="detail-index">№ {String(word.number).padStart(3, "0")}</span>
            <span className="eyebrow-text dark">СЛОВАРНАЯ СТАТЬЯ</span>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭词条详情">
            <X size={20} />
          </button>
        </header>

        <div className="detail-scroll">
          <section className="detail-hero">
            <div className="detail-hero-top">
              <div className="detail-tags">
                <span className="detail-pos">{word.pos}</span>
                <span style={{ background: topic.soft, color: topic.color }}>
                  {topic.label}
                </span>
              </div>
              <button className="detail-audio" onClick={() => onSpeak(word.ru)}>
                <Volume2 size={18} />
                听发音
              </button>
            </div>
            <span className="detail-transliteration">{word.transliteration}</span>
            <h2 id="word-detail-title">{word.ru}</h2>
            <p>{word.zh}</p>
          </section>

          <section className="detail-section">
            <div className="detail-section-heading">
              <span className="detail-section-icon">
                <Quote size={18} />
              </span>
              <div>
                <small>ПРИМЕРЫ</small>
                <h3>双语例句</h3>
              </div>
            </div>
            <div className="detail-examples">
              {word.examples.map((example, index) => (
                <article className="detail-example" key={`${word.id}-example-${index}`}>
                  <span className="example-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <p>{example.ru}</p>
                    <small>{example.zh}</small>
                  </div>
                  <button onClick={() => onSpeak(example.ru)} aria-label="朗读例句">
                    <Volume2 size={16} />
                  </button>
                </article>
              ))}
            </div>
          </section>

          <div className="detail-two-columns">
            <section className="detail-section detail-note-card">
              <div className="detail-section-heading">
                <span className="detail-section-icon">
                  <GitBranch size={18} />
                </span>
                <div>
                  <small>ФОРМЫ</small>
                  <h3>派生与变形</h3>
                </div>
              </div>
              <p className="detail-copy">{word.derived}</p>
            </section>

            <section className="detail-section detail-note-card">
              <div className="detail-section-heading">
                <span className="detail-section-icon">
                  <Repeat2 size={18} />
                </span>
                <div>
                  <small>СИНОНИМЫ</small>
                  <h3>同义替换</h3>
                </div>
              </div>
              <p className="detail-copy">{word.synonyms}</p>
            </section>
          </div>

          <section className="detail-section detail-extension">
            <div className="detail-section-heading">
              <span className="detail-section-icon">
                <Layers3 size={18} />
              </span>
              <div>
                <small>РАСШИРЕНИЕ</small>
                <h3>延展与常用短语</h3>
              </div>
            </div>
            <div className="phrase-list">
              {phrases.map((phrase, index) => (
                <button
                  key={`${word.id}-phrase-${index}`}
                  onClick={() => onSpeak(phrase.split(/\s+/).slice(0, 3).join(" "))}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {phrase}
                  <Volume2 size={14} />
                </button>
              ))}
            </div>
          </section>
        </div>

        <footer className="detail-footer">
          <button
            className="primary-button"
            onClick={() => {
              onClose();
              onStudy(word);
            }}
          >
            <BookOpen size={17} />
            用这个词开始训练
            <ArrowRight size={16} />
          </button>
        </footer>
      </aside>
    </div>
  );
}
