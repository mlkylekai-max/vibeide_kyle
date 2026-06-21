# Hardboard IDE 施工文档

## 目标

把 vibeide 重构为硬件 vibecoding 专用 IDE：

- 左侧 Agent 负责写 ESP-IDF 代码、解释步骤、调用工具、处理编译/烧录错误。
- 右侧 BrowserView 保留，用于打开乐鑫文档、GitHub、工作台文件和调试页面。
- 前端原重放区改为设备选择、Build、Flash；浏览器、录制、workflow、storage 等 MVP 能力保留。
- Windows 打包后不依赖用户手工配置 ESP-IDF 环境变量；Claude Code 通过 MCP hardboard tools 调用随包 ESP-IDF。

## 当前目录

```text
runtime/hardboard/
  esptools/        ESP-IDF 5.4.3 源码、Python venv、CMake/Ninja/Xtensa 工具链
  example/         按芯片保存示例工程；当前包含 ESP32-S3 示例
  projects/        Agent 修改、编译、烧录的工作工程
  doc/             Agent 可读施工文档、设备记录、硬件约束
  git-snapshots/   本地工程快照，排除 build/.git 等产物
  firmware/        预留 bin/elf/map 等交付固件
  logs/            编译、烧录、串口日志
```

## ESP-IDF 版本

- 当前固定版本：ESP-IDF 5.4.3。
- 默认 target：`esp32s3`。
- 参考流程来自 Espressif ESP-IDF v5.4 Windows start-project 文档和 v5.4.4 get-started 文档。

## 官方流程映射

乐鑫标准流程：

1. ESP-IDF 路径和工程路径避免空格。
2. 从 `examples/get-started/hello_world` 复制工程。
3. 进入工程目录后执行 `idf.py set-target esp32s3`。
4. 执行 `idf.py build`。
5. 选择串口，例如 Windows 下 `COM3`。
6. 执行 `idf.py -p COM3 flash`。

vibeide 对应工具：

```text
hardboard.env_status
hardboard.devices_list
hardboard.snapshot_create
hardboard.idf_set_target
hardboard.idf_build
hardboard.idf_flash
hardboard.serial_capture
hardboard.idf_clean
hardboard.idf_erase_flash
```

## 路径规则

ESP-IDF 工程可以使用相对路径，推荐 Agent 和工具调用统一写：

```text
hardboard\projects\<project-name>
```

不要让 Agent 拼 `C:\vibeide\electron\dist-package\win-unpacked\resources\runtime\hardboard\...` 这种打包后的长绝对路径。Windows 打包版 runtime 会在内部把 hardboard 根目录映射到短路径：

```text
%LOCALAPPDATA%\vibeide-hardboard-runtime\hardboard
```

用途：

- 避免随包 ESP-IDF/GCC 工具链在很深的 `resources\runtime\hardboard\esptools\...` 路径下出现 C++ 标准库头文件解析异常。
- 让 `hardboard.env_status` 返回的 `idfPath`、`python`、`idfToolsPath`、`projectsDir` 都是短路径。
- 允许旧的打包绝对路径输入被 runtime 自动重写到短路径别名下。
- 如果旧 build 缓存记录了旧 Python 或旧路径，runtime 会删除该项目 `build` 目录并自动重试一次。

已定位过的典型错误：

```text
fatal error: bits/stl_iterator_base_types.h: No such file or directory
```

这个错误不是 ESP-IDF 源码缺文件。实测头文件存在，问题出在打包后路径环境。修复后用打包版 runtime 执行：

```cmd
cd /d C:\vibeide\electron\dist-package\win-unpacked\resources\runtime
node dist\index.js hardboard:env
node dist\index.js hardboard:build hardboard\projects\wifi_connect_fmai
```

`hardboard:env` 应显示：

```text
hardboardRoot = C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard
```

## 已验证状态

- Windows 仓库：`C:\vibeide`。
- 当前 GitHub main：以仓库 `main` 分支为准。
- Windows 发现串口：`COM3`、`COM8`、`COM9`。
- ESP32-S3 实测端口：`COM3`。
- `npm --prefix runtime run smoke:hardboard` 已通过：
  - `hardboard.env_status` 找到 ESP-IDF 5.4.3、Python venv、IDF tools。
  - `hardboard.devices_list` 能列出 Windows 串口。
  - `hardboard.idf_set_target` 通过。
  - `hardboard.idf_build` 通过，输出 `hardboard build smoke ok`。
- `hardboard.idf_flash` 已在 Windows 真实烧录 ESP32-S3 成功：
  - 芯片识别：ESP32-S3 QFN56 revision v0.2。
  - 特性：Wi-Fi、BT 5 LE、Dual Core + LP Core、240MHz、Embedded PSRAM 8MB。
  - USB 模式：USB-Serial/JTAG。
  - MAC：`cc:ba:97:01:3a:dc`。
  - bootloader、app、partition table 均 hash verified。
- `hardboard.serial_capture` 用于 SSH/Agent 下非交互读取串口日志，替代需要 TTY 的 `idf.py monitor`。
- Windows 打包已通过：
  - `electron/dist-package/win-unpacked/vibeide.exe`
  - `electron/dist-package/vibeide-0.3.0-win-x64.exe`
  - `electron/dist-package/vibeide-0.3.0-win-x64.exe.blockmap`
- 打包版 runtime 相对路径编译已通过：
  - 命令：`node dist\index.js hardboard:build hardboard\projects\wifi_connect_fmai`
  - `cwd`：`%LOCALAPPDATA%\vibeide-hardboard-runtime\hardboard\projects\wifi_connect_fmai`
  - `exitCode`：`0`
- 打包版 runtime 烧录已通过：
  - 命令：`node dist\index.js hardboard:flash hardboard\projects\wifi_connect_fmai COM3`
  - `COM3` 识别为 ESP32-S3，写入和 hash verified 均成功。

## 随包环境策略

`runtime/src/hardboard.ts` 不要求用户打开 ESP-IDF shell。每次运行 `idf.py` 前会自动设置：

- `IDF_PATH`
- `IDF_TOOLS_PATH`
- `IDF_PYTHON_ENV_PATH`
- `ESP_ROM_ELF_DIR`
- `IDF_PYTHON_CHECK_CONSTRAINTS=no`
- `PATH`：自动追加 Python venv、ESP-IDF tools、已安装工具链 bin 目录。

Windows 打包配置包含 `runtime/hardboard`，但排除 ESP-IDF 自带 `examples/**`，避免 NSIS/7zip 处理 Unix 脚本路径时报错。vibeide 自己的 `runtime/hardboard/example/**` 保留。

## Agent 开发规则

- 硬件任务先读 `agent/skills/espidf_hardboard.md`。
- 新工程放在 `runtime/hardboard/projects/<project-name>`，不要直接改原始 example。
- 大改前调用 `hardboard.snapshot_create`。
- 编译必须调用 `hardboard.idf_build`；烧录必须调用 `hardboard.devices_list` 后再 `hardboard.idf_flash`。
- 用户要求“测试运行/联网/板子情况”时，烧录后必须调用 `hardboard.serial_capture` 或等价串口日志采集。
- 不允许只凭文件生成或口头描述宣称编译/烧录成功。

## 后续增强

- 串口监视器继续增强：
  - 前端入口在右侧 `监视器` 标签。
  - 已有 COM、波特率、字符编码选择。
  - 已有实时文本和数值曲线；曲线会从每行提取最后一个数字，适配 `sin:0.7071`、`value=0.7071` 等格式。
  - 后续要补 Electron smoke，直接调用主进程串口监视器并等待真实 `serial-data` IPC。
- 为 ESP32-C3/ESP32-C6 增加示例、target、真实设备记录。
- 增加固件归档工具，把 `.bin/.elf/.map/flasher_args.json` 复制到 `runtime/hardboard/firmware`。
