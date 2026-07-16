import { useState } from 'react';

export function NotificationBell({
  open,
  onToggle,
  unreadCount,
  items,
  onAccept,
  onDecline,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
}) {
  const [busyId, setBusyId] = useState(null);

  const isPendingInvite = (n) =>
    n.notification_type === 'private_invite'
    && n.payload?.session_id
    && !n.payload?.resolved;

  const runAction = async (id, action) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await action();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="notif-bell-wrap">
      <button type="button" className="notif-bell-btn" onClick={onToggle} title="Уведомления">
        <span className="notif-bell-icon" aria-hidden>
          🔔
        </span>
        {unreadCount > 0 && <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dropdown-header">
            <span>Уведомления</span>
            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button type="button" className="btn-text" onClick={onMarkAllRead}>
                  Прочитать все
                </button>
              )}
              {items.length > 0 && (
                <button type="button" className="btn-text" onClick={onClearAll}>
                  Очистить
                </button>
              )}
            </div>
          </div>
          {items.length === 0 ? (
            <div className="notif-empty">Нет уведомлений</div>
          ) : (
            <ul className="notif-list">
              {items.map((n) => (
                <li key={n.id} className={n.is_read ? 'read' : 'unread'}>
                  <div className="notif-title">{n.title}</div>
                  {n.body && <div className="notif-body">{n.body}</div>}
                  {isPendingInvite(n) && (
                    <div className="notif-actions">
                      <button
                        type="button"
                        className="notif-accept"
                        disabled={busyId === n.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          runAction(n.id, () => onAccept(n));
                        }}
                      >
                        Принять
                      </button>
                      <button
                        type="button"
                        className="notif-decline"
                        disabled={busyId === n.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          runAction(n.id, () => onDecline(n));
                        }}
                      >
                        Отклонить
                      </button>
                    </div>
                  )}
                  {n.notification_type === 'private_invite' && n.payload?.resolved === 'declined' && (
                    <div className="notif-resolved">Отклонено</div>
                  )}
                  {n.notification_type === 'private_invite' && n.payload?.resolved === 'accepted' && (
                    <div className="notif-resolved">Принято</div>
                  )}
                  {n.notification_type === 'private_invite' && n.payload?.resolved === 'cancelled' && (
                    <div className="notif-resolved">Отменено</div>
                  )}
                  {!n.is_read && !isPendingInvite(n) && (
                    <button
                      type="button"
                      className="btn-text notif-mark"
                      onClick={() => onMarkRead(n.id)}
                    >
                      Прочитано
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
