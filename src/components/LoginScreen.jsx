import { useState } from "react";
import { ArrowRight, BookOpen, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";

export function LoginScreen({ onLogin, message = "" }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onLogin(username.trim(), password);
    } catch (loginError) {
      setError(loginError.message || "登录失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-editorial">
        <div className="login-brand">
          <span>С</span>
          <div>
            <strong>СЛОВО</strong>
            <small>俄语高频词</small>
          </div>
        </div>
        <div className="login-copy">
          <span>СЛОВА · ПАМЯТЬ · ПРАКТИКА</span>
          <h1>让每个账号，<br />都有自己的俄语进度。</h1>
          <p>
            分组练习、三轮测验、复习池和动态间隔都会按账号独立保存。管理员可以为所有用户增加新的兼容词书。
          </p>
        </div>
        <div className="login-feature-list">
          <span>
            <BookOpen size={17} />
            6 本词书 · 3000 词
          </span>
          <span>
            <KeyRound size={17} />
            账号独立保存
          </span>
        </div>
        <div className="login-letter" aria-hidden="true">Я</div>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <div className="login-form-heading">
            <span className="eyebrow-text dark">ВХОД</span>
            <h2>登录学习账号</h2>
            <p>使用管理员分配的账号和密码继续学习。</p>
          </div>

          {message ? <div className="login-message">{message}</div> : null}

          <label className="login-field">
            <span>账号</span>
            <div>
              <UserRound size={17} />
              <input
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="请输入账号"
              />
            </div>
          </label>

          <label className="login-field">
            <span>密码</span>
            <div>
              <KeyRound size={17} />
              <input
                autoComplete="current-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "隐藏密码" : "显示密码"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error ? <div className="login-error" role="alert">{error}</div> : null}

          <button
            className="primary-button login-submit"
            disabled={submitting || !username.trim() || !password}
          >
            {submitting ? "正在登录…" : "进入学习空间"}
            {!submitting ? <ArrowRight size={17} /> : null}
          </button>

          <p className="login-note">进度、复习池和 Wordbook 选择会保存在当前账号中。</p>
        </form>
      </section>
    </main>
  );
}

export function AuthLoading() {
  return (
    <main className="auth-loading">
      <span className="brand-mark">С</span>
      <p>正在读取账号和学习进度…</p>
    </main>
  );
}
