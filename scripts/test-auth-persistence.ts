import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:8083';
const SCREENSHOT_DIR = '/Users/matteo/hyokai-vercel/test-screenshots/auth-test';
const AUTH_STATE_FILE = '/Users/matteo/hyokai-vercel/test-screenshots/auth-state.json';

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
  console.log(`📸 Screenshot: ${name}.png`);
  return filePath;
}

async function getLocalStorage(page: Page): Promise<Record<string, any>> {
  return await page.evaluate(() => {
    const storage: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          storage[key] = JSON.parse(localStorage.getItem(key) || 'null');
        } catch {
          storage[key] = localStorage.getItem(key);
        }
      }
    }
    return storage;
  });
}

async function logStorage(page: Page, label: string) {
  const storage = await getLocalStorage(page);
  console.log(`\n📦 localStorage (${label}):`);

  const keys = Object.keys(storage).filter(k =>
    k.startsWith('hyokai-') || k.includes('supabase') || k.includes('sb-')
  );

  for (const key of keys.sort()) {
    const value = storage[key];
    if (key.includes('auth') || key.includes('sb-')) {
      console.log(`  ${key}: [AUTH DATA - ${typeof value === 'string' ? value.length : JSON.stringify(value).length} chars]`);
    } else if (Array.isArray(value)) {
      console.log(`  ${key}: [${value.length} items]`);
      if (key.includes('history') && value.length > 0) {
        console.log(`    First entry ID: ${value[0]?.id || 'no id'}`);
      }
    } else if (typeof value === 'object' && value !== null) {
      console.log(`  ${key}: {${Object.keys(value).join(', ')}}`);
    } else {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    }
  }

  return storage;
}

async function checkAuthState(page: Page): Promise<{ isLoggedIn: boolean; hasAuthTokens: boolean; userEmail?: string }> {
  return await page.evaluate(() => {
    const authKeys = Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth'));
    let userEmail: string | undefined;

    for (const key of authKeys) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (data.user?.email) {
          userEmail = data.user.email;
        }
      } catch {}
    }

    return {
      isLoggedIn: authKeys.length > 0,
      hasAuthTokens: authKeys.length > 0,
      userEmail
    };
  });
}

async function performLogin(page: Page): Promise<boolean> {
  console.log('\n🔐 Performing automated login...');
  console.log(`   Email: ${TEST_EMAIL}`);

  try {
    // Click sign in button to open dialog
    const signInBtn = page.locator('button:has-text("Sign in"), button:has-text("Sign In")').first();
    if (await signInBtn.count() > 0) {
      await signInBtn.click();
      await page.waitForTimeout(1000);
    }

    // Fill email
    const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(TEST_EMAIL);
    console.log('   Filled email');

    // Fill password
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(TEST_PASSWORD);
    console.log('   Filled password');

    await screenshot(page, '02-login-filled');

    // Click login button - target the one inside the dialog (it's the blue/cyan button)
    // The dialog contains a form with the submit button
    const loginBtn = page.locator('[role="dialog"] button:has-text("Sign in"), [data-state="open"] button:has-text("Sign in")').first();
    await loginBtn.click({ force: true });
    console.log('   Clicked sign in button');

    // Wait for auth to complete
    await page.waitForTimeout(3000);

    // Check if logged in
    const authState = await checkAuthState(page);
    if (authState.isLoggedIn) {
      console.log(`✅ Login successful: ${authState.userEmail}`);
      return true;
    } else {
      console.log('❌ Login may have failed, checking UI...');
      await screenshot(page, '02-login-result');

      // Wait a bit more and check again
      await page.waitForTimeout(2000);
      const retryAuth = await checkAuthState(page);
      if (retryAuth.isLoggedIn) {
        console.log(`✅ Login successful (delayed): ${retryAuth.userEmail}`);
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    await screenshot(page, '02-login-error');
    return false;
  }
}

async function main() {
  await ensureDir(SCREENSHOT_DIR);

  console.log('🚀 AUTHENTICATED PERSISTENCE TEST');
  console.log('='.repeat(60));

  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  let context: BrowserContext;

  // Check if we have saved auth state
  if (fs.existsSync(AUTH_STATE_FILE)) {
    console.log('\n📂 Found saved auth state, restoring...');
    context = await browser.newContext({
      storageState: AUTH_STATE_FILE,
      viewport: { width: 1280, height: 900 }
    });
  } else {
    console.log('\n🆕 No saved auth state, will perform login...');
    context = await browser.newContext({
      viewport: { width: 1280, height: 900 }
    });
  }

  const page: Page = await context.newPage();

  try {
    // Step 1: Load app and check auth
    console.log('\n📍 STEP 1: Initial load');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '01-initial');

    let authState = await checkAuthState(page);
    console.log(`  Auth tokens present: ${authState.hasAuthTokens}`);
    console.log(`  User email: ${authState.userEmail || 'none'}`);

    // If not logged in, perform automated login
    if (!authState.isLoggedIn) {
      const loginSuccess = await performLogin(page);
      if (!loginSuccess) {
        console.log('\n❌ Could not complete login. Exiting.');
        await screenshot(page, 'login-failed');
        await page.waitForTimeout(10000);
        await browser.close();
        return;
      }

      // Save auth state for future runs
      await context.storageState({ path: AUTH_STATE_FILE });
      console.log('💾 Auth state saved for future tests');

      await page.waitForTimeout(2000);
      await screenshot(page, '03-after-login');
    }

    await logStorage(page, 'authenticated state');

    // Step 2: Create test data
    console.log('\n📍 STEP 2: Create test data');

    // Check for existing history
    const historyBefore = await page.evaluate(() => {
      const h = localStorage.getItem('hyokai-history');
      const sh = localStorage.getItem('hyokai-simple-history');
      return {
        history: h ? JSON.parse(h) : [],
        simpleHistory: sh ? JSON.parse(sh) : []
      };
    });
    console.log(`  Existing history entries: ${historyBefore.history.length}`);
    console.log(`  Existing simple history: ${historyBefore.simpleHistory.length}`);

    // Add input and transform
    const input = page.locator('textarea').first();
    if (await input.count() > 0) {
      const testText = `AUTH TEST: ${new Date().toISOString()}`;
      await input.fill(testText);
      console.log(`  Filled input: "${testText}"`);
      await screenshot(page, '04-input-filled');

      // Click transform button
      const transformBtn = page.locator('button:has-text("Generate"), button:has-text("Transform")').first();
      if (await transformBtn.count() > 0) {
        await transformBtn.click();
        console.log('  Clicked transform button');

        // Wait for transformation to complete
        await page.waitForTimeout(5000);
        await screenshot(page, '05-after-transform');
      }
    }

    // Check history after transform
    const historyAfter = await page.evaluate(() => {
      const h = localStorage.getItem('hyokai-history');
      const sh = localStorage.getItem('hyokai-simple-history');
      return {
        history: h ? JSON.parse(h) : [],
        simpleHistory: sh ? JSON.parse(sh) : []
      };
    });
    console.log(`  History entries after transform: ${historyAfter.history.length}`);
    console.log(`  Simple history after transform: ${historyAfter.simpleHistory.length}`);

    // Store full state before refresh
    const stateBefore = await getLocalStorage(page);
    await logStorage(page, 'BEFORE REFRESH');

    // Step 3: REFRESH TESTS
    console.log('\n📍 STEP 3: REFRESH TEST');
    console.log('  Refreshing page...');

    await page.reload();

    // Take rapid screenshots during reload
    console.log('  Taking rapid screenshots...');
    await screenshot(page, '06-refresh-0ms');

    await page.waitForTimeout(100);
    await screenshot(page, '07-refresh-100ms');

    await page.waitForTimeout(400);
    await screenshot(page, '08-refresh-500ms');

    await page.waitForLoadState('domcontentloaded');
    await screenshot(page, '09-refresh-domloaded');

    await page.waitForLoadState('networkidle');
    await screenshot(page, '10-refresh-networkidle');

    await page.waitForTimeout(1000);
    await screenshot(page, '11-refresh-1s');

    await page.waitForTimeout(2000);
    await screenshot(page, '12-refresh-3s');

    // Check state after refresh
    const stateAfter = await getLocalStorage(page);
    await logStorage(page, 'AFTER REFRESH');

    // Compare
    console.log('\n📊 COMPARISON:');
    const keysBefore = Object.keys(stateBefore).filter(k => k.startsWith('hyokai-'));
    const keysAfter = Object.keys(stateAfter).filter(k => k.startsWith('hyokai-'));

    const lost = keysBefore.filter(k => !keysAfter.includes(k));
    const gained = keysAfter.filter(k => !keysBefore.includes(k));
    const changed: string[] = [];

    for (const key of keysBefore) {
      if (keysAfter.includes(key)) {
        const before = JSON.stringify(stateBefore[key]);
        const after = JSON.stringify(stateAfter[key]);
        if (before !== after) {
          changed.push(key);
          console.log(`  🔄 CHANGED: ${key}`);
          if (key.includes('history')) {
            const beforeLen = Array.isArray(stateBefore[key]) ? stateBefore[key].length : 0;
            const afterLen = Array.isArray(stateAfter[key]) ? stateAfter[key].length : 0;
            console.log(`     Before: ${beforeLen} items, After: ${afterLen} items`);
          }
        }
      }
    }

    if (lost.length > 0) {
      console.log(`  🔴 LOST KEYS: ${lost.join(', ')}`);
    }
    if (gained.length > 0) {
      console.log(`  🟢 GAINED KEYS: ${gained.join(', ')}`);
    }
    if (lost.length === 0 && gained.length === 0 && changed.length === 0) {
      console.log('  ✅ No changes detected');
    }

    // Step 4: Check UI for visible history
    console.log('\n📍 STEP 4: Check visible history in UI');

    // Look for history panel/entries
    const historyButton = page.locator('button:has-text("History"), [aria-label*="history"]').first();
    if (await historyButton.count() > 0) {
      console.log('  Found history button, clicking...');
      await historyButton.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '13-history-panel');

      // Count visible entries
      const entries = page.locator('[class*="history"] [class*="entry"], [class*="history"] li, [class*="HistoryEntry"]');
      const entryCount = await entries.count();
      console.log(`  Visible history entries: ${entryCount}`);
    }

    // Step 5: Multiple refresh test
    console.log('\n📍 STEP 5: Multiple refresh test (3x rapid)');
    for (let i = 0; i < 3; i++) {
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      console.log(`  Refresh ${i + 1} complete`);
    }
    await page.waitForTimeout(2000);
    await screenshot(page, '14-after-3-refreshes');
    await logStorage(page, 'after 3 refreshes');

    // Step 6: Hard refresh
    console.log('\n📍 STEP 6: Hard refresh (cache bypass)');
    await page.evaluate(() => location.reload());
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '15-hard-refresh');
    await logStorage(page, 'after hard refresh');

    // Step 7: Close and reopen
    console.log('\n📍 STEP 7: Close tab and reopen');
    const currentStorage = await getLocalStorage(page);

    // Navigate away
    await page.goto('about:blank');
    await page.waitForTimeout(500);

    // Come back
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, '16-after-reopen');

    const reopenStorage = await getLocalStorage(page);
    await logStorage(page, 'after tab reopen');

    // Final comparison
    console.log('\n📊 FINAL STATE CHECK:');
    const finalAuth = await checkAuthState(page);
    console.log(`  Still authenticated: ${finalAuth.isLoggedIn}`);
    console.log(`  User: ${finalAuth.userEmail || 'LOGGED OUT!'}`);

    const finalHistory = await page.evaluate(() => {
      const h = localStorage.getItem('hyokai-history');
      const sh = localStorage.getItem('hyokai-simple-history');
      return {
        history: h ? JSON.parse(h).length : 0,
        simpleHistory: sh ? JSON.parse(sh).length : 0
      };
    });
    console.log(`  History entries: ${finalHistory.history}`);
    console.log(`  Simple history: ${finalHistory.simpleHistory}`);

    if (!finalAuth.isLoggedIn) {
      console.log('\n🔴 BUG DETECTED: User was logged out during refresh!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete! Screenshots in: test-screenshots/auth-test/');

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
