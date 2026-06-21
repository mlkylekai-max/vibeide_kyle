# vibeide 接力开发文档

> 本文记录当前接手状态、架构规则、开发流程和同步方式。敏感账号密码不写在本文，见本机私有文件 `.local-secrets/HANDOFF_PRIVATE.md`，该目录已被 `.gitignore` 排除。

## 当前位置

- GitHub 仓库：`git@github.com:howtio/vibeide.git`
- Windows 实机目录：`C:\vibecodingide`
- 本机工作目录：`/run/media/howtion/thinkplus/hardvibecoding/vibeide`
- Windows SSH：`hp@192.168.137.1`
- Windows 机器名：`LAPTOP-JQQD9L56`

## 当前状态

- GitHub 仓库原始状态只有 `README.md`，本机已从 Windows 同步出源码镜像，并已重写新的 GitHub README。
- Windows 原目录不是 Git 仓库。
- 项目总大小约 `4.25 GB`，但源码镜像约 `24 MB`。
- 新文档体系已建立：
  - `docs/INDEX.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DEVELOPMENT.md`
  - `docs/GITHUB_SYNC.md`
  - `docs/REFACTOR_PLAN.md`
  - `docs/SECURITY.md`
- 已排除大体积运行产物和依赖：
  - `electron/node_modules`
  - `electron/dist`
  - `electron/dist-package`
  - `electron/dist-package.zip`
  - `agent/node_modules`
  - `agent/logs`
  - `agent/screenshots`
  - `agent/recordings`
  - `runtime/node_modules`
  - `runtime/dist`
  - `runtime/chrome_profile`
  - `runtime/recordings`
  - `runtime/workflows`
  - `_bundled`
  - `apikey.txt`

## 架构概览

```text
Electron Window
├── Renderer UI
│   ├── ChatPanel
│   ├── TaskProgress
│   ├── ResultPanel
│   └── BrowserPanel / WorkspacePanel
├── Gateway
│   └── IPC 唯一入口
├── Worker / Orchestrator
│   ├── 快捷任务
│   ├── 搜索预处理
│   ├── 任务上下文构造
│   └── 拉起 Claude Agent
├── Agent 工作区
│   ├── agent/CLAUDE.md
│   ├── agent/skills/*.md
│   └── agent/tools/*
└── Runtime
    ├── CDP 连接 Electron Chromium
    ├── MCP Server
    ├── browser.* tools
    ├── storage.* tools
    └── 录制 / 回放 / workflow
```

核心链路：

```text
UI -> Gateway -> Worker -> Agent -> MCP -> Runtime -> Electron Chromium
```

## 关键规则

1. Gateway 是唯一 IPC 入口。
2. Runtime 不调 LLM，只做浏览器连接、动作、提取、录制、回放和存储。
3. Agent 不直接碰 Playwright，不写脚本操作浏览器，所有浏览器操作必须走 MCP。
4. Agent 可读 `agent/skills/`，可写 `agent/tools/`，不要修改 `runtime/`、`electron/`、`scripts/`。
5. 搜索任务优先用 `agent/tools/build_platform_search_url.mjs` 生成站内 URL，再 `browser.navigate`。
6. 录制、回放、复用流程优先使用 `browser.recording_*` 和 `browser.workflow_*`。
7. API key、cookie、Chrome profile、录制运行产物、依赖目录不进 Git。
8. 真实账号密码只放 `.local-secrets/`，不要提交、不要 push。

## 主要目录

```text
electron/                  Electron 桌面端
electron/src/main/          主进程、Gateway、Worker、BrowserView
electron/src/renderer/      React UI
runtime/                   Runtime MCP 与 CDP 控制层
runtime/src/mcp/            MCP tools 注册
agent/                     Claude Agent 工作区
agent/skills/              平台知识与操作规则
agent/tools/               跨平台辅助脚本
config/                    YAML 配置
docs/                      项目文档
scripts/                   启动、报告和辅助脚本
tests/                     Python scaffold / 结构测试
```

## 关键文件

- `CLAUDE.md`：总开发规则。
- `agent/CLAUDE.md`：Agent 运行规则，强调所有浏览器操作必须走 MCP。
- `electron/src/main/index.ts`：Electron 启动、窗口、CDP 端口、BrowserView 初始化。
- `electron/src/main/gateway.ts`：IPC 注册和 Worker 转发。
- `electron/src/main/worker/orchestrator.ts`：任务编排、快捷任务、搜索预处理、Agent 生命周期。
- `electron/src/main/worker/context.ts`：按任务选择 skills 并构造 Agent prompt。
- `electron/src/main/agent.ts`：拉起 Claude Code、生成 MCP 配置、读取 DeepSeek API key。
- `electron/src/main/browser-view.ts`：右侧 WebContentsView tabs、持久 session、bounds 同步。
- `electron/src/main/browser-recorder.ts`：Electron 侧录制和回放桥接。
- `runtime/src/mcp/browser.tool.ts`：注册 `browser.*` MCP tools。
- `runtime/src/browser.ts`：CDP 连接和页面选择。
- `runtime/src/record.ts` / `runtime/src/replay.ts`：Runtime 侧录制和回放。
- `runtime/src/workflows.ts`：workflow 持久化。

## 开发前检查

```bash
cd /run/media/howtion/thinkplus/hardvibecoding/vibeide
git status --short
git branch --show-current
sed -n '1,220p' docs/INDEX.md
sed -n '1,260p' docs/ARCHITECTURE.md
sed -n '1,260p' docs/REFACTOR_PLAN.md
```

如果要开始实质改动，建议先建备份分支：

```bash
git checkout -b backup/$(date +%Y%m%d)-before-work
git push -u origin HEAD
git checkout main
```

## 本机验证命令

```bash
# Python 结构测试
pytest tests/

# Runtime typecheck
cd runtime
npm install
npm run typecheck

# Electron typecheck / build
cd ../electron
npm install
npm run typecheck
npm run build:main
npm run build:renderer
```

注意：历史文档记录 `pytest tests/` 曾因缺少旧 `src/coddecat` scaffold 实现失败；当前代码应以 `tests/test_project.py` 的结构测试为主要参考，`tests/test_scaffold.py` 属于旧 scaffold 测试。

## Windows 实机运行

Windows 上项目目录：

```powershell
cd C:\vibecodingide
```

推荐启动：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start_electron_desktop.ps1
```

或：

```cmd
scripts\start_electron_desktop.cmd
```

## GitHub 同步策略

推荐把 GitHub 作为源码真相源：

1. 本机修改源码。
2. 本机验证。
3. 提交并 push 到 `git@github.com:howtio/vibeide.git`。
4. Windows 端后续改为 clone/pull 该仓库，或者从本机同步变更文件回 `C:\vibecodingide`。

不要把 Windows 当前整目录直接提交，因为里面有依赖、构建产物、运行态和密钥。

详细流程见 `docs/GITHUB_SYNC.md`。

## 从 Windows 重新同步源码

如果 Windows 原目录有新改动，可重新打源码包。注意继续排除依赖、产物、运行态和密钥：

```bash
ssh hp@192.168.137.1 "tar -a -cf C:\Users\HP\AppData\Local\Temp\vibeide-source.zip --exclude=./electron/node_modules --exclude=./electron/dist-package --exclude=./electron/dist-package.zip --exclude=./agent/node_modules --exclude=./agent/logs --exclude=./agent/screenshots --exclude=./agent/recordings --exclude=./_bundled --exclude=./apikey.txt -C C:\vibecodingide ."
scp hp@192.168.137.1:/C:/Users/HP/AppData/Local/Temp/vibeide-source.zip ../vibeide-source.zip
unzip -o ../vibeide-source.zip
```

`runtime/` 要单独同步源码，避免把运行态一起带进来：

```bash
ssh hp@192.168.137.1 "tar -a -cf C:\Users\HP\AppData\Local\Temp\vibeide-runtime-source.zip --exclude=./node_modules --exclude=./dist --exclude=./chrome_profile --exclude=./recordings --exclude=./workflows -C C:\vibecodingide\runtime ."
scp hp@192.168.137.1:/C:/Users/HP/AppData/Local/Temp/vibeide-runtime-source.zip ../vibeide-runtime-source.zip
mkdir -p runtime
unzip -o ../vibeide-runtime-source.zip -d runtime
```

## 敏感信息规则

- `apikey.txt` 不提交。
- `.env` 不提交。
- `.local-secrets/` 不提交。
- `runtime/chrome_profile/` 不提交。
- `runtime/recordings/` 和 `runtime/workflows/` 默认视为运行态，不提交，除非用户明确要求保存某个示例 workflow。
- 如果要记录账号密码，只写入 `.local-secrets/HANDOFF_PRIVATE.md`。

## 当前读码结论

- 这个项目目前更像 Electron + Runtime + Agent 的桌面采集原型，而不是 README 里旧的纯 Python `coddecat` scaffold。
- `pyproject.toml` 和 `tests/test_scaffold.py` 仍保留旧 Python scaffold 叙事，可能与当前主链路不一致。
- `README.md`、`CLAUDE.md` 已先统一成 `vibeide` 当前主线。
- 代码、package、UI、部分注释中仍有旧名 `coffecat/coddecat`，后续按 `docs/REFACTOR_PLAN.md` 分阶段处理。
- `electron/dist/` 已被同步出来，但属于构建产物，后续应从 Git 中排除。
- 中文文件名文档在当前 Linux 外置盘解包时出现编码/权限问题，必要时应从 Windows 远程读取或重命名为 ASCII 文件名后再入库。

## 下一步建议

1. 先清理 Git 跟踪范围：只提交源码、配置、文档，不提交 `electron/dist/` 和私有配置。
2. 提交并 push 当前源码和文档到 `git@github.com:howtio/vibeide.git`。
3. 明确 Python scaffold 是否还保留；如果不保留，应同步调整 `pyproject.toml` 和测试。
4. 在 Windows 上用 Git clone 方式替代原裸目录，之后统一通过 GitHub 接力。
