import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Home } from "@/pages/Home";

const NotFound = lazy(() => import("@/pages/not-found").then(m => ({ default: m.default })));
const Tool = lazy(() => import("@/pages/Tool").then(m => ({ default: m.Tool })));
const Chat = lazy(() => import("@/pages/Chat").then(m => ({ default: m.Chat })));
const Admin = lazy(() => import("@/pages/Admin").then(m => ({ default: m.Admin })));
const YtDownloader = lazy(() => import("@/pages/tools/YtDownloader").then(m => ({ default: m.YtDownloader })));
const VideoTrimmer = lazy(() => import("@/pages/tools/VideoTrimmer").then(m => ({ default: m.VideoTrimmer })));
const TextFormatter = lazy(() => import("@/pages/tools/TextFormatter").then(m => ({ default: m.TextFormatter })));
const ImageToText = lazy(() => import("@/pages/tools/ImageToText").then(m => ({ default: m.ImageToText })));
const PromptBuilder = lazy(() => import("@/pages/tools/PromptBuilder").then(m => ({ default: m.PromptBuilder })));
const NoteEditor = lazy(() => import("@/pages/tools/Note").then(m => ({ default: m.NoteEditor })));
const NoteViewer = lazy(() => import("@/pages/tools/Note").then(m => ({ default: m.NoteViewer })));
const QRGenerator = lazy(() => import("@/pages/tools/QRGenerator").then(m => ({ default: m.QRGenerator })));
const ImageCompressor = lazy(() => import("@/pages/tools/ImageCompressor").then(m => ({ default: m.ImageCompressor })));
const AISummarizer = lazy(() => import("@/pages/tools/AISummarizer").then(m => ({ default: m.AISummarizer })));
const AITranslator = lazy(() => import("@/pages/tools/AITranslator").then(m => ({ default: m.AITranslator })));
const AICodeExplainer = lazy(() => import("@/pages/tools/AICodeExplainer").then(m => ({ default: m.AICodeExplainer })));
const AIMathSolver = lazy(() => import("@/pages/tools/AIMathSolver").then(m => ({ default: m.AIMathSolver })));
const BackgroundRemover = lazy(() => import("@/pages/tools/BackgroundRemover").then(m => ({ default: m.BackgroundRemover })));
const CodeReview = lazy(() => import("@/pages/tools/CodeReview").then(m => ({ default: m.CodeReview })));
const EmailWriter = lazy(() => import("@/pages/tools/EmailWriter").then(m => ({ default: m.EmailWriter })));
const PasswordGenerator = lazy(() => import("@/pages/tools/PasswordGenerator").then(m => ({ default: m.PasswordGenerator })));
const PromptImage = lazy(() => import("@/pages/tools/PromptImage").then(m => ({ default: m.PromptImage })));
const TempMail = lazy(() => import("@/pages/tools/TempMail").then(m => ({ default: m.TempMail })));
const FileConverter = lazy(() => import("@/pages/tools/FileConverter").then(m => ({ default: m.FileConverter })));
const SpeedTest = lazy(() => import("@/pages/tools/SpeedTest").then(m => ({ default: m.SpeedTest })));
const Project = lazy(() => import("@/pages/Project").then(m => ({ default: m.Project })));

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
        <Route path="/tool" component={Tool} />
        <Route path="/project" component={Project} />
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
        <Route path="/tool/prompt-image" component={PromptImage} />
        <Route path="/tool/temp-mail" component={TempMail} />
        <Route path="/tool/file-converter" component={FileConverter} />
        <Route path="/tool/speed-test" component={SpeedTest} />
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
