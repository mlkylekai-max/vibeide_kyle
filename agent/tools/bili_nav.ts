// 临时脚本：B站搜索"星芯的美少女"
// 通过 runtime 库连接 Electron CDP
import { connectBrowser, getBrowserState } from '../../runtime/src/browser.js';
import { navigate, screenshot, wait } from '../../runtime/src/actions.js';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const agentDir = path.resolve(path.dirname(__filename), '..');

async function main() {
  await connectBrowser(9230);
  await navigate('https://search.bilibili.com/all?keyword=%E6%98%9F%E8%8A%AF%E7%9A%84%E7%BE%8E%E5%B0%91%E5%A5%B3');
  console.log('✅ 已打开 B站搜索结果');

  const state = await getBrowserState();
  console.log('页面:', state.title);
  console.log('URL:', state.url);

  try {
    await wait('.bili-video-card__wrap, .video-list-item', 8000);
    console.log('✅ 视频卡片已加载');
  } catch {
    console.log('⚠️ 视频卡片未找到，继续截图');
  }

  const b64 = await screenshot();
  const outPath = path.join(agentDir, 'bilibili_search_result.png');
  fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
  console.log('✅ 截图已保存:', outPath, `(${b64.length} 字符)`);
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
