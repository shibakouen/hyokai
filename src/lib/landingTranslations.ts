// Landing page translations
// Japanese translations maintain native writing style from original lander

export const landingTranslations = {
  en: {
    nav: {
      howItWorks: 'How it works',
      features: 'Features',
      pricing: 'Pricing',
      logIn: 'Log in',
      getStarted: 'Get Started',
    },
    hero: {
      badge: 'Your Personal AI Translator',
      headline: 'Talk to AI like a friend.',
      headlineGradient: 'Get results like a pro.',
      description: 'You don\'t need to learn "tech speak" to use tools like ChatGPT. Just tell Hyokai what you want in plain English, and we\'ll translate it into the perfect instructions.',
      ctaPrimary: 'Start Free Trial →',
      ctaSecondary: 'See Demo',
    },
    carousel: {
      youType: 'You type',
      hyokaiCreates: 'Hyokai creates',
      slides: [
        {
          input: '"I have chicken and rice, what can I make?"',
          output: 'Act as a home chef. Suggest 3 easy recipes using chicken and rice. Include cook time, difficulty, and serving tips.',
        },
        {
          input: '"help me plan a trip to Japan"',
          output: 'Act as a Japan travel expert. Plan a 10-day itinerary with must-see spots, budget tips, and local recommendations.',
        },
        {
          input: '"I want to ask my boss for a raise"',
          output: 'Act as a career coach. Help me write a professional email requesting a raise, highlighting my achievements.',
        },
        {
          input: '"make my resume better"',
          output: 'Act as a recruiter. Review my resume and suggest improvements for impact, formatting, and keywords.',
        },
        {
          input: '"write a bedtime story for my kid"',
          output: 'Act as a children\'s author. Write a calming 5-minute bedtime story with a gentle lesson and happy ending.',
        },
        {
          input: '"write a thank you email to my interviewer"',
          output: 'Act as a communication expert. Draft a professional thank-you email that stands out and reinforces interest.',
        },
      ],
    },
    marquee: {
      trustedBy: 'Trusted by thousands of happy users',
      users: ['Writers', 'Marketers', 'Designers', 'Entrepreneurs', 'Students', 'Researchers', 'Developers', 'Content Creators'],
    },
    howItWorks: {
      title: 'How it works',
      subtitle: 'Three simple steps to transform your ideas into perfect AI prompts.',
      steps: [
        {
          title: 'Type naturally',
          description: 'Just describe what you want in your own words. No special format needed.',
        },
        {
          title: 'We optimize',
          description: 'Hyokai adds context, structure, and details that AI tools understand best.',
        },
        {
          title: 'Get results',
          description: 'Paste the optimized prompt and watch your AI deliver exactly what you wanted.',
        },
      ],
    },
    features: {
      title: 'It\'s like a',
      titleHighlight: 'helpful translator',
      titleEnd: 'for your biggest ideas.',
      subtitle: 'Hyokai transforms your casual thoughts into powerful AI instructions. No learning curve required.',
      cards: [
        {
          icon: '💬',
          title: 'Just Be Yourself',
          description: 'Type exactly how you think. No need to use special commands or robot language.',
        },
        {
          icon: '✨',
          title: 'We Fill in the Blanks',
          description: 'Forgot to say "make it short"? Hyokai adds the important details you missed.',
        },
        {
          icon: '🎯',
          title: 'Better Results',
          description: 'Get responses that actually help. No more "that\'s not what I meant" moments.',
        },
      ],
    },
    stats: {
      promptsTransformed: 'Prompts Transformed',
      happyUsers: 'Happy Users',
      betterResults: 'Better AI Results',
      userRating: 'User Rating',
    },
    demo: {
      title: 'See the',
      titleHighlight: 'magic',
      titleEnd: 'happen',
      subtitle: 'Click a category to see how Hyokai transforms casual requests into powerful prompts.',
      tabs: {
        recipes: 'Find Recipes',
        trip: 'Plan a Trip',
        raise: 'Ask for a Raise',
        email: 'Write an Email',
      },
      rawIdea: '💭 Raw Idea',
      hyokaiOutput: '✨ Hyokai Output',
      status: 'Status',
      clickToTransform: 'Click to transform',
      transforming: 'Transforming...',
      complete: 'Complete!',
      placeholder: 'Click the button to see the magic',
      panels: {
        recipes: {
          input: '"I have chicken and rice. What can I make?"',
          output: 'Act as an experienced home chef. I have chicken and rice as my main ingredients. Provide 5 recipe ideas that: (1) require minimal additional ingredients, (2) take under 30 minutes, (3) include calorie estimates. Format each recipe with ingredients list, steps, and difficulty level.',
        },
        trip: {
          input: '"plan me a weekend getaway somewhere warm"',
          output: 'Act as a travel planning expert. Create a weekend getaway itinerary for a warm destination. Include: (1) 3 destination options with weather info, (2) suggested activities for 2 full days, (3) accommodation recommendations for different budgets, (4) estimated costs breakdown, (5) packing checklist. Consider accessibility from major US cities.',
        },
        raise: {
          input: '"help me ask my boss for a raise"',
          output: 'Act as a career negotiation coach. Help me prepare to ask for a salary raise. Provide: (1) research framework for market salary data, (2) list of accomplishments to highlight, (3) talking points script, (4) responses to common objections, (5) timing and setting recommendations. Use a confident but professional tone.',
        },
        email: {
          input: '"write an email to reschedule a meeting"',
          output: 'Act as a professional communication expert. Draft an email to reschedule a business meeting. Include: (1) polite apology for the change, (2) brief reason (without over-explaining), (3) 2-3 alternative time slots, (4) easy way to confirm. Keep it concise, professional, and under 100 words. End with a friendly closing.',
        },
      },
      processing: 'Processing your ideas...',
    },
    testimonials: {
      title: 'Loved by thousands',
      subtitle: 'See what our users are saying about Hyokai.',
      cards: [
        {
          text: '"I used to spend 10 minutes crafting prompts. Now I just type what I need and Hyokai does the rest. Game changer!"',
          name: 'Sarah K.',
          role: 'Marketing Manager',
          initials: 'SK',
        },
        {
          text: '"Finally, AI tools make sense to me. I don\'t have to think like a programmer anymore. Hyokai translates for me."',
          name: 'James M.',
          role: 'Small Business Owner',
          initials: 'JM',
        },
        {
          text: '"My ChatGPT results went from \'meh\' to \'wow\' overnight. The difference in output quality is incredible."',
          name: 'Lisa T.',
          role: 'Content Creator',
          initials: 'LT',
        },
      ],
    },
    pricing: {
      title: 'Simple, transparent pricing',
      subtitle: 'Start free. Upgrade when you need more.',
      perMonth: '/month',
      getStarted: 'Get Started',
      startTrial: 'Start Free Trial',
      mostPopular: 'Most Popular',
      tiers: {
        starter: {
          name: 'Starter',
          tier: 'For Getting Started',
          price: '$9.99',
          description: 'Perfect for trying things out',
          features: [
            '150 transformations/mo',
            'All AI models',
            'Coding & General modes',
            'History sync',
            'Email support',
          ],
        },
        pro: {
          name: 'Pro',
          tier: 'For Power Users',
          price: '$24.99',
          description: 'For power users who want more',
          features: [
            '500 transformations/mo',
            'All AI models',
            'GitHub context integration',
            'History sync',
            'Priority support',
          ],
        },
        business: {
          name: 'Business',
          tier: 'For Teams',
          price: '$49.99',
          description: 'For teams and professionals',
          features: [
            '1,500 transformations/mo',
            'All AI models',
            'GitHub context integration',
            'Custom instructions',
            'Priority support',
          ],
        },
        max: {
          name: 'Max',
          tier: 'For Heavy Users',
          price: '$99.99',
          description: 'Maximum power, maximum value',
          features: [
            '5,000 transformations/mo',
            'All AI models',
            'Custom instructions',
            'Dedicated support',
            'Early access to new features',
          ],
        },
      },
    },
    faq: {
      title: 'Frequently asked questions',
      subtitle: 'Everything you need to know about Hyokai.',
      items: [
        {
          question: 'What is Hyokai and how does it work?',
          answer: 'Hyokai is an AI prompt translator that converts your natural language into optimized prompts for AI tools like ChatGPT, Claude, and others. Simply type what you want in plain English, and Hyokai adds the context, structure, and details that AI tools need to give you better results.',
        },
        {
          question: 'Do I need technical knowledge to use Hyokai?',
          answer: 'Not at all! Hyokai is designed specifically for non-technical users. If you can text a friend or write an email, you can use Hyokai. No special commands, formatting, or "prompt engineering" knowledge required.',
        },
        {
          question: 'Which AI tools does Hyokai work with?',
          answer: 'Hyokai works with all major AI assistants including ChatGPT, Claude, Gemini, and more. The optimized prompts we generate are designed to work universally across different AI platforms.',
        },
        {
          question: 'Is there a free trial available?',
          answer: 'Yes! We offer a 3-day free trial with full access to all features. No credit card required to start. You can explore everything Hyokai has to offer before deciding on a plan.',
        },
        {
          question: 'Can I cancel my subscription anytime?',
          answer: 'Absolutely. You can cancel your subscription at any time with no questions asked. Your access continues until the end of your billing period, and we won\'t charge you again.',
        },
      ],
    },
    proPromo: {
      badge: 'For Power Users',
      title: 'Need GitHub integration & model comparison?',
      subtitle: 'Connect your repos, compare AI models side-by-side, and save custom contexts. Built for developers, engineers, and power users.',
      features: ['GitHub Context', 'Model Comparison', 'Custom Instructions', 'Team Workspaces'],
      cta: 'Explore Pro Features →',
    },
    cta: {
      title: 'Ready to unlock the full power of AI?',
      subtitle: 'Join thousands of users who are getting better AI results with less effort.',
      primaryBtn: 'Start Free Trial →',
      secondaryBtn: 'Contact Sales',
    },
    footer: {
      ctaTitle: 'Ready to speak',
      ctaTitleHighlight: 'AI fluently',
      ctaDescription: 'Transform your ideas into powerful AI prompts. No technical skills required.',
      ctaBtn: 'Get Started Free →',
      product: {
        title: 'Product',
        howItWorks: 'How it Works',
        pricing: 'Pricing',
        examples: 'Examples',
        openApp: 'Open App',
      },
      company: {
        title: 'Company',
        about: 'About',
        blog: 'Blog',
        careers: 'Careers',
        contact: 'Contact',
      },
      legal: {
        title: 'Legal',
        privacy: 'Privacy',
        terms: 'Terms',
        security: 'Security',
      },
      copyright: '© 2024 Hyokai. All rights reserved.',
      social: {
        twitter: 'Twitter',
        github: 'GitHub',
        discord: 'Discord',
      },
    },
  },
  ja: {
    nav: {
      howItWorks: '仕組み',
      features: '特徴',
      pricing: '料金プラン',
      logIn: 'ログイン',
      getStarted: '始める',
    },
    hero: {
      badge: 'あなたの専属AI通訳',
      headline: 'AIと、もっと自由に話そう。',
      headlineGradient: 'プロ並みの結果を、その手に。',
      description: '「プロンプトエンジニアリング」のような専門用語を覚える必要はありません。普通の言葉でHyokaiに伝えるだけで、AIが完璧に理解できる指示書に翻訳します。',
      ctaPrimary: '無料で試す →',
      ctaSecondary: 'デモを見る',
    },
    carousel: {
      youType: '入力',
      hyokaiCreates: 'Hyokaiが作成',
      slides: [
        {
          input: '「冷蔵庫に鶏肉とご飯がある。何か作れる？」',
          output: '家庭料理のシェフとして。鶏肉とご飯を使った簡単レシピを3つ提案してください。調理時間、難易度、盛り付けのコツを含めてください。',
        },
        {
          input: '「日本旅行の計画を手伝って」',
          output: '日本旅行の専門家として。10日間の旅程を作成してください。必見スポット、予算のコツ、地元のおすすめを含めてください。',
        },
        {
          input: '「上司に昇給をお願いしたい」',
          output: 'キャリアコーチとして。私の実績を強調した、昇給をお願いするプロフェッショナルなメールを書く手伝いをしてください。',
        },
        {
          input: '「履歴書をもっと良くして」',
          output: '採用担当者として。私の履歴書をレビューし、インパクト、フォーマット、キーワードの改善点を提案してください。',
        },
        {
          input: '「子供に読み聞かせる物語を書いて」',
          output: '児童作家として。やさしい教訓とハッピーエンドのある、5分程度の落ち着いた寝かしつけ用のお話を書いてください。',
        },
        {
          input: '「面接官にお礼のメールを書いて」',
          output: 'コミュニケーションの専門家として。印象に残り、関心を再確認させるプロフェッショナルなお礼メールを作成してください。',
        },
      ],
    },
    marquee: {
      trustedBy: '多くのユーザーにご愛用いただいています',
      users: ['ライター', 'マーケター', 'デザイナー', '起業家', '学生', '研究者', '開発者', 'クリエイター'],
    },
    howItWorks: {
      title: '使い方',
      subtitle: '3つの簡単なステップで、あなたのアイデアを完璧なAIプロンプトに変換します。',
      steps: [
        {
          title: '自然に入力',
          description: '自分の言葉でやりたいことを書くだけ。特別な形式は不要です。',
        },
        {
          title: 'Hyokaiが最適化',
          description: 'AIツールが最もよく理解できるように、文脈、構造、詳細を追加します。',
        },
        {
          title: '結果を得る',
          description: '最適化されたプロンプトを貼り付けるだけで、AIがあなたの望む結果を出してくれます。',
        },
      ],
    },
    features: {
      title: 'あなたの大きなアイデアのための',
      titleHighlight: '頼れる通訳',
      titleEnd: 'です。',
      subtitle: 'Hyokaiは、あなたの何気ない思いつきを、強力なAI指示書に変換します。学習曲線は必要ありません。',
      cards: [
        {
          icon: '💬',
          title: 'ありのままで',
          description: '思ったとおりに入力するだけ。特別なコマンドやロボット語は必要ありません。',
        },
        {
          icon: '✨',
          title: '足りない部分を補完',
          description: '「短くして」と言い忘れた？Hyokaiが重要な詳細を補います。',
        },
        {
          icon: '🎯',
          title: 'より良い結果',
          description: '本当に役立つ回答を得られます。「そうじゃない」というストレスはもうありません。',
        },
      ],
    },
    stats: {
      promptsTransformed: '変換されたプロンプト',
      happyUsers: 'ユーザー数',
      betterResults: 'AI結果の向上',
      userRating: 'ユーザー評価',
    },
    demo: {
      title: '',
      titleHighlight: '魔法',
      titleEnd: 'を見てみましょう',
      subtitle: 'カテゴリをクリックして、Hyokaiがカジュアルなリクエストをどう変換するか見てください。',
      tabs: {
        recipes: 'レシピを探す',
        trip: '旅行を計画',
        raise: '昇給を交渉',
        email: 'メールを書く',
      },
      rawIdea: '💭 元のアイデア',
      hyokaiOutput: '✨ Hyokaiの出力',
      status: 'ステータス',
      clickToTransform: 'クリックして変換',
      transforming: '変換中...',
      complete: '完了！',
      placeholder: 'ボタンをクリックして魔法を見る',
      panels: {
        recipes: {
          input: '「鶏肉とご飯がある。何作れる？」',
          output: '経験豊富な家庭料理のシェフとして行動してください。鶏肉とご飯を主な材料として、5つのレシピアイデアを提供してください：(1) 追加材料が最小限、(2) 30分以内で調理可能、(3) カロリー推定を含む。各レシピには材料リスト、手順、難易度を記載してください。',
        },
        trip: {
          input: '「暖かいところで週末旅行を計画して」',
          output: '旅行計画の専門家として行動してください。暖かい目的地への週末旅行プランを作成してください。含めるもの：(1) 天気情報付きの3つの目的地オプション、(2) 2日間のアクティビティ提案、(3) 予算別の宿泊施設、(4) 費用の内訳、(5) 持ち物チェックリスト。',
        },
        raise: {
          input: '「上司に昇給をお願いする手伝いをして」',
          output: 'キャリア交渉コーチとして行動してください。昇給を依頼する準備を手伝ってください。提供するもの：(1) 市場給与データのリサーチ方法、(2) アピールすべき実績リスト、(3) 会話のスクリプト、(4) よくある反論への対応、(5) タイミングと場所の提案。自信を持ちつつプロフェッショナルなトーンで。',
        },
        email: {
          input: '「会議の日程変更メールを書いて」',
          output: 'プロのコミュニケーション専門家として行動してください。ビジネスミーティングの日程変更メールを作成してください。含めるもの：(1) 変更への丁寧なお詫び、(2) 簡潔な理由（詳しすぎない）、(3) 2-3の代替日時、(4) 確認しやすい方法。簡潔でプロフェッショナルに、100語以内で。友好的な締めくくりで。',
        },
      },
      processing: 'アイデアを処理中...',
    },
    testimonials: {
      title: '多くのユーザーに愛されています',
      subtitle: 'Hyokaiについてのユーザーの声をご覧ください。',
      cards: [
        {
          text: '「以前はプロンプト作成に10分かけていました。今は必要なことを入力するだけ。Hyokaiが残りをやってくれます。革命的です！」',
          name: '佐藤 花子',
          role: 'マーケティングマネージャー',
          initials: '佐',
        },
        {
          text: '「やっとAIツールが理解できるようになりました。もうプログラマーのように考える必要はありません。Hyokaiが翻訳してくれます。」',
          name: '田中 太郎',
          role: '中小企業オーナー',
          initials: '田',
        },
        {
          text: '「ChatGPTの結果が一晩で「まあまあ」から「すごい」に変わりました。出力品質の差は驚くべきものです。」',
          name: '山田 美咲',
          role: 'コンテンツクリエイター',
          initials: '山',
        },
      ],
    },
    pricing: {
      title: 'シンプルで透明な料金',
      subtitle: '無料で始めて、必要に応じてアップグレード。',
      perMonth: '/月',
      getStarted: '始める',
      startTrial: '無料トライアル',
      mostPopular: '人気No.1',
      tiers: {
        starter: {
          name: 'スターター',
          tier: '入門者向け',
          price: '$9.99',
          description: 'まずは試してみたい方に',
          features: [
            '月150回の変換',
            'すべてのAIモデル',
            'コーディング＆一般モード',
            '履歴同期',
            'メールサポート',
          ],
        },
        pro: {
          name: 'プロ',
          tier: 'パワーユーザー向け',
          price: '$24.99',
          description: 'もっと活用したい方に',
          features: [
            '月500回の変換',
            'すべてのAIモデル',
            'GitHub連携',
            '履歴同期',
            '優先サポート',
          ],
        },
        business: {
          name: 'ビジネス',
          tier: 'チーム向け',
          price: '$49.99',
          description: 'チームやプロフェッショナル向け',
          features: [
            '月1,500回の変換',
            'すべてのAIモデル',
            'GitHub連携',
            'カスタム指示',
            '優先サポート',
          ],
        },
        max: {
          name: 'マックス',
          tier: 'ヘビーユーザー向け',
          price: '$99.99',
          description: '最大のパワー、最大の価値',
          features: [
            '月5,000回の変換',
            'すべてのAIモデル',
            'カスタム指示',
            '専用サポート',
            '新機能への早期アクセス',
          ],
        },
      },
    },
    faq: {
      title: 'よくある質問',
      subtitle: 'Hyokaiについて知っておくべきことすべて。',
      items: [
        {
          question: 'Hyokaiとは何ですか？どのように動作しますか？',
          answer: 'HyokaiはAIプロンプト翻訳ツールです。あなたの自然な言葉を、ChatGPT、Claude、その他のAIツール用に最適化されたプロンプトに変換します。普通の日本語でやりたいことを入力するだけで、HyokaiがAIツールがより良い結果を出すために必要な文脈、構造、詳細を追加します。',
        },
        {
          question: 'Hyokaiを使うのに技術的な知識は必要ですか？',
          answer: '全く必要ありません！Hyokaiは非技術者のために特別に設計されています。友達にLINEを送ったり、メールを書いたりできるなら、Hyokaiを使えます。特別なコマンド、フォーマット、「プロンプトエンジニアリング」の知識は不要です。',
        },
        {
          question: 'HyokaiはどのAIツールと連携しますか？',
          answer: 'HyokaiはChatGPT、Claude、Geminiなど、すべての主要なAIアシスタントと連携します。生成される最適化されたプロンプトは、異なるAIプラットフォーム間で普遍的に動作するように設計されています。',
        },
        {
          question: '無料トライアルはありますか？',
          answer: 'はい！すべての機能にフルアクセスできる3日間の無料トライアルをご用意しています。開始にクレジットカードは不要です。プランを決める前に、Hyokaiが提供するすべてをお試しいただけます。',
        },
        {
          question: 'いつでもサブスクリプションをキャンセルできますか？',
          answer: 'もちろんです。いつでも理由を問わずサブスクリプションをキャンセルできます。請求期間の終わりまでアクセスは継続し、再度請求されることはありません。',
        },
      ],
    },
    proPromo: {
      badge: 'パワーユーザー向け',
      title: 'GitHub連携やモデル比較が必要ですか？',
      subtitle: 'リポジトリを接続し、AIモデルを並べて比較し、カスタムコンテキストを保存。開発者、エンジニア、パワーユーザーのために設計されています。',
      features: ['GitHubコンテキスト', 'モデル比較', 'カスタム指示', 'チームワークスペース'],
      cta: 'Pro機能を見る →',
    },
    cta: {
      title: 'AIの全力を引き出す準備はできましたか？',
      subtitle: '少ない労力でより良いAI結果を得ている何千ものユーザーに参加しましょう。',
      primaryBtn: '無料トライアル →',
      secondaryBtn: 'お問い合わせ',
    },
    footer: {
      ctaTitle: 'AIと流暢に',
      ctaTitleHighlight: '会話',
      ctaDescription: 'あなたのアイデアを強力なAIプロンプトに変換。技術スキルは不要です。',
      ctaBtn: '無料で始める →',
      product: {
        title: '製品',
        howItWorks: '使い方',
        pricing: '料金',
        examples: '使用例',
        openApp: 'アプリを開く',
      },
      company: {
        title: '会社',
        about: '会社概要',
        blog: 'ブログ',
        careers: '採用情報',
        contact: 'お問い合わせ',
      },
      legal: {
        title: '法的情報',
        privacy: 'プライバシー',
        terms: '利用規約',
        security: 'セキュリティ',
      },
      copyright: '© 2024 Hyokai. All rights reserved.',
      social: {
        twitter: 'Twitter',
        github: 'GitHub',
        discord: 'Discord',
      },
    },
  },
};

export type LandingTranslations = typeof landingTranslations.en;
export type Language = 'en' | 'ja';

export const getLandingTranslations = (lang: Language): LandingTranslations => {
  return landingTranslations[lang];
};
