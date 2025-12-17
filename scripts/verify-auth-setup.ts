#!/usr/bin/env npx tsx

/**
 * Verify Supabase Auth Setup
 *
 * This script checks if all auth components are properly configured.
 * Run with: npx tsx scripts/verify-auth-setup.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://znjqpxlijraodmjrhqaz.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

async function main() {
  console.log('\n🔍 Verifying Supabase Auth Setup...\n');

  const results: { check: string; status: 'pass' | 'fail' | 'warn'; message: string }[] = [];

  // Check 1: Supabase URL is accessible
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: { 'apikey': SUPABASE_ANON_KEY }
    });
    results.push({
      check: 'Supabase API',
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? 'API is accessible' : `Status: ${response.status}`
    });
  } catch (e) {
    results.push({
      check: 'Supabase API',
      status: 'fail',
      message: `Connection error: ${e instanceof Error ? e.message : 'Unknown'}`
    });
  }

  // Check 2: Tables exist
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const tables = [
    'user_profiles',
    'user_preferences',
    'saved_contexts',
    'user_active_context',
    'github_credentials',
    'github_repos',
    'github_repo_cache',
    'github_settings',
    'history_entries',
    'simple_history_entries'
  ];

  for (const table of tables) {
    try {
      // This will fail with 401 due to RLS (which is expected)
      // But a 404 means the table doesn't exist
      const { error } = await supabase.from(table).select('*').limit(0);

      if (error?.code === 'PGRST116') {
        results.push({ check: `Table: ${table}`, status: 'fail', message: 'Table not found' });
      } else {
        results.push({ check: `Table: ${table}`, status: 'pass', message: 'Exists' });
      }
    } catch (e) {
      results.push({
        check: `Table: ${table}`,
        status: 'fail',
        message: `Error: ${e instanceof Error ? e.message : 'Unknown'}`
      });
    }
  }

  // Check 3: user-data function is deployed
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/user-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid' // Will fail auth, but should return 401 not 404
      },
      body: JSON.stringify({ action: 'test' })
    });

    if (response.status === 404) {
      results.push({ check: 'Edge Function: user-data', status: 'fail', message: 'Not deployed' });
    } else if (response.status === 401) {
      results.push({ check: 'Edge Function: user-data', status: 'pass', message: 'Deployed (JWT required)' });
    } else {
      results.push({ check: 'Edge Function: user-data', status: 'pass', message: `Status: ${response.status}` });
    }
  } catch (e) {
    results.push({
      check: 'Edge Function: user-data',
      status: 'fail',
      message: `Error: ${e instanceof Error ? e.message : 'Unknown'}`
    });
  }

  // Check 4: Email auth endpoint (Supabase has email auth enabled by default)
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ email: 'test@test.com', password: 'test' })
    });

    // Expect 400 (password too short) or 422 (validation error) - both indicate email auth is working
    if (response.status === 400 || response.status === 422) {
      results.push({ check: 'Email Auth', status: 'pass', message: 'Signup endpoint accessible' });
    } else if (response.status === 200) {
      results.push({ check: 'Email Auth', status: 'pass', message: 'Signup endpoint accessible' });
    } else {
      results.push({ check: 'Email Auth', status: 'warn', message: `Status: ${response.status}` });
    }
  } catch (e) {
    results.push({
      check: 'Email Auth',
      status: 'fail',
      message: `Error: ${e instanceof Error ? e.message : 'Unknown'}`
    });
  }

  // Print results
  console.log('━'.repeat(60));
  console.log(' Check'.padEnd(35) + 'Status'.padEnd(10) + 'Message');
  console.log('━'.repeat(60));

  for (const r of results) {
    const statusIcon = r.status === 'pass' ? '✅' : r.status === 'warn' ? '⚠️ ' : '❌';
    console.log(` ${r.check.padEnd(33)} ${statusIcon.padEnd(8)} ${r.message}`);
  }

  console.log('━'.repeat(60));

  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  if (failed > 0) {
    console.log(`\n❌ ${failed} check(s) failed. See SUPABASE_AUTH_SETUP.md for setup instructions.`);
    process.exit(1);
  } else if (warned > 0) {
    console.log(`\n⚠️  All checks passed with ${warned} warning(s).`);
  } else {
    console.log('\n✅ All checks passed! Auth setup is complete.');
  }
}

main().catch(console.error);
