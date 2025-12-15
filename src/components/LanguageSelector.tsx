import { useLanguage } from '@/contexts/LanguageContext';

export function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-50">
            <div className="flex rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 overflow-hidden">
                <button
                    onClick={() => setLanguage('en')}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        language === 'en'
                            ? 'bg-cb-blue text-white'
                            : 'text-slate-600 hover:bg-white/20'
                    }`}
                    aria-label="Switch to English"
                >
                    EN
                </button>
                <button
                    onClick={() => setLanguage('jp')}
                    className={`px-2.5 py-1.5 text-xs font-semibold transition-all ${
                        language === 'jp'
                            ? 'bg-cb-blue text-white'
                            : 'text-slate-600 hover:bg-white/20'
                    }`}
                    aria-label="Switch to Japanese"
                >
                    JP
                </button>
            </div>
        </div>
    );
}
