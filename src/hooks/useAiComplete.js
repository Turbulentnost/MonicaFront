import { useCallback, useEffect, useRef, useState } from 'react';
import { aiApi } from '../api/client';

const DEFAULT_DEBOUNCE_MS = 380;
const MIN_DRAFT_LEN = 8;

/**
 * Ghost-text completion for the chat composer.
 * Returns the suggestion suffix (continuation only).
 */
export function useAiComplete({
  draft,
  chatId = null,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  refreshKey = 0,
}) {
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [styleEnabled, setStyleEnabled] = useState(true);
  const abortRef = useRef(null);
  const requestSeqRef = useRef(0);
  const lastFetchedDraftRef = useRef('');

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
    lastFetchedDraftRef.current = '';
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const setEnabled = useCallback(async (nextEnabled) => {
    setStyleEnabled(Boolean(nextEnabled));
    if (!nextEnabled) clearSuggestion();
    try {
      const { data } = await aiApi.updateStyle({ enabled: Boolean(nextEnabled) });
      setStyleEnabled(data?.enabled !== false);
      return data;
    } catch {
      return null;
    }
  }, [clearSuggestion]);

  useEffect(() => {
    if (!enabled || !styleEnabled) {
      setSuggestion('');
      setLoading(false);
      return undefined;
    }

    const text = String(draft || '');
    if (text.trim().length < MIN_DRAFT_LEN) {
      setSuggestion('');
      setLoading(false);
      lastFetchedDraftRef.current = '';
      return undefined;
    }

    if (text === lastFetchedDraftRef.current) {
      return undefined;
    }

    // Draft changed — drop stale ghost immediately
    setSuggestion('');

    const timer = setTimeout(async () => {
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
        if (seq !== requestSeqRef.current) return;
        lastFetchedDraftRef.current = text;
        if (data?.disabled || data?.rate_limited || data?.error) {
          setSuggestion('');
          if (data?.detail === 'llm_unavailable') {
            // Soft signal in console for debugging; UI stays calm.
            // eslint-disable-next-line no-console
            console.warn('[ai] LLM unavailable — check OPENAI_BASE_URL / LM Studio network');
          }
        } else {
          setSuggestion(String(data?.suggestion || ''));
        }
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        if (seq !== requestSeqRef.current) return;
        setSuggestion('');
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
    };
  }, [draft, chatId, enabled, styleEnabled, debounceMs]);

  const acceptAll = useCallback(() => {
    if (!suggestion) return '';
    const next = `${draft || ''}${suggestion}`;
    setSuggestion('');
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

  return {
    suggestion,
    loading,
    styleEnabled,
    setEnabled,
    clearSuggestion,
    acceptAll,
    acceptWord,
  };
}
