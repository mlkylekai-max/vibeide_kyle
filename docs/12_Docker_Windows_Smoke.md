# Docker Windows Smoke 测试

> 这是 `windows1.0` 支线的 Windows 打包链路替代测试。它使用 Linux Docker + Wine + electron-builder 生成 Windows 产物，不等同于真实 Windows 内核运行测试。

## 运行

```bash
scripts/docker_windows_smoke.sh pack
```

如果当前 shell 还没有重新登录到 `docker` 用户组，可以临时使用：

```bash
DOCKER_CMD='sudo docker' scripts/docker_windows_smoke.sh pack
```

生成安装包：

```bash
scripts/docker_windows_smoke.sh dist
```

进入容器调试：

```bash
scripts/docker_windows_smoke.sh shell
```

## 覆盖范围

- 在干净容器里执行 `runtime` 依赖安装与 `tsc` 构建。
- 在干净容器里执行 Electron 依赖安装、主进程 typecheck、主进程构建、renderer 构建。
- 验证 `agent/tools/build_platform_search_url.mjs` 能生成淘宝、B站、Google 搜索 URL。
- 使用 Wine/electron-builder 尝试 Windows `pack:win` 或 `dist:win`。

## 当前验证状态

当前开发机已安装并启动 Docker。`scripts/docker_windows_smoke.sh pack` 已开始拉取 `electronuserland/builder:wine`，但基础镜像下载速度过慢，用户决定改到 Windows 实机调试，本次 Docker smoke 未跑完。

Linux Docker 不能运行真正的 Windows 容器。若要做完整 Windows 实机验证，仍需要 Windows 主机、Windows VM，或 Windows runner。
