import { getContext, getPage } from './browser';
import type { PageAction } from './types';

export async function replaySession(actions: PageAction[]): Promise<void> {
  const context = getContext();
  let page = getPage();

  for (const action of actions) {
    switch (action.kind) {
      case 'click': {
        const locator = page.locator(action.selector).first();
        await locator.waitFor({ timeout: action.timeoutMs });
        const beforePages = new Set(context.pages());
        await locator.click({ timeout: action.timeoutMs });
        if (action.waitAfterMs > 0) {
          await page.waitForTimeout(action.waitAfterMs);
        }

        const newPages = context.pages().filter((candidate) => !beforePages.has(candidate) && !candidate.isClosed());
        if (newPages.length > 0) {
          page = newPages[newPages.length - 1];
        }
        break;
      }
      case 'fill':
        await page.locator(action.selector).first().fill(action.value ?? '', { timeout: action.timeoutMs });
        if (action.waitAfterMs > 0) {
          await page.waitForTimeout(action.waitAfterMs);
        }
        break;
      case 'click_text': {
        const locator = page.getByText(action.text ?? '', { exact: action.exact ?? true }).first();
        await locator.waitFor({ timeout: action.timeoutMs });
        await locator.click({ timeout: action.timeoutMs });
        if (action.waitAfterMs > 0) {
          await page.waitForTimeout(action.waitAfterMs);
        }
        break;
      }
      case 'wait':
        await page.waitForSelector(action.selector, { timeout: action.timeoutMs });
        if (action.waitAfterMs > 0) {
          await page.waitForTimeout(action.waitAfterMs);
        }
        break;
    }
  }
}
