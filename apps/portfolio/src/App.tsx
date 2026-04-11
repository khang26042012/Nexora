import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import NotFound from "@/pages/not-found";
import { Home } from "@/pages/Home";
import { Tool } from "@/pages/Tool";
import { Chat } from "@/pages/Chat";
import { YtDownloader } from "@/pages/tools/YtDownloader";
import { VideoTrimmer } from "@/pages/tools/VideoTrimmer";
import { TextFormatter } from "@/pages/tools/TextFormatter";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tool" component={Tool} />
      <Route path="/tool/yt-downloader" component={YtDownloader} />
      <Route path="/tool/video-trimmer" component={VideoTrimmer} />
      <Route path="/tool/text-formatter" component={TextFormatter} />
      <Route path="/chat" component={Chat} />
      <Route component={NotFound} />
    </Switch>
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
