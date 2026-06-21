# 搜索任务统一工作流

适用场景：
- 用户说 `搜索`
- 用户说 `查找`
- 用户说 `整理结果`
- 用户要求列出若干条搜索结果、视频、商品、页面

## 核心原则

只要任务本质上是“先搜再整理”，就不要让 Agent 自己临场决定打开路径。

## 强制流程

1. 先识别用户指定的平台。
2. 先执行平台 URL 工具生成搜索 URL：
   - Windows 优先：`node tools/build_platform_search_url.mjs <platform> "<keyword>"`
   - Linux/macOS 可用：`tools/build_platform_search_url.sh <platform> "<keyword>"`
3. 拿到 URL 后，只能用 `browser.navigate({ url })` 打开。
4. 打开后立刻：
   - `browser.getState()`
   - `browser.screenshot()`
5. 确认平台、URL、页面形态正确后，才允许后续提取或整理。

## 平台不支持时

1. 如果平台 URL 工具返回 unsupported platform：
   - 直接报告当前平台未配置统一搜索工具
   - 不要擅自改成别的平台
   - 不要自己摸索首页点击路径

## 列表页优先

1. 优先停留在搜索结果页、列表页、排序页。
2. 除非用户明确要求点进详情，否则不要打开详情页。
3. 除非用户明确要求进入主页，否则不要打开作者主页、店铺主页、频道主页。

## 禁止事项

- 禁止先打开首页再自己尝试搜索
- 禁止跨平台替代搜索
- 禁止把搜索任务变成“随便点一个结果看看”
