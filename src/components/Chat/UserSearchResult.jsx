import { UserAvatar } from './UserAvatar';

export function UserSearchResult({ user, onSelect }) {
  return (
    <li>
      <button type="button" className="search-result-btn" onClick={() => onSelect(user.id)}>
        <UserAvatar user={user} size={36} />
        <span className="search-result-text">
          <span className="search-result-nick">@{user.nickname}</span>
          <span className="search-result-name">
            {user.first_name} {user.last_name}
          </span>
        </span>
      </button>
    </li>
  );
}
