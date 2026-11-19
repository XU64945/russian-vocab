import { useEffect, useState } from "react";
import {
  BookMarked,
  Flag,
  GitBranch,
  Layers3,
  Quote,
  Repeat2,
  Send,
  Star,
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

export function WordDetailDrawer({
  word,
  open,
  onClose,
  onSpeak,
  favorite,
  onToggleFavorite,
  onSubmitCorrection,
}) {
  const { topicMap } = useWordbook();
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [category, setCategory] = useState("释义");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [correctionError, setCorrectionError] = useState("");

  useEffect(() => {
    if (!open || !word) return;
    setCorrectionOpen(false);
    setCategory("释义");
    setMessage("");
    setCorrectionError("");
  }, [open, word?.id]);

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
              <button
                className={`detail-favorite-button ${favorite ? "active" : ""}`}
                onClick={onToggleFavorite}
              >
                <Star size={17} fill={favorite ? "currentColor" : "none"} />
                {favorite ? "已收藏" : "收藏"}
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

          <section className="detail-section correction-section">
            <div className="detail-section-heading">
              <span className="detail-section-icon">
                <Flag size={18} />
              </span>
              <div>
                <small>СООБЩИТЬ ОБ ОШИБКЕ</small>
                <h3>发现词条有误</h3>
              </div>
            </div>
            {correctionOpen ? (
              <form
                className="correction-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (!message.trim()) return;
                  setSubmitting(true);
                  setCorrectionError("");
                  try {
                    await onSubmitCorrection({
                      wordId: word.id,
                      category,
                      message,
                    });
                    setCorrectionOpen(false);
                    setMessage("");
                  } catch (error) {
                    setCorrectionError(error.message || "纠错发送失败");
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                <label>
                  <span>问题类型</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    {["释义", "例句", "派生变化", "同义替换", "延展短语", "其他"].map(
                      (item) => (
                        <option key={item}>{item}</option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  <span>具体问题</span>
                  <textarea
                    value={message}
                    maxLength={2000}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="请说明错误位置和正确内容，管理员会在后台处理。"
                  />
                </label>
                <div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setCorrectionOpen(false)}
                  >
                    取消
                  </button>
                  <button
                    className="primary-button"
                    disabled={submitting || !message.trim()}
                  >
                    <Send size={15} />
                    {submitting ? "发送中…" : "发送给管理员"}
                  </button>
                </div>
                {correctionError ? (
                  <div className="login-error">{correctionError}</div>
                ) : null}
              </form>
            ) : (
              <button
                className="correction-trigger"
                onClick={() => setCorrectionOpen(true)}
              >
                <BookMarked size={16} />
                提交纠错
              </button>
            )}
          </section>
        </div>

      </aside>
    </div>
  );
}
