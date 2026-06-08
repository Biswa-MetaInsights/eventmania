import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:8000';

async function shot(page, name) {
  await page.screenshot({ path: `d:/MetaInsights/Eventmind/eventmind/screenshots/${name}.png`, fullPage: false });
  console.log(`📸  ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── 1. Homepage ──────────────────────────────────────────────────────────────
  console.log('\n── 1. Homepage ──');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await shot(page, '01_homepage');
  const eventsVisible = await page.locator('text=Upcoming Events').isVisible();
  console.log(`  Upcoming Events heading: ${eventsVisible ? '✅' : '❌'}`);

  // ── 2. Explore Events page ───────────────────────────────────────────────────
  console.log('\n── 2. /explore ──');
  await page.goto(`${BASE}/explore`, { waitUntil: 'networkidle' });
  await shot(page, '02_explore');
  const exploreHeading = await page.locator('h1:has-text("Explore Events")').isVisible();
  console.log(`  Explore Events heading: ${exploreHeading ? '✅' : '❌'}`);

  // ── 3. Filter panel ──────────────────────────────────────────────────────────
  console.log('\n── 3. Filter panel ──');
  await page.click('button:has-text("Filters")');
  await page.waitForTimeout(400);
  await shot(page, '03_explore_filters');
  const filterPanel = await page.locator('text=Category').first().isVisible();
  console.log(`  Filter panel open: ${filterPanel ? '✅' : '❌'}`);

  // ── 4. Pick first event and go to detail ─────────────────────────────────────
  console.log('\n── 4. Event detail ──');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000); // let event grid load
  const firstCard = page.locator('[class*="rounded"]').filter({ hasText: /Book|Free|USD|\$/ }).first();
  const eventCards = await page.locator('a[href^="/event/"]').all();
  let eventId = null;
  if (eventCards.length > 0) {
    const href = await eventCards[0].getAttribute('href');
    eventId = href?.split('/event/')[1];
    await page.goto(`${BASE}/event/${eventId}`, { waitUntil: 'networkidle' });
  } else {
    // fallback: get events from API
    const res = await fetch(`${API}/event/search?status=published&limit=5`);
    const events = await res.json();
    if (events.length > 0) {
      eventId = events[0].id;
      await page.goto(`${BASE}/event/${eventId}`, { waitUntil: 'networkidle' });
    }
  }
  await shot(page, '04_event_detail');
  const bookNow = await page.locator('button:has-text("Book Now")').isVisible();
  console.log(`  Book Now button: ${bookNow ? '✅' : '❌'}`);

  // ── 5. Chat widget visible ───────────────────────────────────────────────────
  console.log('\n── 5. Chat widget ──');
  const chatBtn = page.locator('button[title="Event Assistant"]');
  const chatVisible = await chatBtn.isVisible();
  console.log(`  Chat button visible: ${chatVisible ? '✅' : '❌'}`);
  if (chatVisible) {
    await chatBtn.click();
    await page.waitForTimeout(500);
    await shot(page, '05_chat_open_unauthenticated');
    const signInPrompt = await page.locator('text=Sign in to chat').isVisible();
    console.log(`  Unauthenticated prompt: ${signInPrompt ? '✅' : '❌'}`);
  }

  // ── 6. Auth page ─────────────────────────────────────────────────────────────
  console.log('\n── 6. Auth page ──');
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  await shot(page, '06_auth');
  const authForm = await page.locator('input[type="email"]').isVisible();
  console.log(`  Login form: ${authForm ? '✅' : '❌'}`);

  // ── 7. Register a test user ───────────────────────────────────────────────────
  console.log('\n── 7. Register ──');
  // Switch to register if toggle exists
  const registerTab = page.locator('button:has-text("Register"), button:has-text("Sign Up"), text=Create account').first();
  if (await registerTab.isVisible()) {
    await registerTab.click();
    await page.waitForTimeout(300);
  }
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').first();
  if (await nameInput.isVisible()) await nameInput.fill('Test User');
  await emailInput.fill('testuser@eventmind.test');
  await passwordInput.fill('TestPass123!');
  const confirmInput = page.locator('input[placeholder*="confirm" i]').first();
  if (await confirmInput.isVisible()) await confirmInput.fill('TestPass123!');
  await shot(page, '07_register_filled');

  // ── 8. Communities page ──────────────────────────────────────────────────────
  console.log('\n── 8. Communities page ──');
  await page.goto(`${BASE}/communities`, { waitUntil: 'networkidle' });
  await shot(page, '08_communities');
  const commHeading = await page.locator('h1:has-text("Explore Communities")').isVisible();
  console.log(`  Communities heading: ${commHeading ? '✅' : '❌'}`);

  // ── 9. Navbar Events dropdown ────────────────────────────────────────────────
  console.log('\n── 9. Navbar dropdowns ──');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.hover('button:has-text("Events")');
  await page.waitForTimeout(400);
  await shot(page, '09_navbar_events_dropdown');
  const exploreItem = await page.locator('text=Explore Events').first().isVisible();
  console.log(`  Events → Explore Events: ${exploreItem ? '✅' : '❌'}`);

  await page.hover('button:has-text("Communities")');
  await page.waitForTimeout(400);
  await shot(page, '10_navbar_communities_dropdown');
  const commItem = await page.locator('text=Explore Communities').first().isVisible();
  console.log(`  Communities → Explore Communities: ${commItem ? '✅' : '❌'}`);

  await browser.close();
  console.log('\n✅ Test run complete. Check screenshots/ folder.');
}

main().catch(e => { console.error(e); process.exit(1); });
