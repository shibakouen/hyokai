import { Snowflake } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function Header() {
  const { t } = useLanguage();

  return (
    <header className="text-center mb-6 md:mb-12 pt-16 md:pt-8">
      <div className="inline-flex items-center gap-2 md:gap-3 mb-4 flex-wrap justify-center">
        <div className="relative">
          <Snowflake className="w-8 h-8 md:w-12 md:h-12 text-primary animate-float" />
          <div className="absolute inset-0 w-8 h-8 md:w-12 md:h-12 bg-primary/20 blur-xl rounded-full" />
        </div>
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-semibold tracking-tight text-gradient-blue">
          {t('header.title')}
        </h1>
        <span className="text-xl md:text-3xl lg:text-4xl text-muted-foreground font-light">
          {t('header.subtitle')}
        </span>
      </div>
      <p className="text-muted-foreground text-sm md:text-base max-w-lg mx-auto px-4">
        {t('footer.text')}
      </p>
    </header>
  );
}
