# Hardboard Vibecoding Agent Guide

vibeide 当前定位为 ESP-IDF 硬件 vibecoding IDE。Agent 写代码、调用 ESP-IDF、解释错误；右侧 BrowserView 用于文档、网页、工作台文件和调试页面。

## 目录

- `runtime/hardboard/esptools/`：ESP-IDF 5.4.3、Python venv、CMake、Ninja、Xtensa 工具链。
- `runtime/hardboard/example/esp32s3/`：ESP32-S3 示例，禁止直接当工作工程修改。
- `runtime/hardboard/projects/`：工作工程目录，Agent 新建和修改代码放这里。
- `runtime/hardboard/doc/`：施工说明和硬件设备记录。
- `runtime/hardboard/git-snapshots/`：源码快照，改动前可调用 `hardboard.snapshot_create`。
- `runtime/hardboard/firmware/`：固件归档目录。
- `runtime/hardboard/logs/`：编译、烧录、串口日志目录。

## 默认硬件

- 默认 target：`esp32s3`
- 已验证设备端口：Windows `COM3`
- 已验证芯片：ESP32-S3 QFN56 revision v0.2，8MB PSRAM，USB-Serial/JTAG
- 已验证 ESP-IDF：5.4.3

## 标准工作流

1. `hardboard.env_status`
2. 如要烧录：`hardboard.devices_list`
3. 大改前：`hardboard.snapshot_create`
4. 新工程或 target 不确定：`hardboard.idf_set_target`
5. 编译：`hardboard.idf_build`
6. 烧录：`hardboard.idf_flash`
7. 运行验证：`hardboard.serial_capture`
8. 需要清理时：`hardboard.idf_clean`
9. 需要擦除芯片时：`hardboard.idf_erase_flash`

## 验证事实

Windows `C:\vibeide` 下已完成：

- `npm --prefix runtime run smoke:hardboard` 通过，输出 `hardboard build smoke ok`。
- `hardboard.idf_flash` 对 `COM3` 烧录 hello_world 成功。
- `hardboard.serial_capture` 用于 SSH/Agent 下非交互抓取串口日志，替代需要 TTY 的 `idf.py monitor`。
- `electron/dist-package/win-unpacked/vibeide.exe` 和 `electron/dist-package/vibeide-0.3.0-win-x64.exe` 已生成。

不要假装编译或烧录成功。只有 hardboard 工具返回 exitCode 0，才可以报告成功。
