import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription, PlanId, BillingInterval, PLAN_LIMITS } from '@/contexts/SubscriptionContext';
import { toast } from '@/hooks/use-toast';
import '@/styles/pro.css';

type Language = 'en' | 'ja';

// Translations for the Pro page
const getProTranslations = (lang: 'en' | 'ja') => {
  const translations = {
    en: {
      nav: {
        features: 'Features',
        howItWorks: 'How It Works',
        pricing: 'Pricing',
        logIn: 'Log In',
        openApp: 'Open App',
      },
      hero: {
        badge: 'Advanced Features',
        headline: 'Built for ',
        headlineGradient: 'Power Users',
        description: 'Whether you\'re a marketer, vibe coder, or seasoned developer — unlock the full potential of AI-powered prompt transformation with custom contexts, model comparison, and GitHub integration.',
        ctaPrimary: 'Start Free Trial',
        ctaSecondary: 'See Features',
      },
      carousel: {
        youType: 'You type:',
        hyokaiCreates: 'Hyokai creates:',
        slides: [
          { input: 'Compare Claude vs GPT for my code', output: 'Side-by-side analysis with custom context from your GitHub repo...' },
          { input: 'Use my project rules', output: 'Applying your saved custom instructions and coding conventions...' },
          { input: 'Check this against my codebase', output: 'Analyzing your repository structure and patterns...' },
          { input: 'Switch to GPT-4 for this one', output: 'Model selection applied. Transforming with GPT-4 Turbo...' },
          { input: 'Save this as my default context', output: 'Context saved. Will apply to all future transformations...' },
          { input: 'Connect my private repo', output: 'Authenticating with GitHub PAT. Indexing repository structure...' },
        ],
      },
      marquee: {
        usedBy: 'Trusted by power users everywhere',
        users: ['Developers', 'Engineers', 'Tech Leads', 'Architects', 'CTOs', 'Consultants', 'Researchers', 'Agencies'],
      },
      howItWorks: {
        title: 'How Advanced Mode Works',
        subtitle: 'Three simple steps to supercharge your workflow',
        steps: [
          { title: 'Connect Your Context', description: 'Link your GitHub repos, set custom instructions, and define your coding conventions.' },
          { title: 'Choose Your Model', description: 'Select from Claude, GPT-4, Gemini, or compare multiple models side-by-side.' },
          { title: 'Transform & Compare', description: 'Get optimized prompts with full context awareness and model comparison.' },
        ],
      },
      features: {
        title: 'Advanced Features for',
        titleHighlight: 'Power Users',
        titleEnd: '',
        subtitle: 'Everything you need to get the most out of AI prompt transformation.',
        cards: [
          { icon: '🔗', title: 'GitHub Integration', description: 'Connect private repos with PAT. Hyokai reads your codebase structure, patterns, and conventions.' },
          { icon: '⚖️', title: 'Model Comparison', description: 'Transform with multiple models at once. See how Claude, GPT-4, and Gemini interpret your prompts.' },
          { icon: '📝', title: 'Custom Instructions', description: 'Save project-specific rules, coding standards, and preferences. Apply them automatically.' },
          { icon: '🧠', title: 'Context Memory', description: 'Save unlimited contexts. Switch between projects instantly. Your setup, always ready.' },
          { icon: '🎯', title: 'Model Selection', description: 'Choose the right model for each task. GPT-4 for creativity, Claude for reasoning, Gemini for speed.' },
          { icon: '📊', title: 'Usage Analytics', description: 'Track your transformations, compare model performance, and optimize your workflow.' },
        ],
      },
      stats: {
        promptsTransformed: 'Prompts Transformed',
        powerUsers: 'Power Users',
        modelsAvailable: 'AI Models',
        satisfaction: 'Satisfaction',
      },
      demo: {
        title: 'See ',
        titleHighlight: 'Advanced Features',
        titleEnd: ' in Action',
        subtitle: 'Experience the power of context-aware prompt transformation',
        rawIdea: 'Your Input',
        hyokaiOutput: 'Hyokai Output',
        status: 'Status',
        clickToTransform: 'Click to transform',
        transforming: 'Transforming...',
        complete: 'Complete!',
        placeholder: 'Click the button to see the magic',
        processing: 'AI-powered transformation',
        tabs: {
          github: 'GitHub Context',
          compare: 'Compare Models',
          context: 'Custom Context',
          select: 'Model Selection',
        },
        panels: {
          github: {
            input: 'Refactor this function to match my project style',
            output: 'Based on your repository analysis:\n\n**Project Patterns Detected:**\n- TypeScript with strict mode\n- Functional components with hooks\n- Custom useAsync pattern for data fetching\n\n**Refactored prompt:**\nRefactor this function following the established patterns in [repo]. Use the useAsync hook pattern from src/hooks/, apply TypeScript strict types, and follow the naming conventions in src/utils/...',
          },
          compare: {
            input: 'Compare how different models handle this prompt',
            output: '**Claude 3.5 Sonnet:**\nAnalytical approach with detailed reasoning chain...\n\n**GPT-4 Turbo:**\nCreative interpretation with broader context...\n\n**Gemini Pro:**\nFast, concise response with key points...\n\n**Recommendation:** Use Claude for complex reasoning, GPT-4 for creative tasks.',
          },
          context: {
            input: 'Apply my saved project rules',
            output: '**Custom Context Applied:**\n\n✓ Coding standards from your saved rules\n✓ Preferred libraries: React, TypeScript, Tailwind\n✓ Naming conventions: camelCase for functions\n✓ Error handling: Always use try-catch with logging\n\nTransformed prompt now includes all your project-specific requirements...',
          },
          select: {
            input: 'Switch to the best model for code review',
            output: '**Model Analysis for Code Review:**\n\n🏆 **Recommended: Claude 3.5 Sonnet**\n- Best for: Detailed code analysis\n- Strength: Catches edge cases\n- Context window: 200k tokens\n\nSwitching model and applying code review optimization...',
          },
        },
      },
      testimonials: {
        title: 'Loved by Developers',
        subtitle: 'See what power users are saying about Hyokai Advanced',
        cards: [
          { text: 'The GitHub integration is game-changing. Hyokai understands my codebase better than I expected.', initials: 'TL', name: 'Tech Lead', role: 'Series B Startup' },
          { text: 'Comparing models side-by-side saves me hours. I finally know which AI works best for each task.', initials: 'SE', name: 'Senior Engineer', role: 'FAANG Company' },
          { text: 'Custom contexts are incredible. I switch between 5 projects daily, each with different rules.', initials: 'FC', name: 'Freelance Consultant', role: 'Multi-client work' },
        ],
      },
      pricing: {
        title: 'Simple, Transparent Pricing',
        subtitle: 'Start with a 3-day free trial. Cancel anytime.',
        perMonth: '/month',
        getStarted: 'Get Started',
        startTrial: 'Start Free Trial',
        currentPlan: 'Current Plan',
        mostPopular: 'Most Popular',
        monthly: 'Monthly',
        annual: 'Annual',
        youSave: 'You save',
        tiers: {
          starter: { name: 'Starter', tier: 'For Getting Started', price: '$9.99', description: 'Essential features for individuals', features: ['150 transformations/month', 'All AI models', 'Coding & General modes', 'History sync', 'Email support'] },
          pro: { name: 'Pro', tier: 'For Power Users', price: '$24.99', description: 'Advanced features for professionals', features: ['500 transformations/month', 'All AI models', 'GitHub context integration', 'Model comparison', 'Custom instructions', 'Priority support'] },
          business: { name: 'Business', tier: 'For Teams', price: '$49.99', description: 'Collaboration features for teams', features: ['1,500 transformations/month', 'Everything in Pro', 'Team workspaces', 'Shared contexts', 'Analytics dashboard', 'Dedicated support'] },
          max: { name: 'Max', tier: 'For Heavy Users', price: '$99.99', description: 'Unlimited power for enterprises', features: ['5,000 transformations/month', 'Everything in Business', 'API access', 'Custom integrations', 'SLA guarantee', 'Early access features'] },
        },
        proTiers: {
          sectionTitle: 'Pro Tier Plans',
          sectionSubtitle: 'Enhanced features with GitHub integration, model comparison, and team collaboration.',
          pro_tier: { name: 'Pro', tier: 'Essential Power', price: '$19.99', description: 'Core pro features for individuals', features: ['150 transformations/month', '3 GitHub repositories', '5 saved contexts', '2 compare slots', 'Priority support'] },
          pro_plus: { name: 'Pro Plus', tier: 'Advanced Power', price: '$49.99', description: 'More capacity for power users', features: ['500 transformations/month', '10 GitHub repositories', '20 saved contexts', '3 compare slots', 'Priority support'] },
          pro_team: { name: 'Pro Team', tier: 'Team Collaboration', price: '$79.99', description: 'Perfect for small teams', features: ['1,500 transformations/month', 'Unlimited GitHub repos', 'Unlimited contexts', '4 compare slots', '5 team seats'] },
          pro_max: { name: 'Pro Max', tier: 'Enterprise Power', price: '$199.99', description: 'Maximum power for enterprises', features: ['5,000 transformations/month', 'Unlimited GitHub repos', 'Unlimited contexts', '4 compare slots', 'Unlimited team seats'] },
        },
      },
      faq: {
        title: 'Frequently Asked Questions',
        subtitle: 'Everything you need to know about Hyokai Advanced',
        items: [
          { question: 'How does GitHub integration work?', answer: 'Connect your repositories using a Personal Access Token (PAT). Hyokai reads your codebase structure, file patterns, and coding conventions to provide context-aware transformations. Your code never leaves your machine — we only analyze structure and patterns.' },
          { question: 'Can I compare multiple AI models?', answer: 'Yes! In comparison mode, you can select 2-4 AI models and see how each one transforms your prompt. This helps you understand which model works best for different types of tasks.' },
          { question: 'What are custom instructions?', answer: 'Custom instructions are persistent rules that apply to all your transformations. You can define coding standards, preferred libraries, naming conventions, and more. Switch between different instruction sets for different projects.' },
          { question: 'How does the 3-day trial work?', answer: 'You get full access to all features for 3 days. Your card is required upfront but won\'t be charged until the trial ends. Cancel anytime before to avoid charges.' },
          { question: 'Can I switch plans anytime?', answer: 'Absolutely! Upgrade or downgrade at any time. When upgrading, you pay the prorated difference. When downgrading, your new rate starts at the next billing cycle.' },
        ],
      },
      cta: {
        title: 'Ready to unlock advanced features?',
        subtitle: 'Start your 3-day free trial. No commitment required.',
        primaryBtn: 'Start Free Trial',
        secondaryBtn: 'Contact Sales',
      },
      footer: {
        ctaTitle: 'Ready to get',
        ctaTitleHighlight: 'started',
        ctaDescription: 'Join thousands of developers using Hyokai Advanced to supercharge their AI workflow.',
        ctaBtn: 'Start Free Trial',
        product: { title: 'Product', howItWorks: 'How It Works', pricing: 'Pricing', examples: 'Examples', openApp: 'Open App' },
        company: { title: 'Company', about: 'About', blog: 'Blog', careers: 'Careers', contact: 'Contact' },
        legal: { title: 'Legal', privacy: 'Privacy', terms: 'Terms', security: 'Security' },
        copyright: '© 2024 Hyokai. All rights reserved.',
        social: { twitter: 'X (Twitter)', github: 'GitHub', discord: 'Discord' },
      },
    },
    ja: {
      nav: {
        features: '機能',
        howItWorks: '使い方',
        pricing: '料金プラン',
        logIn: 'ログイン',
        openApp: 'アプリを開く',
      },
      hero: {
        badge: 'アドバンスド機能',
        headline: 'プロのための、',
        headlineGradient: '本格ツール',
        description: 'マーケター、エンジニア、開発者の方へ。GitHubとの連携、モデル比較、カスタムコンテキストで、AIプロンプトの真の力を引き出しましょう。',
        ctaPrimary: '無料で試す',
        ctaSecondary: '機能を見る',
      },
      carousel: {
        youType: '入力：',
        hyokaiCreates: '出力：',
        slides: [
          { input: 'ClaudeとGPTで比べて', output: 'GitHubの情報を活かして、両モデルを並べて比較...' },
          { input: 'いつものルールで変換して', output: '保存済みのコーディング規約を適用中...' },
          { input: 'うちのコードに合わせて', output: 'リポジトリの構造とパターンを分析中...' },
          { input: 'GPT-4で試して', output: 'GPT-4 Turboに切り替えて変換中...' },
          { input: 'この設定を保存して', output: 'コンテキストを保存しました。次回以降も適用されます...' },
          { input: '社内リポジトリを繋いで', output: 'GitHub PATで認証中。リポジトリを読み込んでいます...' },
        ],
      },
      marquee: {
        usedBy: 'プロフェッショナルに選ばれています',
        users: ['開発者', 'エンジニア', 'テックリード', 'アーキテクト', 'CTO', 'コンサルタント', '研究者', '制作会社'],
      },
      howItWorks: {
        title: 'アドバンスドモードの使い方',
        subtitle: '3ステップで、あなたのワークフローが変わる',
        steps: [
          { title: 'コンテキストを設定', description: 'GitHubリポジトリを接続。カスタム指示やコーディング規約を登録できます。' },
          { title: 'モデルを選ぶ', description: 'Claude、GPT-4、Geminiから選択。複数モデルの同時比較も可能です。' },
          { title: '変換して比較', description: 'コンテキストを理解した最適なプロンプトが生成されます。' },
        ],
      },
      features: {
        title: 'プロ向け',
        titleHighlight: 'アドバンスド',
        titleEnd: '機能',
        subtitle: 'AIプロンプト変換を最大限に活用するための機能を揃えました。',
        cards: [
          { icon: '🔗', title: 'GitHub連携', description: 'Personal Access Tokenでプライベートリポを接続。コードベースの構造やパターンを自動で読み取ります。' },
          { icon: '⚖️', title: 'モデル比較', description: '複数のAIモデルで同時に変換。Claude、GPT-4、Geminiの違いが一目でわかります。' },
          { icon: '📝', title: 'カスタム指示', description: 'プロジェクトごとのルールやコーディング規約を保存。毎回自動で適用されます。' },
          { icon: '🧠', title: 'コンテキスト記憶', description: '複数のコンテキストを保存可能。プロジェクト間の切り替えもワンクリック。' },
          { icon: '🎯', title: 'モデル選択', description: 'タスクに最適なモデルを選択。創造性重視ならGPT-4、論理的思考ならClaude。' },
          { icon: '📊', title: '利用状況', description: '変換履歴を確認。モデルごとのパフォーマンスを比較してワークフローを最適化。' },
        ],
      },
      stats: {
        promptsTransformed: 'プロンプト変換数',
        powerUsers: 'パワーユーザー',
        modelsAvailable: 'AIモデル',
        satisfaction: '満足度',
      },
      demo: {
        title: '',
        titleHighlight: 'アドバンスド機能',
        titleEnd: 'を体験',
        subtitle: 'コンテキストを理解したプロンプト変換の威力をお試しください',
        rawIdea: 'あなたの入力',
        hyokaiOutput: 'Hyokaiの出力',
        status: 'ステータス',
        clickToTransform: 'クリックして変換',
        transforming: '変換中...',
        complete: '完了！',
        placeholder: 'ボタンをクリックしてお試しください',
        processing: 'AI変換中',
        tabs: {
          github: 'GitHub連携',
          compare: 'モデル比較',
          context: 'カスタム設定',
          select: 'モデル選択',
        },
        panels: {
          github: {
            input: 'この関数をうちのプロジェクトスタイルに合わせて',
            output: 'リポジトリ分析の結果：\n\n**検出されたパターン：**\n- TypeScript（strictモード）\n- 関数コンポーネント + Hooks\n- useAsyncパターンでデータ取得\n\n**最適化されたプロンプト：**\nリポジトリのパターンに沿ってリファクタリング...',
          },
          compare: {
            input: '各モデルの違いを見せて',
            output: '**Claude 3.5 Sonnet：**\n論理的で詳細な分析アプローチ...\n\n**GPT-4 Turbo：**\n創造的で幅広い解釈...\n\n**Gemini Pro：**\n高速でポイントを押さえた回答...\n\n**おすすめ：** 複雑な推論にはClaude、クリエイティブな作業にはGPT-4。',
          },
          context: {
            input: '保存したルールを適用して',
            output: '**カスタムコンテキスト適用済み：**\n\n✓ 保存されたコーディング規約\n✓ 使用ライブラリ：React, TypeScript, Tailwind\n✓ 命名規則：関数はcamelCase\n✓ エラー処理：try-catch必須\n\nプロジェクト設定が反映されたプロンプトを生成...',
          },
          select: {
            input: 'コードレビューに最適なモデルは？',
            output: '**コードレビュー向けモデル分析：**\n\n🏆 **おすすめ：Claude 3.5 Sonnet**\n- 用途：詳細なコード分析\n- 強み：エッジケースの検出\n- コンテキスト：200kトークン対応\n\nClaude に切り替えてコードレビューモードを適用中...',
          },
        },
      },
      testimonials: {
        title: 'ユーザーの声',
        subtitle: 'Hyokai Advancedを使っている方々の感想',
        cards: [
          { text: 'GitHub連携が革命的。Hyokaiがうちのコードベースをここまで理解してくれるとは思わなかった。', initials: 'TL', name: 'テックリード', role: 'シリーズBスタートアップ' },
          { text: 'モデル比較で何時間も節約できてる。どのAIがどんなタスクに向いてるか、やっと理解できた。', initials: 'SE', name: 'シニアエンジニア', role: 'FAANG企業' },
          { text: 'カスタムコンテキストが神。毎日5つのプロジェクトを行き来してるけど、設定の切り替えが一瞬。', initials: 'FC', name: 'フリーランス', role: '複数案件対応' },
        ],
      },
      pricing: {
        title: 'シンプルな料金プラン',
        subtitle: '3日間の無料トライアル付き。いつでも解約OK。',
        perMonth: '/月',
        getStarted: '始める',
        startTrial: '無料で試す',
        currentPlan: '現在のプラン',
        mostPopular: '人気No.1',
        monthly: '月払い',
        annual: '年払い',
        youSave: '割引',
        tiers: {
          starter: { name: 'スターター', tier: 'はじめての方に', price: '$9.99', description: '基本機能をすべて利用可能', features: ['月150回の変換', '全AIモデル利用可', 'コーディング・一般モード', '履歴の同期', 'メールサポート'] },
          pro: { name: 'プロ', tier: 'パワーユーザー向け', price: '$24.99', description: 'プロ向けの高度な機能', features: ['月500回の変換', '全AIモデル利用可', 'GitHub連携', 'モデル比較', 'カスタム指示', '優先サポート'] },
          business: { name: 'ビジネス', tier: 'チーム向け', price: '$49.99', description: 'チームでの共同作業に', features: ['月1,500回の変換', 'Proの全機能', 'チームワークスペース', 'コンテキスト共有', '分析ダッシュボード', '専任サポート'] },
          max: { name: 'マックス', tier: 'ヘビーユーザー向け', price: '$99.99', description: '大規模利用・企業向け', features: ['月5,000回の変換', 'Businessの全機能', 'API利用', 'カスタム連携', 'SLA保証', '新機能の先行アクセス'] },
        },
        proTiers: {
          sectionTitle: 'Proティアプラン',
          sectionSubtitle: 'GitHub連携、モデル比較、チーム機能が充実した上位プラン',
          pro_tier: { name: 'プロ', tier: 'エッセンシャル', price: '$19.99', description: '個人向けのコア機能', features: ['月150回の変換', '3つのGitHubリポジトリ', '5つのコンテキスト', '2つの比較スロット', '優先サポート'] },
          pro_plus: { name: 'プロプラス', tier: 'アドバンスド', price: '$49.99', description: 'パワーユーザー向け', features: ['月500回の変換', '10個のGitHubリポジトリ', '20個のコンテキスト', '3つの比較スロット', '優先サポート'] },
          pro_team: { name: 'プロチーム', tier: 'チーム向け', price: '$79.99', description: '小規模チームに最適', features: ['月1,500回の変換', '無制限のGitHubリポジトリ', '無制限のコンテキスト', '4つの比較スロット', '5名分のチームシート'] },
          pro_max: { name: 'プロマックス', tier: 'エンタープライズ', price: '$199.99', description: '大規模利用・企業向け', features: ['月5,000回の変換', '無制限のGitHubリポジトリ', '無制限のコンテキスト', '4つの比較スロット', '無制限のチームシート'] },
        },
      },
      faq: {
        title: 'よくある質問',
        subtitle: 'Hyokai Advancedについて',
        items: [
          { question: 'GitHub連携はどう使うの？', answer: 'Personal Access Token（PAT）を使ってリポジトリを接続します。Hyokaiがコードの構造やファイルパターン、コーディング規約を読み取り、それに基づいた変換を行います。コード自体がサーバーに送られることはありません。構造とパターンのみを分析します。' },
          { question: '複数のAIモデルを比較できる？', answer: 'はい！比較モードでは、2〜4つのモデルを選んで同時に変換結果を見ることができます。どのモデルがどんなタスクに向いているか、一目で比較できます。' },
          { question: 'カスタム指示って何？', answer: 'すべての変換に適用される「あなた専用のルール」です。コーディング規約、よく使うライブラリ、命名規則などを登録しておけます。プロジェクトごとに異なる指示セットを作って、切り替えることも可能です。' },
          { question: '無料トライアルの仕組みは？', answer: '3日間、すべての機能を無料でお試しいただけます。クレジットカードの登録は必要ですが、トライアル期間中に解約すれば課金されません。' },
          { question: 'プラン変更はいつでもできる？', answer: 'もちろんです！アップグレードは即時反映（日割り計算）、ダウングレードは次の請求サイクルから適用されます。' },
        ],
      },
      cta: {
        title: 'アドバンスド機能を使ってみませんか？',
        subtitle: '3日間の無料トライアル。解約はいつでもOK。',
        primaryBtn: '無料で試す',
        secondaryBtn: 'お問い合わせ',
      },
      footer: {
        ctaTitle: '始める準備は',
        ctaTitleHighlight: 'できましたか？',
        ctaDescription: '多くの開発者がHyokai AdvancedでAIワークフローを強化しています。',
        ctaBtn: '無料で始める',
        product: { title: '製品', howItWorks: '使い方', pricing: '料金', examples: '事例', openApp: 'アプリを開く' },
        company: { title: '会社情報', about: '会社概要', blog: 'ブログ', careers: '採用情報', contact: 'お問い合わせ' },
        legal: { title: '法的情報', privacy: 'プライバシー', terms: '利用規約', security: 'セキュリティ' },
        copyright: '© 2024 Hyokai. All rights reserved.',
        social: { twitter: 'X (Twitter)', github: 'GitHub', discord: 'Discord' },
      },
    },
  };
  return translations[lang];
};

export default function Pricing() {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine language from URL path (like Landing.tsx)
  const lang: Language = location.pathname.includes('/pro/ja') ? 'ja' : 'en';
  const t = getProTranslations(lang);

  // Language toggle handler
  const toggleLanguage = () => {
    if (lang === 'en') {
      navigate('/pro/ja');
    } else {
      navigate('/pro');
    }
  };

  const { isAuthenticated } = useAuth();
  const { subscription, hasSubscription, openCheckout, openGuestCheckout, isLoading } = useSubscription();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Carousel state for hero section
  const [activeSlide, setActiveSlide] = useState(0);

  // Demo tabs state
  const [activeTab, setActiveTab] = useState('github');
  const [demoStatus, setDemoStatus] = useState<Record<string, 'idle' | 'transforming' | 'done'>>({
    github: 'idle',
    compare: 'idle',
    context: 'idle',
    select: 'idle',
  });

  // FAQ accordion state
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  // Auto-rotate carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 6);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Handle demo transform button click
  const handleDemoTransform = (tab: string) => {
    if (demoStatus[tab] === 'done') return;
    setDemoStatus(prev => ({ ...prev, [tab]: 'transforming' }));
    setTimeout(() => {
      setDemoStatus(prev => ({ ...prev, [tab]: 'done' }));
    }, 1500);
  };

  // Toggle FAQ
  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  // Pricing helpers
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(cents / 100);
  };

  const getMonthlyEquivalent = (planId: PlanId) => {
    const plan = PLAN_LIMITS[planId];
    if (billingInterval === 'annual') {
      return plan.annualPrice / 12;
    }
    return plan.monthlyPrice;
  };

  const getSavings = (planId: PlanId) => {
    const plan = PLAN_LIMITS[planId];
    const monthlyTotal = plan.monthlyPrice * 12;
    const annualTotal = plan.annualPrice;
    return Math.round(((monthlyTotal - annualTotal) / monthlyTotal) * 100);
  };

  const isCurrentPlan = (planId: PlanId) => {
    return hasSubscription && subscription?.planId === planId;
  };

  const handleSelectPlan = async (planId: PlanId) => {
    setIsRedirecting(true);
    try {
      if (!isAuthenticated) {
        await openGuestCheckout(planId, billingInterval);
      } else {
        await openCheckout(planId, billingInterval);
      }
    } catch (err) {
      toast({
        title: 'Checkout failed',
        description: err instanceof Error ? err.message : 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
      setIsRedirecting(false);
    }
  };

  const getButtonText = (planId: PlanId) => {
    if (isCurrentPlan(planId)) {
      return t.pricing.currentPlan;
    }
    if (hasSubscription) {
      return 'Switch Plan';
    }
    return t.pricing.startTrial;
  };

  return (
    <div className="pro-page">
      {/* Dashed Background Lines — MERIDIAN MOTIF */}
      <div className="page_bg-lines_wrap">
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
        <div className="page_bg-line_col"></div>
      </div>

      {/* Navigation — MERIDIAN PATTERN */}
      <nav className="nav_bar">
        <div className="nav_progressive-blur_wrap">
          <div className="nav_progressive-blur_panel is-1"></div>
          <div className="nav_progressive-blur_panel is-2"></div>
          <div className="nav_progressive-blur_panel is-3"></div>
          <div className="nav_progressive-blur_panel is-4"></div>
          <div className="nav_progressive-blur_panel is-5"></div>
          <div className="nav_progressive-blur_panel is-6"></div>
          <div className="nav_progressive-blur_panel is-7"></div>
          <div className="nav_progressive-blur_panel is-8"></div>
          <div className="nav_progressive-blur_panel is-9"></div>
          <div className="nav_progressive-blur_panel is-10"></div>
        </div>
        <div className="c-container nav_wrap">
          <Link to="/" className="nav_logo">
            <span className="nav_logo_icon">氷</span>
            Hyokai
          </Link>
          <ul className="nav_menu_list">
            <li>
              <a href="#how-it-works" className="nav_menu_link">
                <span className="nav_menu_link_text c-text-4-mono">{t.nav.howItWorks}</span>
              </a>
            </li>
            <li>
              <a href="#features" className="nav_menu_link">
                <span className="nav_menu_link_text c-text-4-mono">{t.nav.features}</span>
              </a>
            </li>
            <li>
              <a href="#pricing" className="nav_menu_link">
                <span className="nav_menu_link_text c-text-4-mono">{t.nav.pricing}</span>
              </a>
            </li>
          </ul>
          <div className="nav_btn_group">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="c-button c-button--ghost nav_lang_toggle"
              aria-label="Switch language"
            >
              <span className="c-button_span">{lang === 'en' ? '日本語' : 'EN'}</span>
            </button>
            <Link to="/app" className="c-button c-button--ghost">
              <span className="c-button_span">{t.nav.logIn}</span>
            </Link>
            <a href="#pricing" className="c-button c-button--brand">
              <div className="c-button_bg"></div>
              <span className="c-button_span">{t.hero.ctaPrimary}</span>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section — MERIDIAN ASYMMETRIC LAYOUT */}
      <section className="home_hero_section">
        <div className="c-container">
          <div className="home_hero_layout">
            {/* Left Column: Content */}
            <div className="home_hero_col">
              <div className="home_hero_badge">
                <span className="home_hero_badge_dot"></span>
                {t.hero.badge}
              </div>

              <h1 className="c-title-0 home_hero_headline c-max-5-col">
                {lang === 'en' ? t.hero.headline : ''}
                <span className="gradient-text">{t.hero.headlineGradient}</span>
                {lang === 'ja' ? 'のために' : ''}
              </h1>

              <p className="c-text-2 home_hero_desc c-max-4-col">
                {t.hero.description}
              </p>

              <div className="g_btn_group">
                <a href="#pricing" className="c-button c-button--brand c-button--lg">
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{t.hero.ctaPrimary}</span>
                </a>
                <a href="#features" className="c-button c-button--light c-button--lg">
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{t.hero.ctaSecondary}</span>
                </a>
              </div>
            </div>

            {/* Right Column: Ice Ball with Floating Modal */}
            <div className="home_hero_col">
              <div className="home_hero_float home_hero_float--1"></div>
              <div className="home_hero_float home_hero_float--2"></div>

              <div className="home_hero_sphere_wrap">
                <div className="home_hero_sphere_ring"></div>
                <div className="home_hero_sphere_ring"></div>
                <div className="home_hero_sphere_ring"></div>
                <div className="home_hero_sphere">
                  {/* Pure ice ball - no grid */}
                  <div className="home_hero_sphere_highlight"></div>
                  <div className="home_hero_sphere_highlight_secondary"></div>
                </div>

                {/* Floating Transform Modal Carousel */}
                <div className="hero_modal_overlay">
                  <div className="hero_modal">
                    <div className="hero_modal_carousel">
                      {t.carousel.slides.map((slide, idx) => (
                        <div key={idx} className={`hero_modal_slide ${activeSlide === idx ? 'active' : ''}`} data-slide={idx}>
                          <div className="hero_modal_input">
                            <div className="hero_modal_label hero_modal_label--user">{t.carousel.youType}</div>
                            <div className="hero_modal_text hero_modal_text--user">{slide.input}</div>
                          </div>
                          <div className="hero_modal_arrow">→</div>
                          <div className="hero_modal_output">
                            <div className="hero_modal_label hero_modal_label--hyokai">{t.carousel.hyokaiCreates}</div>
                            <div className="hero_modal_text hero_modal_text--hyokai">{slide.output}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Carousel Navigation Dots */}
                  <div className="hero_carousel_dots">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <button
                        key={idx}
                        className={`hero_carousel_dot ${activeSlide === idx ? 'active' : ''}`}
                        onClick={() => setActiveSlide(idx)}
                        aria-label={`Example ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Marquee — Trust Logos */}
      <section className="marquee_section">
        <div className="c-container">
          <p className="c-text-4 cc-onsurface-softer marquee_label">{t.marquee.usedBy}</p>
        </div>
        <div className="marquee_wrap">
          <div className="marquee_track">
            {['💻', '⚙️', '🎯', '🏗️', '👔', '🔍', '🔬', '🚀'].map((icon, idx) => (
              <div key={idx} className="marquee_item"><span className="marquee_item_icon">{icon}</span> {t.marquee.users[idx]}</div>
            ))}
            {/* Duplicate for seamless loop */}
            {['💻', '⚙️', '🎯', '🏗️', '👔', '🔍', '🔬', '🚀'].map((icon, idx) => (
              <div key={`dup-${idx}`} className="marquee_item"><span className="marquee_item_icon">{icon}</span> {t.marquee.users[idx]}</div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works — Steps Section */}
      <section id="how-it-works" className="steps_section c-section-padding">
        <div className="c-container">
          <div className="section_header_wrap" style={{ marginBottom: '3rem' }}>
            <div>
              <h2 className="c-title-2">{t.howItWorks.title}</h2>
            </div>
            <div>
              <p className="c-text-3 cc-onsurface-weak">{t.howItWorks.subtitle}</p>
            </div>
          </div>

          <div className="steps_grid">
            {t.howItWorks.steps.map((step, idx) => (
              <div key={idx} className="step_card">
                {idx < 2 && <div className="step_connector"></div>}
                <div className="step_number">{idx + 1}</div>
                <h3 className="c-title-3 step_title">{step.title}</h3>
                <p className="c-text-3 cc-onsurface-weak">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section — MERIDIAN CARDS */}
      <section id="features" className="home_feat_section c-section-padding">
        <div className="c-container">
          <div className="section_header_wrap">
            <div className="c-max-6-col">
              <h2 className="c-title-2">
                {lang === 'ja' ? <><span className="cc-brand">{t.features.titleHighlight}</span>{t.features.title}</> : <>{t.features.title} <span className="cc-brand">{t.features.titleHighlight}</span></>}
              </h2>
            </div>
            <div className="c-max-3-col">
              <p className="c-text-3 cc-onsurface-weak">
                {t.features.subtitle}
              </p>
            </div>
          </div>

          <div className="home_feat_grid">
            {t.features.cards.map((card, idx) => (
              <div key={idx} className="home_feat_card">
                <div className="g_feat_content_bg-ball"></div>
                <div className="home_feat_card_icon">{card.icon}</div>
                <h3 className="c-title-3 home_feat_card_title">{card.title}</h3>
                <p className="c-text-3 cc-onsurface-weak">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats_section c-section-padding">
        <div className="c-container">
          <div className="stats_grid">
            <div className="stat_item">
              <div className="stat_number">50K+</div>
              <div className="stat_label">{t.stats.promptsTransformed}</div>
            </div>
            <div className="stat_item">
              <div className="stat_number">8K+</div>
              <div className="stat_label">{t.stats.powerUsers}</div>
            </div>
            <div className="stat_item">
              <div className="stat_number">12</div>
              <div className="stat_label">{t.stats.modelsAvailable}</div>
            </div>
            <div className="stat_item">
              <div className="stat_number">98%</div>
              <div className="stat_label">{t.stats.satisfaction}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Demo Section — INTERACTIVE TRANSFORMATION SHOWCASE */}
      <section id="demo" className="home_demo_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '2rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>
              {t.demo.title}<span style={{ color: 'var(--brand)' }}>{t.demo.titleHighlight}</span>{t.demo.titleEnd}
            </h2>
            <p className="c-text-2 cc-onsurface-weak c-max-4-col mx-auto">
              {t.demo.subtitle}
            </p>
          </div>

          {/* Interactive Category Tabs */}
          <div className="demo_tabs">
            <button
              className={`demo_tab ${activeTab === 'github' ? 'active' : ''}`}
              onClick={() => setActiveTab('github')}
            >
              <span className="demo_tab_icon">🔗</span>{t.demo.tabs.github}
            </button>
            <button
              className={`demo_tab ${activeTab === 'compare' ? 'active' : ''}`}
              onClick={() => setActiveTab('compare')}
            >
              <span className="demo_tab_icon">⚖️</span>{t.demo.tabs.compare}
            </button>
            <button
              className={`demo_tab ${activeTab === 'context' ? 'active' : ''}`}
              onClick={() => setActiveTab('context')}
            >
              <span className="demo_tab_icon">📝</span>{t.demo.tabs.context}
            </button>
            <button
              className={`demo_tab ${activeTab === 'select' ? 'active' : ''}`}
              onClick={() => setActiveTab('select')}
            >
              <span className="demo_tab_icon">🎯</span>{t.demo.tabs.select}
            </button>
          </div>

          {/* Tab Panels */}
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {(['github', 'compare', 'context', 'select'] as const).map((panelKey) => (
              <div key={panelKey} className={`demo_panel ${activeTab === panelKey ? 'active' : ''}`} data-panel={panelKey} data-status={demoStatus[panelKey]}>
                <div className="demo_three_col">
                  <div className="demo_col">
                    <div className="demo_col_header">{t.demo.rawIdea}</div>
                    <div className="demo_col_body">{t.demo.panels[panelKey].input}</div>
                  </div>
                  <div className="demo_arrow_col">
                    <button className="demo_transform_btn" onClick={() => handleDemoTransform(panelKey)}>
                      <span className="demo_transform_icon">✨</span>
                    </button>
                    <div className="demo_status">
                      <span className="demo_status_label">{t.demo.status}</span>
                      <span className="demo_status_text">
                        {demoStatus[panelKey] === 'idle' && t.demo.clickToTransform}
                        {demoStatus[panelKey] === 'transforming' && t.demo.transforming}
                        {demoStatus[panelKey] === 'done' && t.demo.complete}
                      </span>
                    </div>
                  </div>
                  <div className="demo_col">
                    <div className="demo_col_header demo_col_header--hyokai">{t.demo.hyokaiOutput}</div>
                    <div className="demo_col_body">
                      {demoStatus[panelKey] !== 'done' ? (
                        <div className="demo_output_placeholder">
                          <div className="demo_placeholder_icon">🔮</div>
                          <div className="demo_placeholder_text">{t.demo.placeholder}</div>
                        </div>
                      ) : (
                        <div className="demo_output_result" style={{ whiteSpace: 'pre-wrap' }}>{t.demo.panels[panelKey].output}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar — Barberpole Animation */}
          <div style={{ maxWidth: '400px', margin: '3rem auto 0' }}>
            <div className="progress_bar"></div>
            <p className="c-text-4-mono cc-onsurface-weak text-center" style={{ marginTop: '0.75rem' }}>
              {t.demo.processing}
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>{t.testimonials.title}</h2>
            <p className="c-text-2 cc-onsurface-weak">{t.testimonials.subtitle}</p>
          </div>

          <div className="testimonials_grid">
            {t.testimonials.cards.map((card, idx) => (
              <div key={idx} className="testimonial_card">
                <div className="testimonial_stars">★★★★★</div>
                <p className="testimonial_text c-text-3">{card.text}</p>
                <div className="testimonial_author">
                  <div className="testimonial_avatar">{card.initials}</div>
                  <div>
                    <div className="testimonial_name">{card.name}</div>
                    <div className="testimonial_role">{card.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section — Pro Tiers Only */}
      <section id="pricing" className="pricing_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '2rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>{t.pricing.title}</h2>
            <p className="c-text-2 cc-onsurface-weak">{t.pricing.subtitle}</p>
          </div>

          {/* Billing Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div className="billing_toggle">
              <button
                className={`billing_option ${billingInterval === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingInterval('monthly')}
              >
                {t.pricing.monthly}
              </button>
              <button
                className={`billing_option ${billingInterval === 'annual' ? 'active' : ''}`}
                onClick={() => setBillingInterval('annual')}
              >
                {t.pricing.annual}
                <span className="billing_badge">-17%</span>
              </button>
            </div>
          </div>

          {/* Pro Tiers Grid — Main pricing for /pro page */}
          <div className="pricing_grid">
              {/* Pro Tier */}
              <div className={`pricing_card pricing_card--pro-tier ${isCurrentPlan('pro_tier') ? 'pricing_card--current' : ''}`}>
                <div className="pricing_name">{t.pricing.proTiers.pro_tier.name}</div>
                <div className="pricing_tier">{t.pricing.proTiers.pro_tier.tier}</div>
                <div className="pricing_price">
                  <span className="pricing_amount">{formatPrice(getMonthlyEquivalent('pro_tier'))}</span>
                  <span className="pricing_period">{t.pricing.perMonth}</span>
                </div>
                {billingInterval === 'annual' && (
                  <p className="pricing_savings">{t.pricing.youSave} {getSavings('pro_tier')}%</p>
                )}
                <p className="pricing_desc">{t.pricing.proTiers.pro_tier.description}</p>
                <ul className="pricing_features">
                  {t.pricing.proTiers.pro_tier.features.map((feature, idx) => (
                    <li key={idx} className="pricing_feature">
                      <span className="pricing_feature_check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan('pro_tier')}
                  disabled={isCurrentPlan('pro_tier') || isLoading || isRedirecting}
                  className="c-button c-button--ghost pricing_cta"
                  style={{ borderColor: 'rgba(201, 59, 193, 0.3)', color: '#c93bc1' }}
                >
                  {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span className="c-button_span">{getButtonText('pro_tier')}</span>
                </button>
              </div>

              {/* Pro Plus (Featured) */}
              <div className={`pricing_card pricing_card--featured pricing_card--pro-plus ${isCurrentPlan('pro_plus') ? 'pricing_card--current' : ''}`}>
                <div className="pricing_badge" style={{ background: 'linear-gradient(135deg, #c93bc1 0%, #8b5cf6 100%)' }}>{t.pricing.mostPopular}</div>
                <div className="pricing_name">{t.pricing.proTiers.pro_plus.name}</div>
                <div className="pricing_tier">{t.pricing.proTiers.pro_plus.tier}</div>
                <div className="pricing_price">
                  <span className="pricing_amount">{formatPrice(getMonthlyEquivalent('pro_plus'))}</span>
                  <span className="pricing_period">{t.pricing.perMonth}</span>
                </div>
                {billingInterval === 'annual' && (
                  <p className="pricing_savings">{t.pricing.youSave} {getSavings('pro_plus')}%</p>
                )}
                <p className="pricing_desc">{t.pricing.proTiers.pro_plus.description}</p>
                <ul className="pricing_features">
                  {t.pricing.proTiers.pro_plus.features.map((feature, idx) => (
                    <li key={idx} className="pricing_feature">
                      <span className="pricing_feature_check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan('pro_plus')}
                  disabled={isCurrentPlan('pro_plus') || isLoading || isRedirecting}
                  className="c-button c-button--brand pricing_cta"
                  style={{ background: 'linear-gradient(135deg, #c93bc1 0%, #8b5cf6 100%)' }}
                >
                  {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{getButtonText('pro_plus')}</span>
                </button>
              </div>

              {/* Pro Team */}
              <div className={`pricing_card pricing_card--pro-team ${isCurrentPlan('pro_team') ? 'pricing_card--current' : ''}`}>
                <div className="pricing_name">{t.pricing.proTiers.pro_team.name}</div>
                <div className="pricing_tier">{t.pricing.proTiers.pro_team.tier}</div>
                <div className="pricing_price">
                  <span className="pricing_amount">{formatPrice(getMonthlyEquivalent('pro_team'))}</span>
                  <span className="pricing_period">{t.pricing.perMonth}</span>
                </div>
                {billingInterval === 'annual' && (
                  <p className="pricing_savings">{t.pricing.youSave} {getSavings('pro_team')}%</p>
                )}
                <p className="pricing_desc">{t.pricing.proTiers.pro_team.description}</p>
                <ul className="pricing_features">
                  {t.pricing.proTiers.pro_team.features.map((feature, idx) => (
                    <li key={idx} className="pricing_feature">
                      <span className="pricing_feature_check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan('pro_team')}
                  disabled={isCurrentPlan('pro_team') || isLoading || isRedirecting}
                  className="c-button c-button--ghost pricing_cta"
                  style={{ borderColor: 'rgba(201, 59, 193, 0.3)', color: '#c93bc1' }}
                >
                  {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span className="c-button_span">{getButtonText('pro_team')}</span>
                </button>
              </div>

              {/* Pro Max */}
              <div className={`pricing_card pricing_card--pro-max ${isCurrentPlan('pro_max') ? 'pricing_card--current' : ''}`}>
                <div className="pricing_name">{t.pricing.proTiers.pro_max.name}</div>
                <div className="pricing_tier">{t.pricing.proTiers.pro_max.tier}</div>
                <div className="pricing_price">
                  <span className="pricing_amount">{formatPrice(getMonthlyEquivalent('pro_max'))}</span>
                  <span className="pricing_period">{t.pricing.perMonth}</span>
                </div>
                {billingInterval === 'annual' && (
                  <p className="pricing_savings">{t.pricing.youSave} {getSavings('pro_max')}%</p>
                )}
                <p className="pricing_desc">{t.pricing.proTiers.pro_max.description}</p>
                <ul className="pricing_features">
                  {t.pricing.proTiers.pro_max.features.map((feature, idx) => (
                    <li key={idx} className="pricing_feature">
                      <span className="pricing_feature_check">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan('pro_max')}
                  disabled={isCurrentPlan('pro_max') || isLoading || isRedirecting}
                  className="c-button c-button--ghost pricing_cta"
                  style={{ borderColor: 'rgba(201, 59, 193, 0.3)', color: '#c93bc1' }}
                >
                  {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span className="c-button_span">{getButtonText('pro_max')}</span>
                </button>
              </div>
            </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq_section c-section-padding">
        <div className="c-container">
          <div className="text-center" style={{ marginBottom: '3rem' }}>
            <h2 className="c-title-2" style={{ marginBottom: '0.75rem' }}>{t.faq.title}</h2>
            <p className="c-text-2 cc-onsurface-weak">{t.faq.subtitle}</p>
          </div>

          <div className="faq_grid">
            {t.faq.items.map((item, idx) => (
              <div key={idx} className={`faq_item ${openFAQ === idx ? 'is-open' : ''}`}>
                <button className="faq_question" onClick={() => toggleFAQ(idx)}>
                  {item.question}
                  <span className="faq_icon">+</span>
                </button>
                <div className="faq_answer">
                  <div className="faq_answer_inner">
                    <p className="faq_answer_text">{item.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="cta_section">
        <div className="c-container">
          <div className="cta_content">
            <h2 className="c-title-1 cta_title c-max-5-col mx-auto">{t.cta.title}</h2>
            <p className="c-text-1 cta_desc c-max-4-col mx-auto">{t.cta.subtitle}</p>
            <div className="cta_buttons">
              <button
                onClick={() => handleSelectPlan('pro_plus')}
                disabled={isLoading || isRedirecting}
                className="c-button c-button--white c-button--lg"
              >
                {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
                <div className="c-button_bg"></div>
                <span className="c-button_span">{t.cta.primaryBtn}</span>
              </button>
              <a href="mailto:hello@hyokai.ai" className="c-button c-button--outline-white c-button--lg">
                <span className="c-button_span">{t.cta.secondaryBtn}</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer — MERIDIAN PATTERN WITH GLOBE */}
      <footer className="footer_wrap">
        <div className="c-container">
          <div className="footer_top_wrap">
            <div className="footer_cta">
              <h2 className="c-title-2 footer_cta_title c-max-4-col">
                {t.footer.ctaTitle} <span>{t.footer.ctaTitleHighlight}</span>?
              </h2>
              <p className="c-text-3 footer_cta_desc c-max-3-col">
                {t.footer.ctaDescription}
              </p>
              <div className="g_btn_group">
                <button
                  onClick={() => handleSelectPlan('pro_plus')}
                  disabled={isLoading || isRedirecting}
                  className="c-button c-button--brand"
                >
                  {isRedirecting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <div className="c-button_bg"></div>
                  <span className="c-button_span">{t.footer.ctaBtn}</span>
                </button>
              </div>
            </div>

            <div className="footer_sitemap">
              <div className="footer_sitemap_col">
                <h4>{t.footer.product.title}</h4>
                <ul className="footer_sitemap_list">
                  <li><a href="#how-it-works" className="footer_sitemap_link">{t.footer.product.howItWorks}</a></li>
                  <li><a href="#pricing" className="footer_sitemap_link">{t.footer.product.pricing}</a></li>
                  <li><a href="#demo" className="footer_sitemap_link">{t.footer.product.examples}</a></li>
                  <li><Link to="/app" className="footer_sitemap_link">{t.footer.product.openApp}</Link></li>
                </ul>
              </div>
              <div className="footer_sitemap_col">
                <h4>{t.footer.company.title}</h4>
                <ul className="footer_sitemap_list">
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.company.about}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.company.blog}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.company.careers}</span></li>
                  <li><a href="mailto:hello@hyokai.ai" className="footer_sitemap_link">{t.footer.company.contact}</a></li>
                </ul>
              </div>
              <div className="footer_sitemap_col">
                <h4>{t.footer.legal.title}</h4>
                <ul className="footer_sitemap_list">
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.legal.privacy}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.legal.terms}</span></li>
                  <li><span className="footer_sitemap_link footer_sitemap_link--disabled">{t.footer.legal.security}</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pure Ice Globe - no grid */}
          <div className="footer_globe_wrap">
            <div className="footer_globe"></div>
            <div className="footer_globe_highlight"></div>
          </div>

          <div className="footer_bottom">
            <span>{t.footer.copyright}</span>
            <div className="footer_social">
              <a href="https://x.com/hyokai_ai" target="_blank" rel="noopener noreferrer" className="footer_social_link">{t.footer.social.twitter}</a>
              <a href="https://github.com/hyokai" target="_blank" rel="noopener noreferrer" className="footer_social_link">{t.footer.social.github}</a>
              <span className="footer_social_link footer_social_link--disabled">{t.footer.social.discord}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
