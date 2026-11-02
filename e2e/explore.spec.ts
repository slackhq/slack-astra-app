import { expect, test, type Page } from '@playwright/test';

const STUB = 'http://localhost:9201';
const APP = '/a/slack-astra-app';

// Console output that means the plugin is broken. Grafana itself logs plenty of
// unrelated warnings, so this matches specific failures rather than everything.
const PLUGIN_PROBLEMS = [/Could not load plugin/, /already has a parent set/];

type StubRequest = { ds: string; method: string; path: string; body: string };

const stubRequests = async (): Promise<StubRequest[]> => (await fetch(`${STUB}/__requests`)).json();
const lastSearch = async () => (await stubRequests()).filter((r) => r.path.endsWith('_msearch')).at(-1);

const timePicker = (page: Page) => page.getByRole('button', { name: /^Time range selected:/ });

const expectUrlParams = async (page: Page, params: Record<string, string>) => {
  for (const [key, value] of Object.entries(params)) {
    await expect.poll(() => new URL(page.url()).searchParams.get(key), { message: key }).toBe(value);
  }
};

let problems: string[];

test.beforeEach(async ({ page }) => {
  problems = [];
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (PLUGIN_PROBLEMS.some((pattern) => pattern.test(message.text()))) {
      problems.push(message.text());
    }
  });
  await fetch(`${STUB}/__requests`, { method: 'DELETE' });
});

test.afterEach(() => {
  expect(problems).toEqual([]);
});

test('loads with the default datasource and time range written to the URL', async ({ page }) => {
  await page.goto(APP);

  await expect(page.getByText('hello from astra-a 0')).toBeVisible();
  await expect(page.getByText('3 hits')).toBeVisible();
  await expect(timePicker(page)).toHaveAccessibleName('Time range selected: Last 15 minutes');
  await expectUrlParams(page, { 'var-datasource': 'astra-a', from: 'now-15m', to: 'now' });
});

test('reads the datasource and time range from the URL', async ({ page }) => {
  await page.goto(`${APP}?var-datasource=astra-b&from=now-6h&to=now`);

  await expect(page.getByText('hello from astra-b 0')).toBeVisible();
  await expect(timePicker(page)).toHaveAccessibleName('Time range selected: Last 6 hours');
  expect((await lastSearch())?.ds).toBe('b');
});

test('writes time range changes to the URL', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByText('hello from astra-a 0')).toBeVisible();

  await timePicker(page).click();
  await page.getByText('Last 1 hour', { exact: true }).click();

  await expect(timePicker(page)).toHaveAccessibleName('Time range selected: Last 1 hour');
  await expectUrlParams(page, { from: 'now-1h', to: 'now' });
});

test('runs the typed query and keeps it in the URL', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByText('hello from astra-a 0')).toBeVisible();

  await page.getByPlaceholder('Lucene Query').fill('service:worker');
  await page.getByPlaceholder('Lucene Query').press('Enter');

  await expectUrlParams(page, { 'var-query': 'service:worker' });
  await expect.poll(async () => (await lastSearch())?.body).toContain('service:worker');
});

test('keeps its state across in-app navigation', async ({ page }) => {
  await page.goto(`${APP}?var-datasource=astra-b&from=now-1h&to=now`);
  await expect(page.getByText('hello from astra-b 0')).toBeVisible();

  // Client-side navigation keeps the JS context, so coming back remounts the page
  // with the same module-level scene objects.
  await page.locator('a[href="/"]').first().click();
  await expect(page).not.toHaveURL(new RegExp(APP));
  await page.goBack();

  await expect(page.getByText('hello from astra-b 0')).toBeVisible();
  await expect(timePicker(page)).toHaveAccessibleName('Time range selected: Last 1 hour');
  await expectUrlParams(page, { 'var-datasource': 'astra-b', from: 'now-1h' });
});

test('links log rows to the configured datasource', async ({ page }) => {
  await page.goto(APP);
  await expect(page.getByText('hello from astra-a 0')).toBeVisible();

  // The first row's expand button sits next to its timestamp.
  await page.getByText(/\d{4}-\d{2}-\d{2} @ /).first().getByRole('button').click();

  await expect(page.getByText('Expanded Document')).toBeVisible();
  const link = page.getByRole('link', { name: 'View in Linked Alertmanager' });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /\/explore\?left=.*linked-alertmanager.*trace-a-0/);
});
