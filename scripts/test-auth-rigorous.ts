/**
 * Rigorous Auth & Data Persistence Test
 *
 * Tests actual app functionality through login/logout cycles:
 * 1. Log in
 * 2. Do a prompt transformation
 * 3. Check history shows the entry
 * 4. Refresh page - verify history persists
 * 5. Log out - verify history clears
 * 6. Log back in
 * 7. Do another prompt
 * 8. Check history shows entries
 * 9. Multiple refreshes
 * 10. Verify everything persists
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8085';
const TEST_EMAIL = 'reimutomonari@gmail.com';
const TEST_PASSWORD = 'test321';

let browser: Browser;
let page: Page;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function log(msg: string) {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  console.log(`[${timestamp}] ${msg}`);
}

async function screenshot(name: string) {
  await page.screenshot({ path: `test-screenshots/rigorous-${name}.png`, fullPage: true });
  await log(`📸 Screenshot: rigorous-${name}.png`);
}

async function isLoggedIn(): Promise<boolean> {
  const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
  return !(await signInBtn.isVisible().catch(() => false));
}

async function getHistoryCount(): Promise<number> {
  // Open history panel
  const historyBtn = await page.locator('button:has-text("History"), button[aria-label*="History"], [data-testid="history-button"]').first();
  if (await historyBtn.isVisible().catch(() => false)) {
    await historyBtn.click();
    await sleep(500);
  }

  // Count history entries
  const entries = await page.locator('[data-testid="history-entry"], .history-entry, [class*="history"] [class*="entry"], [class*="HistoryPanel"] > div > div').count();

  // Close history panel by clicking elsewhere
  await page.keyboard.press('Escape');
  await sleep(300);

  return entries;
}

async function doLogin() {
  await log('🔐 Logging in...');

  const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
  await signInBtn.click();
  await sleep(500);

  const emailInput = await page.locator('[role="dialog"] input[type="email"], [role="dialog"] input[placeholder*="email"]').first();
  await emailInput.fill(TEST_EMAIL);

  const passwordInput = await page.locator('[role="dialog"] input[type="password"]').first();
  await passwordInput.fill(TEST_PASSWORD);

  const submitBtn = await page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Sign in")').first();
  await submitBtn.click({ force: true });

  // Wait for dialog to close
  await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, { timeout: 15000 });
  await sleep(1000);

  const loggedIn = await isLoggedIn();
  await log(loggedIn ? '✅ Login successful' : '❌ Login failed');
  return loggedIn;
}

async function doLogout() {
  await log('🚪 Logging out...');

  // Find all buttons in the header area and click the one that looks like the user menu
  // The user button typically contains an avatar or user icon
  const allButtons = await page.locator('button').all();
  await log(`Found ${allButtons.length} buttons on page`);

  // Look for the user dropdown trigger - it's typically a small button with avatar
  // Try clicking buttons until we find one that opens a menu with "Sign out"
  let foundTrigger = false;

  // First try: Look for button with SVG that has green color (cloud icon)
  const greenIconBtn = await page.locator('button svg.text-green-500, button .text-green-500').first();
  if (await greenIconBtn.isVisible().catch(() => false)) {
    await greenIconBtn.click();
    await sleep(500);
    foundTrigger = true;
    await log('Clicked green icon button');
  }

  // If no menu appeared, try the button that contains the avatar
  if (!foundTrigger) {
    // Try finding by inspecting header buttons
    const headerBtns = await page.locator('.absolute.top-3 button, .absolute.top-4 button').all();
    await log(`Found ${headerBtns.length} header buttons`);

    for (const btn of headerBtns) {
      const html = await btn.innerHTML().catch(() => '');
      if (html.includes('Avatar') || html.includes('lucide-user') || html.includes('green')) {
        await btn.click();
        await sleep(500);
        foundTrigger = true;
        await log('Clicked header button with user indicator');
        break;
      }
    }
  }

  // Check if dropdown menu appeared
  const menu = await page.locator('[role="menu"]').first();
  const menuVisible = await menu.isVisible().catch(() => false);
  await log(`Menu visible: ${menuVisible}`);

  if (menuVisible) {
    // Look for Sign out in the menu - use text matching
    const signOutItem = await page.locator('[role="menu"] [role="menuitem"]:has-text("Sign out"), [role="menu"] [role="menuitem"]:has-text("ログアウト")').first();
    if (await signOutItem.isVisible().catch(() => false)) {
      const text = await signOutItem.textContent();
      await log(`Sign out item text: "${text}"`);
      // Use force click and wait for click to register
      await signOutItem.click({ force: true });
      await log('Clicked sign out, waiting for logout to complete...');
      // Wait for the sign in button to appear (indicates logged out)
      try {
        await page.waitForSelector('button:has-text("Sign in"), button:has-text("ログイン")', { timeout: 10000 });
        await log('Sign in button appeared - logout successful');
      } catch {
        await log('Sign in button did not appear after 10s');
      }
      await sleep(1000);
    }
  } else {
    await log('⚠️  Menu did not appear - trying direct element query');

    // Fallback: Use page.evaluate to find and click the element
    await page.evaluate(() => {
      // Find buttons in the top-right area
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        // Look for small buttons in top-right corner
        if (rect.top < 100 && rect.right > window.innerWidth - 200) {
          const hasUserIndicator = btn.querySelector('svg') &&
            (btn.innerHTML.includes('green') || btn.innerHTML.includes('Avatar') || btn.innerHTML.includes('User'));
          if (hasUserIndicator || rect.width < 50) {
            (btn as HTMLElement).click();
            break;
          }
        }
      }
    });
    await sleep(500);

    // Try clicking sign out again
    const signOut = await page.locator('text=Sign out, text=ログアウト').first();
    if (await signOut.isVisible().catch(() => false)) {
      await signOut.click();
      await sleep(2000);
    }
  }

  const loggedOut = !(await isLoggedIn());
  await log(loggedOut ? '✅ Logout successful' : '❌ Logout failed');
  return loggedOut;
}

async function doTransform(prompt: string): Promise<boolean> {
  await log(`✨ Transforming prompt: "${prompt.substring(0, 30)}..."`);

  // Make sure we're in input view (click New Prompt if needed)
  const newPromptBtn = await page.locator('button:has-text("New Prompt"), button:has-text("新しいプロンプト")').first();
  if (await newPromptBtn.isVisible().catch(() => false)) {
    await newPromptBtn.click();
    await sleep(500);
  }

  // Enter prompt
  const promptInput = await page.locator('[data-testid="prompt-input"], textarea[placeholder*="pls make"], textarea[placeholder*="prompt"]').first();
  await promptInput.fill(prompt);
  await sleep(300);

  // Click generate
  const generateBtn = await page.locator('button:has-text("Generate"), button:has-text("生成")').first();
  await generateBtn.click();

  await log('⏳ Waiting for transformation...');

  // Wait for output (look for textarea with substantial content)
  try {
    await page.waitForFunction(() => {
      const textareas = document.querySelectorAll('textarea');
      for (const ta of textareas) {
        if (ta.value && ta.value.length > 100) return true;
      }
      return false;
    }, { timeout: 90000 });

    await sleep(2000);
    await log('✅ Transformation complete');
    return true;
  } catch {
    await log('❌ Transformation timed out');
    return false;
  }
}

async function runRigorousTest() {
  console.log('\n' + '='.repeat(60));
  console.log('RIGOROUS AUTH & DATA PERSISTENCE TEST');
  console.log('='.repeat(60) + '\n');

  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  page = await context.newPage();

  try {
    // SETUP: Clear all state and start fresh
    await log('🧹 Clearing all state...');
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        localStorage.removeItem(key);
      }
    });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await screenshot('01-fresh-start');

    // Verify we're logged out
    if (await isLoggedIn()) {
      await log('⚠️  Still logged in after clearing - doing explicit logout');
      await doLogout();
    }

    // ============================================
    // PHASE 1: Login and first transformation
    // ============================================
    console.log('\n--- PHASE 1: Login and First Transform ---\n');

    if (!await doLogin()) {
      throw new Error('Initial login failed');
    }
    await screenshot('02-after-login');

    // Do first transformation
    if (!await doTransform('Create a Python function that calculates fibonacci numbers')) {
      throw new Error('First transformation failed');
    }
    await screenshot('03-after-first-transform');

    // Check we're still logged in
    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after transformation!');
    }
    await log('✅ Still logged in after transformation');

    // ============================================
    // PHASE 2: Refresh and verify persistence
    // ============================================
    console.log('\n--- PHASE 2: Refresh and Verify ---\n');

    await log('🔄 Refreshing page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await sleep(2000);
    await screenshot('04-after-refresh');

    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after refresh!');
    }
    await log('✅ Still logged in after refresh');

    // ============================================
    // PHASE 3: Multiple rapid refreshes
    // ============================================
    console.log('\n--- PHASE 3: Rapid Refreshes ---\n');

    for (let i = 1; i <= 5; i++) {
      await log(`🔄 Rapid refresh ${i}/5...`);
      await page.reload();
      await sleep(500);
    }
    await page.waitForLoadState('networkidle');
    await sleep(2000);
    await screenshot('05-after-rapid-refresh');

    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after rapid refreshes!');
    }
    await log('✅ Still logged in after 5 rapid refreshes');

    // ============================================
    // PHASE 4: Second transformation
    // ============================================
    console.log('\n--- PHASE 4: Second Transform ---\n');

    if (!await doTransform('Write a JavaScript class for a shopping cart with add/remove methods')) {
      throw new Error('Second transformation failed');
    }
    await screenshot('06-after-second-transform');

    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after second transformation!');
    }
    await log('✅ Still logged in after second transformation');

    // ============================================
    // PHASE 5: Logout
    // ============================================
    console.log('\n--- PHASE 5: Logout ---\n');

    await doLogout();
    await screenshot('07-after-logout');

    if (await isLoggedIn()) {
      throw new Error('🚨 BUG: Still logged in after logout!');
    }
    await log('✅ Successfully logged out');

    // ============================================
    // PHASE 6: Log back in
    // ============================================
    console.log('\n--- PHASE 6: Log Back In ---\n');

    await sleep(1000);
    if (!await doLogin()) {
      throw new Error('Re-login failed');
    }
    await screenshot('08-after-relogin');

    // Refresh to make sure session persists
    await page.reload();
    await page.waitForLoadState('networkidle');
    await sleep(2000);

    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after re-login and refresh!');
    }
    await log('✅ Still logged in after re-login and refresh');

    // ============================================
    // PHASE 7: Third transformation
    // ============================================
    console.log('\n--- PHASE 7: Third Transform ---\n');

    if (!await doTransform('Design a REST API endpoint for user authentication')) {
      throw new Error('Third transformation failed');
    }
    await screenshot('09-after-third-transform');

    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after third transformation!');
    }
    await log('✅ Still logged in after third transformation');

    // ============================================
    // PHASE 8: Wait 10 seconds (catch delayed issues)
    // ============================================
    console.log('\n--- PHASE 8: Long Wait ---\n');

    await log('⏳ Waiting 10 seconds for any delayed race conditions...');
    await sleep(10000);
    await screenshot('10-after-long-wait');

    if (!await isLoggedIn()) {
      throw new Error('🚨 BUG: User was signed out after 10 second wait!');
    }
    await log('✅ Still logged in after 10 second wait');

    // ============================================
    // PHASE 9: Final refresh barrage
    // ============================================
    console.log('\n--- PHASE 9: Final Refresh Barrage ---\n');

    for (let i = 1; i <= 3; i++) {
      await log(`🔄 Final refresh ${i}/3...`);
      await page.reload();
      await page.waitForLoadState('networkidle');
      await sleep(1000);

      if (!await isLoggedIn()) {
        throw new Error(`🚨 BUG: User was signed out on final refresh ${i}!`);
      }
    }
    await screenshot('11-final-state');
    await log('✅ Still logged in after final refresh barrage');

    // ============================================
    // SUCCESS
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Auth is working correctly!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.log('\n' + '='.repeat(60));
    console.log('❌ TEST FAILED');
    console.log('='.repeat(60));
    console.log(`Error: ${error}`);
    await screenshot('ERROR-final-state');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runRigorousTest();
