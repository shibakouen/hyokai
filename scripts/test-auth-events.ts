import { chromium } from 'playwright';

const BASE_URL = 'http://localhost:8083';
const TEST_EMAIL = 'reimutomonari@gmail.com';
const TEST_PASSWORD = 'test321';

async function main() {
  console.log('🧪 AUTH EVENTS TEST\n');
  console.log('Watching for auth state changes during login...\n');

  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  // Capture console logs from the page
  const authLogs: string[] = [];
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('[AuthContext]') || text.includes('auth') || text.includes('Auth')) {
      console.log(`📋 ${text}`);
      authLogs.push(text);
    }
  });

  try {
    // Load page
    console.log('Loading page...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('\n--- Initial auth events above ---\n');

    // First logout if logged in
    const isLoggedIn = await page.evaluate(() =>
      Object.keys(localStorage).some(k => k.includes('sb-') && k.includes('auth'))
    );

    if (isLoggedIn) {
      console.log('Already logged in. Logging out first...\n');
      await page.evaluate(() => {
        // Clear auth tokens to force logout
        Object.keys(localStorage)
          .filter(k => k.includes('sb-') && k.includes('auth'))
          .forEach(k => localStorage.removeItem(k));
      });
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      console.log('\n--- After logout events above ---\n');
    }

    // Clear logs before login
    authLogs.length = 0;
    console.log('='.repeat(50));
    console.log('STARTING LOGIN FLOW');
    console.log('='.repeat(50) + '\n');

    // Click sign in button
    console.log('Clicking Sign In button...');
    await page.click('button:has-text("Sign")');
    await page.waitForTimeout(500);

    // Fill credentials
    console.log('Filling credentials...');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);

    // Submit
    console.log('Submitting login form...\n');
    console.log('--- Auth events during login: ---');
    await page.click('[role="dialog"] button:has-text("Sign in")', { force: true });

    // Wait and watch for events
    await page.waitForTimeout(5000);

    console.log('\n--- End of login events ---\n');
    console.log(`Total auth events captured: ${authLogs.length}`);

    // Check final state
    const finalAuth = await page.evaluate(() => {
      const authKeys = Object.keys(localStorage).filter(k => k.includes('sb-') && k.includes('auth'));
      return { hasAuth: authKeys.length > 0, keyCount: authKeys.length };
    });
    console.log(`Final auth state: ${finalAuth.hasAuth ? 'Logged in' : 'Not logged in'} (${finalAuth.keyCount} auth keys)`);

    // Take screenshot
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/auth-events-final.png' });
    console.log('\nScreenshot saved to test-screenshots/auth-events-final.png');

  } catch (e) {
    console.error('Error:', e);
    await page.screenshot({ path: '/Users/matteo/hyokai-vercel/test-screenshots/auth-events-error.png' });
  }

  console.log('\n⏸️ Browser open for 15s to observe UI...');
  await page.waitForTimeout(15000);
  await browser.close();
}

main();
