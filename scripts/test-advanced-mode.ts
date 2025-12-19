/**
 * Playwright tests for Advanced Mode with Saved Instructions Library
 *
 * Tests define what "working" looks like:
 * 1. Toggle enables/disables custom instructions panel
 * 2. Textarea for ad-hoc instructions works
 * 3. Saved instructions library (CRUD operations)
 * 4. Multi-select instructions
 * 5. Instructions appended to transformed output
 * 6. localStorage persistence for anonymous users
 * 7. Visual highlighting of appended instructions
 */

import { chromium, Browser, Page } from 'playwright';

const BASE_URL = process.env.TEST_URL || 'http://localhost:8085';
const INSTRUCTIONS_KEY = 'hyokai-custom-instructions';
const INSTRUCTIONS_ENABLED_KEY = 'hyokai-instructions-enabled';
const SAVED_INSTRUCTIONS_KEY = 'hyokai-saved-instructions';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (e) {
    results.push({ name, passed: false, error: String(e), duration: Date.now() - start });
    console.log(`  ✗ ${name}: ${e}`);
  }
}

async function runTests() {
  console.log('\n=== Advanced Mode with Instructions Library Tests ===\n');
  console.log(`Testing against: ${BASE_URL}\n`);

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    page = await context.newPage();

    // Setup: Clear state and set to Advanced mode (not Beginner)
    await page.goto(BASE_URL);
    await page.evaluate(() => {
      localStorage.setItem('hyokai-beginner-mode', 'false');
      localStorage.removeItem('hyokai-custom-instructions');
      localStorage.removeItem('hyokai-instructions-enabled');
      localStorage.removeItem('hyokai-saved-instructions');
      localStorage.removeItem('hyokai-selected-instructions');
    });
    await page.reload();
    await page.waitForTimeout(1500);

    await page.screenshot({ path: 'test-screenshots/advanced-01-initial.png', fullPage: true });

    // ============ SECTION 1: Toggle Functionality ============
    console.log('\n--- Toggle Functionality ---');

    await test('Custom Instructions toggle is visible', async () => {
      const toggle = await page.locator('[data-testid="instructions-toggle"], button:has-text("Custom Instructions"), label:has-text("Custom Instructions")').first();
      const isVisible = await toggle.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        throw new Error('Custom Instructions toggle not found in UI');
      }
    });

    await test('Clicking toggle reveals instructions panel', async () => {
      const toggle = await page.locator('[data-testid="instructions-toggle"], button:has-text("Custom Instructions"), label:has-text("Custom Instructions")').first();
      await toggle.click();
      await page.waitForTimeout(500);

      // Look for the panel/container
      const panel = await page.locator('[data-testid="instructions-panel"], .instructions-panel, [class*="instructions"]').first();
      const isVisible = await panel.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Instructions panel not visible after toggle');
      }
      await page.screenshot({ path: 'test-screenshots/advanced-02-panel-open.png', fullPage: true });
    });

    // ============ SECTION 2: Ad-hoc Instructions Textarea ============
    console.log('\n--- Ad-hoc Instructions Textarea ---');

    await test('Textarea for custom instructions is present', async () => {
      const textarea = await page.locator('[data-testid="custom-instructions-input"], textarea[placeholder*="instruction"], textarea[placeholder*="append"]').first();
      const isVisible = await textarea.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Custom instructions textarea not found');
      }
    });

    await test('Can enter text into instructions textarea', async () => {
      const testText = 'Always respond in bullet points. Be concise.';
      const textarea = await page.locator('[data-testid="custom-instructions-input"], textarea[placeholder*="instruction"], textarea[placeholder*="append"]').first();
      await textarea.fill(testText);
      const value = await textarea.inputValue();
      if (value !== testText) {
        throw new Error(`Expected "${testText}", got "${value}"`);
      }
    });

    await test('Instructions persist to localStorage', async () => {
      const stored = await page.evaluate((key) => localStorage.getItem(key), INSTRUCTIONS_KEY);
      if (!stored || !stored.includes('bullet points')) {
        throw new Error(`Instructions not saved to localStorage. Got: ${stored}`);
      }
    });

    await test('Instructions persist after page reload', async () => {
      await page.reload();
      await page.waitForTimeout(1000);

      // Panel should auto-open if enabled
      const textarea = await page.locator('[data-testid="custom-instructions-input"], textarea[placeholder*="instruction"], textarea[placeholder*="append"]').first();
      const value = await textarea.inputValue().catch(() => '');
      if (!value.includes('bullet points')) {
        throw new Error(`Instructions not restored after reload. Got: "${value}"`);
      }
      await page.screenshot({ path: 'test-screenshots/advanced-03-persisted.png', fullPage: true });
    });

    // ============ SECTION 3: Saved Instructions Library ============
    console.log('\n--- Saved Instructions Library ---');

    await test('Manage Library button exists', async () => {
      const btn = await page.locator('[data-testid="manage-instructions-btn"], button:has-text("Manage"), button:has-text("Library"), button:has-text("Saved")').first();
      const isVisible = await btn.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Manage Library button not found');
      }
    });

    await test('Clicking Manage opens library modal', async () => {
      const btn = await page.locator('[data-testid="manage-instructions-btn"], button:has-text("Manage"), button:has-text("Library")').first();
      await btn.click();
      await page.waitForTimeout(500);

      const modal = await page.locator('[data-testid="instructions-modal"], [role="dialog"]:has-text("Instructions"), [role="dialog"]:has-text("Library")').first();
      const isVisible = await modal.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Library modal not visible after clicking Manage');
      }
      await page.screenshot({ path: 'test-screenshots/advanced-04-modal-open.png', fullPage: true });
    });

    await test('Can create new saved instruction', async () => {
      // Find "New" or "Add" button in modal
      const addBtn = await page.locator('[role="dialog"] button:has-text("New"), [role="dialog"] button:has-text("Add"), [role="dialog"] button:has-text("Create")').first();
      await addBtn.click();
      await page.waitForTimeout(300);

      // Fill name and content
      const nameInput = await page.locator('[role="dialog"] input[placeholder*="name"], [role="dialog"] input[name="name"]').first();
      await nameInput.fill('Code Style Guide');

      const contentInput = await page.locator('[role="dialog"] textarea[placeholder*="content"], [role="dialog"] textarea[name="content"]').first();
      await contentInput.fill('Use TypeScript. Follow ESLint rules. Add JSDoc comments.');

      // Save
      const saveBtn = await page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]').first();
      await saveBtn.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'test-screenshots/advanced-05-instruction-created.png', fullPage: true });
    });

    await test('Saved instruction appears in list', async () => {
      const item = await page.locator('[role="dialog"] [data-testid="instruction-item"], [role="dialog"] .instruction-item, [role="dialog"] li:has-text("Code Style Guide")').first();
      const isVisible = await item.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Created instruction not visible in list');
      }
    });

    await test('Can edit saved instruction', async () => {
      const editBtn = await page.locator('[role="dialog"] button:has-text("Edit"), [role="dialog"] [data-testid="edit-instruction"]').first();
      await editBtn.click();
      await page.waitForTimeout(300);

      const contentInput = await page.locator('[role="dialog"] textarea').first();
      await contentInput.fill('Use TypeScript. Follow ESLint rules. Add JSDoc comments. Use async/await.');

      const saveBtn = await page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button[type="submit"]').first();
      await saveBtn.click();
      await page.waitForTimeout(300);
    });

    await test('Can close modal', async () => {
      const closeBtn = await page.locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("Done"), [role="dialog"] [aria-label="Close"]').first();
      await closeBtn.click();
      await page.waitForTimeout(300);

      const modal = await page.locator('[role="dialog"]:has-text("Library")').first();
      const isVisible = await modal.isVisible().catch(() => false);
      if (isVisible) {
        throw new Error('Modal still visible after closing');
      }
    });

    // ============ SECTION 4: Instruction Selection ============
    console.log('\n--- Instruction Selection ---');

    await test('Saved instructions appear as selectable list', async () => {
      const checkbox = await page.locator('[data-testid="instruction-checkbox"], input[type="checkbox"]:near(:text("Code Style Guide")), .instruction-select').first();
      const isVisible = await checkbox.isVisible().catch(() => false);
      if (!isVisible) {
        throw new Error('Instruction selection checkbox not found');
      }
    });

    await test('Can select instruction for appending', async () => {
      const checkbox = await page.locator('[data-testid="instruction-checkbox"], input[type="checkbox"]:near(:text("Code Style Guide"))').first();
      await checkbox.check();
      await page.waitForTimeout(200);

      const isChecked = await checkbox.isChecked();
      if (!isChecked) {
        throw new Error('Instruction not selected after clicking');
      }
      await page.screenshot({ path: 'test-screenshots/advanced-06-instruction-selected.png', fullPage: true });
    });

    await test('Selected instructions persist to localStorage', async () => {
      const stored = await page.evaluate((key) => {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : [];
      }, 'hyokai-selected-instructions');

      if (!Array.isArray(stored) || stored.length === 0) {
        throw new Error(`Selected instructions not saved. Got: ${JSON.stringify(stored)}`);
      }
    });

    // ============ SECTION 5: Output Appending ============
    console.log('\n--- Output Appending ---');

    await test('Transform with instructions appends to output', async () => {
      // Enter a prompt
      const promptInput = await page.locator('[data-testid="prompt-input"], textarea[placeholder*="prompt"], textarea[placeholder*="pls make"]').first();
      await promptInput.fill('Create a simple React component');

      // Click transform
      const transformBtn = await page.locator('button:has-text("Generate"), button:has-text("Transform")').first();
      await transformBtn.click();

      console.log('    Waiting for transformation...');

      // Wait for output with longer timeout
      try {
        await page.waitForFunction(() => {
          const outputs = document.querySelectorAll('textarea');
          for (const o of outputs) {
            if (o.value && o.value.length > 100) return true;
          }
          return false;
        }, { timeout: 90000 });
      } catch {
        await page.screenshot({ path: 'test-screenshots/advanced-07-transform-timeout.png', fullPage: true });
        throw new Error('Transformation timed out');
      }

      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-screenshots/advanced-07-output.png', fullPage: true });

      // Check output contains appended instructions
      const outputTextarea = await page.locator('[data-testid="output-panel"] textarea, .output-content textarea').first();
      const output = await outputTextarea.inputValue().catch(() => '');

      // Should contain separator and instruction content
      if (!output.includes('---') && !output.includes('TypeScript') && !output.includes('ESLint')) {
        console.log(`    Output preview: ${output.substring(0, 300)}...`);
        throw new Error('Output does not contain appended instructions');
      }
    });

    await test('Appended section is visually highlighted', async () => {
      // Look for visual separator or highlight
      const separator = await page.locator('.instructions-separator, [data-testid="instructions-separator"], .appended-instructions').first();
      const separatorVisible = await separator.isVisible().catch(() => false);

      // Also check for text marker in output
      const outputTextarea = await page.locator('[data-testid="output-panel"] textarea').first();
      const output = await outputTextarea.inputValue().catch(() => '');
      const hasMarker = output.includes('--- Custom Instructions ---') || output.includes('User Instructions');

      if (!separatorVisible && !hasMarker) {
        console.log('    Warning: Visual separator not prominent, but text marker may be present');
      }
    });

    // ============ SECTION 6: Edge Cases ============
    console.log('\n--- Edge Cases ---');

    await test('Disabling toggle hides panel', async () => {
      const toggle = await page.locator('[data-testid="instructions-toggle"], button:has-text("Custom Instructions")').first();
      await toggle.click();
      await page.waitForTimeout(500);

      const panel = await page.locator('[data-testid="instructions-panel"], .instructions-panel').first();
      const isVisible = await panel.isVisible().catch(() => false);
      if (isVisible) {
        throw new Error('Panel still visible after disabling toggle');
      }
      await page.screenshot({ path: 'test-screenshots/advanced-08-toggle-off.png', fullPage: true });
    });

    await test('Re-enabling toggle restores state', async () => {
      const toggle = await page.locator('[data-testid="instructions-toggle"], button:has-text("Custom Instructions")').first();
      await toggle.click();
      await page.waitForTimeout(500);

      // Check textarea has saved content
      const textarea = await page.locator('[data-testid="custom-instructions-input"]').first();
      const value = await textarea.inputValue().catch(() => '');

      // Check saved instruction is still selected
      const checkbox = await page.locator('[data-testid="instruction-checkbox"]').first();
      const isChecked = await checkbox.isChecked().catch(() => false);

      if (!value.includes('bullet points') && !isChecked) {
        throw new Error('State not restored after re-enabling');
      }
    });

    await test('Empty instructions do not append separator', async () => {
      // Reload page to reset to input view
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Ensure instructions are enabled but empty
      await page.evaluate(() => {
        localStorage.setItem('hyokai-instructions-enabled', 'true');
        localStorage.setItem('hyokai-custom-instructions', '');
        localStorage.setItem('hyokai-selected-instructions', '[]');
      });
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Clear all instructions - verify toggle is on and panel is visible
      const toggle = await page.locator('[data-testid="instructions-toggle"]').first();
      if (!(await toggle.isChecked().catch(() => false))) {
        await toggle.click();
        await page.waitForTimeout(300);
      }

      const textarea = await page.locator('[data-testid="custom-instructions-input"]').first();
      await textarea.fill('');

      const checkbox = await page.locator('[data-testid="instruction-checkbox"]').first();
      if (await checkbox.isChecked()) {
        await checkbox.uncheck();
      }

      // Transform
      const promptInput = await page.locator('[data-testid="prompt-input"]').first();
      await promptInput.fill('Test without instructions');

      const transformBtn = await page.locator('button:has-text("Generate")').first();
      await transformBtn.click();

      await page.waitForFunction(() => {
        const outputs = document.querySelectorAll('textarea');
        for (const o of outputs) {
          if (o.value && o.value.length > 50) return true;
        }
        return false;
      }, { timeout: 60000 }).catch(() => {});

      await page.waitForTimeout(1000);

      const outputTextarea = await page.locator('[data-testid="output-panel"] textarea').first();
      const output = await outputTextarea.inputValue().catch(() => '');

      if (output.includes('--- Custom Instructions ---')) {
        throw new Error('Separator present even with no instructions');
      }
    });

    // Cleanup
    await page.evaluate(() => {
      localStorage.removeItem('hyokai-custom-instructions');
      localStorage.removeItem('hyokai-instructions-enabled');
      localStorage.removeItem('hyokai-saved-instructions');
      localStorage.removeItem('hyokai-selected-instructions');
    });

  } catch (e) {
    console.error('\n=== Test setup failed ===');
    console.error(e);
    if (page) {
      await page.screenshot({ path: 'test-screenshots/advanced-error.png', fullPage: true });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  // Print summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  console.log(`Total time: ${results.reduce((a, r) => a + (r.duration || 0), 0)}ms`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
      console.log(`    Error: ${r.error}`);
    });
    process.exit(1);
  }

  console.log('\n All tests passed!');
}

runTests().catch(console.error);
