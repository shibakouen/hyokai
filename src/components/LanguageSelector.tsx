import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

export function LanguageSelector() {
    const { language, setLanguage } = useLanguage();

    return (
        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-50 flex gap-1 md:gap-2">
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setLanguage('jp')}
                className={`text-lg md:text-2xl h-8 w-8 md:h-10 md:w-10 hover:bg-white/20 ${language === 'jp' ? 'opacity-100 scale-110' : 'opacity-50 grayscale'}`}
                title="Japanese"
            >
                🇯🇵
            </Button>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setLanguage('en')}
                className={`text-lg md:text-2xl h-8 w-8 md:h-10 md:w-10 hover:bg-white/20 ${language === 'en' ? 'opacity-100 scale-110' : 'opacity-50 grayscale'}`}
                title="English"
            >
                🇺🇸
            </Button>
        </div>
    );
}
