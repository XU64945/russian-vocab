import { Settings2 } from "lucide-react";
import { MorphSelect } from "./ui/MorphSelect";

export function TopBar({
  date,
  pageName,
  onOpenSettings,
  wordbooks,
  activeBookId,
  onBookChange,
}) {
  return (
    <header className="topbar">
      <div className="date-line">
        <span className="topbar-wordmark" aria-label="СЛОВО 俄语单词">С</span>
        <span className="date-dot" />
        <div>
          <small>{date}</small>
          <strong>{pageName}</strong>
        </div>
      </div>
      <div className="topbar-right">
        <MorphSelect
          items={wordbooks.map((book) => ({
            value: book.id,
            label: book.title,
          }))}
          value={activeBookId || ""}
          onChange={onBookChange}
        />
        <button className="icon-button topbar-settings" onClick={onOpenSettings} aria-label="打开设置">
          <Settings2 size={19} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
