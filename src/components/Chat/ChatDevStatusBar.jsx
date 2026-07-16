export function ChatDevStatusBar() {
  return (
    <div className="chat-dev-statusbar" aria-hidden="true">
      <span className="chat-dev-statusbar__branch">front/redesign</span>
      <span className="chat-dev-statusbar__sep">|</span>
      <span className="chat-dev-statusbar__item chat-dev-statusbar__item--ok">● connected</span>
      <span className="chat-dev-statusbar__sep">|</span>
      <span className="chat-dev-statusbar__item">UTF-8</span>
      <span className="chat-dev-statusbar__sep">|</span>
      <span className="chat-dev-statusbar__item">React 19</span>
      <span className="chat-dev-statusbar__right">Ln 1, Col 1</span>
    </div>
  );
}
