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
    }
} as const;

export type TranslationKey = keyof typeof translations.en;
