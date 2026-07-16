import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import javascriptLang from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import pythonLang from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

SyntaxHighlighter.registerLanguage('python', pythonLang);
SyntaxHighlighter.registerLanguage('javascript', javascriptLang);

const highlightStyle = {
  ...vscDarkPlus,
  'pre[class*="language-"]': {
    ...vscDarkPlus['pre[class*="language-"]'],
    margin: 0,
    padding: 0,
    background: 'transparent',
    fontSize: '13px',
    lineHeight: 1.45,
    fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflow: 'visible',
  },
  'code[class*="language-"]': {
    ...vscDarkPlus['code[class*="language-"]'],
    background: 'transparent',
    fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
    textShadow: 'none',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
};

export const CodeEditorInput = forwardRef(function CodeEditorInput(
  {
    value,
    language = 'python',
    onChange,
    onKeyDown,
    onBlur,
    placeholder = '// Введите код…',
  },
  ref
) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);

  useImperativeHandle(ref, () => textareaRef.current);

  const syncScroll = () => {
    const ta = textareaRef.current;
    const hi = highlightRef.current;
    if (!ta || !hi) return;
    hi.scrollTop = ta.scrollTop;
    hi.scrollLeft = ta.scrollLeft;
  };

  const resize = () => {
    const ta = textareaRef.current;
    const hi = highlightRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    const height = Math.min(Math.max(ta.scrollHeight, 96), 360);
    ta.style.height = `${height}px`;
    if (hi) {
      hi.style.height = `${height}px`;
    }
  };

  useEffect(() => {
    resize();
    syncScroll();
  }, [value, language]);

  const prismLang = language === 'javascript' ? 'javascript' : 'python';
  // Trailing newline иначе не рисуется последняя пустая строка
  const highlightValue = value ? (value.endsWith('\n') ? `${value} ` : value) : ' ';

  return (
    <div className={`code-editor-wrap ${value ? '' : 'is-empty'}`}>
      <div className="code-editor-highlight" ref={highlightRef} aria-hidden="true">
        <SyntaxHighlighter
          language={prismLang}
          style={highlightStyle}
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            maxHeight: 'none',
            overflow: 'visible',
          }}
          codeTagProps={{ style: { fontFamily: 'inherit' } }}
          PreTag="div"
        >
          {highlightValue}
        </SyntaxHighlighter>
      </div>
      {!value && (
        <div className="code-editor-placeholder" aria-hidden="true">
          {placeholder}
        </div>
      )}
      <textarea
        ref={textareaRef}
        className="code-editor-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={4}
        aria-label="Редактор кода"
      />
    </div>
  );
});
