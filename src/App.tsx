import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { UsageProvider } from "@/contexts/UsageContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ModeProvider } from "@/contexts/ModeContext";
import { UserContextProvider } from "@/contexts/UserContextContext";
import { GitRepoProvider } from "@/contexts/GitRepoContext";
import AppPage from "./pages/AppPage";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <SubscriptionProvider>
        <UsageProvider>
        <LanguageProvider>
          <ModeProvider>
            <GitRepoProvider>
              <UserContextProvider>
                <TooltipProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <Routes>
                    {/* Landing page at root and /ja for Japanese */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/ja" element={<Landing />} />
                    {/* Main app at /app */}
                    <Route path="/app" element={<AppPage />} />
                    <Route path="/settings" element={<Settings />} />
                    {/* Pro/Pricing page with Stripe checkout */}
                    <Route path="/pro" element={<Pricing />} />
                    <Route path="/pro/ja" element={<Pricing />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </BrowserRouter>
                </TooltipProvider>
              </UserContextProvider>
            </GitRepoProvider>
          </ModeProvider>
        </LanguageProvider>
        </UsageProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
