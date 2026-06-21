# 录制回放优化与可复用 Workflow

适用场景：

- 用户说“优化这个重放”
- 用户说“把这个重放加上信息捕获”
- 用户说“封装成脚本 / 下次直接调用”
- 用户说“我录制了打开淘宝，然后你帮我统计淘宝上的信息”
- 用户想减少重复推理、减少 token、提高稳定性

## 核心原则

真正的浏览器自动化必须继续走 MCP：

- 回放录制：`browser.recording_replay`
- 保存可复用流程：`browser.workflow_save`
- 执行可复用流程：`browser.workflow_run`

用户说“封装成脚本”时，默认解释为“封装成 Runtime workflow”。不要写 Playwright / Puppeteer / curl / Bash 浏览器脚本绕过 MCP。

只有不碰浏览器的纯辅助逻辑，才可以放到 `agent/tools/`。

## 文件位置

| 内容 | 位置 | 用途 |
|------|------|------|
| 录制文件 | `../runtime/recordings/*.json` | 用户操作轨迹，只负责回放动作 |
| Workflow | `../runtime/workflows/*.json` | 绑定“录制文件 + 提取规则 + 默认 workspace”，相当于可复用任务脚本 |
| 任务结果 | `../workplaces/<name>/` 或 `storage.save(workspace, data)` | 保存抽取结果 |
| 平台知识 | `skills/*.md` | 页面结构、字段说明、异常处理 |
| Agent 工具 | `tools/*` | 只能做 URL 构造、文本处理、文件辅助；禁止操作浏览器 |

## 推荐命名

Workflow 名称用稳定、可读、可复用的格式：

```text
<platform>-<object>-<action>-v1
```

示例：

```text
taobao-search-stats-v1
bilibili-creator-top10-v1
douyin-product-rank-v1
```

workspace 名称用本次结果对象：

```text
taobao-search-stats-20260610
```

## 把录制优化成可复用任务

1. 先列出录制：`browser.recordings_list`
2. 找到用户指定的录制名或最近录制
3. 回放一次确认页面能到目标状态：`browser.recording_replay({ label })`
4. 调 `browser.getState` 和 `browser.screenshot` 确认页面
5. 判断要捕获的信息：
   - 卡片列表：`extractType: "cards"`
   - 表格：`extractType: "table"`
   - 页面文本：`extractType: "text"`
6. 用 `browser.extract` 小样本验证 selector
7. 保存 workflow：

```text
browser.workflow_save({
  name: "<platform>-<object>-<action>-v1",
  recordingLabel: "<录制名>",
  extractType: "cards",
  selector: "<稳定 CSS selector>",
  workspace: "<默认 workspace>",
  maxRows: 50
})
```

8. 立刻执行一次验收：

```text
browser.workflow_run({
  name: "<platform>-<object>-<action>-v1",
  workspace: "<验收 workspace>"
})
```

## 后续直接调用

当用户之后说“做上次那个淘宝统计 / 跑淘宝搜索统计 / 用之前封装的流程”：

1. 先调 `browser.workflows_list`
2. 找到最匹配的 workflow 名称
3. 直接调 `browser.workflow_run({ name, workspace })`
4. 只有 workflow 失败或页面结构变了，才重新截图、修 selector、保存新版本 `v2`

## 版本升级

如果旧 workflow 失效：

- 不覆盖旧文件，保存成 `v2 / v3`
- 简短说明失效原因：登录态、页面结构、selector、流程步骤
- 新旧 workflow 都留在 `../runtime/workflows/`，方便回滚

## 禁止事项

- 禁止写脚本直接 import Playwright 操作浏览器
- 禁止用 Bash / curl / wget 采集页面
- 禁止为了省 token 绕过 MCP
- 禁止把真实账号、cookie、API key 写进 workflow 或 tools
