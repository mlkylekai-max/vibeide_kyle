import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { getResourcesDirFromWorker, getAgentDir } from '../paths';

const PROJECT_ROOT = getResourcesDirFromWorker();
const AGENT_DIR = getAgentDir();

export interface TaskContext {
  prompt: string;
  skillsFound: string[];
}

export function buildContext(task: string): TaskContext {
  const startTime = Date.now();
  const rules = readRules();
  const { content: skillsContent, files: skillsFound } = readSkills(task);

  logger.info('task:context', {
    task: task.slice(0, 200),
    rulesLength: rules.length,
    skillsCount: skillsFound.length,
    skillsFound,
  });

  const gameRules = isHtmlGameTask(task)
    ? [
        '',
        '【HTML 游戏专项验收】',
        'A. 页面必须在 Electron BrowserView 内看起来像完整成品，不是黑底里一个小方块',
        'B. 主游戏区域必须明显铺开：目标是宽度接近视口 70% 以上，高度接近视口 60% 以上',
        'C. 默认先显示开始页 / 开始按钮 / 按键开始，禁止一加载就自动死亡或 game over',
        'D. 不要只写固定像素画布再让 body 居中；必须给外层容器和 canvas 做响应式缩放',
        'E. 完成后必须 navigate 到 file:// 页面并截图验收；如果截图里画面太小、黑边过大、或出现失败文本，继续修改，不要直接结束',
      ].join('\n')
    : '';

  const platformRules = buildPlatformRules(task);

  const prompt = [
    `【任务】${task}`,
    '',
    '【规则 — 必须遵守，违反会导致任务失败】',
    rules,
    '0. ⚠️ 如果存在 WaitForMcpServers 工具，你的第一步必须先调用它，等 MCP 就绪',
    '1. MCP 就绪后，第一批浏览器操作必须是 browser.navigate 或 browser.getState，不是写脚本/读文件',
    '2. 所有浏览器操作必须通过 MCP 工具完成：browser.navigate / browser.click / browser.fill / browser.screenshot / browser.extract / browser.getState',
    '3. ⛔ 不要创建脚本文件来操作浏览器 ⛔ 不要用 Bash ⛔ 不要用 curl/wget ⛔ 不要调用系统浏览器或 Chrome',
    '4. 如果找不到某个 button/link，先用 browser.screenshot 确认页面状态——不要自己猜',
    '5. 如果任务是写网页/小游戏，允许把 HTML/CSS/JS 保存到 agent/ 目录，但保存后必须用 browser.navigate(file://绝对路径) 在 Electron 内打开',
    '6. 如果任务是 HTML 游戏，必须做成响应式布局，尽量铺满 BrowserView；禁止大黑边、小画布、开局即失败',
    '7. 生成 HTML 游戏后，必须先截图自检；如果截图显示黑边过大、布局太小、或一打开就失败，继续修正后再结束',
    '8. 如果 MCP 工具不可用，立即报告错误并停止，不要改用 Bash / Playwright / Chrome 顶替',
    '9. 回复尽量简短，重点放在执行任务上',
    '10. 默认不要点击可能触发新窗口/新标签页/独立详情页的元素；优先用 browser.navigate 在当前页完成跳转',
    '11. 每次关键跳转后立刻 browser.getState，确认当前 URL 仍在用户要求的平台和正确路径内',
    '12. 只要任务包含搜索/查找/整理结果意图，必须先执行平台 URL 工具生成 URL：优先 node tools/build_platform_search_url.mjs <platform> "<关键词>"；如果在 Linux/macOS 且 Node 工具不可用，再用 tools/build_platform_search_url.sh；然后 browser.navigate；禁止先打开首页自己摸索',
    platformRules,
    gameRules,
    '',
    '【操作流程 — 按顺序执行】',
    'Step 0: WaitForMcpServers() — 等 MCP 工具就绪（如果该工具存在）',
    'Step 1: browser.getState() — 确认当前浏览器状态',
    'Step 2: browser.navigate({ url: "目标网址" }) — 打开页面',
    'Step 3: browser.screenshot() — 确认页面加载成功',
    'Step 4: browser.fill / browser.click — 执行采集操作',
    'Step 5: browser.extract — 提取数据',
    '',
    skillsContent ? `\n【平台知识】\n${skillsContent}` : '',
    `\n【可用的 Skills】${skillsFound.length ? skillsFound.join(', ') : '(无)'}`,
  ].join('\n');

  logger.debug('task:context', {
    totalPromptLength: prompt.length,
    buildTimeMs: Date.now() - startTime,
  });

  return { prompt, skillsFound };
}

function buildPlatformRules(task: string): string {
  if (/(b站|哔哩|bilibili)/i.test(task)) {
    return [
      '',
      '【平台硬约束】',
      'A. 本任务用户明确指定了 B 站，只允许使用 bilibili.com 相关页面',
      'B. 禁止改去 YouTube、Google、Bing、抖音、微博或其他网站找“替代结果”',
      'C. 如果当前页面已经离开 B 站，必须立刻导航回 B 站',
      'D. 如果 B 站当前无法完成，就直接报告 B 站受限，不得跨平台继续',
      'E. 优先使用 B 站站内搜索结果页、频道页、排序页；不要随意点击会打开独立播放页或作者空间的新路径',
    ].join('\n');
  }

  if (/(youtube|油管)/i.test(task)) {
    return [
      '',
      '【平台硬约束】',
      'A. 本任务用户明确指定了 YouTube，只允许使用 youtube.com 相关页面',
      'B. 禁止改去 B 站、Google、Bing 或其他网站找“替代结果”',
    ].join('\n');
  }

  if (/(淘宝|taobao|天猫|tmall)/i.test(task)) {
    return [
      '',
      '【平台硬约束】',
      'A. 本任务用户明确指定了淘宝/天猫，只允许使用 taobao.com / tmall.com 相关页面',
      'B. 禁止改去 1688、拼多多、京东、Google、Bing 或其他网站找“替代结果”',
    ].join('\n');
  }

  if (/(百度|baidu)/i.test(task)) {
    return [
      '',
      '【平台硬约束】',
      'A. 本任务用户明确指定了百度，只允许使用 baidu.com 相关页面',
      'B. 搜索任务必须先执行平台 URL 工具生成 URL：优先 node tools/build_platform_search_url.mjs baidu "<关键词>"；如果在 Linux/macOS 且 Node 工具不可用，再用 tools/build_platform_search_url.sh baidu "<关键词>"',
      'C. 禁止改去 Google、Bing、B站、YouTube 或其他网站找“替代结果”',
    ].join('\n');
  }

  return '';
}

function isHtmlGameTask(task: string): boolean {
  return /(html.*游戏|游戏.*html|小游戏|贪吃蛇|马里奥|坦克大战|platformer|game)/i.test(task);
}

function readRules(): string {
  const claudeMdPath = path.join(AGENT_DIR, 'CLAUDE.md');
  try {
    const rules = fs.readFileSync(claudeMdPath, 'utf-8');
    logger.debug('task:context', { claudeMdSize: rules.length });
    return rules;
  } catch (err) {
    logger.warn('task:context', { error: 'CLAUDE.md not found, using defaults' });
    return '';
  }
}

function readSkills(task: string): { content: string; files: string[] } {
  const skillsDir = path.join(AGENT_DIR, 'skills');
  try {
    const allFiles = fs.readdirSync(skillsDir).filter((f) => f.endsWith('.md')).sort();
    const files = selectSkillFiles(task, allFiles);
    let content = '';
    for (const file of files) {
      try {
        const text = fs.readFileSync(path.join(skillsDir, file), 'utf-8');
        content += `\n### ${file}\n${text}\n`;
        logger.debug('task:context', { skillFile: file, size: text.length });
      } catch (err) {
        logger.warn('task:context', { error: `Cannot read skill: ${file}` });
      }
    }
    return { content, files };
  } catch {
    logger.warn('task:context', { error: 'Skills directory not found' });
    return { content: '', files: [] };
  }
}

function selectSkillFiles(task: string, allFiles: string[]): string[] {
  const selected = new Set<string>();
  const needsBrowserGuide = /(打开|搜索|网页|浏览器|导航|采集|提取|抽取|抖音|淘宝|1688|b站|哔哩|html|游戏|browser|navigate|extract|crawl|scrape)/i.test(task);
  const needsSearchWorkflow = /(搜索|查找|搜一下|搜一搜|整理结果|整理视频|列出|最火|最热|top|排行|search|find)/i.test(task);
  const needsRecordingWorkflow = /(录制|回放|重放|播放录制|工作流|流程复用|保存流程|开始录制|停止录制)/i.test(task);
  const needsReplayTooling = /(优化重放|优化回放|信息捕获|封装成脚本|封装.*流程|下次.*调用|复用.*任务|保存成工具|workflow|工作流|重放.*提取|回放.*提取)/i.test(task);
  const add = (...files: string[]) => {
    for (const file of files) {
      if (allFiles.includes(file)) selected.add(file);
    }
  };

  if (needsBrowserGuide) {
    add('browser_guide.md');
  }

  if (needsSearchWorkflow) {
    add('search_workflow.md');
  }

  if (needsRecordingWorkflow) {
    add('recording_workflow.md');
  }

  if (needsReplayTooling) {
    add('recording_workflow.md', 'replay_workflow_tooling.md', 'data_extract.md');
  }

  if (isHtmlGameTask(task)) {
    add('html_game_generation.md');
    return [...selected];
  }

  if (/1688/i.test(task)) {
    add('1688_source_finding.md', 'data_extract.md');
  }

  if (/(b站|哔哩|bilibili)/i.test(task)) {
    add('bilibili_search_workflow.md');
  }

  if (/淘宝|taobao/i.test(task)) {
    add('taobao_listing.md', 'data_extract.md');
  }

  if (/抖音|douyin/i.test(task)) {
    add('douyin_product_rank.md', 'data_extract.md');
  }

  if (/采集|提取|抽取|解析|理解页面|page/i.test(task)) {
    add('data_extract.md', 'page_understanding.md');
  }

  return [...selected];
}
