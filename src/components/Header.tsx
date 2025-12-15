import { Snowflake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useMode } from "@/contexts/ModeContext";

export function Header() {
  const { t } = useLanguage();
  const { isBeginnerMode } = useMode();

  return (
    <header className={`text-center pt-14 sm:pt-16 md:pt-8 ${isBeginnerMode ? 'mb-4 sm:mb-6' : 'mb-6 md:mb-12'}`}>
      <div className="inline-flex items-center gap-2 md:gap-3 mb-3 sm:mb-4 flex-wrap justify-center">
        <div className="relative">
          <Snowflake className={`text-cb-blue animate-float ${isBeginnerMode ? 'w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12' : 'w-8 h-8 md:w-12 md:h-12'}`} />
          <div className={`absolute inset-0 bg-cb-blue/20 blur-xl rounded-full ${isBeginnerMode ? 'w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12' : 'w-8 h-8 md:w-12 md:h-12'}`} />
        </div>
        <h1 className={`font-semibold tracking-tight text-gradient-blue ${isBeginnerMode ? 'text-2xl sm:text-3xl md:text-4xl lg:text-5xl' : 'text-2xl md:text-4xl lg:text-5xl'}`}>
          {t('header.title')}
        </h1>
        <span className={`text-muted-foreground font-light ${isBeginnerMode ? 'text-lg sm:text-2xl md:text-3xl lg:text-4xl' : 'text-xl md:text-3xl lg:text-4xl'}`}>
          {t('header.subtitle')}
        </span>
      </div>
      <p className={`text-muted-foreground/80 max-w-lg mx-auto px-4 ${isBeginnerMode ? 'text-xs sm:text-sm md:text-base' : 'text-sm md:text-base'}`}>
        {t('footer.text')}
      </p>
    </header>
  );
}
