export const USER_SESSION_EVENT = "urbanforge:user-session-changed";

export function notifyUserSessionChanged() {
  try { localStorage.setItem(USER_SESSION_EVENT, crypto.randomUUID()); }
  catch { /* Session queries still refresh when the window regains focus. */ }
}
