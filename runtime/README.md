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
