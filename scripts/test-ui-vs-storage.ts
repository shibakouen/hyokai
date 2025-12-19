import { chromium, Browser, Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:8083';
const SCREENSHOT_DIR = '/Users/matteo/hyokai-vercel/test-screenshots/ui-test';
const AUTH_STATE_FILE = '/Users/matteo/hyokai-vercel/test-screenshots/auth-state.json';

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

async function main() {
  await ensureDir(SCREENSHOT_DIR);

  console.log('🔍 UI vs STORAGE SYNC TEST');
  console.log('='.repeat(60));
  console.log('Testing if data in localStorage renders correctly in UI\n');

  const browser: Browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  // Use saved auth state
  if (!fs.existsSync(AUTH_STATE_FILE)) {
    console.log('❌ No auth state found. Run test-auth-persistence.ts first.');
    await browser.close();
    return;
  }

  const context: BrowserContext = await browser.newContext({
    storageState: AUTH_STATE_FILE,
    viewport: { width: 1280, height: 900 }
  });

  const page: Page = await context.newPage();

  try {
    // Step 1: Load and verify auth
    console.log('📍 STEP 1: Load app with saved auth');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await screenshot(page, '01-initial-load');

    const authCheck = await page.evaluate(() => {
      const authKeys = Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth'));
      return authKeys.length > 0;
    });
    console.log(`  Authenticated: ${authCheck}`);

    // Step 2: Switch to Advanced mode (non-beginner) to see history
    console.log('\n📍 STEP 2: Check current mode and history');

    // Check what mode we're in by looking at localStorage
    const mode = await page.evaluate(() => {
      return {
        mode: localStorage.getItem('hyokai-mode'),
        beginnerMode: localStorage.getItem('hyokai-beginner-mode'),
        history: localStorage.getItem('hyokai-history'),
        simpleHistory: localStorage.getItem('hyokai-simple-history')
      };
    });
    console.log(`  Mode: ${mode.mode}`);
    console.log(`  Beginner mode: ${mode.beginnerMode}`);
    console.log(`  History entries: ${mode.history ? JSON.parse(mode.history).length : 0}`);
    console.log(`  Simple history entries: ${mode.simpleHistory ? JSON.parse(mode.simpleHistory).length : 0}`);

    // Step 3: Create a transform and wait for completion
    console.log('\n📍 STEP 3: Create test transformation');

    const input = page.locator('textarea').first();
    const testText = `UI SYNC TEST: ${new Date().toISOString()}`;
    await input.fill(testText);
    console.log(`  Input: "${testText}"`);

    const transformBtn = page.locator('button:has-text("Generate"), button:has-text("Transform")').first();
    await transformBtn.click();
    console.log('  Started transformation...');

    // Wait for transformation to complete (button text changes back)
    await page.waitForFunction(() => {
      const btn = document.querySelector('button:has-text("Generate"), button:has-text("Transform")');
      return btn && !btn.textContent?.includes('Transforming');
    }, { timeout: 30000 }).catch(() => {
      console.log('  (Transform button state unchanged, continuing...)');
    });

    // Also wait for output to appear
    await page.waitForTimeout(8000);  // Give extra time
    await screenshot(page, '02-after-transform');

    // Check if output appeared
    const hasOutput = await page.evaluate(() => {
      // Look for output panel or generated content
      const outputElements = document.querySelectorAll('[class*="output"], [class*="result"], [class*="generated"]');
      return outputElements.length > 0;
    });
    console.log(`  Output visible: ${hasOutput}`);

    // Check localStorage for new history
    const historyAfter = await page.evaluate(() => {
      return {
        history: localStorage.getItem('hyokai-history'),
        simpleHistory: localStorage.getItem('hyokai-simple-history')
      };
    });
    console.log(`  History after: ${historyAfter.history ? JSON.parse(historyAfter.history).length : 0}`);
    console.log(`  Simple history after: ${historyAfter.simpleHistory ? JSON.parse(historyAfter.simpleHistory).length : 0}`);

    // Step 4: REFRESH and immediately check localStorage vs UI
    console.log('\n📍 STEP 4: REFRESH TEST - localStorage vs UI');

    const storageBefore = await getLocalStorage(page);
    console.log('  Storage before refresh:');
    const hyokaiKeysBefore = Object.keys(storageBefore).filter(k => k.startsWith('hyokai-'));
    for (const key of hyokaiKeysBefore) {
      const val = storageBefore[key];
      if (Array.isArray(val)) {
        console.log(`    ${key}: [${val.length} items]`);
      } else if (typeof val === 'string' && val.length > 50) {
        console.log(`    ${key}: "${val.substring(0, 50)}..."`);
      } else {
        console.log(`    ${key}: ${JSON.stringify(val)}`);
      }
    }

    // Now refresh
    console.log('\n  Refreshing...');
    await page.reload();

    // IMMEDIATELY check localStorage (before React hydrates)
    const storageImmediate = await page.evaluate(() => {
      return {
        timestamp: Date.now(),
        keys: Object.keys(localStorage).filter(k => k.startsWith('hyokai-') || k.includes('sb-')),
        history: localStorage.getItem('hyokai-history'),
        simpleHistory: localStorage.getItem('hyokai-simple-history'),
        userContext: localStorage.getItem('hyokai-user-context'),
        savedContexts: localStorage.getItem('hyokai-saved-contexts')
      };
    });
    console.log(`  Immediate check (${storageImmediate.timestamp}):`);
    console.log(`    Keys present: ${storageImmediate.keys.length}`);
    console.log(`    History: ${storageImmediate.history ? JSON.parse(storageImmediate.history).length : 0} entries`);
    console.log(`    User context: ${storageImmediate.userContext ? 'present' : 'empty'}`);

    await screenshot(page, '03-refresh-immediate');

    // Wait for React to hydrate
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await screenshot(page, '04-refresh-hydrated');

    // Check localStorage again after hydration
    const storageAfterHydrate = await page.evaluate(() => {
      return {
        timestamp: Date.now(),
        keys: Object.keys(localStorage).filter(k => k.startsWith('hyokai-') || k.includes('sb-')),
        history: localStorage.getItem('hyokai-history'),
        simpleHistory: localStorage.getItem('hyokai-simple-history'),
        userContext: localStorage.getItem('hyokai-user-context'),
        savedContexts: localStorage.getItem('hyokai-saved-contexts')
      };
    });
    console.log(`  After hydration (${storageAfterHydrate.timestamp}):`);
    console.log(`    Keys present: ${storageAfterHydrate.keys.length}`);
    console.log(`    History: ${storageAfterHydrate.history ? JSON.parse(storageAfterHydrate.history).length : 0} entries`);
    console.log(`    User context: ${storageAfterHydrate.userContext ? 'present' : 'empty'}`);

    // Check if any data was LOST
    const keysBefore = new Set(hyokaiKeysBefore);
    const keysAfter = new Set(storageAfterHydrate.keys.filter((k: string) => k.startsWith('hyokai-')));

    const lostKeys = [...keysBefore].filter(k => !keysAfter.has(k));
    if (lostKeys.length > 0) {
      console.log(`\n  🔴 LOST KEYS: ${lostKeys.join(', ')}`);
    } else {
      console.log(`\n  ✅ No keys lost`);
    }

    // Step 5: Open history panel and check UI
    console.log('\n📍 STEP 5: Check History Panel UI');

    const historyBtn = page.locator('button:has-text("History"), [aria-label*="istory"]').first();
    if (await historyBtn.count() > 0) {
      await historyBtn.click();
      await page.waitForTimeout(1000);
      await screenshot(page, '05-history-panel');

      // Check what's displayed vs what's in storage
      const historyComparison = await page.evaluate(() => {
        const storageHistory = localStorage.getItem('hyokai-history');
        const storageSimple = localStorage.getItem('hyokai-simple-history');

        // Count visible history items in UI
        const visibleItems = document.querySelectorAll('[class*="history"] [class*="entry"], [class*="history"] [class*="item"]');

        return {
          storageHistoryCount: storageHistory ? JSON.parse(storageHistory).length : 0,
          storageSimpleCount: storageSimple ? JSON.parse(storageSimple).length : 0,
          visibleUICount: visibleItems.length,
          noHistoryMessage: document.body.textContent?.includes('No history yet') || false
        };
      });

      console.log(`  Storage history: ${historyComparison.storageHistoryCount}`);
      console.log(`  Storage simple: ${historyComparison.storageSimpleCount}`);
      console.log(`  Visible in UI: ${historyComparison.visibleUICount}`);
      console.log(`  Shows "No history": ${historyComparison.noHistoryMessage}`);

      if (historyComparison.storageHistoryCount > 0 && historyComparison.noHistoryMessage) {
        console.log('\n  🔴 BUG: History exists in localStorage but UI shows "No history"!');
      }
    }

    // Step 6: Multiple rapid refreshes
    console.log('\n📍 STEP 6: Rapid refresh stress test (5x)');
    for (let i = 0; i < 5; i++) {
      await page.reload();
      await page.waitForTimeout(200);
      const quickCheck = await page.evaluate(() => ({
        authPresent: Object.keys(localStorage).some(k => k.includes('auth')),
        hyokaiKeys: Object.keys(localStorage).filter(k => k.startsWith('hyokai-')).length
      }));
      console.log(`  Refresh ${i + 1}: auth=${quickCheck.authPresent}, keys=${quickCheck.hyokaiKeys}`);
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await screenshot(page, '06-after-5-refreshes');

    // Final state check
    const finalStorage = await getLocalStorage(page);
    const finalAuth = await page.evaluate(() => {
      const authKeys = Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth'));
      for (const key of authKeys) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.user?.email) return data.user.email;
        } catch {}
      }
      return null;
    });

    console.log('\n📊 FINAL STATE:');
    console.log(`  Authenticated: ${!!finalAuth} (${finalAuth || 'none'})`);
    console.log(`  localStorage keys: ${Object.keys(finalStorage).filter(k => k.startsWith('hyokai-')).length}`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    await screenshot(page, 'error');
  } finally {
    console.log('\n⏸️  Browser open for 20s...');
    await page.waitForTimeout(20000);
    await browser.close();
  }
}

main().catch(console.error);
