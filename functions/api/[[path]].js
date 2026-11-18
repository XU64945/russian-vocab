import seedWordbooks from "../../server/seed/wordbooks.json";

const encoder = new TextEncoder();
const SESSION_COOKIE = "slovo_session";
const SESSION_DAYS = 30;
// Cloudflare Workers Web Crypto supports at most 100,000 PBKDF2 iterations.
const PBKDF2_ITERATIONS = 100000;

const seedUsers = [
  {
    id: "admin-root",
    username: "13144666848",
    role: "admin",
    salt: "f38981cc972f61515d89be52aedd30a8",
    hash: "1fbe9160d776b9894b3a15bf4a83fe46bcf1008ce6e20d95aa9c24e520893869",
    legacySalt: "4b7480fa62be5e414d4fc590712dc450",
    legacyHash:
      "49d95644627c121bb95fc54f4bdd669eadb763c136356daf066af675c51f1838",
  },
  {
    id: "user-lvziyi",
    username: "lvziyi",
    role: "user",
    salt: "b9c5338b4b8ba8ee8e0c5400c0c99e74",
    hash: "8e723882d05b600c251e1a85f7460558502b3c2e6ba7eac8fd1fe22285982d4f",
    legacySalt: "8525757c406f81f5e17170f9acf416c0",
    legacyHash:
      "be0d0a589996da32f6d7db96fc35471ba137c5f3c6be6298b91d247dfe61b1b9",
  },
];

const defaultProgress = () => ({
  mastered: [],
  difficult: [],
  history: [],
  memory: {},
  reviewPool: [],
  learningCursors: {
    beginner: 0,
    intermediate: 0,
    advanced: 0,
  },
  streak: 0,
  lastStudyDate: null,
  totalReviews: 0,
  dailyGoal: 12,
});

function bytesToHex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex) {
  const result = new Uint8Array(hex.length / 2);
  for (let index = 0; index < result.length; index += 1) {
    result[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return result;
}

function randomHex(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

async function derivePassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToBytes(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToHex(bits);
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  return bytesToHex(digest);
}

function jsonResponse(status, payload, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

function sessionCookie(token, maxAge = SESSION_DAYS * 86400) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.get("Cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

async function ensureSchema(db) {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      password_iterations INTEGER NOT NULL,
      created_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS wordbooks (
      id TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      topics_json TEXT NOT NULL,
      words_json TEXT NOT NULL,
      word_count INTEGER NOT NULL,
      topic_count INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      created_by TEXT NOT NULL,
      sort_order INTEGER NOT NULL,
      built_in INTEGER NOT NULL DEFAULT 0
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      data_json TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, book_id)
    )`),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)",
    ),
    db.prepare(
      "CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id)",
    ),
  ]);
}

async function ensureSeed(db) {
  for (const user of seedUsers) {
    // Migrate the original seeded accounts without touching passwords users
    // changed after the initial release.
    await db
      .prepare(
        `UPDATE users
         SET password_salt = ?, password_hash = ?, password_iterations = ?
         WHERE id = ? AND password_salt = ? AND password_hash = ?
           AND password_iterations > ?`,
      )
      .bind(
        user.salt,
        user.hash,
        PBKDF2_ITERATIONS,
        user.id,
        user.legacySalt,
        user.legacyHash,
        PBKDF2_ITERATIONS,
      )
      .run();
  }

  const countRow = await db
    .prepare("SELECT COUNT(*) AS count FROM users")
    .first();
  if (!countRow?.count) {
    for (const user of seedUsers) {
      await db
        .prepare(
          `INSERT OR IGNORE INTO users
            (id, username, role, password_salt, password_hash, password_iterations, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          user.id,
          user.username,
          user.role,
          user.salt,
          user.hash,
          PBKDF2_ITERATIONS,
          new Date().toISOString(),
        )
        .run();
    }
  }

  for (let index = 0; index < seedWordbooks.length; index += 1) {
    const book = seedWordbooks[index];
    await db
      .prepare(
        `INSERT OR IGNORE INTO wordbooks
          (id, schema_version, title, description, topics_json, words_json,
           word_count, topic_count, created_at, created_by, sort_order, built_in)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      )
      .bind(
        book.id,
        book.schemaVersion,
        book.title,
        book.description,
        JSON.stringify(book.topics),
        JSON.stringify(book.words),
        book.words.length,
        book.topics.length,
        book.createdAt,
        book.createdBy,
        index + 1,
      )
      .run();
  }
}

async function ensureReady(env) {
  if (!env.DB) {
    throw new Error("Cloudflare D1 binding DB is not configured");
  }
  await ensureSchema(env.DB);
  await ensureSeed(env.DB);
}

async function getSessionUser(request, db) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = await hashToken(token);
  return db
    .prepare(
      `SELECT u.id, u.username, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .bind(tokenHash, new Date().toISOString())
    .first();
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

function bookSummary(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    schemaVersion: row.schema_version,
    wordCount: row.word_count,
    topicCount: row.topic_count,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function fullBook(row) {
  return {
    id: row.id,
    schemaVersion: row.schema_version,
    title: row.title,
    description: row.description,
    topics: JSON.parse(row.topics_json),
    words: JSON.parse(row.words_json),
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

async function getWorkspace(db, user, requestedBookId) {
  const progressState = await db
    .prepare(
      "SELECT book_id FROM progress WHERE user_id = ? AND active = 1 LIMIT 1",
    )
    .bind(user.id)
    .first();
  const firstBook = await db
    .prepare("SELECT id FROM wordbooks ORDER BY sort_order, created_at LIMIT 1")
    .first();
  const bookId =
    requestedBookId || progressState?.book_id || firstBook?.id;
  if (!bookId) return null;

  const bookRow = await db
    .prepare("SELECT * FROM wordbooks WHERE id = ?")
    .bind(bookId)
    .first();
  if (!bookRow) return null;

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO progress
        (user_id, book_id, data_json, active, updated_at)
       VALUES (?, ?, ?, 0, ?)`,
    )
    .bind(user.id, bookId, JSON.stringify(defaultProgress()), now)
    .run();
  await db
    .prepare("UPDATE progress SET active = 0 WHERE user_id = ?")
    .bind(user.id)
    .run();
  await db
    .prepare(
      "UPDATE progress SET active = 1, updated_at = ? WHERE user_id = ? AND book_id = ?",
    )
    .bind(now, user.id, bookId)
    .run();

  const progressRow = await db
    .prepare(
      "SELECT data_json FROM progress WHERE user_id = ? AND book_id = ?",
    )
    .bind(user.id, bookId)
    .first();
  const bookRows = await db
    .prepare("SELECT * FROM wordbooks ORDER BY sort_order, created_at")
    .all();

  return {
    user: publicUser(user),
    wordbooks: bookRows.results.map(bookSummary),
    activeBookId: bookId,
    book: fullBook(bookRow),
    progress: progressRow?.data_json
      ? JSON.parse(progressRow.data_json)
      : defaultProgress(),
  };
}

function normalizeWordbook(body, user, sortOrder) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const sourceWords = Array.isArray(body.words) ? body.words : [];
  if (!title) throw new Error("词书名称不能为空");
  if (!sourceWords.length) throw new Error("词书至少需要一个单词");

  const topics = Array.isArray(body.topics) && body.topics.length
    ? body.topics.map((topic, index) => ({
        id: String(topic.id || `topic-${index + 1}`),
        label: String(topic.label || `单元 ${index + 1}`),
        ru: String(topic.ru || `Раздел ${index + 1}`),
        color: topic.color || "#1d4f9f",
        soft: topic.soft || "#dbe9ff",
      }))
    : [
        {
          id: "custom-1",
          label: "自定义词书",
          ru: "Словарь",
          color: "#1d4f9f",
          soft: "#dbe9ff",
        },
      ];
  const topicIds = new Set(topics.map((topic) => topic.id));
  const id = `book-${Date.now()}-${randomHex(3)}`;
  const words = sourceWords.map((word, index) => {
    const ru = String(word.ru || "").trim();
    const zh = String(word.zh || "").trim();
    if (!ru || !zh) throw new Error(`第 ${index + 1} 个词缺少 ru 或 zh`);
    const examples = Array.isArray(word.examples)
      ? word.examples
          .filter((example) => example?.ru && example?.zh)
          .map((example) => ({ ru: String(example.ru), zh: String(example.zh) }))
      : word.example
        ? [{ ru: String(word.example), zh: String(word.exampleZh || "") }]
        : [];
    const topic = topicIds.has(word.topic)
      ? word.topic
      : topicIds.has(word.unitId)
        ? word.unitId
        : topics[0].id;
    return {
      id: String(word.id || `custom-${index + 1}`),
      number: Number(word.number) || index + 1,
      ru,
      zh,
      pos: String(word.pos || "词汇"),
      transliteration: String(word.transliteration || ru),
      topic,
      unitId: topic,
      unitLabel: topics.find((item) => item.id === topic)?.label || "自定义词书",
      level: String(word.level || "进阶"),
      examples,
      derived: String(word.derived || "—"),
      synonyms: String(word.synonyms || "—"),
      phrases: String(word.phrases || "—"),
    };
  });

  return {
    id,
    schemaVersion: 1,
    title,
    description,
    topics,
    words,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    sortOrder,
  };
}

async function handleApi(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/?/, "");
  const db = env.DB;

  if (path === "auth/login" && request.method === "POST") {
    const body = await request.json();
    const user = await db
      .prepare("SELECT * FROM users WHERE username = ?")
      .bind(String(body.username || ""))
      .first();
    const passwordHash = user
      ? await derivePassword(
          String(body.password || ""),
          user.password_salt,
          user.password_iterations,
        )
      : null;
    if (!user || !constantTimeEqual(passwordHash, user.password_hash)) {
      return jsonResponse(401, { error: "账号或密码错误" });
    }
    const token = randomHex(32);
    const tokenHash = await hashToken(token);
    const expiresAt = new Date(
      Date.now() + SESSION_DAYS * 86400 * 1000,
    ).toISOString();
    await db
      .prepare("DELETE FROM sessions WHERE expires_at <= ?")
      .bind(new Date().toISOString())
      .run();
    await db
      .prepare(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
      )
      .bind(tokenHash, user.id, expiresAt)
      .run();
    return jsonResponse(
      200,
      { user: publicUser(user) },
      { "Set-Cookie": sessionCookie(token) },
    );
  }

  if (path === "auth/me" && request.method === "GET") {
    const user = await getSessionUser(request, db);
    if (!user) return jsonResponse(401, { error: "未登录" });
    return jsonResponse(200, { user: publicUser(user) });
  }

  if (path === "auth/logout" && request.method === "POST") {
    const token = parseCookies(request)[SESSION_COOKIE];
    if (token) {
      await db
        .prepare("DELETE FROM sessions WHERE token_hash = ?")
        .bind(await hashToken(token))
        .run();
    }
    return jsonResponse(
      200,
      { ok: true },
      { "Set-Cookie": sessionCookie("", 0) },
    );
  }

  const user = await getSessionUser(request, db);
  if (!user) return jsonResponse(401, { error: "请先登录" });

  if (path === "bootstrap" && request.method === "GET") {
    const workspace = await getWorkspace(
      db,
      user,
      url.searchParams.get("bookId"),
    );
    if (!workspace) return jsonResponse(404, { error: "没有可用词书" });
    return jsonResponse(200, workspace);
  }

  if (path === "progress" && request.method === "PUT") {
    const body = await request.json();
    const bookId = String(body.bookId || "");
    const book = await db
      .prepare("SELECT id FROM wordbooks WHERE id = ?")
      .bind(bookId)
      .first();
    if (!book) return jsonResponse(404, { error: "词书不存在" });
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO progress (user_id, book_id, data_json, active, updated_at)
         VALUES (?, ?, ?, 1, ?)
         ON CONFLICT(user_id, book_id) DO UPDATE SET
           data_json = excluded.data_json,
           active = 1,
           updated_at = excluded.updated_at`,
      )
      .bind(user.id, bookId, JSON.stringify(body.progress || defaultProgress()), now)
      .run();
    await db
      .prepare(
        "UPDATE progress SET active = CASE WHEN book_id = ? THEN 1 ELSE 0 END WHERE user_id = ?",
      )
      .bind(bookId, user.id)
      .run();
    return jsonResponse(200, { ok: true });
  }

  if (path === "password" && request.method === "POST") {
    const body = await request.json();
    const userRecord = await db
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(user.id)
      .first();
    const currentHash = await derivePassword(
      String(body.currentPassword || ""),
      userRecord.password_salt,
      userRecord.password_iterations,
    );
    if (!constantTimeEqual(currentHash, userRecord.password_hash)) {
      return jsonResponse(400, { error: "当前密码不正确" });
    }
    if (String(body.newPassword || "").length < 8) {
      return jsonResponse(400, { error: "新密码至少需要 8 位" });
    }
    if (body.newPassword !== body.confirmPassword) {
      return jsonResponse(400, { error: "两次输入的新密码不一致" });
    }
    const salt = randomHex(16);
    const hash = await derivePassword(String(body.newPassword), salt);
    await db
      .prepare(
        "UPDATE users SET password_salt = ?, password_hash = ?, password_iterations = ? WHERE id = ?",
      )
      .bind(salt, hash, PBKDF2_ITERATIONS, user.id)
      .run();
    await db
      .prepare("DELETE FROM sessions WHERE user_id = ?")
      .bind(user.id)
      .run();
    return jsonResponse(
      200,
      { ok: true },
      { "Set-Cookie": sessionCookie("", 0) },
    );
  }

  if (path === "wordbooks" && request.method === "GET") {
    const rows = await db
      .prepare("SELECT * FROM wordbooks ORDER BY sort_order, created_at")
      .all();
    return jsonResponse(200, { wordbooks: rows.results.map(bookSummary) });
  }

  if (path === "wordbooks" && request.method === "POST") {
    if (user.role !== "admin") {
      return jsonResponse(403, { error: "只有管理员可以新增词书" });
    }
    const body = await request.json();
    const maxRow = await db
      .prepare("SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM wordbooks")
      .first();
    const book = normalizeWordbook(body, user, Number(maxRow?.maxOrder || 0) + 1);
    await db
      .prepare(
        `INSERT INTO wordbooks
          (id, schema_version, title, description, topics_json, words_json,
           word_count, topic_count, created_at, created_by, sort_order, built_in)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      )
      .bind(
        book.id,
        book.schemaVersion,
        book.title,
        book.description,
        JSON.stringify(book.topics),
        JSON.stringify(book.words),
        book.words.length,
        book.topics.length,
        book.createdAt,
        book.createdBy,
        book.sortOrder,
      )
      .run();
    return jsonResponse(201, {
      book: {
        id: book.id,
        title: book.title,
        description: book.description,
        schemaVersion: book.schemaVersion,
        wordCount: book.words.length,
        topicCount: book.topics.length,
        createdAt: book.createdAt,
        createdBy: book.createdBy,
      },
    });
  }

  const bookMatch = path.match(/^wordbooks\/([^/]+)$/);
  if (bookMatch && request.method === "GET") {
    const row = await db
      .prepare("SELECT * FROM wordbooks WHERE id = ?")
      .bind(bookMatch[1])
      .first();
    if (!row) return jsonResponse(404, { error: "词书不存在" });
    return jsonResponse(200, { book: fullBook(row) });
  }

  if (bookMatch && request.method === "DELETE") {
    if (user.role !== "admin") {
      return jsonResponse(403, { error: "只有管理员可以删除词书" });
    }
    const row = await db
      .prepare("SELECT built_in FROM wordbooks WHERE id = ?")
      .bind(bookMatch[1])
      .first();
    if (!row) return jsonResponse(404, { error: "词书不存在" });
    if (row.built_in) {
      return jsonResponse(400, { error: "内置词书不能删除" });
    }
    await db.batch([
      db.prepare("DELETE FROM wordbooks WHERE id = ?").bind(bookMatch[1]),
      db.prepare("DELETE FROM progress WHERE book_id = ?").bind(bookMatch[1]),
    ]);
    return jsonResponse(200, { ok: true });
  }

  return jsonResponse(404, { error: "接口不存在" });
}

export async function onRequest(context) {
  try {
    await ensureReady(context.env);
    return await handleApi(context);
  } catch (error) {
    console.error("Cloudflare API error", error);
    return jsonResponse(500, {
      error:
        error?.message ||
        "服务器错误。请确认 Cloudflare D1 已绑定到 DB 并完成迁移。",
    });
  }
}
