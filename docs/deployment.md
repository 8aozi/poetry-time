# 网站发布

公开网址：**https://8aozi.github.io/poetry-time/**。

## 分支职责

- `main`：完整项目源码、数据源、工具、测试和精简说明。
- `gh-pages`：由 `task1/` 正式应用生成的纯静态发布文件。
- GitHub Settings → Pages → Deploy from a branch → **`gh-pages` / `/ (root)`**。

保留 `.nojekyll`，使用 HTTPS。页面通过相对路径加载资源，通过 hash 区分阅读和练习，无需后端路由。网站不依赖开发者电脑保持开机。

推送 `main` 或 Gitee 不会自动复制文件到 `gh-pages`；推送 `gh-pages` 后 Pages 自动部署。

## 准备发布包

在完整仓库的 `task1/` 下运行：

```sh
npm run build:site
```

无需安装依赖。输出在 `task1/dist/`，包含 HTML、样式、四个 JS 模块、诗词数据、两张 SVG 和 `.nojekyll`。该目录为生成文件，脚本每次会重建它。增加正式资源时须相应更新 `scripts/build-site.cjs` 的文件清单。

发布包不包含测试、Node 依赖、说明文档、数据源文本、截图、课程资料或独立实验 Demo。

## 更新发布分支

1. 完成与本次改动相关的测试，并提交 `main`。
2. 生成发布包。
3. 在一个独立目录检出远程 `gh-pages`，避免在主工作目录切换分支丢失未提交修改：

   ```sh
   git clone --single-branch --branch gh-pages https://github.com/8aozi/poetry-time.git poetry-time-site
   ```

4. 将 `task1/dist/` 中的所有文件（包括隐藏文件 `.nojekyll`）复制到 `poetry-time-site/`，保留 `.git/`。同时删除已不在发布包内的旧运行文件；不要将源码仓库整体复制过去。
5. 在该发布目录检查并提交：

   ```sh
   git status --short
   git diff
   git add -A
   git commit -m "Deploy updated Poetry Time"
   git push origin gh-pages
   ```

6. 在 GitHub 查看 Pages 部署成功后，再用公开网址检查首页、阅读与拼音、收藏、练习、错题本以及手机布局。没有文件变化时无需创建空提交。

首次创建 `gh-pages` 与配置 Pages 已由维护者完成，后续按上述流程增量发布即可。

## 记录与隐私

学习数据保存在访问者当前浏览器中，不跨设备同步。网站 URL 与存储键保持不变时，更新页面不会主动清除已有数据。localhost、直接打开文件及公开网站的记录彼此独立。

Gitee 保存课程协作所需材料；GitHub `main` 保留项目本身所需文件，开发历程只做概括。独立朗读 Demo 仅放在源码分支，生成音频不会上传，亦不包含在网站发布包中。
