import { usePrivateSession } from '../../hooks/usePrivateSession';

export function PrivatePanel({ sessionId, partnerNickname, onClose }) {
  const { connected, myText, peerText, updateMyText, closeSession } = usePrivateSession(
    sessionId,
    { onClosed: onClose }
  );

  const handleClose = async () => {
    await closeSession();
  };

  return (
    <aside className="private-panel">
      <div className="private-panel-header">
        <div>
          <h3>Приватный чат</h3>
          <span className="private-panel-status">
            {connected ? 'в реальном времени' : 'подключение…'} · @{partnerNickname || '—'}
          </span>
        </div>
        <button type="button" className="btn-text" onClick={handleClose}>
          Закрыть
        </button>
      </div>
      <div className="private-panel-panes">
        <div className="private-pane">
          <span className="private-pane-label">Вы пишете</span>
          <textarea
            value={myText}
            onChange={(e) => updateMyText(e.target.value)}
            placeholder="Просто пишите — собеседник видит текст сразу…"
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="private-pane">
          <span className="private-pane-label">@{partnerNickname || 'Собеседник'} пишет</span>
          <textarea
            value={peerText}
            readOnly
            placeholder="Здесь появляется текст собеседника в реальном времени…"
            spellCheck={false}
          />
        </div>
      </div>
    </aside>
  );
}
