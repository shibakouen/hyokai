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
import Landing from "./pages/Landing";
import AppPage from "./pages/AppPage";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
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
                    <Route path="/" element={<Landing />} />
                    <Route path="/ja" element={<Landing />} />
                    <Route path="/app" element={<AppPage />} />
                    <Route path="/pro" element={<Pricing />} />
                    <Route path="/pro/ja" element={<Pricing />} />
                    <Route path="/settings" element={<Settings />} />
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
