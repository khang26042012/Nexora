import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Home } from "@/pages/Home";

const NotFound = lazy(() => import("@/pages/not-found").then(m => ({ default: m.default })));
const Chat = lazy(() => import("@/pages/Chat").then(m => ({ default: m.Chat })));
const ServerStatus = lazy(() => import("@/pages/ServerStatus").then(m => ({ default: m.ServerStatus })));
const InventoryInfo = lazy(() => import("@/pages/InventoryInfo").then(m => ({ default: m.InventoryInfo })));
const Localize = lazy(() => import("@/pages/Localize").then(m => ({ default: m.Localize })));
const ServerAdmin = lazy(() => import("@/pages/ServerAdmin").then(m => ({ default: m.default })));
const KhangBoard = lazy(() => import("@/pages/KhangBoard").then(m => ({ default: m.default })));
const KhangBoardAdmin = lazy(() => import("@/pages/KhangBoard").then(m => ({ default: m.KhangBoardAdmin })));

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
        <Route path="/chat" component={Chat} />
        <Route path="/server-status" component={ServerStatus} />
        <Route path="/inventory" component={InventoryInfo} />
        <Route path="/localize" component={Localize} />
        <Route path="/server-admin" component={ServerAdmin} />
        <Route path="/khang-board" component={KhangBoard} />
        <Route path="/khang-board-admin" component={KhangBoardAdmin} />
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
