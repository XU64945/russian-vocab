import { LibraryBig, Settings2 } from "lucide-react";

export function TopBar({
  date,
  onOpenSettings,
  wordbooks,
  activeBookId,
  onBookChange,
}) {
  return (
    <header className="topbar">
      <div className="date-line">
        <span className="date-dot" />
        <span>{date}</span>
      </div>
      <div className="topbar-right">
        <label className="wordbook-select">
          <LibraryBig size={16} />
          <select value={activeBookId || ""} onChange={(event) => onBookChange(event.target.value)}>
            {wordbooks.map((book) => (
              <option key={book.id} value={book.id}>
                {book.title}
              </option>
            ))}
          </select>
        </label>
        <button className="icon-button topbar-settings" onClick={onOpenSettings} aria-label="打开设置">
          <Settings2 size={19} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
