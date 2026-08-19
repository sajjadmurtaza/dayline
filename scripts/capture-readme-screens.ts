/**
 * One-off capture of README walkthrough stills.
 * Run: npm run capture:readme
 * Requires: npm run dev (http://localhost:3000)
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Locator, type Page } from "@playwright/test";

const OUT = join(process.cwd(), "docs/readme");
const KEY = "dayline.local.v1";
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

function atHours(hours: number, minutes: number) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

async function hideChrome(page: Page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
    `,
  });
}

async function waitReady(page: Page) {
  await page.locator("#main").waitFor({ timeout: 20_000 });
  await page.waitForTimeout(500);
}

async function shot(page: Page, name: string, fullPage = true) {
  await hideChrome(page);
  await page.waitForTimeout(350);
  await page.screenshot({
    path: join(OUT, `${name}.jpg`),
    type: "jpeg",
    quality: 72,
    fullPage,
    animations: "disabled",
  });
  console.log("wrote", name);
}

async function clip(page: Page, target: Locator, name: string, pad = 16, minHeight = 0) {
  await hideChrome(page);
  await target.waitFor();
  await target.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const box = await target.boundingBox();
  if (!box) throw new Error(`no box for ${name}`);
  const vp = page.viewportSize();
  if (!vp) throw new Error("no viewport");
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const width = Math.min(vp.width - x, Math.ceil(box.width + pad * 2));
  const height = Math.min(vp.height - y, Math.max(minHeight, Math.ceil(box.height + pad * 2)));
  await page.screenshot({
    path: join(OUT, `${name}.jpg`),
    type: "jpeg",
    quality: 72,
    clip: { x, y, width: Math.max(1, width), height: Math.max(1, height) },
    animations: "disabled",
  });
  console.log("wrote", name);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const morning = atHours(10, 30);
  const evening = atHours(20, 15);

  async function visit(opts: {
    path: string;
    name?: string;
    viewport?: { width: number; height: number };
    time?: Date;
    fullPage?: boolean;
    after?: (page: Page) => Promise<void>;
  }): Promise<Page> {
    const viewport = opts.viewport ?? DESKTOP;
    const time = opts.time ?? morning;
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      locale: "en-US",
      timezoneId: "Asia/Tokyo",
    });
    await context.addInitScript((key: string) => {
      window.localStorage.removeItem(key);
    }, KEY);
    const page = await context.newPage();
    await page.clock.install({ time });
    await page.clock.pauseAt(time);
    await page.goto(`${BASE}${opts.path}`, { waitUntil: "domcontentloaded" });
    await waitReady(page);
    const hours = await page.evaluate(() => new Date().getHours());
    if (hours !== time.getHours()) {
      throw new Error(`clock mismatch on ${opts.path}: page=${hours} expected=${time.getHours()}`);
    }
    if (opts.after) await opts.after(page);
    if (opts.name) await shot(page, opts.name, opts.fullPage ?? true);
    return page;
  }

  async function closePage(page: Page) {
    await page.context().close();
  }

  {
    const page = await visit({ path: "/en", name: "01-today" });
    await clip(page, page.locator("[data-readme=today-header]"), "02-today-header", 20);
    await clip(page, page.locator("[data-readme=today-summary]"), "03-today-summary", 20);
    await page.locator("#quick-capture").click();
    await page.locator("#quick-capture").fill("Call dentist tomorrow 3pm");
    await page.getByText(/Looks like an? /i).waitFor({ timeout: 5000 });
    await clip(page, page.locator("[data-readme=today-capture]"), "04-today-capture", 18);
    await page.locator("#dayline-now").scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const now = page.locator("#dayline-now");
    const box = await now.boundingBox();
    const vp = page.viewportSize();
    if (box && vp) {
      await hideChrome(page);
      const y = Math.max(0, Math.floor(box.y - 120));
      await page.screenshot({
        path: join(OUT, "05-today-now.jpg"),
        type: "jpeg",
        quality: 72,
        clip: { x: 0, y, width: vp.width, height: Math.min(340, vp.height - y) },
        animations: "disabled",
      });
      console.log("wrote", "05-today-now");
    }
    await clip(page, page.locator("[data-readme=today-rail]"), "06-today-rail", 12);
    await closePage(page);
  }

  {
    const page = await visit({
      path: "/en",
      name: "07-today-plan",
      after: async (p) => {
        await p.getByRole("button", { name: "Plan my day" }).click();
        await p.getByText("Suggested placements").waitFor({ timeout: 8000 });
        await p.waitForTimeout(300);
      },
    });
    await closePage(page);
  }

  {
    const page = await visit({
      path: "/en",
      name: "08-today-running",
      after: async (p) => {
        await p
          .getByRole("article")
          .filter({ hasText: "Prepare client presentation" })
          .getByRole("button", { name: "Start" })
          .click();
        await p.getByRole("button", { name: "Pause" }).waitFor({ timeout: 8000 });
        await p.locator("#dayline-now").scrollIntoViewIfNeeded();
        await p.waitForTimeout(400);
      },
    });
    await clip(
      page,
      page.getByRole("article").filter({ hasText: "Prepare client presentation" }),
      "08-today-session",
      14,
    );
    await closePage(page);
  }

  await closePage(await visit({ path: "/en/inbox", name: "09-inbox" }));
  await closePage(await visit({ path: "/en/calendar", name: "10-calendar" }));
  await closePage(await visit({ path: "/en/upcoming", name: "11-upcoming" }));
  await closePage(await visit({ path: "/en/projects", name: "12-projects" }));
  await closePage(await visit({ path: "/en/notes", name: "13-notes" }));
  await closePage(await visit({ path: "/en/sometime", name: "14-sometime" }));

  {
    const page = await visit({
      path: "/en/brain-dump",
      name: "15-brain-dump",
      after: async (p) => {
        await p
          .locator("textarea")
          .fill("Need to email Michael\nLook at Japan flights\nMaybe redesign pricing");
        await p.getByText("Review suggestions").waitFor({ timeout: 8000 });
      },
    });
    await closePage(page);
  }

  {
    const page = await visit({
      path: "/en/search",
      name: "16-search",
      after: async (p) => {
        await p.getByPlaceholder(/Search tasks/i).fill("presentation");
        await p.getByText("Prepare client presentation").waitFor({ timeout: 8000 });
      },
    });
    await closePage(page);
  }

  await closePage(await visit({ path: "/en/more", name: "17-more" }));
  await closePage(await visit({ path: "/ar", name: "18-today-arabic-rtl" }));
  await closePage(await visit({ path: "/ja", name: "19-today-japanese" }));
  await closePage(await visit({ path: "/ko", name: "20-today-korean" }));

  await closePage(
    await visit({
      path: "/en",
      name: "21-today-mobile",
      viewport: PHONE,
      fullPage: false,
    }),
  );

  {
    const page = await visit({
      path: "/en",
      name: "22-closing-today",
      time: evening,
      after: async (p) => {
        await p.getByRole("heading", { name: "Closing today" }).waitFor({ timeout: 12_000 });
        await p.locator("#evening-close").scrollIntoViewIfNeeded();
        await p.waitForTimeout(300);
      },
    });
    await clip(
      page,
      page.locator("section").filter({ has: page.locator("#evening-close") }),
      "23-closing-ritual",
      18,
    );
    await closePage(page);
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
