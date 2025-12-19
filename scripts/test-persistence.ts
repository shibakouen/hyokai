import { chromium, Browser, Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'http://localhost:8083';
const SCREENSHOT_DIR = '/Users/matteo/hyokai-vercel/test-screenshots';

async function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
}

async function screenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`📸 Screenshot saved: ${name}.png`);
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

async function logLocalStorage(page: Page, label: string) {
  const storage = await getLocalStorage(page);
  console.log(`\n📦 localStorage (${label}):`);

  const hyokaiKeys = Object.keys(storage).filter(k => k.startsWith('hyokai-') || k.includes('supabase'));

  for (const key of hyokaiKeys) {
    const value = storage[key];
    if (Array.isArray(value)) {
      console.log(`  ${key}: [${value.length} items]`);
    } else if (typeof value === 'object' && value !== null) {
      console.log(`  ${key}: {object with ${Object.keys(value).length} keys}`);
    } else {
      console.log(`  ${key}: ${JSON.stringify(value)}`);
    }
  }

  return storage;
}

async function waitAndObserve(page: Page, ms: number, label: string) {
  console.log(`⏳ Waiting ${ms}ms (${label})...`);
  await page.waitForTimeout(ms);
}

async function main() {
  await ensureScreenshotDir();

  console.log('🚀 Starting Playwright persistence test...\n');
  console.log('=' .repeat(60));

  const browser: Browser = await chromium.launch({
    headless: false,  // Visible browser for observation
    slowMo: 100       // Slow down actions to observe
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });

  const page: Page = await context.newPage();

  try {
    // Step 1: Initial load
    console.log('\n📍 STEP 1: Initial page load');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await waitAndObserve(page, 2000, 'initial load');
    await screenshot(page, '01-initial-load');
    await logLocalStorage(page, 'after initial load');

    // Step 2: Check auth state
    console.log('\n📍 STEP 2: Check authentication state');
    const isLoggedIn = await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(k => k.includes('auth'));
      return keys.length > 0;
    });
    console.log(`  Auth tokens present: ${isLoggedIn}`);

    // Look for any user profile or auth indicators in the UI
    const hasUserMenu = await page.locator('[data-testid="user-menu"], .auth-button, button:has-text("Sign")').count();
    console.log(`  UI auth elements found: ${hasUserMenu}`);
    await screenshot(page, '02-auth-state');

    // Step 3: Check for existing history
    console.log('\n📍 STEP 3: Check existing history data');
    const historyData = await page.evaluate(() => {
      return {
        history: localStorage.getItem('hyokai-history'),
        simpleHistory: localStorage.getItem('hyokai-simple-history'),
        userContext: localStorage.getItem('hyokai-user-context'),
        savedContexts: localStorage.getItem('hyokai-saved-contexts')
      };
    });
    console.log('  History data in localStorage:');
    for (const [key, value] of Object.entries(historyData)) {
      if (value) {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            console.log(`    ${key}: [${parsed.length} items]`);
          } else {
            console.log(`    ${key}: ${value.substring(0, 50)}...`);
          }
        } catch {
          console.log(`    ${key}: ${value.substring(0, 50)}...`);
        }
      } else {
        console.log(`    ${key}: (empty)`);
      }
    }

    // Step 4: Try to create test data (enter some text in input)
    console.log('\n📍 STEP 4: Create test data');

    // Look for text input field
    const inputSelector = 'textarea, input[type="text"], [contenteditable="true"]';
    const inputCount = await page.locator(inputSelector).count();
    console.log(`  Input fields found: ${inputCount}`);

    if (inputCount > 0) {
      const input = page.locator(inputSelector).first();
      await input.click();
      await input.fill('TEST: Persistence check at ' + new Date().toISOString());
      await screenshot(page, '03-input-filled');
      console.log('  Filled test input');

      // Look for transform/submit button
      const buttonSelector = 'button:has-text("Transform"), button:has-text("Generate"), button[type="submit"]';
      const buttons = await page.locator(buttonSelector).count();
      console.log(`  Action buttons found: ${buttons}`);

      if (buttons > 0) {
        await page.locator(buttonSelector).first().click();
        console.log('  Clicked transform button');
        await waitAndObserve(page, 3000, 'waiting for transformation');
        await screenshot(page, '04-after-transform');
      }
    }

    await logLocalStorage(page, 'before refresh');

    // Step 5: NORMAL REFRESH
    console.log('\n📍 STEP 5: NORMAL REFRESH TEST');
    console.log('  Performing page.reload()...');

    const storageBeforeRefresh = await getLocalStorage(page);

    await page.reload();

    // Immediately check after reload starts
    await screenshot(page, '05-refresh-immediate');
    console.log('  Screenshot taken immediately after reload');

    // Wait for load
    await page.waitForLoadState('domcontentloaded');
    await screenshot(page, '06-refresh-domloaded');
    console.log('  Screenshot at DOMContentLoaded');

    await page.waitForLoadState('networkidle');
    await screenshot(page, '07-refresh-networkidle');
    console.log('  Screenshot at networkidle');

    // Wait and observe
    await waitAndObserve(page, 1000, '1 second after refresh');
    await screenshot(page, '08-refresh-1s');

    await waitAndObserve(page, 2000, '3 seconds total');
    await screenshot(page, '09-refresh-3s');

    const storageAfterRefresh = await getLocalStorage(page);
    await logLocalStorage(page, 'after refresh');

    // Compare before/after
    console.log('\n📊 STORAGE COMPARISON:');
    const beforeKeys = new Set(Object.keys(storageBeforeRefresh).filter(k => k.startsWith('hyokai-')));
    const afterKeys = new Set(Object.keys(storageAfterRefresh).filter(k => k.startsWith('hyokai-')));

    const removedKeys = [...beforeKeys].filter(k => !afterKeys.has(k));
    const addedKeys = [...afterKeys].filter(k => !beforeKeys.has(k));

    if (removedKeys.length > 0) {
      console.log('  🔴 REMOVED KEYS:', removedKeys);
    }
    if (addedKeys.length > 0) {
      console.log('  🟢 ADDED KEYS:', addedKeys);
    }
    if (removedKeys.length === 0 && addedKeys.length === 0) {
      console.log('  ✅ Keys unchanged');
    }

    // Check specific values
    for (const key of beforeKeys) {
      const before = JSON.stringify(storageBeforeRefresh[key]);
      const after = JSON.stringify(storageAfterRefresh[key]);
      if (before !== after) {
        console.log(`  🔄 CHANGED: ${key}`);
        console.log(`     Before: ${before.substring(0, 100)}...`);
        console.log(`     After: ${after.substring(0, 100)}...`);
      }
    }

    // Step 6: Check for history panel
    console.log('\n📍 STEP 6: Check UI state after refresh');

    // Try to find history panel or entries
    const historyPanelSelector = '[class*="history"], [data-testid="history"]';
    const historyPanels = await page.locator(historyPanelSelector).count();
    console.log(`  History panel elements: ${historyPanels}`);

    // Check if any history entries are visible
    const historyEntrySelector = '[class*="history-entry"], [class*="historyEntry"]';
    const visibleEntries = await page.locator(historyEntrySelector).count();
    console.log(`  Visible history entries: ${visibleEntries}`);

    // Step 7: Hard refresh (Cmd+Shift+R equivalent)
    console.log('\n📍 STEP 7: HARD REFRESH TEST');

    await page.reload({ waitUntil: 'networkidle' });
    await waitAndObserve(page, 2000, 'after hard refresh');
    await screenshot(page, '10-hard-refresh');
    await logLocalStorage(page, 'after hard refresh');

    // Step 8: Close and reopen tab simulation
    console.log('\n📍 STEP 8: CLOSE/REOPEN TAB TEST');

    // Get current storage state
    const storageBeforeClose = await getLocalStorage(page);

    // Navigate away completely
    await page.goto('about:blank');
    await waitAndObserve(page, 500, 'blank page');

    // Navigate back
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await waitAndObserve(page, 2000, 'after reopen');
    await screenshot(page, '11-after-reopen');

    const storageAfterReopen = await getLocalStorage(page);
    await logLocalStorage(page, 'after tab reopen');

    // Final comparison
    console.log('\n📊 FINAL COMPARISON (original vs after reopen):');
    for (const key of Object.keys(storageBeforeRefresh).filter(k => k.startsWith('hyokai-'))) {
      const original = JSON.stringify(storageBeforeRefresh[key]);
      const final = JSON.stringify(storageAfterReopen[key] || null);
      if (original !== final) {
        console.log(`  🔴 LOST: ${key}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Test complete! Check screenshots in: test-screenshots/');

  } catch (error) {
    console.error('❌ Test error:', error);
    await screenshot(page, 'error-state');
  } finally {
    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser kept open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    await browser.close();
  }
}

main().catch(console.error);
