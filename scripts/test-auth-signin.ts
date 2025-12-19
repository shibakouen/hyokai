/**
 * Test: Sign-in persistence - User should stay signed in after login
 *
 * This test verifies that:
 * 1. User can sign in successfully
 * 2. User remains signed in after sign-in completes
 * 3. User remains signed in after page refresh
 * 4. Auth state is properly persisted to localStorage
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8085';
const TEST_EMAIL = 'reimutomonari@gmail.com';
const TEST_PASSWORD = 'test321';

let browser: Browser;
let page: Page;

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}: ${error}`);
    return false;
  }
}

async function setup() {
  browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  page = await context.newPage();

  // Clear any existing auth state
  await page.goto(BASE_URL);
  await page.evaluate(() => {
    // Clear all Supabase auth tokens
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith('sb-') || key.startsWith('hyokai-')) {
        localStorage.removeItem(key);
      }
    }
  });
  await page.reload();
  await page.waitForLoadState('networkidle');
}

async function cleanup() {
  await browser?.close();
}

async function runTests() {
  console.log('\n=== Sign-In Persistence Tests ===\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  try {
    await setup();
    await page.screenshot({ path: 'test-screenshots/auth-01-initial.png', fullPage: true });

    // Test 1: Verify we start logged out
    const result1 = await test('User starts logged out', async () => {
      // Look for sign-in button (indicates logged out state)
      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      const isVisible = await signInBtn.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Sign in button not found - user may already be logged in');
      }
    });
    if (result1) passed++; else failed++;

    // Test 2: Can open sign-in dialog
    const result2 = await test('Can open sign-in dialog', async () => {
      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      await signInBtn.click();
      await page.waitForTimeout(500);

      const dialog = await page.locator('[role="dialog"]').first();
      const isVisible = await dialog.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Sign-in dialog did not open');
      }
      await page.screenshot({ path: 'test-screenshots/auth-02-dialog-open.png', fullPage: true });
    });
    if (result2) passed++; else failed++;

    // Test 3: Can enter credentials
    const result3 = await test('Can enter credentials', async () => {
      const emailInput = await page.locator('[role="dialog"] input[type="email"], [role="dialog"] input[placeholder*="email"], [role="dialog"] input[placeholder*="Email"]').first();
      await emailInput.fill(TEST_EMAIL);

      const passwordInput = await page.locator('[role="dialog"] input[type="password"]').first();
      await passwordInput.fill(TEST_PASSWORD);

      await page.screenshot({ path: 'test-screenshots/auth-03-credentials.png', fullPage: true });
    });
    if (result3) passed++; else failed++;

    // Test 4: Sign in succeeds
    const result4 = await test('Sign in succeeds', async () => {
      const submitBtn = await page.locator('[role="dialog"] button[type="submit"], [role="dialog"] button:has-text("Sign in"), [role="dialog"] button:has-text("ログイン")').first();
      await submitBtn.click({ force: true });

      // Wait for dialog to close (indicates success)
      await page.waitForFunction(() => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        return dialogs.length === 0;
      }, { timeout: 15000 });

      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/auth-04-after-signin.png', fullPage: true });
    });
    if (result4) passed++; else failed++;

    // Test 5: User remains signed in (CRITICAL - this is the bug we're testing)
    const result5 = await test('User remains signed in after sign-in', async () => {
      // Wait a moment to let any race conditions manifest
      await page.waitForTimeout(2000);

      // Check that we're still logged in - sign in button should NOT be visible
      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      const signInVisible = await signInBtn.isVisible().catch(() => false);

      // Check for user avatar or account indicator
      const userIndicator = await page.locator('[data-testid="user-avatar"], .user-avatar, button:has-text("Sign out"), button:has-text("ログアウト")').first();
      const userIndicatorVisible = await userIndicator.isVisible().catch(() => false);

      await page.screenshot({ path: 'test-screenshots/auth-05-after-wait.png', fullPage: true });

      if (signInVisible) {
        throw new Error('User was signed out immediately after signing in - BUG CONFIRMED');
      }

      console.log(`    User indicator visible: ${userIndicatorVisible}`);
    });
    if (result5) passed++; else failed++;

    // Test 6: Auth tokens are in localStorage
    const result6 = await test('Auth tokens stored in localStorage', async () => {
      const authKeys = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        return keys.filter(k => k.startsWith('sb-') && k.includes('auth'));
      });

      if (authKeys.length === 0) {
        throw new Error('No auth tokens found in localStorage');
      }
      console.log(`    Found auth keys: ${authKeys.join(', ')}`);
    });
    if (result6) passed++; else failed++;

    // Test 7: User remains signed in after page refresh
    const result7 = await test('User remains signed in after page refresh', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-screenshots/auth-06-after-refresh.png', fullPage: true });

      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      const signInVisible = await signInBtn.isVisible().catch(() => false);

      if (signInVisible) {
        throw new Error('User was signed out after page refresh');
      }
    });
    if (result7) passed++; else failed++;

    // Test 8: Multiple rapid refreshes don't break auth
    const result8 = await test('Multiple rapid refreshes maintain auth', async () => {
      for (let i = 0; i < 3; i++) {
        await page.reload();
        await page.waitForTimeout(500);
      }
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      await page.screenshot({ path: 'test-screenshots/auth-07-after-rapid-refresh.png', fullPage: true });

      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      const signInVisible = await signInBtn.isVisible().catch(() => false);

      if (signInVisible) {
        throw new Error('User was signed out after rapid refreshes');
      }
    });
    if (result8) passed++; else failed++;

    // Test 9: Tab focus/blur doesn't break auth (simulates switching tabs)
    const result9 = await test('Tab visibility change maintains auth', async () => {
      // Simulate tab blur/focus
      await page.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.waitForTimeout(1000);

      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      const signInVisible = await signInBtn.isVisible().catch(() => false);

      if (signInVisible) {
        throw new Error('User was signed out after tab visibility change');
      }
    });
    if (result9) passed++; else failed++;

    // Test 10: Auth persists after 5 seconds wait (catches delayed race conditions)
    const result10 = await test('Auth persists after 5 second wait', async () => {
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'test-screenshots/auth-08-after-long-wait.png', fullPage: true });

      const signInBtn = await page.locator('button:has-text("Sign in"), button:has-text("ログイン")').first();
      const signInVisible = await signInBtn.isVisible().catch(() => false);

      if (signInVisible) {
        throw new Error('User was signed out after 5 second wait - delayed race condition');
      }
    });
    if (result10) passed++; else failed++;

    // Test 11: Console has no auth-related errors
    const result11 = await test('No auth errors in console', async () => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error' && msg.text().toLowerCase().includes('auth')) {
          errors.push(msg.text());
        }
      });

      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      if (errors.length > 0) {
        throw new Error(`Auth errors in console: ${errors.join('; ')}`);
      }
    });
    if (result11) passed++; else failed++;

  } catch (error) {
    console.error('Test setup/teardown error:', error);
    failed++;
  } finally {
    await cleanup();
  }

  console.log(`\n=== Test Summary ===`);
  console.log(`Passed: ${passed}/${passed + failed}`);
  console.log(`Failed: ${failed}/${passed + failed}`);
  console.log(`Total time: ${Date.now() - startTime}ms`);

  if (failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

runTests();
