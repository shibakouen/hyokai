import { GitCompare, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CompareToggleProps {
  isCompareMode: boolean;
  onToggle: (value: boolean) => void;
}

export function CompareToggle({ isCompareMode, onToggle }: CompareToggleProps) {
  const { t } = useLanguage();

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      {/* Compare toggle container - ice-design styling */}
      <div className="inline-flex p-1 rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm">
        <button
          onClick={() => onToggle(false)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
            ${!isCompareMode
              ? 'bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-md shadow-[#0ea5e9]/30'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }
          `}
        >
          <Sparkles className="w-4 h-4" />
          {t('compare.single')}
        </button>
        <button
          onClick={() => onToggle(true)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
            ${isCompareMode
              ? 'bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] text-white shadow-md shadow-[#0ea5e9]/30'
              : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
            }
          `}
        >
          <GitCompare className="w-4 h-4" />
          {t('compare.models')}
        </button>
      </div>
    </div>
  );
}
