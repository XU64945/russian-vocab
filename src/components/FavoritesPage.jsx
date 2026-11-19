import { Star, Volume2 } from "lucide-react";
import { useWordbook } from "../context/WordbookContext";

export function FavoritesPage({
  words,
  onOpenWord,
  onSpeak,
  onRemoveFavorite,
}) {
  const { topicMap } = useWordbook();

  return (
    <div className="page favorites-page">
      <section className="page-intro favorites-intro">
        <div>
          <p className="intro-ru">ИЗБРАННОЕ</p>
          <h1>收藏夹 · 你的私人生词本</h1>
          <p className="intro-subtitle">
            随手收藏值得反复看的词，不打断练习，也能随时回来复习完整词条。
          </p>
        </div>
        <div className="favorites-count">
          <Star size={18} fill="currentColor" />
          <strong>{words.length}</strong>
          <span>个收藏词</span>
        </div>
      </section>

      {words.length ? (
        <section className="favorite-grid">
          {words.map((word) => {
            const topic = word.topicMeta || topicMap[word.topic];
            return (
              <article className="favorite-card" key={word.id}>
                <div className="favorite-card-top">
                  <span style={{ background: topic.soft, color: topic.color }}>
                    {topic.label}
                  </span>
                  <button
                    className="favorite-star active"
                    onClick={() => onRemoveFavorite(word.id)}
                    aria-label={`取消收藏 ${word.ru}`}
                  >
                    <Star size={17} fill="currentColor" />
                  </button>
                </div>
                <button
                  className="favorite-word-main"
                  onClick={() => onOpenWord(word)}
                >
                  <small>{word.pos} · {word.transliteration}</small>
                  <strong>{word.ru}</strong>
                  <span>{word.zh}</span>
                  {word.examples?.[0] ? <p>{word.examples[0].ru}</p> : null}
                </button>
                <footer>
                  <button onClick={() => onSpeak(word.ru)}>
                    <Volume2 size={15} />
                    朗读
                  </button>
                  <span>收藏词不单独插入练习</span>
                </footer>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="favorites-empty">
          <span>
            <Star size={28} />
          </span>
          <h2>收藏夹还是空的</h2>
          <p>在词库或单词详情中点击星标，就能把单词收藏到这里。</p>
        </section>
      )}
    </div>
  );
}
