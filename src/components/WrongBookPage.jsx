import { AlertTriangle, ArrowRight, Volume2 } from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import { getWordMemory } from "../lib/srs";

export function WrongBookPage({ words, progress, onOpenWord, onSpeak }) {
  const { topicMap } = useWordbook();

  return (
    <div className="page wrongbook-page">
      <section className="page-intro wrongbook-intro">
        <div>
          <p className="intro-ru">РАБОТА НАД ОШИБКАМИ</p>
          <h1>错题本</h1>
          <p className="intro-subtitle">
            练习和复习答错的词会自动收录。错误不会清空原有复习进度，只会在明天优先出现。
          </p>
        </div>
        <div className="wrongbook-count">
          <AlertTriangle size={18} />
          <strong>{words.length}</strong>
          <span>个薄弱词</span>
        </div>
      </section>

      {words.length ? (
        <section className="wrongbook-grid">
          {words.map((word) => {
            const topic = word.topicMeta || topicMap[word.topic];
            const memory = getWordMemory(progress, word.id);
            return (
              <article className="wrongbook-card" key={word.id}>
                <div>
                  <span style={{ background: topic.soft, color: topic.color }}>
                    {topic.label}
                  </span>
                  <small>累计错误 {memory.lapses} 次</small>
                </div>
                <button onClick={() => onSpeak(word.ru)}>
                  <Volume2 size={16} />
                </button>
                <strong>{word.ru}</strong>
                <p>{word.zh}</p>
                <button className="wrongbook-detail" onClick={() => onOpenWord(word)}>
                  查看完整词条
                  <ArrowRight size={15} />
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="favorites-empty">
          <span><AlertTriangle size={28} /></span>
          <h2>错题本还是空的</h2>
          <p>练习或复习中答错的词会自动收录到这里。</p>
        </section>
      )}
    </div>
  );
}
