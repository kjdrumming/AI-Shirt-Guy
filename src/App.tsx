import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import AdminConfig from "./pages/AdminConfig";
import SecretAdminRoute from "./pages/SecretAdminRoute";
import { initializeAdminConfig } from "./lib/adminConfig";

const queryClient = new QueryClient();

const App = () => {
  // Initialize admin config on app startup
  useEffect(() => {
    initializeAdminConfig().catch(error => {
      console.error('Failed to initialize admin config:', error);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SecretAdminRoute />} />
            <Route path="/admin-config" element={<AdminConfig />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
