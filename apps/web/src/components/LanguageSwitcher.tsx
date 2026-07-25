import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGUAGES, setLanguage, type SupportedLanguage } from "@/i18n";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <div
      className="inline-flex overflow-hidden rounded-sm border-2 border-border"
      role="group"
      aria-label={t("language.switchLabel")}
    >
      {SUPPORTED_LANGUAGES.map((lang: SupportedLanguage) => (
        <button
          key={lang}
          onClick={() => setLanguage(lang)}
          className={cn(
            "px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest transition-colors",
            i18n.language === lang
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
