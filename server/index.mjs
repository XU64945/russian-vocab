import { createServer } from "node:http";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dataDir = join(root, "server", "data");
const dbPath = join(dataDir, "db.json");
const distDir = join(root, "dist");
const port = Number(process.env.PORT || 4173);
const builtInBooks = JSON.parse(
  readFileSync(join(root, "server", "seed", "wordbooks.json"), "utf8"),
);

const defaultTopics = [
  { id: "u1", label: "代词与虚词", ru: "Местоимения", color: "#1d4f9f", soft: "#dbe9ff" },
  { id: "u2", label: "最高频动词 I", ru: "Глаголы I", color: "#2e67c7", soft: "#e0ebff" },
  { id: "u3", label: "最高频动词 II", ru: "Глаголы II", color: "#3f78d6", soft: "#e8f0ff" },
  { id: "u4", label: "时间、数量与频度", ru: "Время и число", color: "#285b93", soft: "#dce9f5" },
  { id: "u5", label: "人与家庭", ru: "Люди и семья", color: "#3c669e", soft: "#e4edf8" },
  { id: "u6", label: "居家与衣食", ru: "Дом и еда", color: "#1e6ca8", soft: "#dbeeff" },
  { id: "u7", label: "城市、出行与方位", ru: "Город и дорога", color: "#457db3", soft: "#e2f0fb" },
  { id: "u8", label: "身体、健康与情绪", ru: "Тело и чувства", color: "#315a8e", soft: "#dee8f5" },
  { id: "u9", label: "学习、工作与社会", ru: "Учёба и работа", color: "#4c75ad", soft: "#e3ecf8" },
  { id: "u10", label: "性质、状态与程度", ru: "Качество", color: "#355b9a", soft: "#dee8fa" },
];

const defaultProgress = () => ({
  mastered: [],
  difficult: [],
  history: [],
  memory: {},
  reviewPool: [],
  favorites: [],
  passed: [],
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

const seedUsers = [
  {
    id: "admin-root",
    username: "13144666848",
    role: "admin",
    passwordSalt: "3aa5564335f1a14591e9ced9cf1c765b",
    passwordHash:
      "5c9c105876382a16d4735b26ecb55f75bacf0cb5458069a3e2d620b8cda4b5e0c92b9b5d6e07674255507d16b239447a73162371ab38bc97dab2b558a940634b",
  },
  {
    id: "user-lvziyi",
    username: "lvziyi",
    role: "user",
    passwordSalt: "70c1bf873fc4e9ecfbc88388f7bd9e89",
    passwordHash:
      "34ad1a9d54344847bcbdca50e440b8c774259484bdf8822809b14ceb6955105e9716164b20828182defa0f3117f5629e16145c3e724609a0a64e4735793b6130",
  },
];

function passwordRecord(password) {
  const salt = randomBytes(16).toString("hex");
  return {
    passwordSalt: salt,
    passwordHash: scryptSync(password, salt, 64).toString("hex"),
  };
}

function checkPassword(user, password) {
  const candidate = scryptSync(password, user.passwordSalt, 64);
  const stored = Buffer.from(user.passwordHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

function createSeedDatabase() {
  const [admin, lvziyi] = seedUsers.map((user) => ({
    ...user,
    createdAt: new Date().toISOString(),
  }));
  const books = JSON.parse(JSON.stringify(builtInBooks));
  return {
    version: 1,
    users: [admin, lvziyi],
    sessions: [],
    wordbooks: books,
    corrections: [],
    progressByUser: {
      [admin.id]: {
        activeBookId: books[0].id,
        books: Object.fromEntries(books.map((book) => [book.id, defaultProgress()])),
        progressUpdatedAt: {},
      },
      [lvziyi.id]: {
        activeBookId: books[0].id,
        books: Object.fromEntries(books.map((book) => [book.id, defaultProgress()])),
        progressUpdatedAt: {},
      },
    },
  };
}

function migrateBuiltInBooks(db) {
  let changed = false;
  if (!Array.isArray(db.corrections)) {
    db.corrections = [];
    changed = true;
  }
  for (const seedBook of builtInBooks) {
    const existingBook = db.wordbooks.find((book) => book.id === seedBook.id);
    if (!existingBook) {
      db.wordbooks.push(JSON.parse(JSON.stringify(seedBook)));
      changed = true;
    } else {
      for (const seedTopic of seedBook.topics) {
        const existingTopic = existingBook.topics.find(
          (topic) => topic.id === seedTopic.id,
        );
        if (
          existingTopic &&
          (existingTopic.color !== seedTopic.color ||
            existingTopic.soft !== seedTopic.soft)
        ) {
          existingTopic.color = seedTopic.color;
          existingTopic.soft = seedTopic.soft;
          changed = true;
        }
      }
    }
  }
  for (const user of db.users) {
    const state = db.progressByUser[user.id] || {
      activeBookId: db.wordbooks[0]?.id,
      books: {},
      progressUpdatedAt: {},
    };
    if (!state.progressUpdatedAt) {
      state.progressUpdatedAt = {};
      changed = true;
    }
    for (const book of db.wordbooks) {
      if (!state.books[book.id]) {
        state.books[book.id] = defaultProgress();
        changed = true;
      }
    }
    if (!db.wordbooks.some((book) => book.id === state.activeBookId)) {
      state.activeBookId = db.wordbooks[0]?.id;
      changed = true;
    }
    db.progressByUser[user.id] = state;
  }
  return changed;
}

function loadDb() {
  mkdirSync(dataDir, { recursive: true });
  if (!existsSync(dbPath)) {
    const db = createSeedDatabase();
    writeFileSync(dbPath, JSON.stringify(db, null, 2));
    return db;
  }
  const db = JSON.parse(readFileSync(dbPath, "utf8"));
  if (migrateBuiltInBooks(db)) {
    writeFileSync(dbPath, JSON.stringify(db, null, 2));
  }
  return db;
}

let db = loadDb();

function saveDb() {
  writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function parseCookies(request) {
  return Object.fromEntries(
    (request.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function sessionUser(request) {
  const token = parseCookies(request).slovo_session;
  if (!token) return null;
  const session = db.sessions.find(
    (item) => item.token === token && new Date(item.expiresAt).getTime() > Date.now(),
  );
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId) || null;
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

function bookSummary(book) {
  return {
    id: book.id,
    title: book.title,
    description: book.description,
    schemaVersion: book.schemaVersion,
    wordCount: book.words.length,
    topicCount: book.topics.length,
    createdAt: book.createdAt,
    createdBy: book.createdBy,
  };
}

function sendJson(response, status, payload, headers = {}) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(payload));
}

function readJsonBody(request) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let total = 0;
    request.on("data", (chunk) => {
      total += chunk.length;
      if (total > 8 * 1024 * 1024) {
        reject(new Error("请求内容过大"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolveBody(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(new Error("JSON 格式不正确"));
      }
    });
    request.on("error", reject);
  });
}

function sessionCookie(token, maxAge = 60 * 60 * 24 * 30) {
  return `slovo_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

function getUserWorkspace(user, requestedBookId) {
  const progressState = db.progressByUser[user.id] || {
    activeBookId: db.wordbooks[0]?.id,
    books: {},
    progressUpdatedAt: {},
  };
  const bookId =
    requestedBookId ||
    progressState.activeBookId ||
    db.wordbooks[0]?.id;
  const book = db.wordbooks.find((item) => item.id === bookId) || db.wordbooks[0];
  if (!book) return null;

  progressState.activeBookId = book.id;
  if (!progressState.books[book.id]) {
    progressState.books[book.id] = defaultProgress();
  }
  db.progressByUser[user.id] = progressState;
  return {
    user: publicUser(user),
    wordbooks: db.wordbooks.map(bookSummary),
    activeBookId: book.id,
    book,
    progress: progressState.books[book.id],
    progressUpdatedAt: progressState.progressUpdatedAt?.[book.id] || null,
  };
}

function normalizeWordbook(body, user) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const sourceWords = Array.isArray(body.words) ? body.words : [];
  if (!title) throw new Error("词书名称不能为空");
  if (!sourceWords.length) throw new Error("词书至少需要一个单词");

  const sourceTopics = Array.isArray(body.topics) ? body.topics : [];
  const topics = sourceTopics.length
    ? sourceTopics.map((topic, index) => ({
        id: String(topic.id || `topic-${index + 1}`),
        label: String(topic.label || `单元 ${index + 1}`),
        ru: String(topic.ru || `Раздел ${index + 1}`),
        color: topic.color || "#2f5f50",
        soft: topic.soft || "#dbe8e2",
      }))
    : [
        {
          id: "custom-1",
          label: "自定义词书",
          ru: "Словарь",
          color: "#2f5f50",
          soft: "#dbe8e2",
        },
      ];
  const topicIds = new Set(topics.map((topic) => topic.id));
  const bookId = `book-${Date.now()}-${randomBytes(3).toString("hex")}`;
  const words = sourceWords.map((word, index) => {
    const ru = String(word.ru || "").trim();
    const zh = String(word.zh || "").trim();
    if (!ru || !zh) throw new Error(`第 ${index + 1} 个词缺少 ru 或 zh`);
    const examples = Array.isArray(word.examples)
      ? word.examples
          .filter((example) => example && example.ru && example.zh)
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
    id: bookId,
    schemaVersion: 1,
    title,
    description,
    createdAt: new Date().toISOString(),
    createdBy: user.id,
    topics,
    words,
  };
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};

async function handleApi(request, response, url) {
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const body = await readJsonBody(request);
    const user = db.users.find((item) => item.username === String(body.username || ""));
    if (!user || !checkPassword(user, String(body.password || ""))) {
      sendJson(response, 401, { error: "账号或密码错误" });
      return true;
    }
    const token = randomBytes(32).toString("hex");
    db.sessions.push({
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    saveDb();
    sendJson(response, 200, { user: publicUser(user) }, {
      "Set-Cookie": sessionCookie(token),
    });
    return true;
  }

  if (url.pathname === "/api/auth/me" && request.method === "GET") {
    const user = sessionUser(request);
    if (!user) {
      sendJson(response, 401, { error: "未登录" });
      return true;
    }
    sendJson(response, 200, { user: publicUser(user) });
    return true;
  }

  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const token = parseCookies(request).slovo_session;
    db.sessions = db.sessions.filter((session) => session.token !== token);
    saveDb();
    sendJson(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
    return true;
  }

  const user = sessionUser(request);
  if (!user) {
    sendJson(response, 401, { error: "请先登录" });
    return true;
  }

  if (url.pathname === "/api/bootstrap" && request.method === "GET") {
    const workspace = getUserWorkspace(user, url.searchParams.get("bookId"));
    if (!workspace) {
      sendJson(response, 404, { error: "没有可用词书" });
    } else {
      saveDb();
      sendJson(response, 200, workspace);
    }
    return true;
  }

  if (url.pathname === "/api/progress" && request.method === "PUT") {
    const body = await readJsonBody(request);
    const bookId = String(body.bookId || "");
    if (!db.wordbooks.some((book) => book.id === bookId)) {
      sendJson(response, 404, { error: "词书不存在" });
      return true;
    }
    const state = db.progressByUser[user.id] || {
      books: {},
      progressUpdatedAt: {},
    };
    if (!state.progressUpdatedAt) state.progressUpdatedAt = {};
    state.activeBookId = bookId;
    state.books[bookId] = body.progress || defaultProgress();
    const updatedAt = new Date().toISOString();
    state.progressUpdatedAt[bookId] = updatedAt;
    db.progressByUser[user.id] = state;
    saveDb();
    sendJson(response, 200, { ok: true, updatedAt });
    return true;
  }

  if (url.pathname === "/api/progress" && request.method === "GET") {
    const bookId = url.searchParams.get("bookId");
    if (!bookId) {
      sendJson(response, 400, { error: "缺少词书 ID" });
      return true;
    }
    const state = db.progressByUser[user.id];
    const progress = state?.books?.[bookId];
    if (!progress) {
      sendJson(response, 404, { error: "尚未建立该词书的进度" });
      return true;
    }
    sendJson(response, 200, {
      progress,
      updatedAt: state.progressUpdatedAt?.[bookId] || null,
    });
    return true;
  }

  if (url.pathname === "/api/password" && request.method === "POST") {
    const body = await readJsonBody(request);
    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    const confirmPassword = String(body.confirmPassword || "");
    if (!checkPassword(user, currentPassword)) {
      sendJson(response, 400, { error: "当前密码不正确" });
      return true;
    }
    if (newPassword.length < 8) {
      sendJson(response, 400, { error: "新密码至少需要 8 位" });
      return true;
    }
    if (checkPassword(user, newPassword)) {
      sendJson(response, 400, { error: "新密码不能与当前密码相同" });
      return true;
    }
    if (newPassword !== confirmPassword) {
      sendJson(response, 400, { error: "两次输入的新密码不一致" });
      return true;
    }
    Object.assign(user, passwordRecord(newPassword));
    db.sessions = db.sessions.filter((session) => session.userId !== user.id);
    saveDb();
    sendJson(response, 200, { ok: true }, { "Set-Cookie": sessionCookie("", 0) });
    return true;
  }

  if (url.pathname === "/api/corrections" && request.method === "POST") {
    const body = await readJsonBody(request);
    const bookId = String(body.bookId || "");
    const wordId = String(body.wordId || "");
    const message = String(body.message || "").trim();
    const book = db.wordbooks.find((item) => item.id === bookId);
    if (!book) {
      sendJson(response, 404, { error: "词书不存在" });
      return true;
    }
    if (!book.words.some((word) => word.id === wordId)) {
      sendJson(response, 404, { error: "单词不存在" });
      return true;
    }
    if (!message) {
      sendJson(response, 400, { error: "请填写纠错内容" });
      return true;
    }
    if (message.length > 2000) {
      sendJson(response, 400, { error: "纠错内容不能超过 2000 字" });
      return true;
    }
    const correction = {
      id: `correction-${Date.now()}-${randomBytes(3).toString("hex")}`,
      userId: user.id,
      username: user.username,
      bookId,
      wordId,
      category: String(body.category || "其他"),
      message,
      status: "open",
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    };
    db.corrections.unshift(correction);
    saveDb();
    sendJson(response, 201, { correction });
    return true;
  }

  if (url.pathname === "/api/corrections" && request.method === "GET") {
    if (user.role !== "admin") {
      sendJson(response, 403, { error: "只有管理员可以查看纠错" });
      return true;
    }
    const corrections = db.corrections.slice(0, 200).map((correction) => {
      const book = db.wordbooks.find((item) => item.id === correction.bookId);
      return {
        ...correction,
        bookTitle: book?.title || "已删除词书",
        currentWord: book?.words.find((word) => word.id === correction.wordId) || null,
      };
    });
    sendJson(response, 200, { corrections });
    return true;
  }

  const correctionMatch = url.pathname.match(/^\/api\/corrections\/([^/]+)$/);
  if (correctionMatch && request.method === "PATCH") {
    if (user.role !== "admin") {
      sendJson(response, 403, { error: "只有管理员可以处理纠错" });
      return true;
    }
    const body = await readJsonBody(request);
    const correction = db.corrections.find((item) => item.id === correctionMatch[1]);
    if (!correction) {
      sendJson(response, 404, { error: "纠错记录不存在" });
      return true;
    }
    correction.status = body.status === "open" ? "open" : "resolved";
    correction.resolvedAt =
      correction.status === "resolved" ? new Date().toISOString() : null;
    saveDb();
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (url.pathname === "/api/wordbooks" && request.method === "GET") {
    sendJson(response, 200, { wordbooks: db.wordbooks.map(bookSummary) });
    return true;
  }

  if (url.pathname === "/api/wordbooks" && request.method === "POST") {
    if (user.role !== "admin") {
      sendJson(response, 403, { error: "只有管理员可以新增词书" });
      return true;
    }
    const body = await readJsonBody(request);
    const book = normalizeWordbook(body, user);
    db.wordbooks.push(book);
    for (const item of db.users) {
      const state = db.progressByUser[item.id] || { books: {} };
      state.books[book.id] = defaultProgress();
      db.progressByUser[item.id] = state;
    }
    saveDb();
    sendJson(response, 201, { book: bookSummary(book) });
    return true;
  }

  const bookWordMatch = url.pathname.match(
    /^\/api\/wordbooks\/([^/]+)\/words\/([^/]+)$/,
  );
  if (bookWordMatch && request.method === "PATCH") {
    if (user.role !== "admin") {
      sendJson(response, 403, { error: "只有管理员可以修改词条" });
      return true;
    }
    const bookId = decodeURIComponent(bookWordMatch[1]);
    const wordId = decodeURIComponent(bookWordMatch[2]);
    const book = db.wordbooks.find((item) => item.id === bookId);
    const word = book?.words.find((item) => item.id === wordId);
    if (!book || !word) {
      sendJson(response, 404, { error: "词书或单词不存在" });
      return true;
    }
    const body = await readJsonBody(request);
    const changes = body.word || body;
    for (const field of [
      "ru",
      "zh",
      "pos",
      "transliteration",
      "derived",
      "synonyms",
      "phrases",
      "level",
    ]) {
      if (changes[field] !== undefined) word[field] = String(changes[field]);
    }
    if (!word.ru.trim() || !word.zh.trim()) {
      sendJson(response, 400, { error: "俄语单词和中文释义不能为空" });
      return true;
    }
    if (Array.isArray(changes.examples)) {
      word.examples = changes.examples
        .filter((example) => example?.ru && example?.zh)
        .map((example) => ({
          ru: String(example.ru),
          zh: String(example.zh),
        }));
    }
    saveDb();
    sendJson(response, 200, { word });
    return true;
  }

  const bookMatch = url.pathname.match(/^\/api\/wordbooks\/([^/]+)$/);
  if (bookMatch && request.method === "GET") {
    const book = db.wordbooks.find((item) => item.id === bookMatch[1]);
    if (!book) sendJson(response, 404, { error: "词书不存在" });
    else sendJson(response, 200, { book });
    return true;
  }

  if (bookMatch && request.method === "DELETE") {
    if (user.role !== "admin") {
      sendJson(response, 403, { error: "只有管理员可以删除词书" });
      return true;
    }
    if (bookMatch[1] === "russian-frequency-500-v1") {
      sendJson(response, 400, { error: "内置词书不能删除" });
      return true;
    }
    const before = db.wordbooks.length;
    db.wordbooks = db.wordbooks.filter((book) => book.id !== bookMatch[1]);
    if (db.wordbooks.length === before) {
      sendJson(response, 404, { error: "词书不存在" });
      return true;
    }
    for (const state of Object.values(db.progressByUser)) {
      delete state.books[bookMatch[1]];
      if (state.activeBookId === bookMatch[1]) {
        state.activeBookId = db.wordbooks[0]?.id;
      }
    }
    saveDb();
    sendJson(response, 200, { ok: true });
    return true;
  }

  sendJson(response, 404, { error: "接口不存在" });
  return true;
}

function serveStatic(response, pathname) {
  if (!existsSync(distDir)) {
    response.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("请先运行 npm run build");
    return;
  }
  const requested = pathname === "/" ? "/index.html" : pathname;
  let filePath = normalize(join(distDir, requested));
  if (!filePath.startsWith(distDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    filePath = join(distDir, "index.html");
  }
  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": extname(filePath) === ".html" ? "no-store" : "public, max-age=31536000, immutable",
  });
  response.end(readFileSync(filePath));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(request, response, url);
      return;
    }
    serveStatic(response, url.pathname);
  } catch (error) {
    sendJson(response, 500, { error: error.message || "服务器错误" });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`СЛОВО server: http://127.0.0.1:${port}`);
});
