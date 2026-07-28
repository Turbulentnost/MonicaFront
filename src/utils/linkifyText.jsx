import { Fragment } from 'react';
import { renderTextWithAppleEmoji } from '../components/Chat/AppleEmoji';

/** Rough WEB_URL-like matcher (http(s), www., bare domains with path). */
const URL_RE =
  /(?:https?:\/\/|www\.)[^\s<]+|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<]*)?/gi;

const TRAILING_PUNCT = /[),.!?;:'"»]+$/;

export function normalizeUrl(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function extractUrls(text) {
  if (!text) return [];
  const found = [];
  const seen = new Set();
  const source = String(text);
  URL_RE.lastIndex = 0;
  let match = URL_RE.exec(source);
  while (match) {
    let raw = match[0];
    raw = raw.replace(TRAILING_PUNCT, '');
    const href = normalizeUrl(raw);
    if (href && !seen.has(href)) {
      seen.add(href);
      found.push({ raw, href, index: match.index });
    }
    match = URL_RE.exec(source);
  }
  return found;
}

export function firstUrl(text) {
  return extractUrls(text)[0] || null;
}

function pushText(parts, text, keyPrefix, keyRef) {
  if (!text) return;
  const rendered = renderTextWithAppleEmoji(text, `${keyPrefix}-${keyRef.current}`);
  if (rendered == null) return;
  if (Array.isArray(rendered)) {
    parts.push(<Fragment key={`t-${keyRef.current++}`}>{rendered}</Fragment>);
  } else if (typeof rendered === 'string') {
    parts.push(<Fragment key={`t-${keyRef.current++}`}>{rendered}</Fragment>);
  } else {
    parts.push(<Fragment key={`t-${keyRef.current++}`}>{rendered}</Fragment>);
  }
}

export function linkifyText(text) {
  if (text == null || text === '') return null;
  const source = String(text);
  const parts = [];
  const keyRef = { current: 0 };
  let cursor = 0;
  URL_RE.lastIndex = 0;
  let match = URL_RE.exec(source);
  while (match) {
    let raw = match[0];
    const start = match.index;
    const trimmed = raw.replace(TRAILING_PUNCT, '');
    const punct = raw.slice(trimmed.length);
    if (start > cursor) {
      pushText(parts, source.slice(cursor, start), 'pre', keyRef);
    }
    const href = normalizeUrl(trimmed);
    parts.push(
      <a
        key={`a-${keyRef.current++}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="message-link"
        onClick={(event) => event.stopPropagation()}
      >
        {trimmed}
      </a>,
    );
    if (punct) {
      pushText(parts, punct, 'punct', keyRef);
    }
    cursor = start + raw.length;
    match = URL_RE.exec(source);
  }
  if (cursor < source.length) {
    pushText(parts, source.slice(cursor), 'tail', keyRef);
  }
  return parts.length ? parts : source;
}
