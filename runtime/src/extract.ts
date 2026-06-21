import { getPage } from './browser';
import type { CardDetailConfig, CardDetailSectionConfig, CardPaginationConfig, ExtractConfig } from './types';

function cleanText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractLinks(html: string, limit = 20): string[] {
  const matches = Array.from(html.matchAll(/href=["']([^"'#]+)["']/gi));
  return matches.map((item) => item[1]).slice(0, limit);
}

async function extractCardSummary(html: string, text: string): Promise<Record<string, unknown>> {
  const titleMatch = html.match(/__bu_card_title__[^>]*>([\s\S]*?)<\/[^>]+>/i);
  const title = cleanText(titleMatch?.[1]?.replace(/<[^>]+>/g, ' ') ?? '');

  const primaryLinkMatch =
    html.match(/__bu_card_title__[\s\S]*?<a[^>]*href=["']([^"']+)["']/i) ??
    html.match(/<a[^>]*href=["']([^"']+)["']/i);

  const metrics: Record<string, string> = {};
  const metricMatches = Array.from(
    html.matchAll(/clueAttrRow-xJbPfT[\s\S]*?label-CSjpvc[^>]*>([\s\S]*?)<\/[^>]+>[\s\S]*?value-wi8m5l[^>]*>([\s\S]*?)<\/[^>]+>/gi)
  );
  for (const [, labelRaw, valueRaw] of metricMatches) {
    const label = cleanText(labelRaw.replace(/<[^>]+>/g, ' '));
    const value = cleanText(valueRaw.replace(/<[^>]+>/g, ' '));
    if (label) metrics[label] = value;
  }

  const actions = Array.from(
    html.matchAll(/operationButtonGroup-AnKljq[\s\S]*?<button[^>]*>([\s\S]*?)<\/button>/gi)
  )
    .map(([, raw]) => cleanText(raw.replace(/<[^>]+>/g, ' ')))
    .filter(Boolean);

  return {
    title,
    primary_link: primaryLinkMatch?.[1]?.trim() ?? '',
    text: cleanText(text),
    metrics,
    actions,
    links: extractLinks(html, 10),
  };
}

async function extractDetailSections(detailText: string, sections?: CardDetailSectionConfig[]): Promise<Record<string, unknown> | undefined> {
  if (!sections?.length) return undefined;

  const payload: Record<string, unknown> = {};
  for (const section of sections) {
    payload[section.name] = section.multiple ? [] : '';
  }
  return payload;
}

async function extractDetailPayload(config: CardDetailConfig): Promise<Record<string, unknown>> {
  const page = getPage();
  const drawer = page.locator(config.waitFor).last();
  await drawer.waitFor({ timeout: config.timeoutMs });

  const body = drawer.locator('.auxo-drawer-body').first();
  try {
    await body.evaluate((node: Element) => {
      const target = node as HTMLElement;
      target.scrollTop = target.scrollHeight;
    });
    await page.waitForTimeout(200);
    await body.evaluate((node: Element) => {
      const target = node as HTMLElement;
      target.scrollTop = 0;
    });
    await page.waitForTimeout(150);
  } catch {
    // 某些页面没有可滚动容器，忽略即可。
  }

  const html = await drawer.innerHTML();
  const text = cleanText(await drawer.innerText()).slice(0, config.maxChars ?? 20000);
  const titleMatch = html.match(/title-JrDA4o[^>]*>([\s\S]*?)<\/[^>]+>/i);
  const title = cleanText(titleMatch?.[1]?.replace(/<[^>]+>/g, ' ') ?? '');
  const primaryLinkMatch = html.match(/<a[^>]*href=["']([^"']+)["']/i);

  const keyValues: Record<string, string> = {};
  const attrMatches = Array.from(html.matchAll(/attr-yqeQE3[\s\S]*?attr_name-e3zba_[^>]*>([\s\S]*?)<\/[^>]+>([\s\S]*?)<\/div>/gi));
  for (const [, labelRaw, valueRaw] of attrMatches) {
    const label = cleanText(labelRaw.replace(/<[^>]+>/g, ' '));
    const value = cleanText(valueRaw.replace(/<[^>]+>/g, ' ').replace(/^:/, ''));
    if (label) keyValues[label] = value;
  }

  const sectionTitles = Array.from(
    html.matchAll(/(?:h1Title-Fy3k7H|insightSectionTitle-wsnv4P)[^>]*>([\s\S]*?)<\/[^>]+>/gi)
  )
    .map(([, raw]) => cleanText(raw.replace(/<[^>]+>/g, ' ')))
    .filter(Boolean);

  const sections = await extractDetailSections(text, config.sections);

  return {
    title,
    primary_link: primaryLinkMatch?.[1]?.trim() ?? '',
    text,
    section_titles: sectionTitles,
    key_values: keyValues,
    links: extractLinks(html),
    ...(sections ? { sections } : {}),
  };
}

async function closeDetail(config: CardDetailConfig): Promise<void> {
  const page = getPage();
  const closeLocator = page.locator(config.closeSelector).last();
  await closeLocator.click({ timeout: config.timeoutMs });
  try {
    await page.locator(config.waitFor).last().waitFor({ state: 'hidden', timeout: config.timeoutMs });
  } catch {
    await page.keyboard.press('Escape');
    await page.locator(config.waitFor).last().waitFor({ state: 'hidden', timeout: config.timeoutMs });
  }
}

async function clickNextPage(selector: string, pagination: CardPaginationConfig): Promise<boolean> {
  const page = getPage();
  const nextButton = page.locator(pagination.nextSelector).first();
  if ((await nextButton.count()) === 0) return false;

  const className = (await nextButton.getAttribute('class')) ?? '';
  if (pagination.disabledClass && className.includes(pagination.disabledClass)) return false;

  const firstTitleLocator = page.locator(`${selector} .__bu_card_title__`).first();
  let currentFirstTitle = '';
  try {
    currentFirstTitle = cleanText(await firstTitleLocator.innerText());
  } catch {
    // 当前页可能没有标题节点，继续点击下一页。
  }

  await nextButton.click({ timeout: 5000 });
  await page.waitForTimeout(pagination.waitAfterClickMs);

  if (currentFirstTitle) {
    try {
      await page.waitForFunction(
        ([targetSelector, previousTitle]) => {
          const el = document.querySelector(`${targetSelector} .__bu_card_title__`);
          return !!el && !!el.textContent && el.textContent.trim() !== previousTitle;
        },
        [selector, currentFirstTitle],
        { timeout: 10000 }
      );
    } catch {
      // 有些站点不会稳定触发标题变化，这里不把它视为致命失败。
    }
  }

  return true;
}

export async function extractCards(config: ExtractConfig): Promise<{ type: string; items: Record<string, unknown>[] }> {
  const page = getPage();
  const items: Record<string, unknown>[] = [];
  const maxPages = config.pagination?.maxPages ?? 1;
  let globalIndex = 0;

  for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
    await page.waitForSelector(config.selector, { timeout: 10000 });
    const cardCount = await page.locator(config.selector).count();

    for (let pageIndex = 0; pageIndex < cardCount && globalIndex < config.maxRows; pageIndex += 1) {
      const card = page.locator(config.selector).nth(pageIndex);
      const html = await card.innerHTML();
      const text = (await card.innerText()).slice(0, config.maxChars);
      const item = await extractCardSummary(html, text);
      item.index = globalIndex;
      item.page_number = pageNumber;
      item.page_index = pageIndex;

      if (config.detail) {
        try {
          const clickTarget = card.locator(config.detail.clickSelector).first();
          await clickTarget.waitFor({ timeout: config.detail.timeoutMs });
          await clickTarget.click({ timeout: config.detail.timeoutMs });
          item.detail = await extractDetailPayload(config.detail);
          await closeDetail(config.detail);
          await page.waitForTimeout(300);
        } catch (error) {
          item.detail_error = error instanceof Error ? error.message : String(error);
        }
      }

      items.push(item);
      globalIndex += 1;
    }

    if (globalIndex >= config.maxRows || !config.pagination) break;
    if (!(await clickNextPage(config.selector, config.pagination))) break;
  }

  return { type: 'cards', items };
}

export async function extractTable(config: ExtractConfig): Promise<{ type: string; headers: string[]; rows: string[][] }> {
  const page = getPage();
  const table = page.locator(config.selector).first();
  await table.waitFor({ timeout: 10000 });

  const headers = await table.locator('thead th, thead td, tr:first-child th, tr:first-child td').evaluateAll(els =>
    els.slice(0, 20).map(el => cleanText((el as HTMLElement).innerText ?? ''))
  );

  const rows = await table.locator('tbody tr, tr').evaluateAll((els, max) =>
    els.slice(0, max).map(row =>
      Array.from((row as HTMLElement).querySelectorAll('td, th')).map(cell =>
        (cell as HTMLElement).innerText?.replace(/\s+/g, ' ').trim() ?? ''
      )
    ),
    config.maxRows
  );

  return { type: 'table', headers, rows };
}

export async function extractText(config: ExtractConfig): Promise<{ type: string; text: string }> {
  const page = getPage();
  const el = page.locator(config.selector).first();
  const text = await el.innerText({ timeout: 10000 });
  return { type: 'text', text: cleanText(text).slice(0, config.maxChars) };
}
