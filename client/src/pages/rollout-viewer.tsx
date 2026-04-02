import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  RotateCcw,
  Sparkles,
  Brain,
  Loader2,
  Wand2,
  AlertCircle,
  Eye,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface RolloutStep {
  t: number;
  prediction: string;
  confidence: number;
  errors: string;
}

interface ArchitectureRollout {
  name: string;
  rollouts: RolloutStep[];
  summary: string;
}

interface GroundTruthStep {
  t: number;
  description: string;
}

interface RolloutData {
  environmentSummary: string;
  groundTruth: GroundTruthStep[];
  architectures: ArchitectureRollout[];
}

const PHASER_CDN = "https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js";

function buildGameHtml(gameCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0f1114; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
  #game-container { border-radius: 8px; overflow: hidden; }
  #game-container canvas { display: block; }
  .error-display { color: #ff6b6b; font-family: monospace; padding: 24px; max-width: 600px; }
  .error-display h3 { margin-bottom: 12px; }
  .error-display pre { white-space: pre-wrap; font-size: 13px; }
</style>
<script src="${PHASER_CDN}"><\/script>
</head>
<body>
<div id="game-container"></div>
<script>
function showError(msg) {
  document.body.innerHTML = '<div class="error-display"><h3>Runtime Error</h3><pre>' + msg + '</pre></div>';
}
window.onerror = function(msg) { showError(msg); };
try {
  ${gameCode}
  setTimeout(function() {
    if (!document.querySelector('canvas')) {
      showError('Game failed to render.');
    }
  }, 3000);
} catch(e) {
  showError(e.message);
}
<\/script>
</body>
</html>`;
}

const EXAMPLE_PROMPTS = [
  "A breakout game with paddle physics and ball trajectories",
  "A platformer with gravity, jumps, and moving platforms",
  "A top-down space shooter with inertia and wrapping edges",
  "A billiards table with realistic ball collisions",
];

const archColors: Record<string, { bg: string; text: string; border: string }> = {
  "RSSM (DreamerV3)": { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-500/30" },
  "Transformer (IRIS)": { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/30" },
  "Diffusion (DIAMOND)": { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30" },
  "MCTS + Learned (MuZero)": { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30" },
};

function getConfidenceColor(confidence: number) {
  if (confidence >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (confidence >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

function getConfidenceBg(confidence: number) {
  if (confidence >= 80) return "bg-emerald-500";
  if (confidence >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

export default function RolloutViewer() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [rolloutData, setRolloutData] = useState<RolloutData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const timesteps = [1, 5, 10, 25, 50];

  useEffect(() => {
    if (code && iframeRef.current) {
      iframeRef.current.srcdoc = buildGameHtml(code);
    }
  }, [code]);

  // Auto-play through timesteps
  useEffect(() => {
    if (isPlaying && rolloutData) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= timesteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2500);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, rolloutData]);

  const generate = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setError(null);
    setGenerating(true);
    setRolloutData(null);
    setCurrentStep(0);
    setIsPlaying(false);

    try {
      // Step 1: Generate the environment
      const genResponse = await apiRequest("POST", "/api/generate-environment", { prompt: userPrompt });
      const genData = await genResponse.json();

      if (genData.code) {
        setCode(genData.code);

        // Step 2: Analyze it
        const analyzeResponse = await apiRequest("POST", "/api/analyze-environment", { code: genData.code });
        const analysisData = await analyzeResponse.json();
        setAnalysis(analysisData);

        // Step 3: Simulate rollouts
        setSimulating(true);
        const rolloutResponse = await apiRequest("POST", "/api/simulate-rollouts", {
          code: genData.code,
          analysis: analysisData,
        });
        const rollouts = await rolloutResponse.json();
        setRolloutData(rollouts);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate. Try again.");
    } finally {
      setGenerating(false);
      setSimulating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generate(prompt);
    setPrompt("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generate(prompt);
      setPrompt("");
    }
  };

  const resetAll = () => {
    setCode(null);
    setAnalysis(null);
    setRolloutData(null);
    setError(null);
    setCurrentStep(0);
    setIsPlaying(false);
    if (iframeRef.current) iframeRef.current.srcdoc = "";
  };

  const isLoading = generating || simulating;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Rollout Viewer
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Generate an environment, then see how RSSM, Transformer, Diffusion, and MCTS architectures
          would dream it forward — where predictions diverge from reality and errors compound.
        </p>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe an environment to compare rollouts..."
          className="flex-1 min-h-[48px] max-h-32 resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
          rows={1}
          data-testid="input-prompt"
        />
        <Button
          type="submit"
          size="icon"
          disabled={isLoading || !prompt.trim()}
          className="h-[48px] w-[48px] shrink-0"
          data-testid="button-send"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      {/* Example prompts when empty */}
      {!code && !isLoading && (
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLE_PROMPTS.map((ex, i) => (
            <button
              key={i}
              onClick={() => { setPrompt(ex); inputRef.current?.focus(); }}
              className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary/50 hover:text-foreground transition-colors"
              data-testid={`example-${i}`}
            >
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading states */}
      {generating && !code && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating environment...</p>
          </CardContent>
        </Card>
      )}

      {simulating && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Simulating rollouts across 4 architectures...</p>
            <p className="text-xs text-muted-foreground/70">Analyzing how each world model would dream this environment forward</p>
          </CardContent>
        </Card>
      )}

      {/* Main content: game preview + rollout comparison */}
      {code && (
        <div className="space-y-4">
          {/* Top: game preview with controls */}
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Ground Truth
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => { if (iframeRef.current && code) iframeRef.current.srcdoc = buildGameHtml(code); }} data-testid="button-restart">
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Restart
                    </Button>
                    <Button size="sm" variant="outline" onClick={resetAll} data-testid="button-new">
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      New
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <iframe
                  ref={iframeRef}
                  className="w-full bg-[#0f1114]"
                  style={{ height: "min(400px, 45vh)" }}
                  sandbox="allow-scripts"
                  data-testid="game-iframe"
                />
              </CardContent>
            </Card>

            {/* Summary card */}
            {rolloutData && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Brain className="w-4 h-4 text-primary" />
                    Environment Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {rolloutData.environmentSummary}
                  </p>
                  <div className="space-y-2">
                    <span className="text-xs font-medium">Architecture Summaries</span>
                    {rolloutData.architectures.map((arch) => {
                      const colors = archColors[arch.name] || { bg: "bg-muted", text: "text-foreground", border: "border-border" };
                      return (
                        <div key={arch.name} className={`p-2.5 rounded-md ${colors.bg} border ${colors.border}`}>
                          <span className={`text-xs font-medium ${colors.text}`}>{arch.name}</span>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{arch.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Rollout timeline */}
          {rolloutData && (
            <div className="space-y-3">
              {/* Timeline controls */}
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="gap-1.5"
                  data-testid="button-play-pause"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  disabled={currentStep === 0}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                {/* Step indicators */}
                <div className="flex items-center gap-1 flex-1">
                  {timesteps.map((t, i) => (
                    <button
                      key={t}
                      onClick={() => { setCurrentStep(i); setIsPlaying(false); }}
                      className={`flex-1 h-8 rounded-md text-xs font-mono transition-all flex items-center justify-center ${
                        i === currentStep
                          ? "bg-primary text-primary-foreground font-medium"
                          : i < currentStep
                          ? "bg-primary/20 text-primary"
                          : "bg-accent text-muted-foreground hover:bg-accent/80"
                      }`}
                      data-testid={`step-${t}`}
                    >
                      t={t}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setCurrentStep(Math.min(timesteps.length - 1, currentStep + 1))}
                  disabled={currentStep === timesteps.length - 1}
                  data-testid="button-next-step"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Ground truth for this step */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 flex items-start gap-2">
                  <Eye className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs font-medium text-primary">Ground Truth at t={timesteps[currentStep]}</span>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      {rolloutData.groundTruth[currentStep]?.description}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Architecture predictions grid */}
              <div className="grid md:grid-cols-2 gap-3">
                {rolloutData.architectures.map((arch) => {
                  const step = arch.rollouts[currentStep];
                  const colors = archColors[arch.name] || { bg: "bg-muted", text: "text-foreground", border: "border-border" };
                  if (!step) return null;
                  return (
                    <Card key={arch.name} className={`border ${colors.border} transition-all`}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${colors.text}`}>{arch.name}</span>
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${getConfidenceBg(step.confidence)}`}
                                style={{ width: `${step.confidence}%` }}
                              />
                            </div>
                            <span className={`text-[10px] font-mono font-semibold tabular-nums ${getConfidenceColor(step.confidence)}`}>
                              {step.confidence}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-foreground leading-relaxed">{step.prediction}</p>
                          {step.errors && step.errors !== "None" && step.errors !== "none" && (
                            <div className="flex items-start gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span className="leading-relaxed">{step.errors}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Confidence over time chart (text-based) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Confidence Decay Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rolloutData.architectures.map((arch) => {
                      const colors = archColors[arch.name] || { bg: "bg-muted", text: "text-foreground", border: "border-border" };
                      return (
                        <div key={arch.name} className="space-y-1">
                          <span className={`text-[11px] font-medium ${colors.text}`}>{arch.name}</span>
                          <div className="flex items-center gap-1">
                            {arch.rollouts.map((step, i) => (
                              <div
                                key={i}
                                className={`flex-1 h-6 rounded flex items-center justify-center text-[10px] font-mono transition-all ${
                                  i === currentStep ? "ring-1 ring-foreground/50" : ""
                                }`}
                                style={{
                                  backgroundColor: `hsl(${step.confidence > 70 ? 142 : step.confidence > 40 ? 38 : 0} ${Math.min(80, step.confidence)}% ${step.confidence > 70 ? 90 : step.confidence > 40 ? 90 : 93}%)`,
                                  color: `hsl(${step.confidence > 70 ? 142 : step.confidence > 40 ? 38 : 0} 70% ${step.confidence > 70 ? 30 : step.confidence > 40 ? 30 : 40}%)`,
                                }}
                              >
                                {step.confidence}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-1 mt-1">
                      {timesteps.map((t) => (
                        <div key={t} className="flex-1 text-center text-[10px] text-muted-foreground font-mono">
                          t={t}
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!code && !isLoading && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <Wand2 className="w-10 h-10 text-muted-foreground/30" />
            <div className="space-y-1.5 max-w-md">
              <p className="text-sm font-medium text-muted-foreground">Rollout Comparison Viewer</p>
              <p className="text-xs text-muted-foreground/70">
                Describe an environment above. The system will generate it, then simulate how
                four different world model architectures would predict its future states — showing
                where and why each one fails as predictions extend further into the future.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
