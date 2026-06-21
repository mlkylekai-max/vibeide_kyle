# 录制与工作流复用

适用场景：

- 用户说“开始录制”
- 用户说“停止录制”
- 用户说“列出录制”
- 用户说“回放某个录制”
- 用户说“把这个流程保存起来，下次复用”
- 用户说“把当前页面提取规则和录制做成一套工具”

## 优先工具

1. `browser.recording_start`
2. `browser.recording_stop`
3. `browser.recordings_list`
4. `browser.recording_replay`
5. `browser.workflow_save`
6. `browser.workflows_list`
7. `browser.workflow_run`

如果用户说“优化重放 / 加信息捕获 / 封装成脚本 / 下次自动调用”，同时阅读 `replay_workflow_tooling.md`。

## 强制流程

### 开始录制

1. 确认当前浏览器状态
2. 调 `browser.recording_start`
3. 告诉用户录制已开始

### 停止录制并命名

1. 调 `browser.recording_stop({ label })`
2. 把保存出来的录制文件名告诉用户

### 按名字回放

1. 先 `browser.recordings_list`
2. 找到最接近用户要求的录制名
3. 调 `browser.recording_replay({ label })`

### 保存成可复用工作流

1. 在当前页面确定提取方式：`text / cards / table`
2. 确定提取 selector
3. 先用 `browser.extract` 小样本验证 selector
4. 调 `browser.workflow_save`
5. 保存时把录制和提取规则绑定到同一个名字

### 下次直接运行

1. 用户只要说要那个名字的数据
2. 先 `browser.workflows_list` 找最匹配的 workflow
3. 优先 `browser.workflow_run({ name })`
4. 如果需要落盘，再传 `workspace`

## 禁止事项

- 禁止为录制/回放临时写 TS 脚本
- 禁止改用 Bash 去直接调用 runtime 内部源码
- 禁止绕过这些工具重新发明一套流程
