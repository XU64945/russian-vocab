export const REGISTER_BROWSER_TIP_KEY = "slovo.register-browser-tip.v1";
export const AUDIO_BROWSER_TIP_KEY = "slovo.audio-browser-tip.v1";

export function hasSeenNotice(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

export function markNoticeSeen(key) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    // A blocked storage API should not hide the current-session notice.
  }
}
