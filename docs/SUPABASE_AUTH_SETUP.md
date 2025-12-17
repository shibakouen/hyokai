# Supabase Auth Setup Guide

This guide walks you through completing the email/password authentication setup for Hyokai.

## Prerequisites

- Supabase CLI installed (`supabase --version` should work)
- Project linked (`supabase projects list` should show hyokai as linked)

---

## Step 1: Run Database Migration

The migration creates all necessary tables with Row Level Security policies.

### Option A: Via Supabase CLI (Recommended)

```bash
cd /Users/matteo/hyokai-vercel
supabase db push
```

### Option B: Via Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/znjqpxlijraodmjrhqaz/sql)
2. Click "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `supabase/migrations/001_auth_tables.sql`
5. Paste and click "Run"

### Tables Created:
- `user_profiles` - Extended user info (auto-created on signup)
- `user_preferences` - Mode, language, model selection
- `saved_contexts` - User contexts (max 10)
- `user_active_context` - Current context tracker
- `github_credentials` - Encrypted PAT storage
- `github_repos` - Connected repos (max 5)
- `github_repo_cache` - Tree/files cache
- `github_settings` - Git context settings
- `history_entries` - Advanced mode history (max 50)
- `simple_history_entries` - Beginner mode history (max 30)

---

## Step 2: Configure Email Authentication

Email authentication is enabled by default in Supabase. You may want to customize the email templates.

### 2.1 Configure Email Templates (Optional)

1. Go to [Supabase Auth Templates](https://supabase.com/dashboard/project/znjqpxlijraodmjrhqaz/auth/templates)
2. Customize the "Confirm signup" template if desired
3. Set the **Site URL** to your production URL (e.g., `https://hyokai.io`)

### 2.2 Configure Redirect URLs

1. Go to [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/znjqpxlijraodmjrhqaz/auth/url-configuration)
2. Add your URLs:
   - **Site URL**: `https://hyokai.io` (or your production domain)
   - **Redirect URLs**:
     - `http://localhost:5173`
     - `https://hyokai.io`

---

## Step 3: Add Edge Function Secrets

The `user-data` edge function needs an encryption key for PAT storage.

### Option A: Via Supabase CLI

```bash
supabase secrets set PAT_ENCRYPTION_KEY="YOUR_GENERATED_KEY_HERE"
```

### Option B: Via Supabase Dashboard

1. Go to [Edge Functions](https://supabase.com/dashboard/project/znjqpxlijraodmjrhqaz/functions)
2. Click on "user-data" function
3. Go to "Secrets" tab
4. Add new secret:
   - **Name**: `PAT_ENCRYPTION_KEY`
   - **Value**: `YOUR_GENERATED_KEY_HERE`

### Generate a New Key (if needed)

```bash
openssl rand -base64 32
```

**Important**: Store this key securely. If lost, all encrypted PATs become unreadable.

---

## Step 4: Deploy Edge Functions

If the `user-data` function hasn't been deployed yet:

```bash
cd /Users/matteo/hyokai-vercel
supabase functions deploy user-data
```

---

## Step 5: Test the Auth Flow

### 5.1 Start Local Development Server

```bash
npm run dev
```

### 5.2 Test Sign Up

1. Open `http://localhost:5173`
2. Click the "Sign in" button in the header
3. Click "Sign up" to switch to the signup form
4. Enter your email and password (min 6 characters)
5. Click "Sign up"
6. Check your email for a confirmation link
7. Click the confirmation link
8. After confirmation, you should be signed in with your avatar in the header

### 5.3 Test Sign In

1. Click "Sign in" button
2. Enter your email and password
3. Click "Sign in"
4. You should see your avatar in the header

### 5.4 Test Data Migration

If you have existing localStorage data:

1. The migration dialog should appear on first login
2. Review the data that will be imported
3. Click "Import" to migrate to cloud storage
4. Verify data syncs by checking another device/browser

### 5.5 Test Cloud Sync

1. Change a setting (e.g., switch language)
2. Open the app in incognito mode
3. Sign in with the same account
4. Verify the setting persisted

---

## Troubleshooting

### "Invalid login credentials" error
- Verify your email and password are correct
- If you haven't confirmed your email, check your inbox for the confirmation link

### "Email not confirmed" error
- Check your inbox (and spam folder) for the confirmation email
- Use the "Resend confirmation email" button if needed

### "Missing encryption key" error
- Ensure `PAT_ENCRYPTION_KEY` secret is set in Edge Functions
- Redeploy the function after setting secret

### Migration fails
- Check Supabase SQL Editor for error details
- Ensure you're using the latest migration file

### Confirmation email not arriving
- Check your spam folder
- Verify your email address is correct
- Try resending the confirmation email

---

## Security Notes

1. **PAT Encryption**: GitHub PATs are encrypted server-side with AES-GCM. The key never reaches the client.

2. **Row Level Security**: All tables have RLS policies ensuring users can only access their own data.

3. **JWT Verification**: The `user-data` edge function requires valid JWT (`verify_jwt = true`).

4. **Post-Migration Cleanup**: localStorage is cleared after successful database migration.

---

## Configuration Reference

### Project Details
- **Project ID**: `znjqpxlijraodmjrhqaz`
- **API URL**: `https://znjqpxlijraodmjrhqaz.supabase.co`
- **Auth Callback**: `https://znjqpxlijraodmjrhqaz.supabase.co/auth/v1/callback`

### Edge Functions
- `transform-prompt` - Main prompt transformation (no JWT required)
- `user-data` - PAT encryption/migration (JWT required)
- `github-api` - GitHub API proxy (no JWT required)

### Environment Variables
```env
VITE_SUPABASE_URL=https://znjqpxlijraodmjrhqaz.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```
