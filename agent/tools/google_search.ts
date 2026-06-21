import { connectBrowser, getBrowserState } from '../../runtime/src/browser.js';
import { navigate, fill, click, screenshot } from '../../runtime/src/actions.js';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const agentDir = path.resolve(path.dirname(__filename), '..');

async function main() {
  // Step 1: Connect & navigate to Google
  console.log('[1/5] 连接浏览器...');
  await connectBrowser();

  console.log('[2/5] 导航到 https://www.google.com ...');
  await navigate('https://www.google.com');
  const state = await getBrowserState();
  console.log(`  页面: ${state.title} — ${state.url}`);

  // Step 2: Screenshot Google homepage
  console.log('[3/5] 截图 Google 首页...');
  const b64_1 = await screenshot();
  const homePath = path.join(agentDir, 'google_home.png');
  writeFileSync(homePath, Buffer.from(b64_1, 'base64'));
  console.log(`  已保存 ${homePath}`);

  // Step 3: Type "gpt" in search box
  console.log('[4/5] 在搜索框输入 "gpt"...');
  await fill('textarea[name="q"]', 'gpt');

  // Step 4: Press Enter to search (use keyboard press instead of click which may be intercepted)
  const { getPage } = await import('../../runtime/src/browser.js');
  const page = getPage();
  await page.locator('textarea[name="q"]').press('Enter');
  await page.waitForTimeout(2000);

  // Step 5: Screenshot search results
  console.log('[5/5] 截图搜索结果...');
  const b64_2 = await screenshot();
  const resultsPath = path.join(agentDir, 'google_results.png');
  writeFileSync(resultsPath, Buffer.from(b64_2, 'base64'));
  console.log(`  已保存 ${resultsPath}`);

  const finalState = await getBrowserState();
  console.log(`\n✅ 完成! 当前页面: ${finalState.title} — ${finalState.url}`);
  console.log(`截图: ${homePath}, ${resultsPath}`);
}

main().catch((err) => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});
