import pinIcon from '../../assets/icons/chat-actions/pin.png';
import replyIcon from '../../assets/icons/chat-actions/reply.png';
import forwardIcon from '../../assets/icons/chat-actions/forward.png';
import editIcon from '../../assets/icons/chat-actions/edit.png';
import copyIcon from '../../assets/icons/chat-actions/copy.png';
import deleteIcon from '../../assets/icons/chat-actions/delete.png';

export function ActionIcon({ src, size = 16, className = '' }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={['action-icon', className].filter(Boolean).join(' ')}
      draggable={false}
      aria-hidden="true"
    />
  );
}

export function ReplyActionIcon({ size = 16, className }) {
  return <ActionIcon src={replyIcon} size={size} className={className} />;
}

export function ForwardActionIcon({ size = 16, className }) {
  return <ActionIcon src={forwardIcon} size={size} className={className} />;
}

export function EditActionIcon({ size = 16, className }) {
  return <ActionIcon src={editIcon} size={size} className={className} />;
}

export function CopyActionIcon({ size = 16, className }) {
  return <ActionIcon src={copyIcon} size={size} className={className} />;
}

export function PinActionIcon({ size = 16, className }) {
  return <ActionIcon src={pinIcon} size={size} className={className} />;
}

export function DeleteActionIcon({ size = 16, className }) {
  return <ActionIcon src={deleteIcon} size={size} className={className} />;
}
