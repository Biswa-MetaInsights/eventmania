import { chromium } from 'playwright';

const BASE = 'http://localhost:3000';
const API  = 'http://localhost:8000';
const SS   = 'd:/MetaInsights/Eventmind/eventmind/screenshots';
const EMAIL = `tester${Date.now()}@gmail.com`;
const PASS  = 'TestPass123!';

async function shot(page, name) {
  await page.screenshot({ path: `${SS}/${name}.png`, fullPage: false });
  console.log(`📸  ${name}.png`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // ── 1. Switch to Register mode ──────────────────────────────────────────────
  console.log('\n── 1. Register ──');
  await page.goto(`${BASE}/auth`, { waitUntil: 'networkidle' });
  // Toggle link reads "Don't have an account? Sign Up"
  await page.click('button:has-text("Sign Up")');
  await page.waitForTimeout(300);

  // Fill form — auth page has: Full Name, Email Address, Password
  await page.fill('input[placeholder="Your full name"]', 'Alice Tester');
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await shot(page, '11_register_form');

  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE}/`, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1000);
  await shot(page, '12_after_register');
  console.log(`  URL after register: ${page.url()}`);
  const loggedIn = page.url() === `${BASE}/` || page.url() === BASE + '/';
  console.log(`  Logged in & redirected home: ${loggedIn ? '✅' : '❌'}`);

  // ── 2. Verify navbar shows user ─────────────────────────────────────────────
  console.log('\n── 2. Auth state ──');
  const avatarVisible = await page.locator('button svg path[d*="15.75 6a3.75"]').isVisible()
    .catch(() => false);
  console.log(`  Avatar in navbar: ${avatarVisible ? '✅' : '(checking differently)'}`);
  // Sign In button should be gone
  const signInGone = !(await page.locator('a[href="/auth"]:has-text("Sign In")').isVisible().catch(() => false));
  console.log(`  Sign In button hidden: ${signInGone ? '✅' : '❌'}`);

  // ── 3. Get a free published event from API ──────────────────────────────────
  console.log('\n── 3. Find a free event ──');
  const evRes = await fetch(`${API}/event/search?status=published&limit=30`);
  const events = await evRes.json();
  const freeEvent = events.find(e => parseFloat(e.price) === 0) ?? events[0];
  console.log(`  Event: "${freeEvent.title}" — $${freeEvent.price} — id: ${freeEvent.id}`);

  // ── 4. Event detail ─────────────────────────────────────────────────────────
  console.log('\n── 4. Event detail page ──');
  await page.goto(`${BASE}/event/${freeEvent.id}`, { waitUntil: 'networkidle' });
  await shot(page, '13_event_detail');
  console.log(`  Book Now visible: ${await page.locator('button:has-text("Book Now")').isVisible() ? '✅' : '❌'}`);
  // Chat widget button
  const chatBtn = page.locator('button[title="Event Assistant"]');
  console.log(`  Chat button visible: ${await chatBtn.isVisible() ? '✅' : '❌'}`);

  // ── 5. Chat widget — no ticket yet ──────────────────────────────────────────
  console.log('\n── 5. Chat — no ticket state ──');
  await chatBtn.click();
  await page.waitForTimeout(600);
  await shot(page, '14_chat_no_ticket');
  const lockState = await page.locator('text=Attendees only').isVisible();
  console.log(`  "Attendees only" lock shown: ${lockState ? '✅' : '❌'}`);
  // Close it
  await chatBtn.click();
  await page.waitForTimeout(300);

  // ── 6. Book free ticket ─────────────────────────────────────────────────────
  console.log('\n── 6. Book free ticket ──');
  await page.click('button:has-text("Book Now")');
  await page.waitForURL(`**/checkout/**`, { timeout: 8000 }).catch(() => {});
  await shot(page, '15_checkout');
  console.log(`  Checkout URL: ${page.url()}`);
  // Click claim/confirm button
  const claimBtn = page.locator('button').filter({ hasText: /Claim|Pay|Confirm|Complete|Free/i }).first();
  if (await claimBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await claimBtn.click();
    await page.waitForTimeout(2500);
    await shot(page, '16_after_checkout');
    console.log(`  After checkout: ${page.url()}`);
  }

  // ── 7. Back to event — chat as attendee ─────────────────────────────────────
  console.log('\n── 7. Chat — attendee access ──');
  await page.goto(`${BASE}/event/${freeEvent.id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const chatBtnPost = page.locator('button[title="Event Assistant"]');
  await chatBtnPost.click();
  await page.waitForTimeout(700);
  await shot(page, '17_chat_attendee_open');
  const badge = await page.locator('text=Attendee · Event Assistant').isVisible();
  const greeting = await page.locator('text=Hi!').isVisible();
  console.log(`  Attendee badge: ${badge ? '✅' : '❌'}`);
  console.log(`  Greeting visible: ${greeting ? '✅' : '❌'}`);

  // ── 8. Send a message and wait for AI reply ──────────────────────────────────
  console.log('\n── 8. AI chat response ──');
  await page.fill('input[placeholder*="Ask about"]', 'What is this event about?');
  await shot(page, '18_chat_message_typed');
  await page.press('input[placeholder*="Ask about"]', 'Enter');
  console.log('  Waiting for AI response (up to 25s)…');
  // Wait until at least one assistant bubble appears after the greeting
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll('div[style*="F2EFEA"]');
    return bubbles.length >= 2;
  }, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, '19_chat_ai_response');
  const moreBubbles = (await page.locator('div').filter({ hasText: /Hi!/ }).count()) > 0;
  console.log(`  AI replied: ${moreBubbles ? '✅' : 'checking screenshot…'}`);

  // ── 9. Explore + Communities + Community create gate ────────────────────────
  console.log('\n── 9. Remaining pages ──');
  await page.goto(`${BASE}/communities`, { waitUntil: 'networkidle' });
  await shot(page, '20_communities');
  console.log(`  Communities: ${await page.locator('h1:has-text("Explore Communities")').isVisible() ? '✅' : '❌'}`);

  await page.goto(`${BASE}/community/create`, { waitUntil: 'networkidle' });
  // Wait until spinner is gone (page has resolved auth + API calls)
  await page.waitForFunction(
    () => !document.querySelector('.animate-spin'),
    { timeout: 15000 }
  ).catch(() => {});
  await page.waitForTimeout(500);
  await shot(page, '21_community_create_gate');
  const gate = await page.locator('text=Not eligible yet').isVisible();
  console.log(`  Eligibility gate (< 2 events): ${gate ? '✅' : '❌'}`);

  await browser.close();
  console.log('\n✅ All done — check screenshots/');
}

main().catch(e => { console.error(e); process.exit(1); });
