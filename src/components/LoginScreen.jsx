import { useState } from "react";
import { ArrowRight, BookOpen, Eye, EyeOff, KeyRound, UserRound } from "lucide-react";

export function LoginScreen({ onLogin, onRegister, message = "" }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("两次输入的密码不一致");
        }
        await onRegister(username.trim(), password, confirmPassword);
      } else {
        await onLogin(username.trim(), password);
      }
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
          <h1>让每个账号，<br />都有自己的俄语进度</h1>
          <p>
            分组练习、三轮测验、复习池和动态间隔都会按账号独立保存。管理员可以为所有用户增加新的兼容词书。
          </p>
        </div>
        <div className="login-feature-list">
          <span>
            <BookOpen size={17} />
            8 本词书 · 4000 词
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
            <span className="eyebrow-text dark">
              {mode === "login" ? "ВХОД" : "РЕГИСТРАЦИЯ"}
            </span>
            <h2>{mode === "login" ? "登录学习账号" : "注册新用户"}</h2>
            <p>
              {mode === "login"
                ? "使用账号和密码继续学习。"
                : "用户名不能与已有账号重复，密码至少 8 位。"}
            </p>
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
            <span>{mode === "login" ? "密码" : "设置密码"}</span>
            <div>
              <KeyRound size={17} />
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
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

          {mode === "register" ? (
            <label className="login-field">
              <span>再次输入密码</span>
              <div>
                <KeyRound size={17} />
                <input
                  autoComplete="new-password"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="再次输入密码"
                />
              </div>
            </label>
          ) : null}

          {error ? <div className="login-error" role="alert">{error}</div> : null}

          <button
            className="primary-button login-submit"
            disabled={
              submitting ||
              !username.trim() ||
              !password ||
              (mode === "register" && !confirmPassword)
            }
          >
            {submitting
              ? mode === "login"
                ? "正在登录…"
                : "正在注册…"
              : mode === "login"
                ? "进入学习空间"
                : "创建账号并登录"}
            {!submitting ? <ArrowRight size={17} /> : null}
          </button>

          <button
            type="button"
            className="login-mode-switch"
            onClick={() => {
              setMode((current) => (current === "login" ? "register" : "login"));
              setError("");
              setConfirmPassword("");
            }}
          >
            {mode === "login" ? "还没有账号？注册新用户" : "已有账号？返回登录"}
          </button>

          <p className="login-note">学习进度、复习计划和错题本会同步到当前账号。</p>
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
