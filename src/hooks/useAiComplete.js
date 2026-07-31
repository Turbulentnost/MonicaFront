import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../api/client';

const MIN_DRAFT_LEN = 1;
const DEFAULT_DEBOUNCE_MS = 450;
const RELATED_PREF_KEY = 'monica.ai.showRelatedMessages';

function readShowRelatedPref() {
  try {
    const raw = localStorage.getItem(RELATED_PREF_KEY);
    if (raw === null) return true;
    return raw !== '0' && raw !== 'false';
  } catch {
    return true;
  }
}

function writeShowRelatedPref(value) {
  try {
    localStorage.setItem(RELATED_PREF_KEY, value ? '1' : '0');
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Ghost-text completion for the chat composer.
 * Suggestions run only while Reason mode is active (composer sparkles toggle).
 */
export function useAiComplete({
  draft,
  chatId = null,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  refreshKey = 0,
}) {
  const [suggestion, setSuggestion] = useState('');
  const [relatedMessages, setRelatedMessages] = useState([]);
  const [relatedDismissed, setRelatedDismissed] = useState(false);
  const [showRelatedPanel, setShowRelatedPanelState] = useState(readShowRelatedPref);
  const [loading, setLoading] = useState(false);
  const [styleEnabled, setStyleEnabled] = useState(true);
  const [reasonActive, setReasonActive] = useState(false);
  const abortRef = useRef(null);
  const requestSeqRef = useRef(0);
  const lastFetchedDraftRef = useRef('');

  const setShowRelatedPanel = useCallback((next) => {
    const value = Boolean(next);
    setShowRelatedPanelState(value);
    writeShowRelatedPref(value);
    if (value) setRelatedDismissed(false);
  }, []);

  const dismissRelatedPanel = useCallback(() => {
    setRelatedDismissed(true);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    aiApi
      .getStyle()
      .then(({ data }) => {
        if (!cancelled) setStyleEnabled(data?.enabled !== false);
      })
      .catch(() => {
        if (!cancelled) setStyleEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  const clearSuggestion = useCallback(() => {
    setSuggestion('');
    setRelatedMessages([]);
    setRelatedDismissed(false);
    lastFetchedDraftRef.current = '';
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const setEnabled = useCallback(async (nextEnabled) => {
    setStyleEnabled(Boolean(nextEnabled));
    if (!nextEnabled) {
      setReasonActive(false);
      clearSuggestion();
    }
    try {
      const { data } = await aiApi.updateStyle({ enabled: Boolean(nextEnabled) });
      setStyleEnabled(data?.enabled !== false);
      return data;
    } catch {
      return null;
    }
  }, [clearSuggestion]);

  const fetchComplete = useCallback(async (text) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++requestSeqRef.current;
    setLoading(true);
    try {
      const { data } = await aiApi.complete(
        { draft: text, chat_id: chatId || undefined },
        { signal: controller.signal, timeout: 30000 }
      );
      if (seq !== requestSeqRef.current) return false;
      lastFetchedDraftRef.current = text;
      if (data?.disabled || data?.rate_limited || data?.error) {
        setSuggestion('');
        setRelatedMessages(Array.isArray(data?.related_messages) ? data.related_messages : []);
        setRelatedDismissed(false);
        if (data?.detail === 'llm_unavailable') {
          // eslint-disable-next-line no-console
          console.warn('[ai] LLM unavailable — check OPENAI_BASE_URL / LM Studio network');
        }
        return false;
      }
      const next = String(data?.suggestion || '');
      setSuggestion(next);
      setRelatedMessages(Array.isArray(data?.related_messages) ? data.related_messages : []);
      setRelatedDismissed(false);
      return Boolean(next);
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return false;
      if (seq !== requestSeqRef.current) return false;
      setSuggestion('');
      setRelatedMessages([]);
      return false;
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }, [chatId]);

  useEffect(() => {
    if (!enabled || !styleEnabled || !reasonActive) {
      setSuggestion('');
      setRelatedMessages([]);
      setRelatedDismissed(false);
      setLoading(false);
      lastFetchedDraftRef.current = '';
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      return undefined;
    }

    const text = String(draft || '');
    if (text.trim().length < MIN_DRAFT_LEN) {
      setSuggestion('');
      setRelatedMessages([]);
      setRelatedDismissed(false);
      setLoading(false);
      lastFetchedDraftRef.current = '';
      return undefined;
    }

    if (text === lastFetchedDraftRef.current) {
      return undefined;
    }

    // Every character cancels the old request and restarts the pause timer.
    // Request only after the user has stopped typing for debounceMs.
    setSuggestion('');
    setRelatedMessages([]);
    setRelatedDismissed(false);
    setLoading(false);
    requestSeqRef.current += 1;
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const timer = setTimeout(() => {
      fetchComplete(text);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      requestSeqRef.current += 1;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [draft, chatId, enabled, styleEnabled, reasonActive, debounceMs, fetchComplete]);

  const acceptAll = useCallback(() => {
    if (!suggestion) return '';
    const next = `${draft || ''}${suggestion}`;
    setSuggestion('');
    setRelatedMessages([]);
    lastFetchedDraftRef.current = next;
    return next;
  }, [draft, suggestion]);

  const acceptWord = useCallback(() => {
    if (!suggestion) return null;
    const match = suggestion.match(/^(\s*\S+\s*)/);
    if (!match) {
      return acceptAll();
    }
    const chunk = match[1];
    const rest = suggestion.slice(chunk.length);
    const next = `${draft || ''}${chunk}`;
    setSuggestion(rest);
    lastFetchedDraftRef.current = next;
    return next;
  }, [acceptAll, draft, suggestion]);

  const toggleReason = useCallback(() => {
    setReasonActive((prev) => {
      if (prev) {
        setSuggestion('');
        setRelatedMessages([]);
        setRelatedDismissed(false);
        lastFetchedDraftRef.current = '';
        if (abortRef.current) {
          abortRef.current.abort();
          abortRef.current = null;
        }
        setLoading(false);
        return false;
      }
      // Activate: clear cache so the effect refetches for the current draft.
      lastFetchedDraftRef.current = '';
      return true;
    });
  }, []);

  // Reset Reason mode when leaving the chat / disabling composer AI.
  useEffect(() => {
    if (!enabled) {
      setReasonActive(false);
      clearSuggestion();
    }
  }, [enabled, clearSuggestion]);

  useEffect(() => {
    setReasonActive(false);
    clearSuggestion();
  }, [chatId, clearSuggestion]);

  return {
    suggestion,
    relatedMessages,
    relatedDismissed,
    showRelatedPanel,
    setShowRelatedPanel,
    dismissRelatedPanel,
    loading,
    styleEnabled,
    reasonActive,
    setEnabled,
    clearSuggestion,
    acceptAll,
    acceptWord,
    toggleReason,
  };
}
