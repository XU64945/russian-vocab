function hashString(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededShuffle(items, seed) {
  const result = [...items];
  let state = hashString(String(seed)) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    const target = Math.abs(state) % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function optionValue(word, round) {
  return round === 1 ? word.zh : word.ru;
}

export function buildOptions(word, round, words, seed) {
  const correct = optionValue(word, round);
  const sameUnit = words.filter(
    (candidate) => candidate.id !== word.id && candidate.topic === word.topic,
  );
  const otherUnits = words.filter(
    (candidate) => candidate.id !== word.id && candidate.topic !== word.topic,
  );
  const candidates = [
    ...seededShuffle(sameUnit, `${seed}-${word.id}-near`),
    ...seededShuffle(otherUnits, `${seed}-${word.id}-far`),
  ];
  const toOption = (candidate) => ({
    value: optionValue(candidate, round),
    wordId: candidate.id,
    ru: candidate.ru,
    zh: candidate.zh,
  });
  const distractors = [];
  const seen = new Set([correct]);

  for (const candidate of candidates) {
    const value = optionValue(candidate, round);
    if (!value || seen.has(value)) continue;
    seen.add(value);
    distractors.push(toOption(candidate));
    if (distractors.length === 3) break;
  }

  return seededShuffle(
    [toOption(word), ...distractors],
    `${seed}-${word.id}-${round}`,
  );
}

export function scrambleLetters(word, seed, difficulty = "easy") {
  const characters = [...word.ru].map((character, index) => ({
    id: `${index}-${character}`,
    character,
  }));
  if (difficulty !== "hard") {
    const alphabet = [..."абвгдеёжзийклмнопрстуфхцчшщъыьэюя"];
    const used = new Set([...word.ru.toLowerCase()]);
    const decoys = seededShuffle(
      alphabet.filter((letter) => !used.has(letter)),
      `${seed}-${word.id}-decoys`,
    )
      .slice(0, 4)
      .map((character, index) => ({
        id: `decoy-${index}-${character}`,
        character,
      }));
    characters.push(...decoys);
  }
  if (characters.length < 2) return characters;

  let shuffled = seededShuffle(characters, `${seed}-${word.id}-letters`);
  if (shuffled.map((item) => item.character).join("") === word.ru) {
    shuffled = [...shuffled.slice(1), shuffled[0]];
  }
  return shuffled;
}

function makeTask(
  word,
  round,
  words,
  seed,
  serial,
  returnToRound = null,
  isRecheck = false,
  spellingDifficulty = "easy",
) {
  return {
    wordId: word.id,
    round,
    serial,
    returnToRound,
    isRecheck,
    options: round === 1 || round === 2 ? buildOptions(word, round, words, seed) : [],
    letters:
      round === 3
        ? scrambleLetters(word, seed, spellingDifficulty)
        : [],
  };
}

export function createQuizState(
  words,
  seed = Date.now(),
  optionPool = words,
  snapshot = null,
  spellingDifficulty = "easy",
) {
  if (snapshot?.active && snapshot.wordMapIds?.length) {
    const wordMap = new Map(words.map((word) => [word.id, word]));
    if (wordMap.has(snapshot.active.wordId)) {
      return {
        seed: snapshot.seed ?? seed,
        wordMap,
        words,
        optionPool,
        baseIds: snapshot.baseIds || words.map((word) => word.id),
        cursor: Number(snapshot.cursor || 0),
        mistakes: snapshot.mistakes || [],
        wrongWordIds: new Set(snapshot.wrongWordIds || []),
        passedIds: new Set(snapshot.passedIds || []),
        round2Queue: snapshot.round2Queue || [],
        round3Queue: snapshot.round3Queue || [],
        active: snapshot.active,
        stage: snapshot.stage || "question",
        lastAnswer: snapshot.lastAnswer || null,
        serial: Number(snapshot.serial || 1),
        preferRecheck: snapshot.preferRecheck !== false,
        spellingDifficulty:
          snapshot.spellingDifficulty || spellingDifficulty || "easy",
        stats: {
          correct: Number(snapshot.stats?.correct || 0),
          wrong: Number(snapshot.stats?.wrong || 0),
          completedWords: new Set(snapshot.stats?.completedWords || []),
        },
      };
    }
  }

  const baseIds = words.map((word) => word.id);
  const wordMap = new Map(words.map((word) => [word.id, word]));
  const firstWord = wordMap.get(baseIds[0]);
  const round2Ids = seededShuffle(baseIds, `${seed}-round-2`);
  const round3Ids = seededShuffle(baseIds, `${seed}-round-3`);

  return {
    seed,
    wordMap,
    words,
    optionPool,
    baseIds,
    cursor: 1,
    mistakes: [],
    wrongWordIds: new Set(),
    passedIds: new Set(),
    round2Queue: round2Ids,
    round3Queue: round3Ids,
    active: firstWord
      ? makeTask(firstWord, 1, optionPool, seed, 1)
      : null,
    stage: firstWord ? "question" : "complete",
    lastAnswer: null,
    serial: 1,
    preferRecheck: true,
    spellingDifficulty,
    stats: {
      correct: 0,
      wrong: 0,
      completedWords: new Set(),
    },
  };
}

export function serializeQuizState(state) {
  if (!state?.active) return null;
  return {
    seed: state.seed,
    wordMapIds: Array.from(state.wordMap.keys()),
    baseIds: state.baseIds,
    cursor: state.cursor,
    mistakes: state.mistakes,
    wrongWordIds: Array.from(state.wrongWordIds),
    passedIds: Array.from(state.passedIds),
    round2Queue: state.round2Queue,
    round3Queue: state.round3Queue,
    active: state.active,
    stage: state.stage,
    lastAnswer: state.lastAnswer,
    serial: state.serial,
    preferRecheck: state.preferRecheck,
    spellingDifficulty: state.spellingDifficulty,
    stats: {
      correct: state.stats.correct,
      wrong: state.stats.wrong,
      completedWords: Array.from(state.stats.completedWords),
    },
  };
}

function nextRoundOneTask(state) {
  const half = Math.ceil(state.baseIds.length / 2);
  const hasBaseWords = state.cursor < state.baseIds.length;
  const hasMistakes = state.mistakes.length > 0;
  if (!hasBaseWords && !hasMistakes) return null;

  const useMistake =
    hasMistakes &&
    (!hasBaseWords ||
      (state.cursor >= half && state.preferRecheck));

  if (useMistake) {
    const [mistake, ...remaining] = state.mistakes;
    const word = state.wordMap.get(mistake.wordId);
    const serial = state.serial + 1;
    return {
      ...state,
      mistakes: remaining,
      preferRecheck: false,
      serial,
      active: makeTask(
        word,
        1,
        state.optionPool,
        state.seed,
        serial,
        mistake.returnToRound,
        true,
        state.spellingDifficulty,
      ),
      stage: "question",
      lastAnswer: null,
    };
  }

  const wordId = state.baseIds[state.cursor];
  const word = state.wordMap.get(wordId);
  const serial = state.serial + 1;
  return {
    ...state,
    cursor: state.cursor + 1,
    preferRecheck: state.cursor + 1 >= half,
    serial,
    active: makeTask(
      word,
      1,
      state.optionPool,
      state.seed,
      serial,
      null,
      false,
      state.spellingDifficulty,
    ),
    stage: "question",
    lastAnswer: null,
  };
}

function takeQueuedTask(state, queueKey, round) {
  const queue = state[queueKey];
  if (!queue.length) return null;
  const [wordId, ...remaining] = queue;
  const word = state.wordMap.get(wordId);
  const serial = state.serial + 1;
  return {
    ...state,
    [queueKey]: remaining,
    serial,
    active: makeTask(
      word,
      round,
      state.optionPool,
      state.seed,
      serial,
      null,
      false,
      state.spellingDifficulty,
    ),
    stage: "question",
    lastAnswer: null,
  };
}

export function advanceQuiz(state) {
  const roundOne = nextRoundOneTask(state);
  if (roundOne) return roundOne;

  const roundTwo = takeQueuedTask(state, "round2Queue", 2);
  if (roundTwo) return roundTwo;

  const roundThree = takeQueuedTask(state, "round3Queue", 3);
  if (roundThree) return roundThree;

  return {
    ...state,
    active: null,
    stage: "complete",
    lastAnswer: null,
  };
}

export function answerQuiz(state, selected, correct, selectedWord = null) {
  const completedWords = new Set(state.stats.completedWords);
  if (correct) completedWords.add(state.active.wordId);

  return {
    ...state,
    stage: correct ? "detail" : "feedback",
    lastAnswer: { selected, correct, selectedWord },
    stats: {
      ...state.stats,
      correct: state.stats.correct + (correct ? 1 : 0),
      wrong: state.stats.wrong + (correct ? 0 : 1),
      completedWords,
    },
  };
}

function requeueCorrectReturn(state) {
  const returnToRound = state.active?.returnToRound;
  if (!returnToRound) return state;
  const queueKey = returnToRound === 2 ? "round2Queue" : "round3Queue";
  return {
    ...state,
    [queueKey]: [...state[queueKey], state.active.wordId],
  };
}

export function continueAfterDetail(state) {
  return advanceQuiz(requeueCorrectReturn(state));
}

export function continueAfterFeedback(state) {
  const mistake = {
    wordId: state.active.wordId,
    returnToRound:
      state.active.returnToRound ?? (state.active.round > 1 ? state.active.round : null),
  };
  return advanceQuiz({
    ...state,
    mistakes: [...state.mistakes, mistake],
  });
}

function passCurrentTask(state) {
  const wordId = state.active?.wordId;
  if (!wordId) return state;
  const baseIndex = state.baseIds.indexOf(wordId);
  const cursor =
    baseIndex >= 0 && baseIndex < state.cursor
      ? Math.max(0, state.cursor - 1)
      : state.cursor;
  const passedIds = new Set(state.passedIds);
  passedIds.add(wordId);
  const completedWords = new Set(state.stats.completedWords);
  completedWords.delete(wordId);
  const wrongWordIds = new Set(state.wrongWordIds);
  wrongWordIds.delete(wordId);
  return advanceQuiz({
    ...state,
    baseIds: state.baseIds.filter((id) => id !== wordId),
    round2Queue: state.round2Queue.filter((id) => id !== wordId),
    round3Queue: state.round3Queue.filter((id) => id !== wordId),
    mistakes: state.mistakes.filter((mistake) => mistake.wordId !== wordId),
    passedIds,
    wrongWordIds,
    cursor,
    stage: "question",
    lastAnswer: null,
    stats: { ...state.stats, completedWords },
  });
}

export function quizReducer(state, action) {
  switch (action.type) {
    case "answer":
      return answerQuiz(
        state,
        action.selected,
        action.correct,
        action.selectedWord,
      );
    case "report-wrong":
      return {
        ...state,
        stage: "question",
        lastAnswer: null,
        wrongWordIds: new Set([...state.wrongWordIds, state.active.wordId]),
        stats: { ...state.stats, wrong: state.stats.wrong + 1 },
      };
    case "pass":
      return passCurrentTask(state);
    case "continue-detail":
      return continueAfterDetail(state);
    case "continue-feedback":
      return continueAfterFeedback(state);
    case "retry":
      return {
        ...state,
        stage: "question",
        lastAnswer: null,
      };
    case "restart":
      return createQuizState(
        action.words,
        action.seed ?? Date.now(),
        action.optionPool,
      );
    default:
      return state;
  }
}
