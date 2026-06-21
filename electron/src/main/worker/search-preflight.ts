export interface SearchPreflightPlan {
  platform: SearchPlatform;
  keyword: string;
  url: string;
  reason: string;
}

type SearchPlatform = 'bilibili' | 'baidu' | 'google' | 'youtube' | 'taobao' | 'tmall' | '1688' | 'douyin';

const SEARCH_INTENT_RE = /(搜索|查找|搜一下|搜一搜|整理|列出|前十|十个|10个|最火|最热|热门|排行|排名|top|播放量|播放最高|数据)/i;
const VIDEO_INTENT_RE = /(视频|up主|UP主|播放|最火|最热|热门|b站|B站|哔哩|bilibili)/i;

export function buildSearchPreflightPlan(task: string, currentUrl = ''): SearchPreflightPlan | null {
  const normalized = task.trim();
  if (!normalized || !SEARCH_INTENT_RE.test(normalized)) return null;

  const explicitPlatform = detectExplicitPlatform(normalized);
  const currentPlatform = detectPlatformFromUrl(currentUrl);
  const implicitChineseVideoRanking = !hasExplicitNonBilibiliPlatform(normalized) &&
    VIDEO_INTENT_RE.test(normalized) &&
    /(最火|最热|热门|排行|排名|前十|十个|10个|top|播放量|播放最高)/i.test(normalized);
  const implicitChineseWebSearch = !explicitPlatform &&
    !currentPlatform &&
    /[\u4e00-\u9fff]/.test(normalized) &&
    /(搜索|查找|搜一下|搜一搜|资料|网页|是谁|是什么|怎么样|整理|列出|数据)/i.test(normalized);

  const platform = explicitPlatform ??
    currentPlatform ??
    (implicitChineseVideoRanking ? 'bilibili' : null) ??
    (implicitChineseWebSearch ? 'baidu' : null);

  if (!platform) return null;

  const keyword = extractKeyword(normalized, platform);
  if (!keyword) return null;

  return {
    platform,
    keyword,
    url: buildPlatformSearchUrl(platform, keyword, normalized),
    reason: explicitPlatform
      ? `用户明确指定 ${platformLabel(platform)} 搜索任务`
      : currentPlatform
        ? `当前页面已在 ${platformLabel(platform)}，沿用当前平台执行搜索任务`
        : implicitChineseVideoRanking
          ? '任务是中文视频热度/榜单整理，默认使用 B 站站内搜索页'
          : '任务是普通中文网页搜索，默认使用百度搜索页',
  };
}

export function buildSearchPreflightPrompt(plan: SearchPreflightPlan): string {
  return [
    '【Worker 搜索预处理】',
    `Worker 已在 Agent 启动前按平台搜索工具策略打开页面：${plan.url}`,
    `平台：${plan.platform}`,
    `关键词：${plan.keyword}`,
    `原因：${plan.reason}`,
    `你必须从当前 ${platformLabel(plan.platform)} 搜索结果页继续完成整理/提取。`,
    '不要改用其他平台或系统浏览器。',
    '如果需要确认页面状态，先调用 browser.getState 和 browser.screenshot。',
    '除非用户明确要求进入详情页，否则优先在搜索结果页/列表页提取前 10 条数据。',
  ].join('\n');
}

function extractKeyword(task: string, platform: SearchPlatform): string {
  const compact = task.replace(/\s+/g, '').replace(platformNamePattern(platform), '');
  const markerMatch = compact.match(/(?:搜索|查找|整理|列出|搜一下|搜一搜)?(?:前十|十个|10个|十大)?(.+?)(?:最火|最热|热门|排行|排名|top|播放量|播放最高|视频|数据|资料|信息|结果|列表|$)/i);
  const raw = markerMatch?.[1] || compact;

  return raw
    .replace(/^(帮我|请|麻烦|给我|帮忙|查找|搜索|整理|列出|看一下|看看|一下)+/g, '')
    .replace(/^(前十|十个|10个|十大)+/g, '')
    .replace(/(的|视频|数据|资料|信息|结果|列表|最火|最热|热门|排行|排名|top|播放量|播放最高|整理|网页|页面)+$/gi, '')
    .trim();
}

function buildPlatformSearchUrl(platform: SearchPlatform, keyword: string, task: string): string {
  const encoded = encodeURIComponent(keyword);
  const rankingSearch = /(最火|最热|热门|排行|排名|前十|十个|10个|top|播放量|播放最高)/i.test(task);

  switch (platform) {
    case 'bilibili':
      return rankingSearch
        ? `https://search.bilibili.com/video?keyword=${encoded}&order=click`
        : `https://search.bilibili.com/all?keyword=${encoded}`;
    case 'baidu':
      return `https://www.baidu.com/s?wd=${encoded}`;
    case 'google':
      return `https://www.google.com/search?q=${encoded}`;
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encoded}`;
    case 'taobao':
      return `https://s.taobao.com/search?q=${encoded}`;
    case 'tmall':
      return `https://list.tmall.com/search_product.htm?q=${encoded}`;
    case '1688':
      return `https://s.1688.com/selloffer/offer_search.htm?keywords=${encoded}`;
    case 'douyin':
      return `https://www.douyin.com/search/${encoded}`;
  }
}

function detectExplicitPlatform(task: string): SearchPlatform | null {
  if (/(b站|B站|哔哩|bilibili)/i.test(task)) return 'bilibili';
  if (/(百度|baidu)/i.test(task)) return 'baidu';
  if (/(google|谷歌)/i.test(task)) return 'google';
  if (/(youtube|油管)/i.test(task)) return 'youtube';
  if (/(淘宝|taobao)/i.test(task)) return 'taobao';
  if (/(天猫|tmall)/i.test(task)) return 'tmall';
  if (/1688/i.test(task)) return '1688';
  if (/(抖音|douyin)/i.test(task)) return 'douyin';
  return null;
}

function detectPlatformFromUrl(url: string): SearchPlatform | null {
  const host = safeUrlHost(url);
  if (/(^|\.)bilibili\.com$/i.test(host)) return 'bilibili';
  if (/(^|\.)baidu\.com$/i.test(host)) return 'baidu';
  if (/(^|\.)google\./i.test(host)) return 'google';
  if (/(^|\.)youtube\.com$/i.test(host)) return 'youtube';
  if (/(^|\.)taobao\.com$/i.test(host)) return 'taobao';
  if (/(^|\.)tmall\.com$/i.test(host)) return 'tmall';
  if (/(^|\.)1688\.com$/i.test(host)) return '1688';
  if (/(^|\.)douyin\.com$/i.test(host)) return 'douyin';
  return null;
}

function hasExplicitNonBilibiliPlatform(task: string): boolean {
  return /(google|谷歌|百度|baidu|bing|必应|youtube|油管|抖音|douyin|淘宝|taobao|天猫|tmall|1688)/i.test(task);
}

function platformNamePattern(platform: SearchPlatform): RegExp {
  switch (platform) {
    case 'bilibili':
      return /(b站|B站|哔哩哔哩|哔哩|bilibili)/gi;
    case 'baidu':
      return /(百度|baidu)/gi;
    case 'google':
      return /(google|谷歌)/gi;
    case 'youtube':
      return /(youtube|油管)/gi;
    case 'taobao':
      return /(淘宝|taobao)/gi;
    case 'tmall':
      return /(天猫|tmall)/gi;
    case '1688':
      return /1688/gi;
    case 'douyin':
      return /(抖音|douyin)/gi;
  }
}

function platformLabel(platform: SearchPlatform): string {
  switch (platform) {
    case 'bilibili':
      return 'B 站';
    case 'baidu':
      return '百度';
    case 'google':
      return 'Google';
    case 'youtube':
      return 'YouTube';
    case 'taobao':
      return '淘宝';
    case 'tmall':
      return '天猫';
    case '1688':
      return '1688';
    case 'douyin':
      return '抖音';
  }
}

function safeUrlHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}
