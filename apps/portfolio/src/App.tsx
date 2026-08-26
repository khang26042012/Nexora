import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Home } from "@/pages/Home";

const NotFound = lazy(() => import("@/pages/not-found").then(m => ({ default: m.default })));
const Chat = lazy(() => import("@/pages/Chat").then(m => ({ default: m.Chat })));
const PanelCoinHost = lazy(() => import("@/pages/PanelCoinHost").then(m => ({ default: m.PanelCoinHost })));
const Admin = lazy(() => import("@/pages/Admin").then(m => ({ default: m.Admin })));
const Project = lazy(() => import("@/pages/Project").then(m => ({ default: m.Project })));
const FundTools = lazy(() => import("@/pages/FundTools"));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-8 h-8 rounded-full border-2 border-white/15 border-t-white/70 animate-spin" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/project" component={Project} />
        <Route path="/panel-coin-host" component={PanelCoinHost} />
        <Route path="/fund-tools" component={FundTools} />
        <Route path="/chat" component={Chat} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="ptk-portfolio-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
