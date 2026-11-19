const configuredAudioBaseUrl = import.meta.env.VITE_WORD_AUDIO_BASE_URL?.trim();

export const WORD_AUDIO_BASE_URL =
  configuredAudioBaseUrl || "https://russian-vocab-audio.pages.dev/words";

export function normalizeAudioText(text) {
  return String(text || "")
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("ru-RU")
    .replace(/\s+/g, " ");
}

export function getWordAudioUrl(wordId) {
  return /^w\d{4}$/.test(wordId) ? `${WORD_AUDIO_BASE_URL}/${wordId}.mp3` : null;
}
