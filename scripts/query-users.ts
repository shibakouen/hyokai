/**
 * Query Users and Usage Statistics
 *
 * Run with: npx tsx scripts/query-users.ts
 *
 * Note: This requires SUPABASE_SERVICE_ROLE_KEY in .env to access auth.users
 * Without it, we can only query public tables via RLS.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env manually
function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), '.env');
    const content = readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=["']?(.+?)["']?$/);
      if (match) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // .env may not exist
  }
}

loadEnv();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl) {
  console.error('Missing VITE_SUPABASE_URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  migrated_at: string | null;
}

interface UserStats {
  userId: string;
  email: string;
  displayName: string;
  createdAt: string;
  migratedAt: string | null;
  historyCount: number;
  simpleHistoryCount: number;
  savedContextsCount: number;
  hasGitHubCredentials: boolean;
  hasPreferences: boolean;
}

async function main() {
  console.log('\n🔍 Querying Hyokai Database...\n');
  console.log('Supabase URL:', supabaseUrl);
  console.log('Using key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');
  console.log('');

  // Check if we have service role access
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasServiceRole) {
    console.log('⚠️  Note: Using anon key. To query auth.users, add SUPABASE_SERVICE_ROLE_KEY to .env');
    console.log('   Get it from: Supabase Dashboard → Project Settings → API → service_role key\n');
  }

  // Query user profiles (public table)
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (profilesError) {
    console.error('Error fetching profiles:', profilesError.message);
  }

  // Query related tables for statistics
  const { data: historyEntries } = await supabase
    .from('history_entries')
    .select('user_id');

  const { data: simpleHistoryEntries } = await supabase
    .from('simple_history_entries')
    .select('user_id');

  const { data: savedContexts } = await supabase
    .from('saved_contexts')
    .select('user_id');

  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('user_id');

  const { data: githubCreds } = await supabase
    .from('github_credentials')
    .select('user_id');

  // Aggregate stats
  const historyByUser = new Map<string, number>();
  const simpleHistoryByUser = new Map<string, number>();
  const contextsByUser = new Map<string, number>();
  const usersWithPrefs = new Set<string>();
  const usersWithGitHub = new Set<string>();

  historyEntries?.forEach(e => {
    historyByUser.set(e.user_id, (historyByUser.get(e.user_id) || 0) + 1);
  });

  simpleHistoryEntries?.forEach(e => {
    simpleHistoryByUser.set(e.user_id, (simpleHistoryByUser.get(e.user_id) || 0) + 1);
  });

  savedContexts?.forEach(e => {
    contextsByUser.set(e.user_id, (contextsByUser.get(e.user_id) || 0) + 1);
  });

  preferences?.forEach(e => usersWithPrefs.add(e.user_id));
  githubCreds?.forEach(e => usersWithGitHub.add(e.user_id));

  // Build user stats
  const userStats: UserStats[] = (profiles || []).map((profile: UserProfile) => ({
    userId: profile.id,
    email: anonymizeEmail(profile.email || 'N/A'),
    displayName: profile.display_name || 'N/A',
    createdAt: new Date(profile.created_at).toLocaleString(),
    migratedAt: profile.migrated_at ? new Date(profile.migrated_at).toLocaleString() : null,
    historyCount: historyByUser.get(profile.id) || 0,
    simpleHistoryCount: simpleHistoryByUser.get(profile.id) || 0,
    savedContextsCount: contextsByUser.get(profile.id) || 0,
    hasGitHubCredentials: usersWithGitHub.has(profile.id),
    hasPreferences: usersWithPrefs.has(profile.id),
  }));

  // Print results
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                         USER LIST');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  if (userStats.length === 0) {
    console.log('📭 No users found in the database.\n');
  } else {
    console.log(`Found ${userStats.length} user(s):\n`);

    userStats.forEach((user, index) => {
      console.log(`┌─ User ${index + 1} ─────────────────────────────────────────────────────`);
      console.log(`│ ID:           ${user.userId.slice(0, 8)}...`);
      console.log(`│ Email:        ${user.email}`);
      console.log(`│ Display Name: ${user.displayName}`);
      console.log(`│ Created:      ${user.createdAt}`);
      console.log(`│ Migrated:     ${user.migratedAt || 'Not migrated'}`);
      console.log(`│`);
      console.log(`│ Activity:`);
      console.log(`│   - History entries (Advanced): ${user.historyCount}`);
      console.log(`│   - History entries (Simple):   ${user.simpleHistoryCount}`);
      console.log(`│   - Saved contexts:             ${user.savedContextsCount}`);
      console.log(`│   - Has preferences:            ${user.hasPreferences ? '✓' : '✗'}`);
      console.log(`│   - Has GitHub credentials:     ${user.hasGitHubCredentials ? '✓' : '✗'}`);
      console.log(`└──────────────────────────────────────────────────────────────────\n`);
    });
  }

  // Token usage note
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                       TOKEN USAGE');
  console.log('═══════════════════════════════════════════════════════════════════\n');
  console.log('⚠️  Token usage tracking is NOT implemented in this application.\n');
  console.log('The app uses OpenRouter API via edge functions but does not log:');
  console.log('  - Input tokens per request');
  console.log('  - Output tokens per request');
  console.log('  - API costs per user');
  console.log('  - Request timestamps\n');
  console.log('To implement token usage tracking, add a table like:\n');
  console.log('  CREATE TABLE api_usage (');
  console.log('    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),');
  console.log('    user_id UUID REFERENCES auth.users(id),');
  console.log('    model TEXT NOT NULL,');
  console.log('    input_tokens INTEGER,');
  console.log('    output_tokens INTEGER,');
  console.log('    cost_usd DECIMAL(10, 6),');
  console.log('    created_at TIMESTAMPTZ DEFAULT NOW()');
  console.log('  );\n');
  console.log('Then update transform-prompt edge function to log usage after each call.');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Summary
  console.log('SUMMARY:');
  console.log(`  Total users:           ${userStats.length}`);
  console.log(`  Total history entries: ${historyEntries?.length || 0}`);
  console.log(`  Total simple history:  ${simpleHistoryEntries?.length || 0}`);
  console.log(`  Total saved contexts:  ${savedContexts?.length || 0}`);
  console.log('');
}

function anonymizeEmail(email: string): string {
  if (!email || email === 'N/A') return email;
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visibleChars = Math.min(3, local.length);
  return `${local.slice(0, visibleChars)}***@${domain}`;
}

main().catch(console.error);
