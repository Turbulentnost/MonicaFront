/** Ensures only one message reaction hover bar is active at a time. */

let activeMessageId = null;
const listeners = new Set();

function notify() {
  listeners.forEach((fn) => {
    try {
      fn(activeMessageId);
    } catch {
      /* ignore listener errors */
    }
  });
}

export function claimReactionBar(messageId) {
  if (activeMessageId === messageId) return;
  activeMessageId = messageId;
  notify();
}

export function releaseReactionBar(messageId) {
  if (activeMessageId !== messageId) return;
  activeMessageId = null;
  notify();
}

export function subscribeReactionBar(listener) {
  listeners.add(listener);
  listener(activeMessageId);
  return () => listeners.delete(listener);
}

export function getActiveReactionBarId() {
  return activeMessageId;
}
