import { useMode } from '@/contexts/ModeContext';
import { Button } from '@/components/ui/button';
import { Code, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ModeToggle() {
    const { mode, setMode } = useMode();
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-center gap-2 mb-6">
            <Button
                variant={mode === 'coding' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('coding')}
                className="flex items-center gap-2"
            >
                <Code className="w-4 h-4" />
                {t('mode.coding')}
            </Button>
            <Button
                variant={mode === 'prompting' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('prompting')}
                className="flex items-center gap-2"
            >
                <Sparkles className="w-4 h-4" />
                {t('mode.prompting')}
            </Button>
        </div>
    );
}
