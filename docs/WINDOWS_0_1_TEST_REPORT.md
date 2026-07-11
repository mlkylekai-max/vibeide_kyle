# Windows 0.1 迁移与硬件测试报告

测试日期：2026-06-29  
测试机器：Windows `hp@192.168.137.1`  
源码目录：`E:\vibeide`  
打包目录：`E:\vibeide-0.1-win-unpacked`  
可执行文件：`E:\vibeide-0.1-win-unpacked\奥德赛0.0.exe`

## 结论

- Windows 源码项目已迁移到 `E:\vibeide`。
- Windows unpacked 包已迁移到 `E:\vibeide-0.1-win-unpacked`。
- 打包 exe 的 PE `FileVersion` / `ProductVersion` 已验证为 `0.1.0`。
- 打包版 runtime 可以发现 ESP32-S3、编译 ESP-IDF 工程、烧录到 `COM7`，并完成写入 hash 校验。
- 串口读取命令可以打开端口并生成日志文件，但当前测试没有抓到应用层 `Hello world!` 输出，需要后续单独处理 console 接口或复位时序。

## 迁移结果

已完成两个目录的镜像迁移：

- `C:\vibeide` -> `E:\vibeide`
- `C:\vibeide\electron\dist-package\win-unpacked` -> `E:\vibeide-0.1-win-unpacked`

验证点：

- `E:\vibeide\electron\package.json` 版本为 `0.1.0`。
- `E:\vibeide-0.1-win-unpacked\奥德赛0.0.exe` 存在。
- `E:\vibeide-0.1-win-unpacked\resources\app.asar` 存在。
- `E:\vibeide-0.1-win-unpacked\VIBEIDE_0_1_BUILD.txt` 存在。

## 打包版 runtime 环境

命令目录：

```cmd
cd /d E:\vibeide-0.1-win-unpacked\resources\runtime
```

`hardboard:env` 返回：

- `runtimeRoot`: `E:\vibeide-0.1-win-unpacked\resources\runtime`
- `hardboardRoot`: `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard`
- `idfVersion`: `5.4.3`
- `idfPath`: `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\esptools\esp-idf-v5.4.3\esp-idf`

## ESP32-S3 设备发现

`hardboard:devices` 发现：

- `COM8`
- `COM9`
- `COM7`，Windows 标签为 USB 串口设备，后续 esptool 确认为 ESP32-S3。

烧录时 `COM7` 识别结果：

- Chip type: `ESP32-S3 (QFN56) (revision v0.2)`
- Features: `Wi-Fi, BT 5 (LE), Dual Core + LP Core, 240MHz, Embedded PSRAM 8MB`
- USB mode: `USB-Serial/JTAG`
- MAC: `94:a9:90:30:50:00`

## 编译测试

### wifi_connect_fmai

命令：

```cmd
node dist\index.js hardboard:build hardboard\projects\wifi_connect_fmai
```

结果：

- `exitCode`: `0`
- `ok`: `true`
- 生成：`wifi_connect_fmai.bin`
- 日志：
  - `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\logs\2026-06-29T11-38-13-510Z-wifi_connect_fmai-build.stdout.log`
  - `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\logs\2026-06-29T11-38-13-510Z-wifi_connect_fmai-build.stderr.log`

### hello_world_esp32s3

命令：

```cmd
node dist\index.js hardboard:build hardboard\projects\hello_world_esp32s3
```

结果：

- `exitCode`: `0`
- `ok`: `true`
- 生成：`hello_world.bin`
- 日志：
  - `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\logs\2026-06-29T11-49-45-278Z-hello_world_esp32s3-build.stdout.log`
  - `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\logs\2026-06-29T11-49-45-278Z-hello_world_esp32s3-build.stderr.log`

## 烧录测试

### wifi_connect_fmai -> COM7

命令：

```cmd
node dist\index.js hardboard:flash hardboard\projects\wifi_connect_fmai COM7
```

结果：

- `exitCode`: `0`
- `ok`: `true`
- `bootloader.bin` 写入完成，hash verified。
- `wifi_connect_fmai.bin` 写入完成，hash verified。
- `partition-table.bin` 写入完成，hash verified。
- 日志：
  - `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\logs\2026-06-29T11-49-06-328Z-wifi_connect_fmai-flash.stdout.log`

### hello_world_esp32s3 -> COM7

命令：

```cmd
node dist\index.js hardboard:flash hardboard\projects\hello_world_esp32s3 COM7
```

结果：

- `exitCode`: `0`
- `ok`: `true`
- `bootloader.bin` 写入完成，hash verified。
- `hello_world.bin` 写入完成，hash verified。
- `partition-table.bin` 写入完成，hash verified。
- 日志：
  - `C:\Users\HP\AppData\Local\vibeide-hardboard-runtime\hardboard\logs\2026-06-29T11-50-44-219Z-hello_world_esp32s3-flash.stdout.log`

## 串口测试

命令：

```cmd
node dist\index.js hardboard:serial COM7 10 115200
node dist\index.js hardboard:serial COM7 8 115200
node dist\index.js hardboard:serial COM8 6 115200
node dist\index.js hardboard:serial COM9 6 115200
```

结果：

- `COM7` 串口命令 `exitCode=0`，日志文件生成，但 stdout 为空。
- `COM8` 串口命令 `exitCode=0`，日志文件生成，但 stdout 为空。
- `COM9` 打开失败，Windows 返回串口超时错误。
- 手动复位脚本曾把 `COM7` 置入 ROM download 模式，后续用 esptool `run` 执行 hard reset。

当前判断：

- 编译和烧录链路已通过。
- 串口读取工具本身能打开 `COM7` / `COM8` 并落日志。
- 应用层输出未抓到，后续需要在 runtime 串口工具中加入明确的 reset/open 时序选项，或在工程 sdkconfig 中明确 console 输出接口。

## 需要后续修复

1. `hardboard:serial` 增加可选复位策略，例如 `--reset none|rts|idf-monitor`。
2. 对 ESP32-S3 USB-Serial/JTAG 和 UART0 分别给出 UI 选择说明。
3. 任务管理器串口监视器应显示“端口已打开但无数据”的状态，而不是让用户误判为工具未运行。
