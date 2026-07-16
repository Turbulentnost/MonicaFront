export function MessageBubble({ message, isOwn }) {
  const content =
    message.message_type === 'text'
      ? message.content
      : `[${message.message_type}] ${message.content}`;

  return (
    <div className={`message ${isOwn ? 'own' : 'other'}`}>
      <div className="message-meta">{message.sender?.nickname}</div>
      <div className="message-content">{content}</div>
      <div className="message-time">
        {new Date(message.sent_at).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}
