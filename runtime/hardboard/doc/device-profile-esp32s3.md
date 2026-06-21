# ESP32-S3 设备记录

## 已验证开发板

- 芯片：ESP32-S3
- 封装/版本：QFN56 revision v0.2
- 特性：Wi-Fi、Bluetooth 5 LE、Dual Core + LP Core、240MHz、Embedded PSRAM 8MB
- 晶振：40MHz
- USB 模式：USB-Serial/JTAG
- Windows 串口：`COM3`
- MAC：`cc:ba:97:01:3a:dc`
- 默认 ESP-IDF：5.4.3
- 默认 target：`esp32s3`

## 已验证命令链路

```text
hardboard.env_status
hardboard.devices_list
hardboard.idf_set_target(projectDir, "esp32s3")
hardboard.idf_build(projectDir)
hardboard.idf_flash(projectDir, "COM3")
```

烧录结果：

- bootloader 写入并校验通过。
- app `hello_world.bin` 写入并校验通过。
- partition table 写入并校验通过。
- 最后通过 RTS hard reset。

## Agent 开发约束

- 烧录前必须重新调用 `hardboard.devices_list`，不要假定 `COM3` 永远存在。
- 如果用户没有明确要求烧录，只编译验证即可。
- 如果用户要求“测试板子/烧录看看/运行到板子上”，必须执行 `hardboard.idf_flash` 并报告真实 exitCode。
- 工程路径不要包含空格；需要复制时放到 `runtime/hardboard/projects`。
