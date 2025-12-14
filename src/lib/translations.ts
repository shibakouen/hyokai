export type Language = 'en' | 'jp';

export const translations = {
    en: {
        // Header
        'header.title': 'Hyokai',
        'header.subtitle': 'Prompt Forge',

        // Model Selector
        'model.label': 'Model',
        'model.placeholder': 'Select a model',

        // Input
        'input.label': 'Your Prompt',
        'input.placeholder': "e.g., 'pls make it store the files somewhere idk where'",

        // Button
        'button.generate': 'Generate Technical Prompt',
        'button.generating': 'Transforming...',

        // Output
        'output.label': 'Technical Output',
        'output.placeholder': 'Technical prompt will appear here...',
        'output.copy': 'Copy to clipboard',
        'output.copied': 'Copied!',

        // Footer
        'footer.text': 'Powered by OpenRouter • Transform natural language into precise technical specifications',

        // Errors
        'error.empty': 'Please enter a prompt to transform.',
        'error.failed': 'Transformation failed',

        // Model Descriptions
        'model.llama4scout': 'Ultra-fast inference for real-time applications. 2,600 tokens/sec.',
        'model.llama33': 'High-performance model with excellent throughput. 2,500 tokens/sec.',
        'model.cerebras': 'Cerebras-accelerated model with exceptional speed. 1,000 tokens/sec.',
        'model.kimi': 'Linear attention architecture for efficient scaling. 1,000 tokens/sec.',
        'model.mercury': 'Fast general-purpose model with strong capabilities. 800 tokens/sec.',
        'model.gemini': 'Multimodal model optimized for speed. 200+ tokens/sec.',
        'model.grokcode': 'Specialized for code generation with fast inference. 85 tokens/sec.',
        'model.grok4': 'Fast general-purpose reasoning model. 85 tokens/sec.',
        'model.nova': 'Compact model with high throughput for cost-effective deployment.',
        'model.haiku': '3x faster than Sonnet 4 with excellent speed-to-quality ratio.',

        // Mode Toggle
        'mode.coding': 'Coding Mode',
        'mode.prompting': 'Prompting Mode',

        // Compare Mode
        'compare.single': 'Single Model',
        'compare.models': 'Compare Models',
        'compare.selectModels': 'Select models to compare',
        'compare.placeholder': 'Select models and enter a prompt to compare outputs',
        'compare.summary': 'Comparison Summary',
        'compare.generate': 'Compare All Models',

        // History
        'history.title': 'History',
        'history.empty': 'No history yet',
        'history.clearAll': 'Clear All',
        'history.input': 'Input',
        'history.output': 'Output',
        'history.restore': 'Restore',
        'history.delete': 'Delete',
        'history.legend': 'Legend',

        // User Context
        'context.title': 'Your Context',
        'context.description': 'Tell the AI about yourself, your project, or preferences. This will be included with every prompt transformation.',
        'context.placeholder': "e.g., 'I'm a Python developer working on a Django REST API for an e-commerce platform. I prefer clean, well-documented code with type hints.'",
        'context.save': 'Save Context',
        'context.clear': 'Clear',
        'context.active': 'Context Active',
        'context.savedContexts': 'Saved Contexts',
        'context.selectContext': 'Select a context',
        'context.newContext': 'New Context',
        'context.slotsUsed': 'slots used',
        'context.contextName': 'Context Name',
        'context.namePlaceholder': 'e.g., My Django Project',
        'context.content': 'Context Content',
        'context.chars': 'chars',
        'context.tokens': 'tokens',
        'context.tokenWarning': 'Large context',
        'context.tokenError': 'Too large',
        'context.tooLarge': 'Context too large!',
        'context.largeContext': 'Large context.',
        'context.tokenWarningDetail': 'This context exceeds {limit} tokens. Some models may truncate or fail.',
        'context.tokenErrorDetail': 'This context exceeds {limit} tokens and will likely cause API errors. Consider splitting into multiple contexts.',
        'context.delete': 'Delete',
        'context.update': 'Update',
        'context.saveNew': 'Save New',
        'context.apply': 'Apply',
        'context.allContexts': 'All Saved Contexts',
        'context.deleteConfirmTitle': 'Delete Context?',
        'context.deleteConfirmMessage': 'Are you sure you want to delete "{name}"? This cannot be undone.',
        'context.cancel': 'Cancel',
        'context.llmPromptTitle': 'Get Context from Your LLM',
        'context.llmPromptDescription': 'Copy this prompt and paste it into Claude Code, Cursor, or any coding assistant to auto-generate context about your project.',
        'context.copyPrompt': 'Copy Prompt',
        'context.llmPromptCopied': 'Prompt copied! Paste it into your LLM, then copy the result back here.',
    },
    jp: {
        // Header
        'header.title': '氷解',
        'header.subtitle': 'プロンプトフォージ',

        // Model Selector
        'model.label': 'モデル',
        'model.placeholder': 'モデルを選択',

        // Input
        'input.label': 'プロンプト',
        'input.placeholder': '例：「ファイルをどこかに保存するようにして」',

        // Button
        'button.generate': '技術プロンプトを生成',
        'button.generating': '変換中...',

        // Output
        'output.label': '技術的出力',
        'output.placeholder': '技術プロンプトがここに表示されます...',
        'output.copy': 'クリップボードにコピー',
        'output.copied': 'コピーしました！',

        // Footer
        'footer.text': 'OpenRouter提供 • 自然言語を正確な技術仕様に変換します',

        // Errors
        'error.empty': '変換するプロンプトを入力してください。',
        'error.failed': '変換に失敗しました',

        // Model Descriptions
        'model.llama4scout': '超高速推論でリアルタイムアプリケーション対応。毎秒2,600トークン。',
        'model.llama33': '優れたスループットを持つ高性能モデル。毎秒2,500トークン。',
        'model.cerebras': 'Cerebras加速による卓越した速度。毎秒1,000トークン。',
        'model.kimi': '効率的なスケーリングのための線形注意アーキテクチャ。毎秒1,000トークン。',
        'model.mercury': '強力な機能を持つ高速汎用モデル。毎秒800トークン。',
        'model.gemini': '速度最適化されたマルチモーダルモデル。毎秒200以上のトークン。',
        'model.grokcode': 'コード生成に特化した高速推論。毎秒85トークン。',
        'model.grok4': '高速汎用推論モデル。毎秒85トークン。',
        'model.nova': 'コスト効果的な展開のための高スループットコンパクトモデル。',
        'model.haiku': 'Sonnet 4の3倍速で優れた速度対品質比。',

        // Mode Toggle
        'mode.coding': 'コーディングモード',
        'mode.prompting': 'プロンプトモード',

        // Compare Mode
        'compare.single': '単一モデル',
        'compare.models': 'モデル比較',
        'compare.selectModels': '比較するモデルを選択',
        'compare.placeholder': 'モデルを選択してプロンプトを入力し、出力を比較します',
        'compare.summary': '比較サマリー',
        'compare.generate': '全モデルを比較',

        // History
        'history.title': '履歴',
        'history.empty': '履歴がありません',
        'history.clearAll': 'すべて削除',
        'history.input': '入力',
        'history.output': '出力',
        'history.restore': '復元',
        'history.delete': '削除',
        'history.legend': '凡例',

        // User Context
        'context.title': 'コンテキスト',
        'context.description': 'あなた自身、プロジェクト、好みについてAIに伝えてください。すべてのプロンプト変換に含まれます。',
        'context.placeholder': "例：「私はDjangoのREST APIでeコマースプラットフォームを開発しているPython開発者です。型ヒント付きのクリーンで文書化されたコードを好みます。」",
        'context.save': '保存',
        'context.clear': 'クリア',
        'context.active': 'コンテキスト有効',
        'context.savedContexts': '保存済みコンテキスト',
        'context.selectContext': 'コンテキストを選択',
        'context.newContext': '新規コンテキスト',
        'context.slotsUsed': 'スロット使用中',
        'context.contextName': 'コンテキスト名',
        'context.namePlaceholder': '例：私のDjangoプロジェクト',
        'context.content': 'コンテキスト内容',
        'context.chars': '文字',
        'context.tokens': 'トークン',
        'context.tokenWarning': '大きなコンテキスト',
        'context.tokenError': '大きすぎます',
        'context.tooLarge': 'コンテキストが大きすぎます！',
        'context.largeContext': '大きなコンテキスト。',
        'context.tokenWarningDetail': 'このコンテキストは{limit}トークンを超えています。一部のモデルで切り捨てまたは失敗する可能性があります。',
        'context.tokenErrorDetail': 'このコンテキストは{limit}トークンを超えており、APIエラーが発生する可能性があります。複数のコンテキストに分割することを検討してください。',
        'context.delete': '削除',
        'context.update': '更新',
        'context.saveNew': '新規保存',
        'context.apply': '適用',
        'context.allContexts': 'すべての保存済みコンテキスト',
        'context.deleteConfirmTitle': 'コンテキストを削除しますか？',
        'context.deleteConfirmMessage': '「{name}」を削除してもよろしいですか？この操作は元に戻せません。',
        'context.cancel': 'キャンセル',
        'context.llmPromptTitle': 'LLMからコンテキストを取得',
        'context.llmPromptDescription': 'このプロンプトをコピーしてClaude Code、Cursor、または任意のコーディングアシスタントに貼り付けると、プロジェクトのコンテキストを自動生成できます。',
        'context.copyPrompt': 'プロンプトをコピー',
        'context.llmPromptCopied': 'プロンプトをコピーしました！LLMに貼り付けて、結果をここにコピーしてください。',
    }
} as const;

export type TranslationKey = keyof typeof translations.en;
