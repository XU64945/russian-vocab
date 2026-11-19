import { useEffect, useReducer, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Delete,
  GitBranch,
  Headphones,
  Layers3,
  Quote,
  Repeat2,
  RotateCcw,
  SkipForward,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useWordbook } from "../context/WordbookContext";
import {
  createQuizState,
  quizReducer,
} from "../lib/quizEngine";

const roundLabels = [
  { number: 1, short: "词义", title: "俄语选中文" },
  { number: 2, short: "选词", title: "中文选俄语" },
  { number: 3, short: "拼写", title: "乱序拼写" },
];

function RoundHeader({ round, correct, wrong, onExit }) {
  return (
    <>
      <header className="quiz-header">
        <button className="back-button" onClick={onExit}>
          <ArrowLeft size={18} />
          退出训练
        </button>
        <div className="quiz-rounds" aria-label="学习轮次">
          {roundLabels.map((item) => (
            <span
              className={`${round === item.number ? "active" : ""} ${
                round > item.number ? "complete" : ""
              }`}
              key={item.number}
            >
              <i>{round > item.number ? <Check size={11} /> : item.number}</i>
              {item.short}
            </span>
          ))}
        </div>
        <div className="quiz-score">
          <span>
            <Check size={13} /> {correct}
          </span>
          <span>
            <X size={13} /> {wrong}
          </span>
        </div>
      </header>
      <div className="quiz-round-track">
        {roundLabels.map((item) => (
          <span
            className={`${round === item.number ? "active" : ""} ${
              round > item.number ? "complete" : ""
            }`}
            key={item.number}
          />
        ))}
      </div>
    </>
  );
}

function ChoiceQuestion({
  word,
  task,
  stage,
  lastAnswer,
  onAnswer,
  onWrong,
  onOpenWord,
  onSpeak,
}) {
  const [wrongSelections, setWrongSelections] = useState([]);
  const [reportedWrong, setReportedWrong] = useState(false);
  const { topicMap } = useWordbook();
  const topic = topicMap[word.topic];
  const correctValue = task.round === 1 ? word.zh : word.ru;
  const prompt =
    task.round === 1
      ? {
          eyebrow: "ВЫБЕРИТЕ ПЕРЕВОД",
          title: "选择正确的中文释义",
          helper: "先认出意思。答对后进入完整词条。",
        }
      : {
          eyebrow: "ВЫБЕРИТЕ СЛОВО",
          title: "选择对应的俄语单词",
          helper: "可以连续排除错误选项，直到选中正确答案。",
        };

  function chooseOption(optionRecord) {
    const selected = optionRecord.value;
    if (wrongSelections.includes(selected)) {
      onOpenWord(optionRecord);
      return;
    }
    if (selected === correctValue) {
      onAnswer(selected, true, optionRecord);
      return;
    }
    setWrongSelections((current) => [...current, selected]);
    if (!reportedWrong) {
      setReportedWrong(true);
      onWrong(selected, optionRecord);
    }
  }

  return (
    <div className="quiz-stage">
      <div className="quiz-instruction">
        <span className="eyebrow-text dark">{prompt.eyebrow}</span>
        <h1>{prompt.title}</h1>
        <p>{prompt.helper}</p>
        {task.returnToRound || task.isRecheck ? (
          <span className="quiz-remediation">
            {task.returnToRound
              ? `错词回炉 · 完成后返回第 ${task.returnToRound} 轮`
              : "错词回炉 · 今天过半后穿插复习"}
          </span>
        ) : null}
      </div>

      <article className="quiz-question-card">
        <div className="quiz-card-meta">
          <span style={{ background: topic.soft, color: topic.color }}>{topic.label}</span>
          <span>{word.pos}</span>
        </div>

        {task.round === 1 ? (
          <div className="quiz-prompt-word">
            <button className="quiz-speak" onClick={() => onSpeak(word.ru)}>
              <Volume2 size={18} />
              听发音
            </button>
            <span>{word.transliteration}</span>
            <h2>{word.ru}</h2>
          </div>
        ) : (
          <div className="quiz-prompt-translation">
            <span>РУССКИЙ ЭКВИВАЛЕНТ</span>
            <h2>{word.zh}</h2>
            <p>从下面四个选项中选出对应的俄语词。</p>
          </div>
        )}

        <div className="choice-grid">
          {task.options.map((optionRecord, index) => {
            const option = optionRecord.value;
            const isWrongSelection = wrongSelections.includes(option);
            const classNames = [
              "choice-button",
              isWrongSelection ? "incorrect" : "",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <button
                className={classNames}
                key={`${task.serial}-${optionRecord.wordId}-${option}`}
                onClick={() => chooseOption(optionRecord)}
                title={
                  isWrongSelection
                    ? "再次点击查看这个词的完整含义"
                    : undefined
                }
              >
                <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                <span className="choice-value">{option}</span>
                {isWrongSelection ? (
                  <>
                    <span className="choice-result-icon">
                      <X size={16} />
                    </span>
                    <small className="choice-correction">
                      {task.round === 1
                        ? `对应俄语：${optionRecord.ru} · 点此查看词义`
                        : `对应中文：${optionRecord.zh} · 点此查看词义`}
                    </small>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </article>

    </div>
  );
}

function DetailSection({ icon: Icon, eyebrow, title, children, className = "" }) {
  return (
    <section className={`quiz-detail-section ${className}`}>
      <div className="detail-section-heading">
        <span className="detail-section-icon">
          <Icon size={18} />
        </span>
        <div>
          <small>{eyebrow}</small>
          <h3>{title}</h3>
        </div>
      </div>
      {children}
    </section>
  );
}

function QuizDetailPage({ word, round, onContinue, onSpeak, onExit }) {
  const { topicMap } = useWordbook();
  const topic = topicMap[word.topic];
  const phrases = word.phrases
    .split("；")
    .map((item) => item.trim())
    .filter(Boolean);

  return (
    <div className="quiz-stage quiz-detail-stage">
      <div className="quiz-correct-banner">
        <span>
          <Check size={17} />
        </span>
        <div>
          <strong>回答正确</strong>
          <small>先把这页读一遍，再进入下一词。</small>
        </div>
        <span>第 {round} 轮</span>
      </div>

      <article className="quiz-learning-page">
        <header className="quiz-learning-hero">
          <div className="detail-tags">
            <span className="detail-pos">{word.pos}</span>
            <span style={{ background: topic.soft, color: topic.color }}>{topic.label}</span>
          </div>
          <span>{word.transliteration}</span>
          <h1>{word.ru}</h1>
          <p>{word.zh}</p>
          <button onClick={() => onSpeak(word.ru)}>
            <Headphones size={17} />
            听发音
          </button>
        </header>

        <div className="quiz-learning-content">
          <DetailSection icon={Quote} eyebrow="ПРИМЕРЫ" title="双语例句">
            <div className="detail-examples">
              {word.examples.map((example, index) => (
                <article className="detail-example" key={`${word.id}-quiz-example-${index}`}>
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
          </DetailSection>

          <div className="quiz-learning-columns">
            <DetailSection icon={GitBranch} eyebrow="ФОРМЫ" title="派生与变形">
              <p className="detail-copy">{word.derived}</p>
            </DetailSection>
            <DetailSection icon={Repeat2} eyebrow="СИНОНИМЫ" title="同义替换">
              <p className="detail-copy">{word.synonyms}</p>
            </DetailSection>
          </div>

          <DetailSection icon={Layers3} eyebrow="РАСШИРЕНИЕ" title="延展与常用短语">
            <div className="phrase-list quiz-phrase-list">
              {phrases.map((phrase, index) => (
                <button
                  key={`${word.id}-quiz-phrase-${index}`}
                  onClick={() => onSpeak(phrase.split(/\s+/).slice(0, 3).join(" "))}
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {phrase}
                  <Volume2 size={14} />
                </button>
              ))}
            </div>
          </DetailSection>
        </div>

        <footer className="quiz-learning-footer">
          <button className="secondary-button" onClick={onExit}>
            稍后再学
          </button>
          <button className="primary-button" onClick={onContinue}>
            下一页
            <ArrowRight size={17} />
          </button>
        </footer>
      </article>
    </div>
  );
}

function SpellingQuestion({
  word,
  task,
  stage,
  lastAnswer,
  onAnswer,
  onContinue,
  onOpenWord,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const selectedSet = new Set(selectedIds);
  const assembled = selectedIds
    .map((id) => task.letters.find((letter) => letter.id === id)?.character ?? "")
    .join("");

  function toggleLetter(letterId) {
    if (stage === "feedback" || selectedSet.has(letterId)) return;
    setSelectedIds((current) => [...current, letterId]);
  }

  function backspace() {
    if (stage === "feedback") return;
    setSelectedIds((current) => current.slice(0, -1));
  }

  const submitted = assembled.trim().toLowerCase() === word.ru.toLowerCase();

  return (
    <div className="quiz-stage">
      <div className="quiz-instruction">
        <span className="eyebrow-text dark">СОБЕРИТЕ СЛОВО</span>
        <h1>打乱字母，拼出俄语单词</h1>
        <p>按顺序点击字母。答错后会回到第 1 轮重新学习。</p>
      </div>

      <article className="spelling-card">
        <div className="quiz-card-meta">
          <span>{word.pos}</span>
          <span>第 3 轮 · 拼写</span>
        </div>
        <div className="spelling-prompt">
          <span>中文释义</span>
          <h2>{word.zh}</h2>
        </div>

        <div className={`spelling-answer ${stage === "feedback" ? "incorrect" : ""}`}>
          {assembled ? (
            [...assembled].map((character, index) => (
              <span key={`${character}-${index}`}>{character === " " ? "·" : character}</span>
            ))
          ) : (
            <small>点击下方字母开始拼写</small>
          )}
        </div>

        <div className="letter-bank" aria-label="乱序字母">
          {task.letters.map((letter) => (
            <button
              className={selectedSet.has(letter.id) ? "used" : ""}
              disabled={stage === "feedback" || selectedSet.has(letter.id)}
              key={letter.id}
              onClick={() => toggleLetter(letter.id)}
            >
              {letter.character === " " ? "空格" : letter.character}
            </button>
          ))}
        </div>

        {stage === "question" ? (
          <div className="spelling-actions">
            <button className="secondary-button" onClick={backspace} disabled={!selectedIds.length}>
              <Delete size={16} />
              退格
            </button>
            <button
              className="secondary-button"
              onClick={() => setSelectedIds([])}
              disabled={!selectedIds.length}
            >
              重置
            </button>
            <button
              className="primary-button"
              onClick={() => onAnswer(assembled, submitted)}
              disabled={!selectedIds.length}
            >
              检查拼写
              <Check size={17} />
            </button>
          </div>
        ) : null}
      </article>

      {stage === "feedback" ? (
        <div className="quiz-feedback">
          <div className="quiz-feedback-mark">
            <X size={20} />
          </div>
          <div className="quiz-feedback-copy">
            <span>拼写不正确，正确答案是</span>
            <strong>{word.ru}</strong>
            <p>{assembled || "未完成拼写"}</p>
            <small>接下来先从第 1 轮重新学习，再回到拼写。</small>
          </div>
          <div className="quiz-feedback-actions">
            <button className="secondary-button" onClick={() => onOpenWord(word)}>
              <BookOpen size={16} />
              先看解析
            </button>
            <button className="primary-button" onClick={onContinue}>
              继续
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuizComplete({ score, onExit, onRestart, onNextGroup }) {
  return (
    <div className="quiz-complete">
      <span className="complete-mark">
        <Sparkles size={31} />
      </span>
      <span className="eyebrow-text dark">ВСЕ ТРИ РАУНДА</span>
      <h1>三轮完成。</h1>
      <p>
        这组词已经过词义辨认、汉译选词和乱序拼写。答错过的词已按你的表现重新安排复习。
      </p>
      <div className="quiz-complete-score">
        <span>
          答对 <strong>{score.correct}</strong>
        </span>
        <span>
          答错 <strong>{score.wrong}</strong>
        </span>
      </div>
      <div className="complete-actions">
        <button className="primary-button" onClick={onNextGroup}>
          增加下一组
          <ArrowRight size={17} />
        </button>
        <button className="secondary-button" onClick={onRestart}>
          <RotateCcw size={17} />
          重练本组
        </button>
        <button className="text-button" onClick={onExit}>
          回到今日学习
        </button>
      </div>
    </div>
  );
}

export function QuizSession({
  queue,
  allWords,
  onAnswer,
  onExit,
  onSpeak,
  autoPlay,
  onOpenWord,
  onQueueComplete,
  onNextGroup,
  onPassWord,
}) {
  const [state, dispatch] = useReducer(
    quizReducer,
    null,
    () => createQuizState(queue, Date.now(), allWords),
  );
  const completedRef = useRef(false);
  const word = state.active ? state.wordMap.get(state.active.wordId) : null;
  useEffect(() => {
    if (
      !autoPlay ||
      !word ||
      state.stage !== "question" ||
      state.active.round !== 1
    ) {
      return undefined;
    }
    const timeout = window.setTimeout(() => onSpeak(word.ru), 280);
    return () => window.clearTimeout(timeout);
  }, [autoPlay, onSpeak, state.active?.round, state.stage, word]);

  useEffect(() => {
    if (state.stage !== "complete" || completedRef.current) return;
    completedRef.current = true;
    onQueueComplete(Array.from(state.passedIds));
  }, [onQueueComplete, state.passedIds, state.stage]);

  function submitAnswer(selected, correct, selectedWord = null) {
    if (!word) return;
    onAnswer(word.id, correct ? "known" : "again");
    dispatch({ type: "answer", selected, correct, selectedWord });
  }

  function reportWrong(selected, selectedWord) {
    if (!word) return;
    onAnswer(word.id, "again");
    dispatch({ type: "report-wrong", selected, selectedWord });
  }

  function passCurrentWord() {
    if (!word) return;
    onPassWord(word.id);
    dispatch({ type: "pass" });
  }

  if (state.stage === "complete") {
    return (
      <div className="page quiz-page">
        <QuizComplete
          score={state.stats}
          onExit={onExit}
          onNextGroup={onNextGroup}
          onRestart={() => {
            completedRef.current = false;
            dispatch({
              type: "restart",
              words: queue,
              optionPool: allWords,
              seed: Date.now(),
            });
          }}
        />
      </div>
    );
  }

  if (!word) return null;

  const round = state.stage === "detail" ? state.active.round : state.active.round;

  return (
    <div className="page quiz-page">
      <RoundHeader
        round={round}
        correct={state.stats.correct}
        wrong={state.stats.wrong}
        onExit={onExit}
      />

      {state.stage === "detail" ? (
        <QuizDetailPage
          word={word}
          round={state.active.round}
          onContinue={() => dispatch({ type: "continue-detail" })}
          onSpeak={onSpeak}
          onExit={onExit}
        />
      ) : null}

      {(state.stage === "question" || state.stage === "feedback") &&
      state.active.round === 3 ? (
        <SpellingQuestion
          key={state.active.serial}
          word={word}
          task={state.active}
          stage={state.stage}
          lastAnswer={state.lastAnswer}
          onAnswer={submitAnswer}
          onContinue={() =>
            dispatch({
              type: state.active.round === 1 ? "retry" : "continue-feedback",
            })
          }
          onOpenWord={onOpenWord}
        />
      ) : null}

      {state.stage === "question" && state.active.round !== 3 ? (
        <ChoiceQuestion
          key={state.active.serial}
          word={word}
          task={state.active}
          stage={state.stage}
          lastAnswer={state.lastAnswer}
          onAnswer={submitAnswer}
          onWrong={reportWrong}
          onOpenWord={(option) =>
            onOpenWord(allWords.find((item) => item.id === option.wordId))
          }
          onSpeak={onSpeak}
        />
      ) : null}

      {state.stage === "question" ? (
        <div className="quiz-pass-bar">
          <button className="pass-button" onClick={passCurrentWord}>
            <SkipForward size={16} />
            Pass 这个单词
          </button>
          <span>跳过学习，不会进入练习和复习池</span>
        </div>
      ) : null}
    </div>
  );
}
