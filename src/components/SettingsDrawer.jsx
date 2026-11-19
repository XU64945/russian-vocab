import {
  Cloud,
  Headphones,
  KeyRound,
  LogOut,
  RefreshCw,
  RotateCcw,
  UserRound,
  Volume2,
  X,
} from "lucide-react";

export function SettingsDrawer({
  open,
  settings,
  onChange,
  onClose,
  onTestVoice,
  onReset,
  user,
  onChangePassword,
  onLogout,
  cloudSyncedAt,
  onSyncNow,
}) {
  return (
    <div className={`drawer-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="drawer-scrim" onClick={onClose} tabIndex={open ? 0 : -1} aria-label="关闭设置" />
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="drawer-header">
          <div>
            <span className="eyebrow-text dark">НАСТРОЙКИ</span>
            <h2 id="settings-title">学习设置</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭设置">
            <X size={20} />
          </button>
        </header>

        <div className="drawer-content">
          <section className="settings-group account-settings-group">
            <div className="settings-group-title">
              <UserRound size={18} />
              <div>
                <strong>{user.username}</strong>
                <span>{user.role === "admin" ? "管理员账号" : "普通用户"}</span>
              </div>
            </div>
            <div className="account-settings-actions">
              <button className="secondary-button" onClick={onChangePassword}>
                <KeyRound size={16} />
                修改密码
              </button>
              <button className="danger-outline-button" onClick={onLogout}>
                <LogOut size={15} />
                退出登录
              </button>
            </div>
          </section>

          <section className="settings-group">
            <div className="settings-group-title">
              <Volume2 size={18} />
              <div>
                <strong>朗读</strong>
                <span>使用当前设备提供的俄语语音</span>
              </div>
            </div>

            <label className="range-field">
              <span>
                语速
                <strong>{settings.speechRate.toFixed(1)}×</strong>
              </span>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={settings.speechRate}
                onChange={(event) => onChange({ speechRate: Number(event.target.value) })}
              />
              <div className="range-ends">
                <small>慢</small>
                <small>快</small>
              </div>
            </label>

            <label className="toggle-row">
              <span>
                <strong>自动朗读新词</strong>
                <small>进入下一张卡片时自动播放</small>
              </span>
              <input
                type="checkbox"
                checked={settings.autoPlay}
                onChange={(event) => onChange({ autoPlay: event.target.checked })}
              />
              <i className="toggle-track" aria-hidden="true" />
            </label>

            <button className="secondary-button test-voice-button" onClick={onTestVoice}>
              <Headphones size={17} />
              试听 “Путешествие”
            </button>
            <details className="voice-help">
              <summary>手机没有声音或提示不支持语音合成</summary>
              <p>
                请改用手机自带的外部浏览器：iPhone 使用 Safari，Android
                使用 Google Chrome，不要使用微信、QQ 等 App 内置浏览器。
              </p>
              <p>
                iPhone：设置 → 辅助功能 → 朗读内容 → 声音 → 俄语。
                Android：设置 → 系统 → 语言和输入法 → 文字转语音输出，安装俄语语音。
              </p>
            </details>
          </section>

          <section className="settings-group">
            <div className="settings-group-title">
              <Cloud size={18} />
              <div>
                <strong>云端同步</strong>
                <span>切换设备后登录同一账号即可读取最新进度</span>
              </div>
            </div>
            <p className="settings-explainer">
              {cloudSyncedAt
                ? `最近同步：${new Intl.DateTimeFormat("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(cloudSyncedAt))}`
                : "尚未建立云端同步记录。"}
            </p>
            <button className="secondary-button" onClick={onSyncNow}>
              <RefreshCw size={16} />
              立即同步到云端
            </button>
          </section>

          <section className="settings-group">
            <div className="settings-group-title">
              <RotateCcw size={18} />
              <div>
                <strong>重置进度</strong>
                <span>掌握记录按当前账号独立保存在云端</span>
              </div>
            </div>
            <p className="settings-explainer">
              清除后，词书仍会保留，但当前账号的今日进度、掌握状态和待复习词会被重置。
            </p>
            <button className="danger-outline-button" onClick={onReset}>
              清除学习进度
            </button>
          </section>
        </div>

        <footer className="drawer-footer">
          <p>СЛОВО · 专注俄语的小词库</p>
          <span>账号独立保存 · 当前词书</span>
        </footer>
      </aside>
    </div>
  );
}
