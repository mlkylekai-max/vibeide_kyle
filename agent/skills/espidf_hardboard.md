# ESP-IDF Hardboard Vibecoding

用于 ESP32 / ESP32-S3 / ESP32-C3 硬件开发、编译、烧录、串口设备选择和本地工程维护。

## 默认环境

- 默认 ESP-IDF 版本：5.4.3。
- 默认 target：`esp32s3`。
- 硬件根目录：`runtime/hardboard`。
- 示例目录：`runtime/hardboard/example`。
- 工作工程目录：`runtime/hardboard/projects`。
- Agent 可读文档：`runtime/hardboard/doc`。
- 本地快照目录：`runtime/hardboard/git-snapshots`。

## 先读资料

硬件任务开始时先读：

1. `runtime/hardboard/doc/README.md`
2. `runtime/hardboard/doc/device-profile-esp32s3.md`

如果任务涉及官方流程，可在右侧 BrowserView 打开 Espressif 文档，但不要用网页步骤替代 hardboard 工具。

## 标准调用顺序

1. `hardboard.env_status`：确认 `idfPath`、`idfPy`、`python`、`idfToolsPath`。
2. `hardboard.devices_list`：烧录前列出串口；Windows 串口通常为 `COM3`、`COM8`。
3. `hardboard.snapshot_create`：大改或用户要求可回滚时，先创建源码快照。
4. `hardboard.idf_set_target`：新工程或 target 不确定时执行，默认 `esp32s3`。
5. `hardboard.idf_build`：编译。
6. `hardboard.idf_flash`：烧录，必须传入真实端口。
7. `hardboard.serial_capture`：烧录后非交互读取串口日志，验证固件实际运行；SSH/Agent 场景不要依赖 `idf.py monitor`。
8. `hardboard.idf_clean`：需要清理构建缓存时执行。
9. `hardboard.idf_erase_flash`：用户明确要求擦除芯片时执行。

## 工程规则

- 不要直接修改 `runtime/hardboard/example/**`；先复制到 `runtime/hardboard/projects/<project-name>`。
- 不要把工程放到带空格路径。
- 修改 ESP-IDF 工程时重点检查：
  - 顶层 `CMakeLists.txt`
  - `main/CMakeLists.txt`
  - `main/*.c` / `main/*.cpp`
  - `sdkconfig.defaults`
  - 组件依赖和 `idf_component_register`
- 编译失败先读 hardboard 工具返回的 `stderr/stdout`，再改代码。

## 成功标准

- “写好了”只代表文件已创建。
- “编译通过”必须来自 `hardboard.idf_build` exitCode 0。
- “烧录成功”必须来自 `hardboard.idf_flash` exitCode 0，并且输出包含写入和校验信息。
- “运行正常”必须来自 `hardboard.serial_capture` 的串口日志，或用户能看到的等价硬件输出。
- 不能因为生成了代码或看起来合理就报告硬件验证成功。

## 已验证基线

- Windows `C:\vibeide` 下 ESP-IDF 5.4.3 可用。
- `runtime/hardboard/projects/hello_world_esp32s3` 已完成 set-target/build。
- ESP32-S3 板子在 `COM3` 烧录成功。
- 打包产物已生成 `win-unpacked` 和 `vibeide-0.3.0-win-x64.exe`。
