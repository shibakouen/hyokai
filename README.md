# Hyokai (氷解)

A prompt transformation tool that converts natural language requests into precise technical specifications for AI coding agents and general assistants.

## Features

- **Dual Modes**: Coding mode (for IDE agents) and Prompting mode (for general AI)
- **Model Comparison**: Run prompts through 2-4 AI models simultaneously
- **20+ AI Models**: Google Gemini, Anthropic Claude, xAI Grok, OpenAI, DeepSeek, and more
- **History**: Auto-save transformations with restore capability
- **Bilingual UI**: English and Japanese support
- **Thinking Models**: Extended reasoning support for compatible models

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn-ui
- **Backend**: Supabase Edge Functions (Deno)
- **AI**: OpenRouter API (multi-provider routing)
- **Hosting**: Vercel

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create a `.env` file with:

```env
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[your-anon-key]
```

## Supabase Setup

1. Create a new Supabase project
2. Deploy the edge function:
   ```bash
   supabase link --project-ref [your-project-id]
   supabase secrets set OPENROUTER_API_KEY=sk-or-v1-xxxxx
   supabase functions deploy transform-prompt
   ```

## Deployment

This project is deployed on Vercel. Push to `main` to trigger auto-deployment.

### Manual Deployment

1. Import this repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

## License

MIT
