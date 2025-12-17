import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Official ChatGPT/OpenAI logo SVG
function ChatGPTIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

interface ChatGPTButtonProps {
  prompt: string;
  variant?: "default" | "compact";
  /** Use primary styling (cb-blue background) vs secondary (frost) */
  primary?: boolean;
  className?: string;
}

/**
 * Detects if the user is on a mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/**
 * Opens ChatGPT with the given prompt
 * - Mobile: Tries deep link to app, falls back to web
 * - Desktop: Opens web in new tab
 */
function openChatGPT(prompt: string) {
  const encodedPrompt = encodeURIComponent(prompt);
  const webUrl = `https://chatgpt.com/?q=${encodedPrompt}`;

  if (isMobileDevice()) {
    // Try ChatGPT app deep link first
    const appUrl = `chatgpt://chat?prompt=${encodedPrompt}`;

    // Create a hidden iframe to test deep link
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // Set a timeout to fall back to web if app doesn't open
    const timeout = setTimeout(() => {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }, 1500);

    // Try to open the app
    try {
      window.location.href = appUrl;
      // If we're still here after a short delay, the app might have opened
      setTimeout(() => {
        clearTimeout(timeout);
        document.body.removeChild(iframe);
      }, 500);
    } catch {
      clearTimeout(timeout);
      document.body.removeChild(iframe);
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  } else {
    // Desktop: open in new tab
    window.open(webUrl, "_blank", "noopener,noreferrer");
  }
}

export function ChatGPTButton({ prompt, variant = "default", primary = false, className = "" }: ChatGPTButtonProps) {
  const { t } = useLanguage();

  const handleClick = () => {
    if (!prompt?.trim()) return;
    openChatGPT(prompt);
  };

  // Don't render if no prompt
  if (!prompt?.trim()) return null;

  const buttonContent = (
    <>
      <ChatGPTIcon className="w-4 h-4" />
      {variant === "default" && <span className="hidden sm:inline">{t("output.sendToChatGPT")}</span>}
    </>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={primary ? "default" : "frost"}
          size="sm"
          onClick={handleClick}
          className={`gap-1.5 ${primary ? "bg-cb-blue hover:bg-cb-blue/90 text-white" : ""} ${className}`}
          aria-label={t("output.sendToChatGPTAria")}
        >
          {buttonContent}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{t("output.sendToChatGPTTooltip")}</p>
      </TooltipContent>
    </Tooltip>
  );
}

// Also export icon for use in other contexts
export { ChatGPTIcon };
