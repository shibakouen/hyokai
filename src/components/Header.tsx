import { Snowflake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMode } from "@/contexts/ModeContext";

export function Header() {
  const { t } = useLanguage();
  const { isBeginnerMode } = useMode();

  return (
    <header className={`text-center pt-14 sm:pt-16 md:pt-8 ${isBeginnerMode ? 'mb-4 sm:mb-6' : 'mb-6 md:mb-12'} page-fade-in`}>
      <div className="inline-flex items-center gap-3 md:gap-4 mb-4 sm:mb-5 flex-wrap justify-center">
        {/* Ice sphere icon with glow rings */}
        <div className="relative">
          <div className={`relative ${isBeginnerMode ? 'w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16' : 'w-12 h-12 md:w-16 md:h-16'}`}>
            {/* Outer glow ring */}
            <div className="absolute inset-0 rounded-full bg-[#0ea5e9]/10 animate-pulse" style={{ transform: 'scale(1.5)' }} />
            {/* Ice sphere background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white via-[#bae6fd] to-[#0ea5e9] shadow-lg shadow-[#0ea5e9]/30" />
            {/* Inner highlight */}
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/80 to-transparent" />
            {/* Icon */}
            <Snowflake className={`absolute inset-0 m-auto text-[#0284c7] animate-float ${isBeginnerMode ? 'w-5 h-5 sm:w-7 sm:h-7 md:w-8 md:h-8' : 'w-6 h-6 md:w-8 md:h-8'}`} />
          </div>
        </div>
        {/* Title with gradient and shine animation */}
        <h1 className={`font-bold tracking-tight gradient-text-shine ${isBeginnerMode ? 'text-3xl sm:text-4xl md:text-5xl lg:text-6xl' : 'text-3xl md:text-5xl lg:text-6xl'}`}>
          {t('header.title')}
        </h1>
        {/* Subtitle */}
        <span className={`text-gray-500 font-light ${isBeginnerMode ? 'text-xl sm:text-2xl md:text-3xl lg:text-4xl' : 'text-2xl md:text-4xl lg:text-5xl'}`}>
          {t('header.subtitle')}
        </span>
      </div>
      {/* Tagline */}
      <p className={`text-gray-500/80 max-w-lg mx-auto px-4 ${isBeginnerMode ? 'text-xs sm:text-sm md:text-base' : 'text-sm md:text-base'}`}>
        {t('footer.text')}
      </p>
    </header>
  );
}
