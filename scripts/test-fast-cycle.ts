import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8083';
const TEST_EMAIL = 'reimutomonari@gmail.com';
const TEST_PASSWORD = 'test321';

async function main() {
  console.log('🧪 FAST LOGOUT/LOGIN CYCLE TEST\n');

  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const getHistory = () => page.evaluate(() => {
    const h = localStorage.getItem('hyokai-history');
    const sh = localStorage.getItem('hyokai-simple-history');
    return { adv: h ? JSON.parse(h).length : 0, simple: sh ? JSON.parse(sh).length : 0 };
  });

  const isLoggedIn = () => page.evaluate(() =>
    Object.keys(localStorage).some(k => k.includes('sb-') && k.includes('auth'))
  );

  try {
    // Load and login
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');

    if (!await isLoggedIn()) {
      console.log('Logging in...');
      await page.click('button:has-text("Sign")');
      await page.waitForTimeout(500);
      await page.fill('input[type="email"]', TEST_EMAIL);
      await page.fill('input[type="password"]', TEST_PASSWORD);
      await page.click('[role="dialog"] button:has-text("Sign in")', { force: true });
      await page.waitForTimeout(3000);
    }
    console.log(`✓ Logged in\n`);

    // Clear history and ensure we're in Advanced mode
    await page.evaluate(() => {
      localStorage.removeItem('hyokai-history');
      localStorage.removeItem('hyokai-simple-history');
      // Switch to advanced mode (not beginner)
      localStorage.setItem('hyokai-beginner-mode', 'false');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // DO 3 PROMPTS
    console.log('📍 DOING 3 PROMPTS');
    for (let i = 1; i <= 3; i++) {
      // Reload page for clean state
      if (i > 1) {
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);
      }

      // Fill the input
      await page.locator('textarea').first().fill(`PROMPT ${i}: Test number ${i} - ${Date.now()}`);

      // Click Generate
      await page.locator('button:has-text("Generate")').first().click();

      // Wait for transform
      await page.waitForTimeout(3000);
      let done = false;
      for (let j = 0; j < 30 && !done; j++) {
        const btns = await page.locator('button').allTextContents();
        done = !btns.some(t => t.includes('Transforming'));
        if (!done) await page.waitForTimeout(1000);
      }
      await page.waitForTimeout(1500);

      const h = await getHistory();
      console.log(`  Prompt ${i} done → History: adv=${h.adv}, simple=${h.simple}`);
    }

    // CHECK HISTORY
    console.log('\n📍 CHECKING HISTORY');
    await page.click('button:has-text("History")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-01-history-3.png' });
    let h = await getHistory();
    console.log(`  History panel open → adv=${h.adv}, simple=${h.simple}`);
    await page.keyboard.press('Escape');

    // LOGOUT
    console.log('\n📍 LOGGING OUT');
    // Close any open dialogs
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // Reload to get clean state
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Find Auth button - it has Avatar (span with initials) + green Cloud icon
    // Debug: list all buttons with their classes
    const headerBtns = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      const results: string[] = [];
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.top < 80 && rect.top > 0) {
          const hasAvatar = btn.querySelector('[class*="avatar"]') !== null;
          const hasCloud = btn.innerHTML.includes('text-green-500');
          const text = btn.textContent?.trim().substring(0, 20) || '';
          results.push(`x=${Math.round(rect.left)} avatar:${hasAvatar} cloud:${hasCloud} text:"${text}"`);
        }
      }
      return results;
    });
    console.log('  Header buttons:');
    headerBtns.forEach(b => console.log(`    ${b}`));

    // Click the Auth button (has avatar class)
    const clicked = await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        const rect = btn.getBoundingClientRect();
        if (rect.top < 80 && rect.top > 0) {
          // Auth button has avatar OR green cloud icon
          const hasAvatar = btn.querySelector('[class*="avatar"]') !== null;
          const hasCloud = btn.innerHTML.includes('text-green-500');
          if (hasAvatar || hasCloud) {
            btn.click();
            return `clicked Auth button at x=${Math.round(rect.left)}`;
          }
        }
      }
      return null;
    });

    console.log(`  ${clicked || 'Auth button not found'}`);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-menu-open.png' });

    // Now click Sign out from dropdown
    const signOutBtn = page.locator('[role="menuitem"]:has-text("Sign out")');
    if (await signOutBtn.count() > 0) {
      await signOutBtn.first().click();
      console.log('  Clicked Sign out');
    } else {
      console.log('  Sign out dropdown not found');
    }
    await page.waitForTimeout(3000);

    h = await getHistory();
    console.log(`  After logout → adv=${h.adv}, simple=${h.simple}, loggedIn=${await isLoggedIn()}`);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-02-after-logout.png' });

    // LOGIN AGAIN
    console.log('\n📍 LOGGING BACK IN');
    await page.click('button:has-text("Sign")');
    await page.waitForTimeout(500);
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('[role="dialog"] button:has-text("Sign in")', { force: true });
    await page.waitForTimeout(3000);

    h = await getHistory();
    console.log(`  After login → adv=${h.adv}, simple=${h.simple}, loggedIn=${await isLoggedIn()}`);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-03-after-login.png' });

    // REFRESH
    console.log('\n📍 REFRESH');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    h = await getHistory();
    console.log(`  After refresh → adv=${h.adv}, simple=${h.simple}, loggedIn=${await isLoggedIn()}`);

    // HARD REFRESH
    console.log('\n📍 HARD REFRESH');
    await page.evaluate(() => location.reload());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    h = await getHistory();
    console.log(`  After hard refresh → adv=${h.adv}, simple=${h.simple}, loggedIn=${await isLoggedIn()}`);

    // DO 4TH PROMPT
    console.log('\n📍 4TH PROMPT');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('textarea').first().fill(`PROMPT 4: Fourth test - ${Date.now()}`);
    await page.locator('button:has-text("Generate")').first().click();

    await page.waitForTimeout(3000);
    let done4 = false;
    for (let j = 0; j < 30 && !done4; j++) {
      const btns = await page.locator('button').allTextContents();
      done4 = !btns.some(t => t.includes('Transforming'));
      if (!done4) await page.waitForTimeout(1000);
    }
    await page.waitForTimeout(1500);

    h = await getHistory();
    console.log(`  After 4th prompt → adv=${h.adv}, simple=${h.simple}`);

    // CHECK HISTORY
    console.log('\n📍 CHECK HISTORY');
    await page.click('button:has-text("History")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-04-history-4.png' });
    h = await getHistory();
    console.log(`  History panel → adv=${h.adv}, simple=${h.simple}`);
    await page.keyboard.press('Escape');

    // REFRESH
    console.log('\n📍 FINAL REFRESH');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    h = await getHistory();
    console.log(`  After refresh → adv=${h.adv}, simple=${h.simple}`);

    // HARD REFRESH
    console.log('\n📍 FINAL HARD REFRESH');
    await page.evaluate(() => location.reload());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // FINAL RESULTS
    h = await getHistory();
    const loggedIn = await isLoggedIn();

    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL RESULTS');
    console.log('='.repeat(50));
    console.log(`  Logged in: ${loggedIn}`);
    console.log(`  Advanced history: ${h.adv}`);
    console.log(`  Simple history: ${h.simple}`);
    console.log(`  Expected: 4 entries`);
    console.log(h.adv === 4 || h.simple === 4 ? '\n  ✅ SUCCESS!' : '\n  🔴 FAILURE!');

    await page.click('button:has-text("History")');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-05-final.png' });

  } catch (e) {
    console.error('Error:', e);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/fast-error.png' });
  }

  console.log('\n⏸️ Browser open 20s...');
  await page.waitForTimeout(20000);
  await browser.close();
}

main();
