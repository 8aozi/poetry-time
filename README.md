# 诗词拾光
> hust华中科技大学 26fall软件工程小组项目  面向儿童的古诗词启蒙平台，收录《义务教育语文课程标准（2022 年版）》小学阶段 **75 篇**诗词。暖米色与草木绿界面，支持桌面、手机和键盘操作。

**[打开公开网站](https://8aozi.github.io/poetry-time/) · [反馈问题](https://github.com/8aozi/poetry-time/issues) · [Gitee 项目](https://gitee.com/lgy3417203301/SEteam26fall)**

## 功能

- 搜索诗名、作者或诗句，分页浏览，逐句查看儿童白话释义及字词注释。
- 汉字上方拼音，支持显示／隐藏，包含古诗语境的多音字纠正。
- 收藏，标记“还没学／正在学习／已学习”，记录时间和学习进度。
- 上下句选择、字词填空、小关卡、首次答对星星奖励，以及错题本和逐题订正。
- 使用指南、开发者交流入口；标题和统计采用浅绿等高卡片，窄屏自动换行。

朗读只保留一个已舍弃方案的独立 Demo：人工试听认为系统合成音色机械感明显，未集成正式应用。详情见 [变更与技术决策](CHANGELOG.md)。

## 本地运行

需要 Node.js 18+ 和 Git。在终端执行：

```sh
git clone https://github.com/8aozi/poetry-time.git
cd poetry-time/task1
npm start
```

访问 **http://127.0.0.1:4173/**，按 Ctrl+C 停止。预览无需安装 npm 依赖。也可保留整个 `task1/` 目录，直接打开 `index.html` 离线阅读；需要稳定保存记录时建议使用 HTTP 预览。

`task1/` 沿用初始目录名，包含累计的正式功能，并非只包含第一阶段。

## 架构与目录

纯静态 HTML、CSS、JavaScript；无账户、业务后端或数据库。数据在开发时生成，阅读、搜索、出题和判分均在浏览器内完成。

| 路径 | 职责 |
| --- | --- |
| `task1/index.html` / `styles.css` / `assets/` | 页面入口、响应式样式、本地装饰与图标 |
| `task1/app.js` | 搜索、阅读、页面路由、收藏与学习操作 |
| `task1/learning-store.js` | 学习状态、收藏、时间与进度的本地存储 |
| `task1/practice.js` / `practice-ui.js` | 题库与判分、奖励和错题记录、练习界面 |
| `task1/data/poems.txt` / `poems.js` | 可编辑原文与译注 / 生成后的拼音数据 |
| `task1/scripts/` | 本地服务、数据生成与静态发布包生成 |
| `task1/tests/` | 内容、业务逻辑与浏览器回归测试 |
| `task1/previews/` | 界面截图；浏览器测试也会在此生成截图 |
| `demos/task4-narration/` | 已弃用朗读方案的本地复现实验 |
| `docs/deployment.md` | 网站发布配置与更新步骤 |

学习记录存于当前浏览器的 `localStorage`，不跨设备同步；清除网站数据会删除记录。公开网址与本地预览的记录独立。本次更新保持原有网站地址与存储格式，不需要迁移已有公开站点记录。

## 开发与测试

在 `task1/` 目录中：

```sh
npm ci
npm test
```

修改 `data/poems.txt` 后执行 `npm run build:data` 生成 `data/poems.js`。`pinyin-pro` 仅用于开发，不是线上接口；稳定的诗词 ID 与历史学习数据相关，请勿重新编号。

浏览器测试需要先运行 `npm start`，再在另一个终端运行：

```sh
npm run test:browser
npm run test:task2
npm run test:task3
```

默认使用本机 Google Chrome。也可执行 `npx playwright install chromium` 安装测试浏览器，然后设置 `PW_CHANNEL=bundled`。其他端口使用 `TEST_URL` 指定。完整内容口径和开发说明见 [应用文档](task1/README.md)。

## 发布

`main` 是完整开发仓库；`gh-pages` 只含网站运行文件，由 GitHub Pages 托管。公开 URL 保持为 **https://8aozi.github.io/poetry-time/**。

在 `task1/` 执行 `npm run build:site`，会将明确列出的运行文件输出到 `dist/`。发布包不包含测试、开发文档、实验 Demo 或依赖。将发布包提交到 `gh-pages` 后，Pages 自动更新；仅推送 `main` 或 Gitee 不会自动同步发布分支。步骤见 [部署说明](docs/deployment.md)。

## 独立朗读实验

仅用于本地复现，未加入公开网站。首次生成需要 macOS、Python 3 和系统“婷婷”普通话语音：

```sh
cd demos/task4-narration
python3 run.py
```

打开 **http://127.0.0.1:4175/**。生成的 WAV 不进入版本控制，未核实再分发许可的系统语音录音不随项目公开上传。详见 [实验说明](demos/task4-narration/README.md)。

## 交流与内容说明

我们来自华中科技大学，是 2024 级本科生。欢迎反馈、疑问、建议和点赞；如果喜欢这个项目，欢迎在 GitHub 点亮 Star。

- 邮箱：[3417203301@qq.com](mailto:3417203301@qq.com)
- [GitHub Issues](https://github.com/8aozi/poetry-time/issues)
- [Gitee](https://gitee.com/lgy3417203301/SEteam26fall)

篇目依据教育部《义务教育语文课程标准（2022 年版）》附录 1。原文使用常见教学文本，逐句释义为面向儿童编写的白话说明，并非教育部提供的译注。该仓库保留项目开发所需内容，开发历程以 [CHANGELOG](CHANGELOG.md) 概括。
