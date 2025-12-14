import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="absolute top-4 left-4 z-50 flex gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setLanguage('jp')}
                className={`text-2xl hover:bg-white/20 ${language === 'jp' ? 'opacity-100 scale-110' : 'opacity-50 grayscale'}`}
                title="Japanese"
            >
                🇯🇵
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setLanguage('en')}
                className={`text-2xl hover:bg-white/20 ${language === 'en' ? 'opacity-100 scale-110' : 'opacity-50 grayscale'}`}
                title="English"
            >
                🇺🇸
            </Button>
        </div>
    );
}
