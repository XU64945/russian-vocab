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

export function scrambleLetters(word, seed) {
  const characters = [...word.ru].map((character, index) => ({
    id: `${index}-${character}`,
    character,
  }));
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
) {
  return {
    wordId: word.id,
    round,
    serial,
    returnToRound,
    isRecheck,
    options: round === 1 || round === 2 ? buildOptions(word, round, words, seed) : [],
    letters: round === 3 ? scrambleLetters(word, seed) : [],
  };
}

export function createQuizState(words, seed = Date.now(), optionPool = words) {
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
    round2Queue: round2Ids,
    round3Queue: round3Ids,
    active: firstWord
      ? makeTask(firstWord, 1, optionPool, seed, 1)
      : null,
    stage: firstWord ? "question" : "complete",
    lastAnswer: null,
    serial: 1,
    preferRecheck: true,
    stats: {
      correct: 0,
      wrong: 0,
      completedWords: new Set(),
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
    active: makeTask(word, 1, state.optionPool, state.seed, serial),
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
    active: makeTask(word, round, state.optionPool, state.seed, serial),
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

export function quizReducer(state, action) {
  switch (action.type) {
    case "answer":
      return answerQuiz(
        state,
        action.selected,
        action.correct,
        action.selectedWord,
      );
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
