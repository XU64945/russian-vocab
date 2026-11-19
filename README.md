# СЛОВО · 俄语单词

一个面向中文学习者的俄语背单词网站。设计参考了 `yalesherwin/Russia` 的“词库 + 朗读 + 掌握”学习方式，并重做了信息架构、视觉与复习逻辑。

普通用户请先阅读：[СЛОВО 用户使用说明](USER_GUIDE.md)

## 功能

- 8 本内置词书，共 4000 个高频俄语词；每册 10 个单元、每单元 50 词
- 每个词条完整呈现两条例句及译文、派生变化、同义替换和延展短语
- 词库列表可搜索俄语、中文、例句、派生、同义和短语
- 独立词条详情抽屉，集中展示完整讲解内容
- 4000 词站内 MP3 发音，可调整语速；无法匹配整句时回退设备语音
- 第 1 轮：俄语选中文；答对后展示完整词条，答错后错词回炉
- 第 2 轮：中文选俄语；答错自动回到第 1 轮重新学习
- 第 3 轮：单词与字母双重乱序拼写
- 每日学习过半后，第 1 轮错词会穿插复习，避免集中堆积
- 开始练习前可选择 5 / 10 / 15 / 20 个词，以及当前词书前 1/3、中段、后 1/3 三档难度
- 完成一组后可继续增加下一组，已练词语会自动加入复习池
- 每本词书按难度分别保存学习位置，第二天会从下一组继续；00:00 只刷新当日统计，未学习时词序保持不变
- 复习模块包含两轮：俄语选中文、乱序拼写；第一轮答错会停留在当前词直到答对
- 复习拼写支持简单模式与困难模式，困难模式额外加入 4 个干扰字母
- 账号登录、普通用户与管理员角色
- 每个账号独立保存所选词书、练习进度、复习池和动态记忆状态
- 学习进度自动同步到云端，切换设备后登录同一账号即可继续
- 未完成练习会保存到具体轮次和题目，第二天可以继续上次的位置
- 学习记录提供“今天学了什么”和“学习计划内已掌握”完整单词清单
- 每个词书可设置每日组数，并自动估算每日用时和计划完成日期
- 词库支持俄语字母、编号、中文、例句、派生、同义和短语分字段检索，并提供快捷搜索索引
- 练习中可 Pass 不需要记忆的词；跳过词不会进入练习和复习池
- 单词可收藏到独立收藏夹，随时翻阅完整词条
- 答错词自动进入错题本，并均匀穿插回后续练习
- 用户可直接提交词条纠错，管理员在后台修改词条并处理纠错
- 支持用户名注册；管理员可查看账号学习情况并冻结或解冻账号
- 修改密码使用当前密码校验，并要求两次输入一致的新密码
- 管理员可粘贴或上传 `schemaVersion: 1` JSON 词书，发布后所有用户可选择
- 每个词独立记录连续答对、错误次数、动态间隔与下次到期时间
- 每日任务优先加载到期复习，再按剩余额度加入新词
- 答错词在本轮稍后重新插入，并在后续队列中提高优先级
- 新词 / 待复习 / 已掌握三种词库状态
- 云端持久化学习进度、计划、错题本和个人设置
- 桌面、平板与手机响应式布局

## 运行

```bash
npm install
npm run dev
```

## Word audio

The 4000 word pronunciations are hosted separately from the application bundle:

```text
https://russian-vocab-audio.pages.dev/words/w0001.mp3
...
https://russian-vocab-audio.pages.dev/words/w4000.mp3
```

Set `VITE_WORD_AUDIO_BASE_URL` at build time to use another static-storage base URL.
The app matches the full Russian headword before playback, then falls back to the
device speech engine for unmatched sentences and phrases.

`npm run dev` 会先构建前端，然后由 `server/index.mjs` 在同一端口提供页面和账号 API。

生产构建：

```bash
npm run build
npm run preview
```

## Cloudflare Pages 部署

项目包含 Cloudflare Pages Functions：

- `functions/api/[[path]].js` 提供登录、账号、词书和学习进度 API
- `migrations/0001_initial.sql` 提供 D1 表结构
- 账号密码使用 PBKDF2 哈希，会话令牌在 D1 中只保存 SHA-256 哈希

首次配置：

```bash
npx wrangler d1 create russian-vocab-db
```

在 Cloudflare Pages 项目的 **Settings → Bindings** 中添加：

- 类型：D1 database
- 变量名：`DB`
- 数据库：`russian-vocab-db`

也可以把创建后的 `database_id` 写入 `wrangler.toml` 的 `[[d1_databases]]` 配置。重新部署后，Pages Functions 会在第一次请求时自动建表并导入 8 本内置词书。

本地模拟：

```bash
npm run build
npx wrangler pages dev dist --d1 DB
```

## 复习算法

算法位于 `src/lib/srs.js`。它为每个单词独立维护练习与复习阶段：

- `repetitions`：回答次数
- `correctStreak`：连续答对次数
- `lapses`：错误次数
- `intervalDays`：当前复习间隔
- `dueAt`：下一次到期时间

新词完成三轮练习后，按第 1、2、4、15 天等节点推送复习；答错不会重置整个阶段，而是在第二天优先复习。只有完成练习并通过两次复习后才进入“已掌握”；任意一次答错都会取消掌握状态并把词穿插回练习。

## 账号与数据

首次运行会在 `server/data/db.json` 中创建账号和内置词书。密码仅保存为 scrypt 哈希，登录使用 HttpOnly 会话 Cookie。

内置账号：

- 管理员：`13144666848`
- 普通用户：`lvziyi`

初始密码由项目交付信息单独提供；登录后可在“学习设置”中修改。

原始资料为《俄语高频词精讲》第 1—6 册。解析后的内置词书位于：

- `server/seed/wordbooks.json`：8 本词书，共 4000 个词条及全部讲解字段
- `src/data/vocabulary.json`：第 1 册兼容数据快照

数据校验结果：8 本词书各 500 词，编号连续覆盖 1—4000；每个词条均包含两条例句、派生、同义和短语。已有账号数据库会自动补齐新增内置词书，不会清空用户进度。账号与学习进度可保存到 Cloudflare D1，不依赖外部 API Key。

管理员新增词书时使用与当前版本兼容的数据结构：

- `topics`：单元数组，每项至少包含 `id`、`label`、`ru`
- `words`：单词数组，每项至少包含 `ru`、`zh`
- 推荐同时提供 `pos`、`examples`、`derived`、`synonyms`、`phrases` 和 `topic`

服务端会校验并规范化词书，使其直接适配现有分组练习、三轮测试和两轮复习流程。
