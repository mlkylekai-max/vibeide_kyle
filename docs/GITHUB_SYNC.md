# GitHub 同步和接力流程

## 目标

把 GitHub 仓库 `git@github.com:howtio/vibeide.git` 作为源码真相源，避免 Windows 裸目录和本机源码镜像长期分叉。

## 当前拓扑

```text
Windows 实机
  C:\vibeide
      ↑↓ SSH / scp
Linux 本机
  /run/media/howtion/thinkplus/hardvibecoding/vibeide
      ↑↓ git
GitHub
  git@github.com:howtio/vibeide.git
```

## 已完成

- GitHub SSH 访问已验证。
- 本机已 clone `git@github.com:howtio/vibeide.git`。
- Windows SSH 已连通。
- Windows 源码已同步到本机，并排除了依赖、构建产物、运行态和密钥。
- 本机私有连接信息已写入 `.local-secrets/HANDOFF_PRIVATE.md`，该目录不会提交。

## 推荐长期流程

1. 本机从 GitHub 拉取：

```bash
git pull --ff-only origin main
```

2. 本机修改、验证、提交：

```bash
git status --short
git add <明确文件>
git commit -m "docs: refresh vibeide handoff and development docs"
git push origin main
```

3. Windows 端改为从 GitHub clone/pull：

```powershell
cd C:\
git clone git@github.com:howtio/vibeide.git vibeide
cd C:\vibeide
npm --prefix runtime install
npm --prefix electron install
npm --prefix agent install
```

4. Windows 正式开发目录是 `C:\vibeide`。如果机器上仍有旧目录 `C:\vibeide`，只作为历史备份，不再手工双向改。

## 从 Windows 裸目录重新同步源码

仅在 Windows 工作目录有新改动、且尚未进入 GitHub 时使用。当前应优先在 `C:\vibeide` 里直接 `git pull` / `git status` / `git diff`。

主源码包：

```bash
ssh hp@192.168.137.1 "tar -a -cf C:\Users\HP\AppData\Local\Temp\vibeide-source.zip --exclude=./electron/node_modules --exclude=./electron/dist-package --exclude=./electron/dist-package.zip --exclude=./agent/node_modules --exclude=./agent/logs --exclude=./agent/screenshots --exclude=./agent/recordings --exclude=./_bundled --exclude=./apikey.txt -C C:\vibeide ."
scp hp@192.168.137.1:/C:/Users/HP/AppData/Local/Temp/vibeide-source.zip ../vibeide-source.zip
unzip -o ../vibeide-source.zip
```

Runtime 源码包：

```bash
ssh hp@192.168.137.1 "tar -a -cf C:\Users\HP\AppData\Local\Temp\vibeide-runtime-source.zip --exclude=./node_modules --exclude=./dist --exclude=./chrome_profile --exclude=./recordings --exclude=./workflows -C C:\vibeide\runtime ."
scp hp@192.168.137.1:/C:/Users/HP/AppData/Local/Temp/vibeide-runtime-source.zip ../vibeide-runtime-source.zip
mkdir -p runtime
unzip -o ../vibeide-runtime-source.zip -d runtime
```

## 推送前排除清单

必须确认这些不进 Git：

```text
.local-secrets/
.claude/
agent/.claude/
apikey.txt
.env
node_modules/
electron/dist/
electron/dist-package/
electron/dist-package.zip
runtime/dist/
runtime/chrome_profile/
runtime/recordings/
runtime/workflows/
runtime/logs/
agent/logs/
agent/screenshots/
workplaces/
```

检查命令：

```bash
git status --short --ignored
git check-ignore -v .local-secrets/HANDOFF_PRIVATE.md .claude/settings.local.json agent/.claude/settings.json electron/dist/main/index.js || true
```

## 初次入库建议

当前 GitHub 仓库原始内容只有 README。第一次正式入库建议只提交：

- 源码：`electron/src/`、`runtime/src/`、`agent/skills/`、`agent/tools/`
- 配置：`config/`、`electron/package.json`、`runtime/package.json`、`agent/package.json`
- 启动脚本：`scripts/`
- 文档：`README.md`、`CLAUDE.md`、`docs/`
- 测试：`tests/test_project.py`

不要提交：

- `electron/dist/`
- `.local-secrets/`
- `.claude/`
- `agent/.claude/`
