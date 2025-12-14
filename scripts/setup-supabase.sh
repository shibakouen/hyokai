#!/bin/bash

# Hyokai Supabase Setup Script
# Run this after creating/selecting a Supabase project

set -e

echo "🔷 Hyokai Supabase Setup"
echo "========================"
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Get project reference
read -p "Enter your Supabase project reference ID: " PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
fi

echo ""
echo "📡 Linking to Supabase project: $PROJECT_REF"
cd "$(dirname "$0")/.."
supabase link --project-ref "$PROJECT_REF"

echo ""
echo "🔑 Setting OpenRouter API key..."
read -s -p "Enter your OpenRouter API key (sk-or-v1-...): " OPENROUTER_KEY
echo ""

if [ -z "$OPENROUTER_KEY" ]; then
    echo "❌ OpenRouter API key is required"
    exit 1
fi

supabase secrets set OPENROUTER_API_KEY="$OPENROUTER_KEY"

echo ""
echo "🚀 Deploying transform-prompt edge function..."
supabase functions deploy transform-prompt

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Get your Supabase credentials from the dashboard:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/api"
echo ""
echo "2. Update your .env file with:"
echo "   VITE_SUPABASE_URL=https://$PROJECT_REF.supabase.co"
echo "   VITE_SUPABASE_PUBLISHABLE_KEY=[your-anon-key]"
echo ""
echo "3. Test locally:"
echo "   npm run dev"
echo ""
echo "4. Deploy to Vercel and set the same environment variables"
