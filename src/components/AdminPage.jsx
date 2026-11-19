import { useEffect, useState } from "react";
import {
  AlertCircle,
  Ban,
  BookPlus,
  Check,
  FileJson,
  Layers3,
  Pencil,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Upload,
  Users,
  X,
} from "lucide-react";

function WordCorrectionModal({ correction, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    ...correction.currentWord,
    example1Ru: correction.currentWord?.examples?.[0]?.ru || "",
    example1Zh: correction.currentWord?.examples?.[0]?.zh || "",
    example2Ru: correction.currentWord?.examples?.[1]?.ru || "",
    example2Zh: correction.currentWord?.examples?.[1]?.zh || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...form,
        examples: [
          { ru: form.example1Ru, zh: form.example1Zh },
          { ru: form.example2Ru, zh: form.example2Zh },
        ].filter((example) => example.ru.trim() && example.zh.trim()),
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "词条保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-modal-layer open">
      <button className="admin-modal-scrim" onClick={onClose} aria-label="关闭词条修改" />
      <form className="admin-modal word-edit-modal" onSubmit={submit}>
        <header>
          <div>
            <span className="eyebrow-text dark">ИСПРАВЛЕНИЕ</span>
            <h2>修改词条</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>
        <div className="correction-original">
          <AlertCircle size={16} />
          <p>{correction.message}</p>
        </div>
        <div className="admin-form-grid">
          {[
            ["ru", "俄语单词"],
            ["zh", "中文释义"],
            ["pos", "词性"],
            ["transliteration", "转写"],
            ["derived", "派生与变形"],
            ["synonyms", "同义替换"],
          ].map(([field, label]) => (
            <label className="admin-input" key={field}>
              <span>{label}</span>
              <input
                value={form[field] || ""}
                onChange={(event) => update(field, event.target.value)}
              />
            </label>
          ))}
        </div>
        <label className="admin-input">
          <span>延展与常用短语</span>
          <textarea
            value={form.phrases || ""}
            onChange={(event) => update("phrases", event.target.value)}
          />
        </label>
        <div className="admin-form-grid example-edit-grid">
          {[
            ["example1Ru", "例句 1 · 俄语"],
            ["example1Zh", "例句 1 · 中文"],
            ["example2Ru", "例句 2 · 俄语"],
            ["example2Zh", "例句 2 · 中文"],
          ].map(([field, label]) => (
            <label className="admin-input" key={field}>
              <span>{label}</span>
              <input
                value={form[field] || ""}
                onChange={(event) => update(field, event.target.value)}
              />
            </label>
          ))}
        </div>
        {error ? <div className="login-error">{error}</div> : null}
        <footer>
          <span>保存后会立即更新所有用户的同一词条。</span>
          <button className="primary-button" disabled={saving}>
            <Check size={16} />
            {saving ? "保存中…" : "保存并标记已处理"}
          </button>
        </footer>
      </form>
    </div>
  );
}

const sampleBook = {
  title: "新词书名称",
  description: "词书说明",
  topics: [
    {
      id: "topic-1",
      label: "单元名称",
      ru: "Раздел",
      color: "#2f5f50",
      soft: "#dbe8e2",
    },
  ],
  words: [
    {
      id: "word-1",
      number: 1,
      ru: "привет",
      zh: "你好",
      pos: "感叹词",
      transliteration: "privet",
      topic: "topic-1",
      unitId: "topic-1",
      unitLabel: "单元名称",
      level: "核心",
      examples: [
        { ru: "Привет, как дела?", zh: "你好，最近怎么样？" },
        { ru: "Он сказал мне привет.", zh: "他向我打了招呼。" },
      ],
      derived: "派生变化",
      synonyms: "同义替换",
      phrases: "常用短语",
    },
  ],
};

function WordbookCreateModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);

  function parseJson(value) {
    try {
      const parsed = JSON.parse(value);
      const words = Array.isArray(parsed) ? parsed : parsed.words;
      setPreview({
        words: Array.isArray(words) ? words.length : 0,
        topics: Array.isArray(parsed?.topics) ? parsed.topics.length : 0,
      });
      setError("");
      return parsed;
    } catch {
      setPreview(null);
      setError("JSON 格式不正确");
      return null;
    }
  }

  async function loadFile(file) {
    if (!file) return;
    const text = await file.text();
    setJsonText(text);
    parseJson(text);
  }

  async function submit(event) {
    event.preventDefault();
    const parsed = parseJson(jsonText);
    if (!parsed) return;
    setSubmitting(true);
    try {
      const payload = Array.isArray(parsed)
        ? { title, description, words: parsed }
        : { ...parsed, title: title || parsed.title, description: description || parsed.description };
      await onSubmit(payload);
      setTitle("");
      setDescription("");
      setJsonText("");
      setPreview(null);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "新增词书失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`admin-modal-layer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="admin-modal-scrim" onClick={onClose} aria-label="关闭新增词书" />
      <form className="admin-modal" onSubmit={submit} role="dialog" aria-modal="true">
        <header>
          <div>
            <span className="eyebrow-text dark">НОВЫЙ СЛОВАРЬ</span>
            <h2>新增兼容词书</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="admin-form-grid">
          <label className="admin-input">
            <span>词书名称</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>
          <label className="admin-input">
            <span>词书说明</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        </div>

        <div className="admin-json-heading">
          <div>
            <span className="eyebrow-text dark">SCHEMA V1</span>
            <h3>粘贴或上传 JSON</h3>
          </div>
          <label className="admin-upload">
            <Upload size={15} />
            上传文件
            <input
              type="file"
              accept=".json,application/json"
              onChange={(event) => loadFile(event.target.files?.[0])}
            />
          </label>
        </div>
        <textarea
          className="admin-json"
          value={jsonText}
          onChange={(event) => {
            setJsonText(event.target.value);
            parseJson(event.target.value);
          }}
          placeholder={JSON.stringify(sampleBook, null, 2)}
        />
        <div className="admin-json-footer">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              const value = JSON.stringify(sampleBook, null, 2);
              setJsonText(value);
              parseJson(value);
            }}
          >
            <FileJson size={15} />
            填入模板
          </button>
          {preview ? (
            <span>
              <Check size={14} />
              {preview.words} 个词 · {preview.topics || "自动"} 个单元
            </span>
          ) : null}
        </div>
        {error ? <div className="login-error">{error}</div> : null}
        <footer>
          <span>兼容当前三轮练习、分组难度和两轮复习流程。</span>
          <button
            className="primary-button"
            disabled={
              submitting ||
              !jsonText.trim() ||
              (!title.trim() && !/"title"\s*:/.test(jsonText))
            }
          >
            <BookPlus size={17} />
            {submitting ? "正在新增…" : "新增并发布"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function AdminPage({
  user,
  wordbooks,
  onCreateWordbook,
  onUpdateWord,
  onResolveCorrection,
  onListCorrections,
  onListUsers,
  onSetUserFrozen,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [corrections, setCorrections] = useState([]);
  const [correctionsLoading, setCorrectionsLoading] = useState(true);
  const [correctionError, setCorrectionError] = useState("");
  const [editingCorrection, setEditingCorrection] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userError, setUserError] = useState("");

  async function loadCorrections() {
    setCorrectionsLoading(true);
    setCorrectionError("");
    try {
      const data = await onListCorrections();
      setCorrections(data.corrections || []);
    } catch (error) {
      setCorrectionError(error.message || "纠错列表读取失败");
    } finally {
      setCorrectionsLoading(false);
    }
  }

  async function loadUsers() {
    setUsersLoading(true);
    setUserError("");
    try {
      const data = await onListUsers();
      setUsers(data.users || []);
    } catch (error) {
      setUserError(error.message || "账号列表读取失败");
    } finally {
      setUsersLoading(false);
    }
  }

  useEffect(() => {
    loadCorrections();
    loadUsers();
  }, []);

  const openCorrections = corrections.filter(
    (correction) => correction.status === "open",
  );

  return (
    <div className="page admin-page">
      <section className="page-intro admin-intro">
        <div>
          <p className="intro-ru">АДМИНИСТРАТОР</p>
          <h1>词书与账号管理</h1>
          <p className="intro-subtitle">
            新增词书会立即出现在用户词书选择器中，并沿用当前练习与复习数据格式。
          </p>
        </div>
        <button className="primary-button" onClick={() => setModalOpen(true)}>
          <BookPlus size={17} />
          新增词书
        </button>
      </section>

      <section className="admin-summary">
        <article>
          <span><ShieldCheck size={18} /></span>
          <div>
            <small>当前角色</small>
            <strong>管理员</strong>
            <p>{user.username}</p>
          </div>
        </article>
        <article>
          <span><Layers3 size={18} /></span>
          <div>
            <small>已发布词书</small>
            <strong>{wordbooks.length}</strong>
            <p>所有用户可选择</p>
          </div>
        </article>
        <article>
          <span><Users size={18} /></span>
          <div>
            <small>数据隔离</small>
            <strong>按账号</strong>
            <p>独立保存进度</p>
          </div>
        </article>
      </section>

      <section className="admin-book-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow-text dark">СЛОВАРИ</span>
            <h2>词书列表</h2>
          </div>
          <span className="admin-schema-note">SCHEMA V1</span>
        </div>
        <div className="admin-book-grid">
          {wordbooks.map((book) => (
            <article className="admin-book-card" key={book.id}>
              <span className="admin-book-icon">
                <BookPlus size={19} />
              </span>
              <div>
                <strong>{book.title}</strong>
                <p>{book.description}</p>
                <small>
                  {book.wordCount} 个词 · {book.topicCount} 个单元
                </small>
              </div>
              <span className="admin-published">
                <Check size={13} />
                已发布
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-correction-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow-text dark">СООБЩЕНИЯ ОБ ОШИБКАХ</span>
            <h2>用户纠错</h2>
          </div>
          <button className="text-button" onClick={loadCorrections}>
            <RefreshCw size={15} />
            刷新
          </button>
        </div>
        {correctionError ? (
          <div className="login-error">{correctionError}</div>
        ) : correctionsLoading ? (
          <div className="admin-correction-empty">正在读取纠错…</div>
        ) : openCorrections.length ? (
          <div className="admin-correction-list">
            {openCorrections.map((correction) => (
              <article className="admin-correction-card" key={correction.id}>
                <span className="admin-correction-icon">
                  <AlertCircle size={18} />
                </span>
                <div>
                  <div className="admin-correction-meta">
                    <strong>{correction.category}</strong>
                    <span>{correction.bookTitle}</span>
                    <small>{correction.username}</small>
                  </div>
                  <p>{correction.message}</p>
                  <small>
                    当前词条：
                    {correction.currentWord
                      ? `${correction.currentWord.ru} · ${correction.currentWord.zh}`
                      : "词条已不存在"}
                  </small>
                </div>
                <button
                  className="secondary-button"
                  disabled={!correction.currentWord}
                  onClick={() => setEditingCorrection(correction)}
                >
                  <Pencil size={15} />
                  修改词条
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-correction-empty">
            <Check size={18} />
            暂无待处理纠错
          </div>
        )}
      </section>

      <section className="admin-correction-section admin-users-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow-text dark">АККАУНТЫ</span>
            <h2>账号与学习情况</h2>
          </div>
          <button className="text-button" onClick={loadUsers}>
            <RefreshCw size={15} />
            刷新
          </button>
        </div>
        {userError ? (
          <div className="login-error">{userError}</div>
        ) : usersLoading ? (
          <div className="admin-correction-empty">正在读取账号…</div>
        ) : (
          <div className="admin-user-list">
            {users.map((account) => (
              <article className={`admin-user-card ${account.frozen ? "frozen" : ""}`} key={account.id}>
                <span className="admin-user-avatar">
                  {account.username.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <div className="admin-user-heading">
                    <strong>{account.username}</strong>
                    <span>{account.role === "admin" ? "管理员" : "普通用户"}</span>
                    {account.frozen ? <em>已冻结</em> : null}
                  </div>
                  <p>
                    {account.activeBookTitle || "尚未选择词书"} · 已学 {account.learned} 词 ·
                    已掌握 {account.mastered} · 错题 {account.wrong}
                  </p>
                  <small>
                    今日作答 {account.todayAnswers} 次 · 累计 {account.totalAnswers} 次
                  </small>
                </div>
                <button
                  className={account.frozen ? "secondary-button" : "danger-outline-button"}
                  disabled={account.id === user.id}
                  onClick={async () => {
                    try {
                      await onSetUserFrozen(account.id, !account.frozen);
                      await loadUsers();
                    } catch (error) {
                      setUserError(error.message || "账号状态更新失败");
                    }
                  }}
                >
                  {account.frozen ? <UserCheck size={15} /> : <Ban size={15} />}
                  {account.frozen ? "解除冻结" : "冻结账号"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <WordbookCreateModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={onCreateWordbook}
      />
      {editingCorrection ? (
        <WordCorrectionModal
          correction={editingCorrection}
          onClose={() => setEditingCorrection(null)}
          onSave={async (word) => {
            await onUpdateWord(
              editingCorrection.bookId,
              editingCorrection.wordId,
              word,
            );
            await onResolveCorrection(editingCorrection.id, "resolved");
            setCorrections((current) =>
              current.filter((item) => item.id !== editingCorrection.id),
            );
          }}
        />
      ) : null}
    </div>
  );
}
