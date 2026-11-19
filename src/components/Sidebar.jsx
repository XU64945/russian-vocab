import {
  BarChart3,
  Brain,
  BookOpen,
  House,
  LibraryBig,
  Settings,
  ShieldCheck,
  Star,
} from "lucide-react";

const navItems = [
  { id: "home", label: "今日学习", ru: "Сегодня", icon: House },
  { id: "study", label: "闪卡训练", ru: "Карточки", icon: BookOpen },
  { id: "library", label: "我的词库", ru: "Словарь", icon: LibraryBig },
  { id: "favorites", label: "收藏夹", ru: "Избранное", icon: Star },
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
  const completion = Math.round((masteredCount / totalWords) * 100);
  const visibleNavItems =
    user?.role === "admin"
      ? [...navItems, { id: "admin", label: "管理", ru: "Админ", icon: ShieldCheck }]
      : navItems;
  const mobileNavItems = [
    ...visibleNavItems.filter(
      (item) =>
        item.id !== "study" &&
        (user?.role === "admin" ? item.id !== "progress" : true),
    ),
  ];

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
                onClick={() => onNavigate(item.id)}
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
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeView === item.id ? "active" : ""}
              key={item.id}
              onClick={() => onNavigate(item.id)}
            >
              <Icon size={20} strokeWidth={1.8} />
              <span>{item.label.replace("我的", "").replace("今日", "")}</span>
            </button>
          );
        })}
        <button onClick={onOpenSettings}>
          <Settings size={20} strokeWidth={1.8} />
          <span>设置</span>
        </button>
      </nav>
    </>
  );
}
