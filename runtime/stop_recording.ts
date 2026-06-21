// 临时脚本：停止录制并保存
import { connectBrowser } from './src/browser.js';
import { stopRecord } from './src/record.js';
import { saveRecording } from './src/recordings.js';

const CDP_PORT = Number.parseInt(process.env.CDP_PORT || '9230', 10);

async function main() {
  await connectBrowser(CDP_PORT);
  const actions = await stopRecord();
  console.log('录制已停止，共收集', actions.length, '条动作');
  const file = await saveRecording(actions, 'browser-recording');
  console.log('已保存到:', file);
}

main().catch((err) => {
  console.error('停止录制失败:', err);
  process.exit(1);
});
