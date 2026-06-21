# 浏览器操作指南

你运行在 Electron 桌面 App 中。所有浏览器操作**必须用 MCP 工具**。

## 可用工具

| 任务 | 工具 | 参数 |
|------|------|------|
| 打开网页 | `browser.navigate` | `{ url: string }` |
| 点击元素 | `browser.click` | `{ selector: string }` |
| 输入文字 | `browser.fill` | `{ selector: string, value: string }` |
| 滚动页面 | `browser.scroll` | `{ direction: 'up'|'down', pixels?: number }` |
| 等待元素 | `browser.wait` | `{ selector: string, timeoutMs?: number }` |
| 截图确认 | `browser.screenshot` | (无参数) |
| 提取数据 | `browser.extract` | `{ type: 'text'|'cards'|'table', selector: string }` |
| 查看状态 | `browser.getState` | (无参数) |

## 铁律

1. **绝对不要**写 Python/Node 脚本去操控浏览器
2. **绝对不要**在 Bash 里调 Playwright 或 curl
3. 如果存在 `WaitForMcpServers` 工具，第一步先调用它，等 MCP 就绪
4. 打开网页 → 直接用 `browser.navigate({ url: "..." })`
5. 每个操作后调 `browser.screenshot` 确认页面状态
6. 如果操作失败，不要慌张，检查 `browser.getState` 看当前 URL
7. HTML/CSS/JS 文件默认写到 Agent 可写工作区；如果明确需要放入仓库 `agent/` 目录，必须用当前机器的实际绝对路径生成 `file:///.../agent/xxx.html` 后再 `browser.navigate` 打开，不要套用历史项目路径。
8. 无论是网页、B 站还是股票搜索，目标都必须在 Electron BrowserView 内完成，绝不能回退到系统 Chrome
9. 如果用户指定平台，必须只在该平台内完成，禁止擅自切去别的网站找替代结果
10. 用户说“B站/哔哩哔哩”时，只允许 `bilibili.com` 域名；如果跳到 YouTube/Google/Bing，必须立刻返回 B 站
11. 平台页面异常时，可以尝试该平台站内搜索、频道页、用户页、排序页，但不能跨平台
12. 默认不要点击可能打开新标签页、新窗口、独立播放页、作者主页的链接；优先保持在当前页
13. 能用 `browser.navigate` 直接进入站内搜索页、排序页、列表页，就不要走站点自己的新窗跳转
14. 每次关键跳转后立刻 `browser.getState`，确认 URL 仍在正确平台和正确任务路径内
15. 只要任务是“搜索 / 查找 / 整理结果”，第一优先不是点首页，而是先执行平台 URL 工具；Windows 优先用 `node tools/build_platform_search_url.mjs <platform> "<keyword>"`，Linux/macOS 可用 `tools/build_platform_search_url.sh <platform> "<keyword>"`
16. 拿到工具生成的 URL 后，再 `browser.navigate({ url })`
17. 如果搜索工具不支持该平台，直接报告，不要自己发挥
18. 如果任务是“录制 / 回放 / 保存流程 / 复用流程”，优先使用 `browser.recording_*` 和 `browser.workflow_*` 工具，不要自己写脚本

## 示例：打开 B 站并搜索

```
1. browser.navigate({ url: "https://www.bilibili.com" })
2. browser.wait({ selector: ".nav-search-input" })
3. browser.fill({ selector: ".nav-search-input", value: "关键词" })
4. browser.click({ selector: ".nav-search-btn" })
5. browser.screenshot()
```
