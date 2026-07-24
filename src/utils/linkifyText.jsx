import { Fragment } from 'react';

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

export function linkifyText(text) {
  if (text == null || text === '') return null;
  const source = String(text);
  const parts = [];
  let cursor = 0;
  let key = 0;
  URL_RE.lastIndex = 0;
  let match = URL_RE.exec(source);
  while (match) {
    let raw = match[0];
    const start = match.index;
    const trimmed = raw.replace(TRAILING_PUNCT, '');
    const punct = raw.slice(trimmed.length);
    if (start > cursor) {
      parts.push(<Fragment key={`t-${key++}`}>{source.slice(cursor, start)}</Fragment>);
    }
    const href = normalizeUrl(trimmed);
    parts.push(
      <a
        key={`a-${key++}`}
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
      parts.push(<Fragment key={`p-${key++}`}>{punct}</Fragment>);
    }
    cursor = start + raw.length;
    match = URL_RE.exec(source);
  }
  if (cursor < source.length) {
    parts.push(<Fragment key={`t-${key++}`}>{source.slice(cursor)}</Fragment>);
  }
  return parts.length ? parts : source;
}
