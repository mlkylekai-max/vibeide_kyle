import fs from 'fs';
import path from 'path';
import type { BrowserSurface } from '../browser-view';
import { getScreenshotsDir } from '../paths';

const SCREENSHOT_DIR = getScreenshotsDir();

export interface PageValidationResult {
  ok: boolean;
  reasons: string[];
  screenshotPath: string;
  url: string;
  title: string;
  metrics: {
    viewportWidth: number;
    viewportHeight: number;
    targetWidth: number;
    targetHeight: number;
    widthRatio: number;
    heightRatio: number;
    areaRatio: number;
    bodyText: string;
    backgroundLuminance: number | null;
  };
}

export function isHtmlGameTask(task: string): boolean {
  return /(html.*游戏|游戏.*html|小游戏|贪吃蛇|马里奥|坦克大战|platformer|game)/i.test(task);
}

export async function validateCurrentPage(view: BrowserSurface, task: string): Promise<PageValidationResult | null> {
  if (!isHtmlGameTask(task)) return null;

  const url = view.webContents.getURL();
  if (!url.startsWith('file://')) return null;

  ensureDir(SCREENSHOT_DIR);
  await waitForSettled(view);

  const screenshotPath = path.join(SCREENSHOT_DIR, `validation-${Date.now()}.png`);
  const image = await view.webContents.capturePage();
  fs.writeFileSync(screenshotPath, image.toPNG());

  const metrics = await view.webContents.executeJavaScript(`
    (() => {
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const selectors = [
        'canvas',
        'svg',
        '#game',
        '#gameCanvas',
        '#board',
        '.game',
        '.game-shell',
        '.game-container',
        '.shell',
        'main',
        'body > div'
      ];
      let target = null;
      for (const selector of selectors) {
        const el = document.querySelector(selector);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          target = { selector, rect };
          break;
        }
      }
      const bodyStyle = getComputedStyle(document.body);
      const htmlStyle = getComputedStyle(document.documentElement);
      const bg = bodyStyle.backgroundColor && bodyStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
        ? bodyStyle.backgroundColor
        : htmlStyle.backgroundColor;
      const m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/i);
      const backgroundLuminance = m
        ? Math.round(0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3]))
        : null;
      const rect = target ? target.rect : { width: 0, height: 0 };
      return {
        viewportWidth,
        viewportHeight,
        targetWidth: Math.round(rect.width || 0),
        targetHeight: Math.round(rect.height || 0),
        widthRatio: viewportWidth ? Number(((rect.width || 0) / viewportWidth).toFixed(3)) : 0,
        heightRatio: viewportHeight ? Number(((rect.height || 0) / viewportHeight).toFixed(3)) : 0,
        areaRatio: viewportWidth && viewportHeight
          ? Number((((rect.width || 0) * (rect.height || 0)) / (viewportWidth * viewportHeight)).toFixed(3))
          : 0,
        bodyText: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 400),
        backgroundLuminance,
      };
    })();
  `) as PageValidationResult['metrics'];

  const reasons: string[] = [];
  if (metrics.widthRatio < 0.7) reasons.push(`主区域宽度过小(${metrics.widthRatio})`);
  if (metrics.heightRatio < 0.6) reasons.push(`主区域高度过小(${metrics.heightRatio})`);
  if (metrics.areaRatio < 0.42) reasons.push(`主区域面积占比过小(${metrics.areaRatio})`);

  const bodyText = metrics.bodyText.toLowerCase();
  if (/(游戏结束|game over|失败|you died|try again|重新开始)/i.test(bodyText)) {
    reasons.push('页面一打开就处于失败/结束状态');
  }

  if ((metrics.backgroundLuminance ?? 255) < 24 && metrics.areaRatio < 0.5) {
    reasons.push('背景过暗且游戏主体太小，容易出现黑边小画布效果');
  }

  return {
    ok: reasons.length === 0,
    reasons,
    screenshotPath,
    url,
    title: view.webContents.getTitle(),
    metrics,
  };
}

async function waitForSettled(view: BrowserSurface): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  try {
    await view.webContents.executeJavaScript('document.readyState');
  } catch {
    // Ignore transient navigation timing issues.
  }
  await new Promise((resolve) => setTimeout(resolve, 800));
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}
