// ==========================================================
// PASTE THIS ENTIRE SCRIPT INTO YOUR BROWSER CONSOLE
// while logged into Hyokai at https://hyokai.vercel.app
// ==========================================================

(async function cleanupDuplicateHistory() {
  // Access the supabase client from window (exposed by the app)
  // If not available, try to create one from localStorage data
  const SUPABASE_URL = 'https://oesiqfljagopqhxwfrlj.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lc2lxZmxqYWdvcHFoeHdmcmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQwOTAyNTQsImV4cCI6MjA0OTY2NjI1NH0.A0q8xsmhZ8vJE1ys-ouJz_KwRsviLLDGp-_i-PYxz5Q';

  // Create Supabase client
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

  // Get session from localStorage
  const sessionKey = Object.keys(localStorage).find(k => k.includes('-auth-token'));
  if (!sessionKey) {
    console.error('❌ No session found. Please log in first.');
    return;
  }

  const sessionData = JSON.parse(localStorage.getItem(sessionKey));
  if (!sessionData?.access_token) {
    console.error('❌ Invalid session. Please log in first.');
    return;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${sessionData.access_token}`
      }
    }
  });

  // Get user ID from session
  const userId = sessionData.user?.id;
  if (!userId) {
    console.error('❌ No user ID in session');
    return;
  }

  console.log('🔍 Cleaning up history for user:', userId.slice(0, 8) + '...');

  // === Clean up history_entries (advanced mode) ===
  console.log('\n📋 Checking history_entries (advanced mode)...');
  const { data: historyEntries, error: histError } = await supabase
    .from('history_entries')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });

  if (histError) {
    console.error('Error loading history:', histError.message);
  } else {
    console.log('Found', historyEntries.length, 'total history entries');

    // Group by input content to find duplicates
    const seenInputs = new Map();
    const duplicateIds = [];

    for (const entry of historyEntries) {
      const inputHash = entry.input.trim();
      if (seenInputs.has(inputHash)) {
        duplicateIds.push(entry.id);
      } else {
        seenInputs.set(inputHash, entry.id);
      }
    }

    console.log('Found', duplicateIds.length, 'duplicate entries to delete');

    if (duplicateIds.length > 0) {
      for (let i = 0; i < duplicateIds.length; i += 50) {
        const batch = duplicateIds.slice(i, i + 50);
        const { error: delError } = await supabase
          .from('history_entries')
          .delete()
          .in('id', batch);

        if (delError) {
          console.error('Error deleting batch:', delError.message);
        } else {
          console.log('✓ Deleted batch', Math.floor(i/50) + 1, ':', batch.length, 'entries');
        }
      }
      console.log('✅ Cleaned history_entries');
    } else {
      console.log('✅ No duplicates in history_entries');
    }
  }

  // === Clean up simple_history_entries (simple/beginner mode) ===
  console.log('\n📋 Checking simple_history_entries (beginner mode)...');
  const { data: simpleEntries, error: simpleError } = await supabase
    .from('simple_history_entries')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: true });

  if (simpleError) {
    console.error('Error loading simple history:', simpleError.message);
  } else {
    console.log('Found', simpleEntries.length, 'total simple history entries');

    const seenSimpleInputs = new Map();
    const simpleDuplicateIds = [];

    for (const entry of simpleEntries) {
      const inputHash = entry.input.trim();
      if (seenSimpleInputs.has(inputHash)) {
        simpleDuplicateIds.push(entry.id);
      } else {
        seenSimpleInputs.set(inputHash, entry.id);
      }
    }

    console.log('Found', simpleDuplicateIds.length, 'duplicate simple entries to delete');

    if (simpleDuplicateIds.length > 0) {
      for (let i = 0; i < simpleDuplicateIds.length; i += 50) {
        const batch = simpleDuplicateIds.slice(i, i + 50);
        const { error: delError } = await supabase
          .from('simple_history_entries')
          .delete()
          .in('id', batch);

        if (delError) {
          console.error('Error deleting batch:', delError.message);
        } else {
          console.log('✓ Deleted batch', Math.floor(i/50) + 1, ':', batch.length, 'entries');
        }
      }
      console.log('✅ Cleaned simple_history_entries');
    } else {
      console.log('✅ No duplicates in simple_history_entries');
    }
  }

  console.log('\n🎉 Cleanup complete! Refresh the page to see updated history.');
})();
