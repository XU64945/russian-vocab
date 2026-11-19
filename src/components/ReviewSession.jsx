import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  PenLine,
  RotateCcw,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { buildOptions, seededShuffle } from "../lib/quizEngine";

const russianAlphabet = [..."абвгдеёжзийклмнопрстуфхцчшщъыьэюя"];

function buildSpellingTiles(word, difficulty, seed) {
  const letters = [...word.ru].map((character, index) => ({
    id: `word-${index}-${character}`,
    character,
    decoy: false,
  }));

  if (difficulty === "hard") {
    const used = new Set([...word.ru.toLowerCase()]);
    const candidates = russianAlphabet.filter((letter) => !used.has(letter));
    const decoys = seededShuffle(candidates, `${seed}-${word.id}-decoys`)
      .slice(0, 4)
      .map((character, index) => ({
        id: `decoy-${index}-${character}`,
        character,
        decoy: true,
      }));
    letters.push(...decoys);
  }

  return seededShuffle(letters, `${seed}-${word.id}-${difficulty}`);
}

function ReviewRoundHeader({ phase, onExit }) {
  return (
    <>
      <header className="review-session-header">
        <button className="back-button" onClick={onExit}>
          <ArrowLeft size={18} />
          退出复习
        </button>
        <div className="review-round-switch">
          <span className={phase === 1 ? "active" : "complete"}>
            <i>{phase > 1 ? <Check size={11} /> : "1"}</i>
            俄语选中文
          </span>
          <span className={phase === 2 ? "active" : ""}>
            <i>2</i>
            乱序拼写
          </span>
        </div>
        <span className="review-session-mode">
          {phase === 1 ? "答错继续当前词" : "拼对才进入下一词"}
        </span>
      </header>
      <div className="review-round-line">
        <span className={phase >= 1 ? "active" : ""} />
        <span className={phase === 2 ? "active" : ""} />
      </div>
    </>
  );
}

function ReviewChoiceRound({
  word,
  allWords,
  seed,
  index,
  total,
  onAnswer,
  onNext,
  onSpeak,
  onOpenWord,
}) {
  const [wrongSelections, setWrongSelections] = useState([]);
  const [reportedWrong, setReportedWrong] = useState(false);
  const [correct, setCorrect] = useState(false);
  const options = useMemo(
    () => buildOptions(word, 1, allWords, `${seed}-${word.id}-${index}`),
    [allWords, index, seed, word],
  );
  function choose(option) {
    if (correct) return;
    if (wrongSelections.includes(option.value)) {
      onOpenWord(option);
      return;
    }
    if (option.value === word.zh) {
      setCorrect(true);
      onAnswer(word.id, true);
      return;
    }
    setWrongSelections((current) => [...current, option.value]);
    if (!reportedWrong) {
      setReportedWrong(true);
      onAnswer(word.id, false);
    }
  }

  return (
    <div className="review-stage">
      <div className="review-stage-heading">
        <span className="eyebrow-text dark">ПОВТОРЕНИЕ · 1</span>
        <h1>看俄语，选择中文释义</h1>
        <p>
          第 {index + 1} / {total} 词 · 答错会停留在这个词，直到答对
        </p>
      </div>

      <article className="review-question-card">
        <div className="review-question-top">
          <span>{word.pos}</span>
          <button onClick={() => onSpeak(word.ru)}>
            <Volume2 size={18} />
            听发音
          </button>
        </div>
        <div className="review-russian-word">
          <span>{word.transliteration}</span>
          <h2>{word.ru}</h2>
        </div>
        <div className="choice-grid review-choice-grid">
          {options.map((option, optionIndex) => {
            const isWrong = wrongSelections.includes(option.value);
            const isCorrect = correct && option.value === word.zh;
            return (
              <button
                className={`choice-button ${isWrong ? "incorrect" : ""} ${
                  isCorrect ? "correct" : ""
                }`}
                key={`${word.id}-${option.wordId}`}
                onClick={() => choose(option)}
                title={isWrong ? "再次点击查看这个词的完整含义" : undefined}
              >
                <span className="choice-letter">{String.fromCharCode(65 + optionIndex)}</span>
                <span className="choice-value">{option.value}</span>
                {isWrong ? (
                  <small className="choice-correction">
                    对应俄语：{option.ru} · 点此查看词义
                  </small>
                ) : null}
              </button>
            );
          })}
        </div>
      </article>

      {correct ? (
        <div className="review-answer-bar correct">
          <span>
            <Check size={18} />
          </span>
          <div>
            <strong>答对了</strong>
            <small>继续下一个词。</small>
          </div>
          <button className="primary-button" onClick={onNext}>
            下一个词
            <ArrowRight size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function ReviewSpellingRound({
  word,
  difficulty,
  index,
  total,
  seed,
  onAnswer,
  onNext,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [wrong, setWrong] = useState(false);
  const tiles = useMemo(
    () => buildSpellingTiles(word, difficulty, `${seed}-${index}`),
    [difficulty, index, seed, word],
  );
  const selectedSet = new Set(selectedIds);
  const assembled = selectedIds
    .map((id) => tiles.find((tile) => tile.id === id)?.character ?? "")
    .join("");
  const complete = selectedIds.length === tiles.filter((tile) => !tile.decoy).length;

  function toggleTile(tile) {
    if (wrong || selectedSet.has(tile.id)) return;
    if (tile.decoy && selectedIds.filter((id) => id.startsWith("decoy-")).length >= 4) {
      return;
    }
    setSelectedIds((current) => [...current, tile.id]);
  }

  function check() {
    const correct = assembled.trim().toLowerCase() === word.ru.toLowerCase();
    setWrong(!correct);
    onAnswer(word.id, correct);
  }

  function retry() {
    setWrong(false);
    setSelectedIds([]);
  }

  return (
    <div className="review-stage">
      <div className="review-stage-heading">
        <span className="eyebrow-text dark">ПОВТОРЕНИЕ · 2</span>
        <h1>听中文，拼出俄语单词</h1>
        <p>
          第 {index + 1} / {total} 词 ·{" "}
          {difficulty === "easy" ? "简单模式" : "困难模式"}
        </p>
      </div>

      <article className="review-spelling-card">
        <div className="review-question-top">
          <span>
            {difficulty === "easy" ? <PenLine size={15} /> : <Sparkles size={15} />}
            {difficulty === "easy" ? "仅单词字母" : "含额外混淆字母"}
          </span>
          <span>{word.pos}</span>
        </div>
        <div className="review-spelling-prompt">
          <span>中文释义</span>
          <h2>{word.zh}</h2>
        </div>
        <div className={`spelling-answer ${wrong ? "incorrect" : ""}`}>
          {assembled ? (
            [...assembled].map((character, tileIndex) => (
              <span key={`${character}-${tileIndex}`}>{character === " " ? "·" : character}</span>
            ))
          ) : (
            <small>点击下方字母开始拼写</small>
          )}
        </div>
        <div className="letter-bank">
          {tiles.map((tile) => (
            <button
              className={`${selectedSet.has(tile.id) ? "used" : ""} ${
                tile.decoy ? "decoy" : ""
              }`}
              disabled={wrong || selectedSet.has(tile.id)}
              key={tile.id}
              onClick={() => toggleTile(tile)}
            >
              {tile.character === " " ? "空格" : tile.character}
            </button>
          ))}
        </div>

        {wrong ? (
          <div className="review-spelling-feedback">
            <span>
              <X size={17} />
            </span>
            <div>
              <strong>拼写还不对</strong>
              <small>清空后重新拼写，直到正确。</small>
            </div>
            <button className="secondary-button" onClick={retry}>
              <RotateCcw size={15} />
              再试一次
            </button>
          </div>
        ) : (
          <div className="review-spelling-actions">
            <button
              className="secondary-button"
              disabled={!selectedIds.length}
              onClick={() => setSelectedIds((current) => current.slice(0, -1))}
            >
              退格
            </button>
            <button
              className="primary-button"
              disabled={!complete}
              onClick={check}
            >
              检查拼写
              <Check size={16} />
            </button>
          </div>
        )}
      </article>

      {!wrong && complete && assembled.trim().toLowerCase() === word.ru.toLowerCase() ? (
        <div className="review-answer-bar correct">
          <span>
            <Check size={18} />
          </span>
          <div>
            <strong>拼写正确</strong>
            <small>继续下一个词。</small>
          </div>
          <button className="primary-button" onClick={onNext}>
            下一个词
            <ArrowRight size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ReviewSession({
  queue,
  allWords,
  spellingDifficulty,
  onAnswer,
  onExit,
  onComplete,
  onSpeak,
  onOpenWord,
}) {
  const [phase, setPhase] = useState(1);
  const [index, setIndex] = useState(0);
  const [seed] = useState(Date.now());
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [finished, setFinished] = useState(false);
  const word = queue[index];

  function recordAnswer(wordId, correct) {
    setStats((current) => ({
      correct: current.correct + (correct ? 1 : 0),
      wrong: current.wrong + (correct ? 0 : 1),
    }));
    onAnswer(wordId, correct ? "known" : "again");
  }

  function next() {
    if (index >= queue.length - 1) {
      if (phase === 1) {
        setPhase(2);
        setIndex(0);
        return;
      }
      setFinished(true);
      onComplete(queue.map((item) => item.id));
      return;
    }
    setIndex((current) => current + 1);
  }

  if (finished) {
    return (
      <div className="page review-session-page">
        <div className="review-complete">
          <span className="complete-mark">
            <Check size={32} />
          </span>
          <span className="eyebrow-text dark">ПОВТОРЕНИЕ ЗАВЕРШЕНО</span>
          <h1>两轮复习完成。</h1>
          <p>这批复习词已完成辨认和拼写，接下来会按新的记忆状态重新安排间隔。</p>
          <div className="quiz-complete-score">
            <span>
              答对 <strong>{stats.correct}</strong>
            </span>
            <span>
              答错 <strong>{stats.wrong}</strong>
            </span>
          </div>
          <button className="primary-button" onClick={onExit}>
            返回复习模块
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page review-session-page">
      <ReviewRoundHeader phase={phase} onExit={onExit} />
      {phase === 1 ? (
        <ReviewChoiceRound
          key={`${word.id}-${index}`}
          word={word}
          allWords={allWords}
          seed={seed}
          index={index}
          total={queue.length}
          onAnswer={recordAnswer}
          onNext={next}
          onSpeak={onSpeak}
          onOpenWord={(option) =>
            onOpenWord(allWords.find((item) => item.id === option.wordId))
          }
        />
      ) : (
        <ReviewSpellingRound
          key={`${word.id}-${index}-spelling`}
          word={word}
          difficulty={spellingDifficulty}
          index={index}
          total={queue.length}
          seed={seed}
          onAnswer={recordAnswer}
          onNext={next}
        />
      )}
    </div>
  );
}
