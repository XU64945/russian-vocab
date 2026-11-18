import { createContext, useContext, useMemo } from "react";

const WordbookContext = createContext({
  book: null,
  words: [],
  topics: [],
  topicMap: {},
});

export function WordbookProvider({ book, children }) {
  const value = useMemo(() => {
    const words = book?.words || [];
    const topics = book?.topics || [];
    return {
      book,
      words,
      topics,
      topicMap: Object.fromEntries(topics.map((topic) => [topic.id, topic])),
    };
  }, [book]);

  return (
    <WordbookContext.Provider value={value}>
      {children}
    </WordbookContext.Provider>
  );
}

export function useWordbook() {
  return useContext(WordbookContext);
}
