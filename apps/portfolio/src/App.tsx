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
import { ImageToText } from "@/pages/tools/ImageToText";
import { PromptBuilder } from "@/pages/tools/PromptBuilder";
import { NoteEditor, NoteViewer } from "@/pages/tools/Note";
import { Admin } from "@/pages/Admin";
import { QRGenerator } from "@/pages/tools/QRGenerator";
import { ImageCompressor } from "@/pages/tools/ImageCompressor";
import { AISummarizer } from "@/pages/tools/AISummarizer";
import { AITranslator } from "@/pages/tools/AITranslator";
import { AICodeExplainer } from "@/pages/tools/AICodeExplainer";
import { AIMathSolver } from "@/pages/tools/AIMathSolver";
import { BackgroundRemover } from "@/pages/tools/BackgroundRemover";
import { CodeReview } from "@/pages/tools/CodeReview";
import { EmailWriter } from "@/pages/tools/EmailWriter";
import { PasswordGenerator } from "@/pages/tools/PasswordGenerator";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tool" component={Tool} />
      <Route path="/tool/yt-downloader" component={YtDownloader} />
      <Route path="/tool/video-trimmer" component={VideoTrimmer} />
      <Route path="/tool/text-formatter" component={TextFormatter} />
      <Route path="/tool/image-to-text" component={ImageToText} />
      <Route path="/tool/prompt-builder" component={PromptBuilder} />
      <Route path="/tool/note/:id" component={NoteViewer} />
      <Route path="/tool/note" component={NoteEditor} />
      <Route path="/tool/qr-generator" component={QRGenerator} />
      <Route path="/tool/image-compressor" component={ImageCompressor} />
      <Route path="/tool/ai-summarizer" component={AISummarizer} />
      <Route path="/tool/ai-translator" component={AITranslator} />
      <Route path="/tool/code-explainer" component={AICodeExplainer} />
      <Route path="/tool/math-solver" component={AIMathSolver} />
      <Route path="/tool/bg-remover" component={BackgroundRemover} />
      <Route path="/tool/code-review" component={CodeReview} />
      <Route path="/tool/email-writer" component={EmailWriter} />
      <Route path="/tool/password-generator" component={PasswordGenerator} />
      <Route path="/chat" component={Chat} />
      <Route path="/admin" component={Admin} />
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
