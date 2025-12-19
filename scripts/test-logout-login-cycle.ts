import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:8083';
const SCREENSHOT_DIR = '/Users/matteo/hyokai-vercel/test-screenshots/logout-cycle';

// Test account credentials
const TEST_EMAIL = 'reimutomonari@gmail.com';
const TEST_PASSWORD = 'test321';

async function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function screenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 ${name}.png`);
  return filePath;
}

async function getHistoryCounts(page: Page) {
  return await page.evaluate(() => {
    const h = localStorage.getItem('hyokai-history');
    const sh = localStorage.getItem('hyokai-simple-history');
    return {
      history: h ? JSON.parse(h).length : 0,
      simpleHistory: sh ? JSON.parse(sh).length : 0,
      historyData: h ? JSON.parse(h) : []
    };
  });
}

async function checkAuth(page: Page) {
  return await page.evaluate(() => {
    const authKeys = Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth'));
    let email: string | null = null;
    for (const key of authKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.user?.email) email = data.user.email;
      } catch {}
    }
    return { isLoggedIn: authKeys.length > 0, email };
  });
}

async function doTransform(page: Page, promptText: string) {
  console.log(`  Transforming: "${promptText.substring(0, 40)}..."`);

  // Wait for textarea to be ready
  const input = page.locator('textarea').first();
  await input.waitFor({ state: 'visible', timeout: 10000 });
  await input.fill(promptText);

  // Find and click transform button
  const transformBtn = page.locator('button:has-text("Generate Technical Prompt"), button:has-text("Transform")').first();
  await transformBtn.waitFor({ state: 'visible', timeout: 10000 });
  await transformBtn.click();

  // Wait for transformation to start
  await page.waitForTimeout(1000);

  // Wait for transformation to complete - look for button to not be disabled/loading
  let attempts = 0;
  while (attempts < 60) { // Max 60 seconds
    try {
      const isDisabled = await transformBtn.isDisabled();
      const btnText = await transformBtn.textContent({ timeout: 1000 });
      if (!isDisabled && btnText && !btnText.includes('Transforming')) {
        break;
      }
    } catch {
      // Button might be temporarily unavailable during state changes
    }
    await page.waitForTimeout(1000);
    attempts++;
  }

  // Extra wait for history to save
  await page.waitForTimeout(2000);
  console.log(`  ✓ Transform complete (${attempts}s)`);
}

async function login(page: Page) {
  console.log('  Logging in...');

  const signInBtn = page.locator('button:has-text("Sign in"), button:has-text("Sign In")').first();
  if (await signInBtn.count() > 0) {
    await signInBtn.click();
    await page.waitForTimeout(1000);
  }

  const emailInput = page.locator('input[type="email"], input[placeholder*="email"]').first();
  await emailInput.waitFor({ state: 'visible', timeout: 5000 });
  await emailInput.fill(TEST_EMAIL);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(TEST_PASSWORD);

  const loginBtn = page.locator('[role="dialog"] button:has-text("Sign in")').first();
  await loginBtn.click({ force: true });

  // Wait for login to complete
  await page.waitForTimeout(4000);

  const auth = await checkAuth(page);
  if (auth.isLoggedIn) {
    console.log(`  ✓ Logged in as ${auth.email}`);
    return true;
  }
  console.log('  ✗ Login failed');
  return false;
}

async function logout(page: Page) {
  console.log('  Logging out...');

  // Look for user menu or sign out button
  // First try clicking user avatar/menu
  const userMenu = page.locator('[aria-label*="user"], [aria-label*="account"], button:has([class*="avatar"]), button:has-text("Sign out")').first();

  if (await userMenu.count() > 0) {
    await userMenu.click();
    await page.waitForTimeout(500);
  }

  // Look for sign out option
  const signOutBtn = page.locator('button:has-text("Sign out"), button:has-text("Log out"), [role="menuitem"]:has-text("Sign out")').first();

  if (await signOutBtn.count() > 0) {
    await signOutBtn.click();
    await page.waitForTimeout(3000);

    const auth = await checkAuth(page);
    if (!auth.isLoggedIn) {
      console.log('  ✓ Logged out');
      return true;
    }
  }

  console.log('  ✗ Could not find sign out button');
  return false;
}

async function openHistoryPanel(page: Page) {
  const historyBtn = page.locator('button:has-text("History"), [aria-label*="istory"]').first();
  if (await historyBtn.count() > 0) {
    await historyBtn.click();
    await page.waitForTimeout(1000);
  }
}

async function closeHistoryPanel(page: Page) {
  // Click the X button or click outside
  const closeBtn = page.locator('[role="dialog"] button:has-text("×"), [role="dialog"] [aria-label="Close"]').first();
  if (await closeBtn.count() > 0) {
    await closeBtn.click();
  } else {
    // Click escape or outside
    await page.keyboard.press('Escape');
  }
  await page.waitForTimeout(500);
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);

  console.log('🧪 LOGOUT/LOGIN CYCLE TEST');
  console.log('='.repeat(60));
  console.log('Scenario: 3 prompts → logout → login → refresh → prompt → check\n');

  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context: BrowserContext = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  const page: Page = await context.newPage();

  try {
    // STEP 1: Initial load and login
    console.log('📍 STEP 1: Initial load and login');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-initial');

    let auth = await checkAuth(page);
    if (!auth.isLoggedIn) {
      await login(page);
    } else {
      console.log(`  Already logged in as ${auth.email}`);
    }
    await screenshot(page, '02-logged-in');

    // Clear any existing history for clean test
    await page.evaluate(() => {
      localStorage.removeItem('hyokai-history');
      localStorage.removeItem('hyokai-simple-history');
    });
    console.log('  Cleared existing history for clean test');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // STEP 2: Do 3 transformations
    console.log('\n📍 STEP 2: Perform 3 transformations');

    await doTransform(page, 'PROMPT 1: Build a React component for user authentication');
    await screenshot(page, '03-after-prompt-1');

    await doTransform(page, 'PROMPT 2: Create a REST API endpoint for data retrieval');
    await screenshot(page, '04-after-prompt-2');

    await doTransform(page, 'PROMPT 3: Implement a caching mechanism for database queries');
    await screenshot(page, '05-after-prompt-3');

    // STEP 3: Check history - should have 3 entries
    console.log('\n📍 STEP 3: Check history (expecting 3 entries)');
    let history = await getHistoryCounts(page);
    console.log(`  History count: ${history.history}`);
    console.log(`  Simple history count: ${history.simpleHistory}`);

    await openHistoryPanel(page);
    await screenshot(page, '06-history-3-entries');
    await closeHistoryPanel(page);

    if (history.history !== 3 && history.simpleHistory !== 3) {
      console.log(`  ⚠️ Expected 3 entries, got history=${history.history}, simple=${history.simpleHistory}`);
    } else {
      console.log('  ✓ 3 entries confirmed');
    }

    // STEP 4: Log out
    console.log('\n📍 STEP 4: Log out');
    await screenshot(page, '07-before-logout');

    const loggedOut = await logout(page);
    await screenshot(page, '08-after-logout');

    // Check localStorage after logout
    const storageAfterLogout = await page.evaluate(() => {
      return {
        history: localStorage.getItem('hyokai-history'),
        simpleHistory: localStorage.getItem('hyokai-simple-history'),
        allKeys: Object.keys(localStorage)
      };
    });
    console.log(`  localStorage keys after logout: ${storageAfterLogout.allKeys.length}`);
    console.log(`  History after logout: ${storageAfterLogout.history ? JSON.parse(storageAfterLogout.history).length : 0}`);

    // STEP 5: Log back in
    console.log('\n📍 STEP 5: Log back in');
    await page.waitForTimeout(2000);
    await login(page);
    await screenshot(page, '09-logged-back-in');

    // Check history immediately after login
    history = await getHistoryCounts(page);
    console.log(`  History immediately after login: ${history.history}`);
    console.log(`  Simple history: ${history.simpleHistory}`);

    // STEP 6: Normal refresh
    console.log('\n📍 STEP 6: Normal refresh');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, '10-after-refresh');

    history = await getHistoryCounts(page);
    console.log(`  History after refresh: ${history.history}`);

    auth = await checkAuth(page);
    console.log(`  Still authenticated: ${auth.isLoggedIn}`);

    // STEP 7: Hard refresh
    console.log('\n📍 STEP 7: Hard refresh');
    await page.evaluate(() => location.reload());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, '11-after-hard-refresh');

    history = await getHistoryCounts(page);
    console.log(`  History after hard refresh: ${history.history}`);

    auth = await checkAuth(page);
    console.log(`  Still authenticated: ${auth.isLoggedIn}`);

    // STEP 8: Do another prompt
    console.log('\n📍 STEP 8: Do 4th prompt');
    await doTransform(page, 'PROMPT 4: Design a notification system with real-time updates');
    await screenshot(page, '12-after-prompt-4');

    history = await getHistoryCounts(page);
    console.log(`  History after 4th prompt: ${history.history}`);

    // STEP 9: Check history panel
    console.log('\n📍 STEP 9: Check history panel');
    await openHistoryPanel(page);
    await screenshot(page, '13-history-panel-final');

    // Count visible entries in UI
    const visibleEntries = await page.evaluate(() => {
      // Get all text content from history panel
      const panel = document.querySelector('[role="dialog"]');
      if (!panel) return { count: 0, entries: [] };

      // Look for history items - they contain the prompt text
      const items = panel.querySelectorAll('[class*="cursor-pointer"], [class*="hover:bg"]');
      const entries: string[] = [];
      items.forEach(item => {
        const text = item.textContent;
        if (text && text.includes('PROMPT')) {
          entries.push(text.substring(0, 50));
        }
      });
      return { count: entries.length, entries };
    });
    console.log(`  Visible UI entries: ${visibleEntries.count}`);

    await closeHistoryPanel(page);

    // STEP 10: Refresh again
    console.log('\n📍 STEP 10: Normal refresh');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, '14-refresh-after-4th');

    history = await getHistoryCounts(page);
    console.log(`  History after refresh: ${history.history}`);

    // STEP 11: Hard refresh
    console.log('\n📍 STEP 11: Final hard refresh');
    await page.evaluate(() => location.reload());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, '15-final-hard-refresh');

    history = await getHistoryCounts(page);
    auth = await checkAuth(page);

    // FINAL RESULTS
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log(`  Authenticated: ${auth.isLoggedIn} (${auth.email || 'none'})`);
    console.log(`  History entries in localStorage: ${history.history}`);
    console.log(`  Simple history entries: ${history.simpleHistory}`);

    if (history.historyData.length > 0) {
      console.log('\n  History entries:');
      history.historyData.forEach((entry: any, i: number) => {
        console.log(`    ${i + 1}. ${entry.input?.substring(0, 50) || 'no input'}...`);
      });
    }

    // Open history panel for final screenshot
    await openHistoryPanel(page);
    await screenshot(page, '16-final-history-panel');

    const expectedEntries = 4; // We did 4 prompts total
    if (history.history === expectedEntries || history.simpleHistory === expectedEntries) {
      console.log(`\n  ✅ SUCCESS: All ${expectedEntries} history entries preserved!`);
    } else {
      console.log(`\n  🔴 FAILURE: Expected ${expectedEntries} entries, got ${history.history} (history) / ${history.simpleHistory} (simple)`);
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error);
    await screenshot(page, 'error');
  } finally {
    console.log('\n⏸️  Browser open for 30s for inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

main().catch(console.error);
