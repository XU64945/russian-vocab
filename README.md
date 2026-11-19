# СЛОВО · 俄语背单词

这是一个给中文学习者使用的俄语背词网站。词库来自《俄语高频词精讲》第 1—8 册，共 4000 个词，每册按 10 个单元整理。

每个词条不仅有中文释义，还包含双语例句、派生与变形、同义替换和常用短语。学习页面、词库检索和词条详情都可以查看这些内容。

第一次使用时可以先看 [用户使用说明](USER_GUIDE.md)。

## 学习方式

一组词会依次经过三轮练习：

1. 看俄语，选择中文释义。
2. 看中文，选择对应的俄语单词。
3. 按乱序字母或完整俄语键盘拼写。

答错的词会在本轮后半段重新出现。完成三轮后，整组词进入复习池，并记录每个词各自的掌握情况。

开始前可以选择每组 5、10、15 或 20 个词，也可以设置每天学习几组。系统会根据词书剩余内容估算每天用时和完成日期。

## 复习规则

复习间隔会跟着答题结果变化，不是所有词共用一张固定时间表。

新词完成练习后，从第 1 天的复习节点开始。答对后会逐步拉长间隔，答错则安排到第二天优先复习。答错不会把整个学习记录清零，但会取消当前的“已掌握”状态，并把词加入错题本。

只有完成三轮练习并通过两次复习后，单词才会进入“已掌握”。每次复习包含两轮：俄语选中文和拼写。

## 发音

4000 个单词发音使用单独部署的 MP3，不依赖手机是否安装了俄语语音包：

```text
https://russian-vocab-audio.pages.dev/words/w0001.mp3
...
https://russian-vocab-audio.pages.dev/words/w4000.mp3
```

网站会优先播放这些 MP3。例句、短语等没有对应音频的内容，再回退到浏览器的语音合成。

如需更换音频存储地址，可以在构建时设置：

```bash
VITE_WORD_AUDIO_BASE_URL=https://your-domain.example/words
```

## 账号

每个账号分别保存选中的词书、学习计划、练习位置、复习池、收藏、错题和掌握状态。换设备后登录同一账号，可以从云端继续。

用户可以自行注册、修改密码、收藏单词、提交词条纠错。管理员可以查看学习情况、冻结账号、处理纠错和新增词书。

文档中不再列出账号或密码。正式部署前请由部署负责人保管并更换初始凭据。

## 本地运行

```bash
npm install
npm run dev
```

`npm run dev` 会先构建前端，然后由 `server/index.mjs` 提供页面和账号接口。

生产构建：

```bash
npm run build
npm run preview
```

## Cloudflare Pages

线上版本使用 Cloudflare Pages 和 D1。相关文件：

- `functions/api/[[path]].js`：登录、账号、词书和学习进度接口。
- `migrations/0001_initial.sql`：D1 表结构。
- `wrangler.toml`：Pages 与 D1 绑定配置。

创建数据库：

```bash
npx wrangler d1 create russian-vocab-db
```

然后在 Cloudflare Pages 项目的 Settings → Bindings 中添加 D1 数据库，变量名使用 `DB`。把生成的 `database_id` 写入 `wrangler.toml`。

本地模拟：

```bash
npm run build
npx wrangler pages dev dist --d1 DB
```

密码使用 PBKDF2 哈希，登录会话保存在 HttpOnly Cookie 中。D1 不保存明文密码或会话令牌原文。

## 词库数据

主要数据位于：

- `server/seed/wordbooks.json`：8 本词书，共 4000 个词条。
- `src/data/vocabulary.json`：第 1 册兼容数据快照。
- `server/data/db.json`：本地开发数据库，首次运行时自动创建。

已有的本地或 D1 数据库会自动补齐新增词书，不会因为更新词库而清空用户进度。

管理员新增词书时，数据需要兼容当前结构：

- `topics`：单元数组，每项至少包含 `id`、`label` 和 `ru`。
- `words`：单词数组，每项至少包含 `ru` 和 `zh`。

推荐同时提供 `pos`、`examples`、`derived`、`synonyms`、`phrases` 和 `topic`，这样新词书可以直接使用现有的练习、详情和复习功能。
