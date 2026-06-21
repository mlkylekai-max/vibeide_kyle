# Runtime

这里保存本机运行状态，不建议提交真实内容：

- `browser_runtime/`: 内置浏览器二进制预留
- `chrome_profile/`: 独立用户目录
- `cookies/`: 平台登录态或导出 cookie
- `pids/`: 运行进程标记
- `logs/`: Gateway / Runtime 日志
- `state.json`: 浏览器运行状态
- `ports.json`: 调试端口与运行端口信息

## 当前入口

```bash
# 健康检查
cd runtime && npm run dev

# 启动 MCP Server（stdio）
cd runtime && npm run mcp

# 直接尝试连接 Electron 暴露的 CDP
cd runtime && npm run connect
```

## Hardboard 打包版路径

Windows 打包版不要直接把 ESP-IDF 工程固定到很深的 `resources/runtime/hardboard` 绝对路径。runtime 会把 hardboard 根目录映射到短路径：

```text
%LOCALAPPDATA%\vibeide-hardboard-runtime\hardboard
```

Agent 和 CLI 都应优先传相对项目路径：

```cmd
node dist\index.js hardboard:env
node dist\index.js hardboard:build hardboard\projects\wifi_connect_fmai
node dist\index.js hardboard:flash hardboard\projects\wifi_connect_fmai COM3
node dist\index.js hardboard:serial COM3 5 115200
```

`hardboard:env` 里的 `hardboardRoot`、`idfPath`、`python`、`projectsDir` 应指向 `%LOCALAPPDATA%\vibeide-hardboard-runtime\hardboard`。如果打包版出现 `bits/stl_iterator_base_types.h` 缺失，先检查是否仍在使用长绝对路径或旧 build 缓存。

## 当前代码结构

```text
runtime/src/
├── index.ts      ← runtime CLI 入口（health / mcp / connect）
├── paths.ts      ← 运行目录与状态文件初始化
├── browser.ts    ← CDP 连接与当前页面选择
├── actions.ts    ← navigate / click / fill / wait / screenshot
├── extract.ts    ← text / table / cards 提取
├── record.ts     ← 页面事件录制
├── replay.ts     ← 录制动作回放
├── storage.ts    ← workspace 持久化
└── mcp/
    ├── server.ts
    ├── browser.tool.ts
    └── storage.tool.ts
```
