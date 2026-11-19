import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Brain,
  BookOpen,
  ChevronRight,
  Ellipsis,
  House,
  LibraryBig,
  Settings,
  ShieldCheck,
  Star,
  X,
} from "lucide-react";

const navItems = [
  { id: "home", label: "今日学习", ru: "Сегодня", icon: House },
  { id: "study", label: "闪卡训练", ru: "Карточки", icon: BookOpen },
  { id: "library", label: "我的词库", ru: "Словарь", icon: LibraryBig },
  { id: "favorites", label: "收藏夹", ru: "Избранное", icon: Star },
  { id: "wrongbook", label: "错题本", ru: "Ошибки", icon: AlertTriangle },
  { id: "review", label: "复习", ru: "Повторение", icon: Brain },
  { id: "progress", label: "学习记录", ru: "Прогресс", icon: BarChart3 },
];

export function Sidebar({
  activeView,
  onNavigate,
  onOpenSettings,
  masteredCount,
  totalWords,
  streak,
  reviewCount,
  user,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const completion = Math.round((masteredCount / totalWords) * 100);
  const visibleNavItems =
    user?.role === "admin"
      ? [...navItems, { id: "admin", label: "管理", ru: "Админ", icon: ShieldCheck }]
      : navItems;
  const mobilePrimaryIds = ["home", "study", "library", "review"];
  const mobilePrimaryItems = visibleNavItems.filter((item) =>
    mobilePrimaryIds.includes(item.id),
  );
  const mobileSecondaryItems = visibleNavItems.filter(
    (item) => !mobilePrimaryIds.includes(item.id),
  );

  useEffect(() => {
    if (!moreOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  function go(nextView) {
    setMoreOpen(false);
    onNavigate(nextView);
  }

  return (
    <>
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate("home")} aria-label="回到首页">
          <span className="brand-mark">С</span>
          <span className="brand-copy">
            <strong>СЛОВО</strong>
            <small>俄语单词</small>
          </span>
        </button>

        <nav className="main-nav" aria-label="主导航">
          <p className="nav-label">学习空间</p>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => go(item.id)}
                aria-label={`${item.label} · ${item.ru}`}
                title={`${item.label} · ${item.ru}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span className="nav-item-copy">
                  <span>{item.label}</span>
                  <small>{item.ru}</small>
                </span>
                {activeView === item.id ? <span className="nav-active-dot" /> : null}
                {item.id === "review" && reviewCount > 0 ? (
                  <span className="nav-count">{reviewCount}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="collection-card">
          <div className="collection-topline">
            <span>词汇进度</span>
            <strong>{completion}%</strong>
          </div>
          <div className="collection-bar" aria-hidden="true">
            <span style={{ width: `${completion}%` }} />
          </div>
          <p>
            已掌握 {masteredCount} / {totalWords} 个词
          </p>
          <div className="collection-streak">
            <span>连续学习</span>
            <strong>{streak} 天</strong>
          </div>
        </div>

        <button className="sidebar-settings" onClick={onOpenSettings}>
          <Settings size={17} strokeWidth={1.8} />
          <span>学习设置</span>
        </button>
      </aside>

      <nav className="mobile-nav" aria-label="移动端导航">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeView === item.id ? "active" : ""}
              key={item.id}
              onClick={() => go(item.id)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>
                {item.id === "home"
                  ? "学习"
                  : item.id === "study"
                    ? "训练"
                    : item.id === "library"
                      ? "词库"
                      : "复习"}
              </span>
            </button>
          );
        })}
        <button
          className={moreOpen ? "active" : ""}
          onClick={() => setMoreOpen((current) => !current)}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-sheet"
        >
          <Ellipsis size={21} strokeWidth={1.9} />
          <span>更多</span>
        </button>
      </nav>

      <div
        className={`mobile-more-layer ${moreOpen ? "open" : ""}`}
        aria-hidden={!moreOpen}
      >
        <button
          className="mobile-more-scrim"
          aria-label="关闭更多导航"
          tabIndex={moreOpen ? 0 : -1}
          onClick={() => setMoreOpen(false)}
        />
        <section
          className="mobile-more-sheet"
          id="mobile-more-sheet"
          aria-label="更多导航"
        >
          <header>
            <div>
              <small>СЛОВО · НАВИГАЦИЯ</small>
              <strong>更多学习空间</strong>
            </div>
            <button
              className="icon-button"
              onClick={() => setMoreOpen(false)}
              aria-label="关闭更多导航"
            >
              <X size={19} />
            </button>
          </header>
          <div className="mobile-more-user">
            <span>{user?.username?.slice(0, 1).toUpperCase() || "С"}</span>
            <div>
              <strong>{user?.username}</strong>
              <small>{user?.role === "admin" ? "管理员账号" : "学习账号"}</small>
            </div>
          </div>
          <div className="mobile-more-links">
            {mobileSecondaryItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} onClick={() => go(item.id)}>
                  <Icon size={18} />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.ru}</small>
                  </span>
                  <ChevronRight size={16} />
                </button>
              );
            })}
            <button
              onClick={() => {
                setMoreOpen(false);
                onOpenSettings();
              }}
            >
              <Settings size={18} />
              <span>
                <strong>学习设置</strong>
                <small>Настройки</small>
              </span>
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
