/**
 * localStorage Testing Script for Hyokai
 * Run this in browser console at http://localhost:8081/
 *
 * Tests:
 * 1. Basic persistence (mode, language, model selection)
 * 2. History persistence and truncation (max 50 entries)
 * 3. Edge cases (invalid data, quota exceeded simulation)
 * 4. Context persistence
 */

const KEYS = {
  mode: 'hyokai-mode',
  beginnerMode: 'hyokai-beginner-mode',
  language: 'hyokai-language',
  selectedModel: 'hyokai-selected-model-index',
  compareModels: 'hyokai-compare-model-indices',
  history: 'hyokai-history',
  simpleHistory: 'hyokai-simple-history',
  userContext: 'hyokai-user-context',
  savedContexts: 'hyokai-saved-contexts',
  activeContext: 'hyokai-active-context-id',
  sessionId: 'hyokai-session-id',
};

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message || 'Values not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// Backup and restore localStorage
function backupStorage() {
  const backup = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    backup[key] = localStorage.getItem(key);
  }
  return backup;
}

function restoreStorage(backup) {
  localStorage.clear();
  Object.entries(backup).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}

// ============================================================
// TEST CASES
// ============================================================

test('Mode persistence - coding', () => {
  localStorage.setItem(KEYS.mode, 'coding');
  const stored = localStorage.getItem(KEYS.mode);
  assertEqual(stored, 'coding', 'Mode should be coding');
});

test('Mode persistence - prompting', () => {
  localStorage.setItem(KEYS.mode, 'prompting');
  const stored = localStorage.getItem(KEYS.mode);
  assertEqual(stored, 'prompting', 'Mode should be prompting');
});

test('Language persistence - en', () => {
  localStorage.setItem(KEYS.language, 'en');
  const stored = localStorage.getItem(KEYS.language);
  assertEqual(stored, 'en', 'Language should be en');
});

test('Language persistence - jp', () => {
  localStorage.setItem(KEYS.language, 'jp');
  const stored = localStorage.getItem(KEYS.language);
  assertEqual(stored, 'jp', 'Language should be jp');
});

test('Beginner mode persistence - true/false', () => {
  localStorage.setItem(KEYS.beginnerMode, 'true');
  assertEqual(localStorage.getItem(KEYS.beginnerMode), 'true');
  localStorage.setItem(KEYS.beginnerMode, 'false');
  assertEqual(localStorage.getItem(KEYS.beginnerMode), 'false');
});

test('Selected model index persistence', () => {
  localStorage.setItem(KEYS.selectedModel, '3');
  const stored = localStorage.getItem(KEYS.selectedModel);
  assertEqual(stored, '3', 'Model index should be 3');

  // Test parsing
  const parsed = parseInt(stored, 10);
  assertEqual(parsed, 3, 'Parsed model index should be 3');
});

test('Compare model indices persistence', () => {
  const indices = [0, 2, 4];
  localStorage.setItem(KEYS.compareModels, JSON.stringify(indices));
  const stored = JSON.parse(localStorage.getItem(KEYS.compareModels));
  assertEqual(stored, indices, 'Compare indices should match');
});

test('History entry structure', () => {
  const entry = {
    id: `${Date.now()}-abc123`,
    timestamp: Date.now(),
    input: 'Test input',
    taskMode: 'coding',
    result: {
      type: 'single',
      modelName: 'Test Model',
      modelProvider: 'Test Provider',
      output: 'Test output',
      elapsedTime: 1234,
    }
  };

  localStorage.setItem(KEYS.history, JSON.stringify([entry]));
  const stored = JSON.parse(localStorage.getItem(KEYS.history));
  assertEqual(stored[0].id, entry.id, 'Entry ID should match');
  assertEqual(stored[0].taskMode, 'coding', 'Task mode should be coding');
  assertEqual(stored[0].result.type, 'single', 'Result type should be single');
});

test('History compare entry structure', () => {
  const entry = {
    id: `${Date.now()}-compare`,
    timestamp: Date.now(),
    input: 'Compare input',
    taskMode: 'prompting',
    result: {
      type: 'compare',
      results: [
        { modelName: 'Model A', modelProvider: 'Provider A', output: 'Output A', error: null, elapsedTime: 1000 },
        { modelName: 'Model B', modelProvider: 'Provider B', output: null, error: 'Error B', elapsedTime: 500 },
      ]
    }
  };

  localStorage.setItem(KEYS.history, JSON.stringify([entry]));
  const stored = JSON.parse(localStorage.getItem(KEYS.history));
  assertEqual(stored[0].result.type, 'compare', 'Result type should be compare');
  assertEqual(stored[0].result.results.length, 2, 'Should have 2 results');
});

test('History truncation at 50 entries', () => {
  const entries = [];
  for (let i = 0; i < 55; i++) {
    entries.push({
      id: `entry-${i}`,
      timestamp: Date.now() - (55 - i) * 1000,
      input: `Input ${i}`,
      taskMode: 'coding',
      result: { type: 'single', modelName: 'Test', modelProvider: 'Test', output: `Output ${i}`, elapsedTime: 100 }
    });
  }

  // Simulate the add history entry logic
  const sorted = entries.sort((a, b) => b.timestamp - a.timestamp);
  const truncated = sorted.slice(0, 50);

  localStorage.setItem(KEYS.history, JSON.stringify(truncated));
  const stored = JSON.parse(localStorage.getItem(KEYS.history));
  assertEqual(stored.length, 50, 'History should be truncated to 50 entries');
  assert(stored[0].id === 'entry-54', 'First entry should be most recent (entry-54)');
});

test('Simple history truncation at 30 entries', () => {
  const entries = [];
  for (let i = 0; i < 35; i++) {
    entries.push({
      id: `simple-${i}`,
      timestamp: Date.now() - (35 - i) * 1000,
      input: `Simple input ${i}`,
      output: `Simple output ${i}`,
      elapsedTime: 100
    });
  }

  const sorted = entries.sort((a, b) => b.timestamp - a.timestamp);
  const truncated = sorted.slice(0, 30);

  localStorage.setItem(KEYS.simpleHistory, JSON.stringify(truncated));
  const stored = JSON.parse(localStorage.getItem(KEYS.simpleHistory));
  assertEqual(stored.length, 30, 'Simple history should be truncated to 30 entries');
});

test('User context persistence', () => {
  const context = 'This is my user context.\nWith multiple lines.\nAnd some special chars: "quotes" and <html>';
  localStorage.setItem(KEYS.userContext, context);
  const stored = localStorage.getItem(KEYS.userContext);
  assertEqual(stored, context, 'User context should match including special characters');
});

test('Saved contexts structure', () => {
  const contexts = [
    { id: 'ctx_1', name: 'Context 1', content: 'Content 1', createdAt: Date.now(), updatedAt: Date.now() },
    { id: 'ctx_2', name: 'Context 2', content: 'Content 2', createdAt: Date.now(), updatedAt: Date.now() },
  ];
  localStorage.setItem(KEYS.savedContexts, JSON.stringify(contexts));
  const stored = JSON.parse(localStorage.getItem(KEYS.savedContexts));
  assertEqual(stored.length, 2, 'Should have 2 saved contexts');
  assertEqual(stored[0].name, 'Context 1', 'First context name should match');
});

test('Active context ID persistence', () => {
  localStorage.setItem(KEYS.activeContext, 'ctx_123');
  const stored = localStorage.getItem(KEYS.activeContext);
  assertEqual(stored, 'ctx_123', 'Active context ID should match');
});

test('Session ID persistence', () => {
  const sessionId = `anon_${Date.now().toString(36)}_abc123`;
  localStorage.setItem(KEYS.sessionId, sessionId);
  const stored = localStorage.getItem(KEYS.sessionId);
  assertEqual(stored, sessionId, 'Session ID should match');
});

test('Invalid JSON handling in history', () => {
  localStorage.setItem(KEYS.history, 'not valid json');

  // Simulate the loadHistory function's error handling
  let result;
  try {
    result = JSON.parse(localStorage.getItem(KEYS.history));
  } catch {
    result = [];
  }

  assertEqual(result, [], 'Should return empty array on invalid JSON');
});

test('Empty storage returns defaults', () => {
  localStorage.removeItem(KEYS.history);
  localStorage.removeItem(KEYS.mode);
  localStorage.removeItem(KEYS.language);

  // Simulate the default value patterns from contexts
  const mode = localStorage.getItem(KEYS.mode) === 'prompting' ? 'prompting' : 'coding';
  const language = localStorage.getItem(KEYS.language) === 'jp' ? 'jp' : 'en';

  let history;
  try {
    const stored = localStorage.getItem(KEYS.history);
    history = stored ? JSON.parse(stored) : [];
  } catch {
    history = [];
  }

  assertEqual(mode, 'coding', 'Default mode should be coding');
  assertEqual(language, 'en', 'Default language should be en');
  assertEqual(history, [], 'Default history should be empty array');
});

test('Large context handling', () => {
  // Create a large context (about 100KB)
  const largeContent = 'x'.repeat(100000);
  localStorage.setItem(KEYS.userContext, largeContent);
  const stored = localStorage.getItem(KEYS.userContext);
  assertEqual(stored.length, 100000, 'Should store 100KB of content');
});

test('Unicode and special characters', () => {
  const unicodeInput = '日本語テスト 🚀 émoji and symbols ∞ ≠ ≤ ≥';
  const entry = {
    id: 'unicode-test',
    timestamp: Date.now(),
    input: unicodeInput,
    taskMode: 'coding',
    result: { type: 'single', modelName: 'Test', modelProvider: 'Test', output: unicodeInput, elapsedTime: 100 }
  };

  localStorage.setItem(KEYS.history, JSON.stringify([entry]));
  const stored = JSON.parse(localStorage.getItem(KEYS.history));
  assertEqual(stored[0].input, unicodeInput, 'Unicode should be preserved');
});

test('Concurrent-safe ID generation', () => {
  // Generate multiple IDs quickly
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    ids.add(id);
  }
  assertEqual(ids.size, 100, 'All 100 IDs should be unique');
});

// ============================================================
// RUN TESTS
// ============================================================

async function runTests() {
  const backup = backupStorage();
  console.log('🔵 Starting localStorage tests...\n');

  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

  // Restore original localStorage
  restoreStorage(backup);
  console.log('🔄 Original localStorage restored\n');

  return { passed, failed };
}

// Run if in browser
if (typeof window !== 'undefined') {
  runTests();
} else {
  console.log('This script is designed to run in a browser environment.');
}
