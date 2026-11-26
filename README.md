# 搜索结果清理 · Tampermonkey 脚本

在搜索结果页自动隐藏识别到的 CSDN 内容和广告。右下角分别显示屏蔽数量，动态加载的新结果也会自动检查。

## 安装

1. 在浏览器中安装 [Tampermonkey](https://www.tampermonkey.net/)。
2. 点击 [安装搜索结果清理脚本](https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/tampermonkey-scripts/main/search-cleaner.user.js)，在 Tampermonkey 中确认安装。
3. 打开或刷新搜索结果页。命中规则时，右下角会显示类似「已屏蔽 8 条 CSDN 结果 · 3 个广告单元」的提示。

如果打开安装链接后只看到源码，可以复制全文，在 Tampermonkey 中新建脚本，粘贴并保存。已安装旧版时，可以直接替换旧脚本。

## 支持的搜索引擎

Google、Bing、百度、DuckDuckGo、Brave Search、Startpage、Yandex、360 搜索、搜狗、Kagi、Ecosia、Yahoo Search 和 SearXNG。

自建 SearXNG 如果使用自定义域名，请在脚本开头填写主机名，例如：

```javascript
const searxHosts = ['search.example.com'];
```

## 屏蔽规则

- **CSDN**：识别 `csdn.net` 及其子域名，并处理部分搜索引擎的跳转链接和来源栏。
- **广告**：根据广告容器和推广标签识别。多条推广共用一个容器时，计为一个广告单元。
- **计数**：显示当前页面的屏蔽数量，点击计数不会恢复结果。

## 发布更新

安装链接指向仓库的 `main` 分支。要让 Tampermonkey 从该地址检查更新，请在 `search-cleaner.user.js` 的元数据区填写：

```javascript
// @updateURL    https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/tampermonkey-scripts/main/search-cleaner.user.js
// @downloadURL  https://raw.githubusercontent.com/YOUR_GITHUB_USERNAME/tampermonkey-scripts/main/search-cleaner.user.js
```

每次发布新版时递增 `@version`，例如从 `3.3.0` 改为 `3.3.1`，再提交到 `main`。

## 测试与反馈

v3.3.0 已通过 JavaScript 语法检查和 Chromium 的 14 个模拟页面测试。搜索引擎的地区差异或页面改版可能造成漏判。

遇到漏屏蔽或误屏蔽时，可以提交 Issue，附上搜索引擎名称、脚本版本、能复现的搜索关键词和结果截图。
