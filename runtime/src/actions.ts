import { getPage } from './browser';

export async function navigate(url: string): Promise<void> {
  const page = getPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
}

export async function click(selector: string): Promise<void> {
  const page = getPage();
  const locator = page.locator(selector).first();
  await locator.waitFor({ timeout: 10000 });

  try {
    await locator.click({ timeout: 5000 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('intercepts pointer events')) {
      await locator.click({ timeout: 5000, force: true });
    } else if (msg.includes('not visible')) {
      await locator.evaluate((node: HTMLElement) => node.click());
    } else {
      throw err;
    }
  }
}

export async function fill(selector: string, value: string): Promise<void> {
  const page = getPage();
  const locator = page.locator(selector).first();
  await locator.waitFor({ timeout: 10000 });
  await locator.fill(value);
}

export async function scroll(direction: 'up' | 'down', pixels?: number): Promise<void> {
  const page = getPage();
  const amount = pixels ?? 500;
  await page.evaluate(
    ({ dir, px }) => window.scrollBy({ top: dir === 'down' ? px : -px, behavior: 'smooth' }),
    { dir: direction, px: amount }
  );
}

export async function wait(selector: string, timeoutMs = 10000): Promise<void> {
  const page = getPage();
  await page.waitForSelector(selector, { timeout: timeoutMs });
}

export async function screenshot(): Promise<string> {
  const page = getPage();
  const buf = await page.screenshot({ type: 'png', fullPage: false });
  return buf.toString('base64');
}
