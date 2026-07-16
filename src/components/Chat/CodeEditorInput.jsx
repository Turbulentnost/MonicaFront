import Editor from '@monaco-editor/react';
import { useEffect, useRef } from 'react';

const PYTHON_KEYWORDS = [
  'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
  'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for',
  'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
];

const PYTHON_BUILTINS = [
  'abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'bytes', 'callable', 'chr',
  'classmethod', 'compile', 'complex', 'dict', 'dir', 'divmod', 'enumerate',
  'eval', 'exec', 'filter', 'float', 'format', 'frozenset', 'getattr',
  'globals', 'hasattr', 'hash', 'help', 'hex', 'id', 'input', 'int',
  'isinstance', 'issubclass', 'iter', 'len', 'list', 'locals', 'map', 'max',
  'memoryview', 'min', 'next', 'object', 'oct', 'open', 'ord', 'pow', 'print',
  'property', 'range', 'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
  'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple', 'type', 'vars',
  'zip', '__import__',
];

const PYTHON_SNIPPETS = [
  {
    label: 'def',
    insertText: 'def ${1:name}(${2:args}):\n\t${3:pass}',
    detail: 'function',
  },
  {
    label: 'class',
    insertText: 'class ${1:Name}:\n\tdef __init__(self${2:}):\n\t\t${3:pass}',
    detail: 'class',
  },
  {
    label: 'if',
    insertText: 'if ${1:condition}:\n\t${2:pass}',
    detail: 'if',
  },
  {
    label: 'for',
    insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',
    detail: 'for loop',
  },
  {
    label: 'while',
    insertText: 'while ${1:condition}:\n\t${2:pass}',
    detail: 'while loop',
  },
  {
    label: 'try',
    insertText: 'try:\n\t${1:pass}\nexcept ${2:Exception} as ${3:e}:\n\t${4:pass}',
    detail: 'try/except',
  },
  {
    label: 'with',
    insertText: 'with ${1:expr} as ${2:var}:\n\t${3:pass}',
    detail: 'with',
  },
  {
    label: 'main',
    insertText: 'if __name__ == "__main__":\n\t${1:main()}',
    detail: 'main guard',
  },
];

let pythonProviderRegistered = false;

function ensurePythonCompletions(monaco) {
  if (pythonProviderRegistered) return;
  pythonProviderRegistered = true;

  monaco.languages.registerCompletionItemProvider('python', {
    triggerCharacters: ['.', '_'],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions = [
        ...PYTHON_KEYWORDS.map((label) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: label,
          range,
        })),
        ...PYTHON_BUILTINS.map((label) => ({
          label,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: label,
          range,
        })),
        ...PYTHON_SNIPPETS.map((snip) => ({
          label: snip.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: snip.insertText,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: snip.detail,
          range,
        })),
      ];

      return { suggestions };
    },
  });
}

export function CodeEditorInput({
  value,
  language = 'python',
  onChange,
  onSubmit,
}) {
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;

  const monacoLang = language === 'javascript' ? 'javascript' : 'python';
  const tabSize = monacoLang === 'python' ? 4 : 2;

  const handleMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    ensurePythonCompletions(monaco);

    // Ctrl/Cmd+Enter — отправить файл
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onSubmitRef.current?.();
    });

    editor.focus();
  };

  useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const model = editor.getModel();
    if (model) {
      monaco.editor.setModelLanguage(model, monacoLang);
    }
    editor.updateOptions({ tabSize, detectIndentation: false });
  }, [monacoLang, tabSize]);

  return (
    <div className="code-editor-wrap monaco">
      <Editor
        height="320px"
        theme="vs-dark"
        language={monacoLang}
        value={value}
        onChange={(next) => onChange(next ?? '')}
        onMount={handleMount}
        loading={<div className="code-editor-loading">Загрузка редактора…</div>}
        options={{
          fontSize: 13,
          fontFamily: "ui-monospace, Consolas, 'Courier New', monospace",
          lineHeight: 20,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize,
          insertSpaces: true,
          detectIndentation: false,
          autoIndent: 'full',
          formatOnType: true,
          formatOnPaste: true,
          wordWrap: 'on',
          wrappingIndent: 'same',
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          padding: { top: 12, bottom: 12 },
          quickSuggestions: {
            other: true,
            comments: false,
            strings: true,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: 'on',
          acceptSuggestionOnCommitCharacter: true,
          tabCompletion: 'on',
          wordBasedSuggestions: 'currentDocument',
          snippetSuggestions: 'inline',
          suggest: {
            showKeywords: true,
            showSnippets: true,
            showWords: true,
            preview: true,
            insertMode: 'insert',
          },
          useTabStops: true,
          autoClosingBrackets: 'languageDefined',
          autoClosingQuotes: 'languageDefined',
          matchBrackets: 'always',
          bracketPairColorization: { enabled: true },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
        }}
      />
    </div>
  );
}
