import { useState } from "react";
import { KeyRound, X } from "lucide-react";

export function PasswordChangeModal({ open, onClose, onSubmit }) {
  const [values, setValues] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (values.newPassword !== values.confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    if (values.newPassword === values.currentPassword) {
      setError("新密码不能与当前密码相同");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (submitError) {
      setError(submitError.message || "修改密码失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`password-modal-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="password-modal-scrim" onClick={onClose} aria-label="关闭修改密码" />
      <form className="password-modal" onSubmit={submit} role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="eyebrow-text dark">БЕЗОПАСНОСТЬ</span>
            <h2>修改密码</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <p>修改成功后当前登录会退出，请使用新密码重新登录。</p>
        {[
          ["currentPassword", "当前密码"],
          ["newPassword", "新密码"],
          ["confirmPassword", "再次输入新密码"],
        ].map(([field, label]) => (
          <label className="login-field" key={field}>
            <span>{label}</span>
            <div>
              <KeyRound size={16} />
              <input
                type="password"
                autoComplete={field === "currentPassword" ? "current-password" : "new-password"}
                value={values[field]}
                onChange={(event) => update(field, event.target.value)}
              />
            </div>
          </label>
        ))}
        {error ? <div className="login-error">{error}</div> : null}
        <button
          className="primary-button"
          disabled={
            submitting ||
            !values.currentPassword ||
            !values.newPassword ||
            !values.confirmPassword
          }
        >
          {submitting ? "正在修改…" : "确认修改并退出登录"}
        </button>
      </form>
    </div>
  );
}
