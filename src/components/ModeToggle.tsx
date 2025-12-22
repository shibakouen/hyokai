import { useMode } from '@/contexts/ModeContext';
import { Code, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export function ModeToggle() {
    const { mode, setMode } = useMode();
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-center gap-1 mb-6">
            {/* Mode toggle container - ice-design styling */}
            <div className="inline-flex p-1 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm">
                <button
                    onClick={() => setMode('coding')}
                    className={`
                        mode-toggle-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                        ${mode === 'coding'
                            ? 'mode-toggle-btn-active bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-md shadow-[#0ea5e9]/30'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                        }
                    `}
                >
                    <Code className="w-4 h-4" />
                    {t('mode.coding')}
                </button>
                <button
                    onClick={() => setMode('prompting')}
                    className={`
                        mode-toggle-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
                        ${mode === 'prompting'
                            ? 'mode-toggle-btn-active bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-md shadow-[#0ea5e9]/30'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                        }
                    `}
                >
                    <Sparkles className="w-4 h-4" />
                    {t('mode.prompting')}
                </button>
            </div>
        </div>
    );
}
