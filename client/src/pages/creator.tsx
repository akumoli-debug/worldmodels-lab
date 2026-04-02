import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  Play,
  RotateCcw,
  Sparkles,
  Brain,
  Layers,
  Zap,
  Target,
  Code2,
  BarChart3,
  Loader2,
  ChevronDown,
  ChevronUp,
  Wand2,
  AlertCircle,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Analysis {
  stateSpace: {
    variables: string[];
    dimensionality: string;
    observability: string;
  };
  actionSpace: {
    actions: string[];
    type: string;
    size: string;
  };
  dynamics: {
    type: string;
    physicsBased: boolean;
    keyRules: string[];
    nonlinearities: string[];
  };
  complexity: {
    score: number;
    horizon: string;
    multiAgent: boolean;
    partialObservability: boolean;
  };
  modelChallenges: {
    architecture: string;
    difficulty: string;
    reason: string;
  }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
</style>
<script src="${PHASER_CDN}"><\/script>
</head>
<body>
<div id="game-container"></div>
<script>
try {
  ${gameCode}
} catch(e) {
  document.body.innerHTML = '<div style="color:#ff6b6b;font-family:monospace;padding:24px;max-width:600px;"><h3>Runtime Error</h3><pre style="margin-top:12px;white-space:pre-wrap;font-size:13px;">' + e.message + '</pre></div>';
}
<\/script>
</body>
</html>`;
}

const EXAMPLE_PROMPTS = [
  "A breakout/brick-breaker game with paddle physics and ball trajectories",
  "A platformer with gravity, jump mechanics, and moving platforms",
  "A top-down space shooter with asteroids, inertia, and wrapping edges",
  "A simple ecosystem with predators chasing prey using flocking behavior",
  "A billiards/pool table with realistic ball collisions and friction",
  "A pendulum chain with connected swinging bodies",
];

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

export default function Creator() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showCode, setShowCode] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, scrollToBottom]);

  // Auto-render when code changes
  useEffect(() => {
    if (code && iframeRef.current) {
      const html = buildGameHtml(code);
      iframeRef.current.srcdoc = html;
    }
  }, [code]);

  const renderGame = useCallback((gameCode: string) => {
    if (!iframeRef.current) return;
    iframeRef.current.srcdoc = buildGameHtml(gameCode);
  }, []);

  const generate = async (userPrompt: string, isIteration: boolean = false) => {
    if (!userPrompt.trim()) return;

    setError(null);
    setGenerating(true);
    setChatHistory((prev) => [...prev, { role: "user", content: userPrompt }]);
    setPrompt("");

    try {
      const body = isIteration && code
        ? { feedback: userPrompt, previousCode: code }
        : { prompt: userPrompt };

      const response = await apiRequest("POST", "/api/generate-environment", body);
      const data = await response.json();

      if (data.code) {
        setCode(data.code);
        setChatHistory((prev) => [
          ...prev,
          { role: "assistant", content: "Environment generated. Try playing it, then tell me what to change." },
        ]);
        // Auto-analyze
        analyzeCode(data.code);
      }
    } catch (err: any) {
      const msg = err?.message || "Failed to generate. Try again.";
      setError(msg);
      setChatHistory((prev) => [...prev, { role: "assistant", content: `Error: ${msg}` }]);
    } finally {
      setGenerating(false);
    }
  };

  const analyzeCode = async (gameCode: string) => {
    setAnalyzing(true);
    try {
      const response = await apiRequest("POST", "/api/analyze-environment", { code: gameCode });
      const data = await response.json();
      setAnalysis(data);
      setShowAnalysis(true);
    } catch {
      // Non-critical, silently fail
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    generate(prompt, code !== null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generate(prompt, code !== null);
    }
  };

  const resetAll = () => {
    setCode(null);
    setAnalysis(null);
    setChatHistory([]);
    setError(null);
    setShowCode(false);
    setShowAnalysis(false);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Environment Creator
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Describe any 2D game or environment in plain language. AI generates playable Phaser.js code instantly. 
          Iterate via chat, then analyze what world model architectures would need to learn.
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-4">
        {/* Left: Game preview + chat */}
        <div className="space-y-4">
          {/* Game canvas */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {code ? (
                <iframe
                  ref={iframeRef}
                  className="w-full bg-[#0f1114] rounded-t-lg"
                  style={{ height: "500px" }}
                  sandbox="allow-scripts allow-same-origin"
                  data-testid="game-iframe"
                />
              ) : (
                <div
                  className="w-full flex flex-col items-center justify-center gap-4 text-muted-foreground"
                  style={{ height: "500px" }}
                >
                  <Wand2 className="w-10 h-10 opacity-30" />
                  <div className="text-center space-y-1.5">
                    <p className="text-sm font-medium">Describe an environment to get started</p>
                    <p className="text-xs max-w-md">
                      Try something like "a platformer with gravity and moving platforms" or pick an example below
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-1.5 max-w-lg">
                    {EXAMPLE_PROMPTS.map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => { setPrompt(ex); inputRef.current?.focus(); }}
                        className="text-xs px-2.5 py-1 rounded-full border border-border bg-card hover:border-primary/50 hover:text-foreground transition-colors text-left"
                        data-testid={`example-${i}`}
                      >
                        {ex.length > 50 ? ex.slice(0, 50) + "..." : ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {/* Controls bar */}
              {code && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => renderGame(code)}
                      data-testid="button-restart"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Restart
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={resetAll}
                      data-testid="button-new"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      New
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowCode(!showCode)}
                      className="text-xs"
                      data-testid="button-toggle-code"
                    >
                      <Code2 className="w-3.5 h-3.5 mr-1" />
                      {showCode ? "Hide" : "View"} Code
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowAnalysis(!showAnalysis)}
                      className="text-xs"
                      data-testid="button-toggle-analysis"
                    >
                      <BarChart3 className="w-3.5 h-3.5 mr-1" />
                      Analysis
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Code viewer */}
          {showCode && code && (
            <Card>
              <CardContent className="p-0">
                <pre className="text-xs font-mono p-4 overflow-auto max-h-64 text-muted-foreground bg-card rounded-lg">
                  {code}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Chat input */}
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={code ? "Tell me what to change..." : "Describe a game or environment..."}
              className="flex-1 min-h-[48px] max-h-32 resize-none rounded-lg border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-shadow"
              rows={1}
              data-testid="input-prompt"
            />
            <Button
              type="submit"
              size="icon"
              disabled={generating || !prompt.trim()}
              className="h-[48px] w-[48px] shrink-0"
              data-testid="button-send"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>

          {/* Chat history */}
          {chatHistory.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 text-xs ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-lg ${
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground"
                        : msg.content.startsWith("Error")
                        ? "bg-destructive/10 text-destructive"
                        : "bg-card border border-border text-muted-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Right: World Model Analysis panel */}
        <div className="space-y-4">
          {/* Analysis panel */}
          {(analyzing || analysis) && showAnalysis && (
            <>
              {analyzing ? (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ) : analysis ? (
                <>
                  {/* State & Action Space */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Layers className="w-4 h-4 text-primary" />
                        State Space
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {analysis.stateSpace.variables.map((v, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px] font-mono">
                            {v}
                          </Badge>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Dimensionality</span>
                          <p className="font-mono mt-0.5">{analysis.stateSpace.dimensionality}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Observability</span>
                          <p className="mt-0.5 capitalize">{analysis.stateSpace.observability}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Target className="w-4 h-4 text-primary" />
                        Action Space
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {analysis.actionSpace.actions.map((a, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">
                            {a}
                          </Badge>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Type</span>
                          <p className="mt-0.5 capitalize">{analysis.actionSpace.type}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Size</span>
                          <p className="mt-0.5">{analysis.actionSpace.size}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dynamics */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        Dynamics
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="capitalize">{analysis.dynamics.type}</Badge>
                        {analysis.dynamics.physicsBased && (
                          <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            Physics
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground">Key rules</span>
                        {analysis.dynamics.keyRules.map((rule, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                            <span className="text-muted-foreground">{rule}</span>
                          </div>
                        ))}
                      </div>
                      {analysis.dynamics.nonlinearities.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs text-muted-foreground">Nonlinearities</span>
                          <div className="space-y-1">
                            {analysis.dynamics.nonlinearities.map((n, i) => (
                              <div key={i} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                                <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                <span className="leading-relaxed">{n}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Complexity */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        Complexity
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${(analysis.complexity.score / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{analysis.complexity.score}/10</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Horizon</span>
                          <p className="mt-0.5 capitalize">{analysis.complexity.horizon}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Multi-agent</span>
                          <p className="mt-0.5">{analysis.complexity.multiAgent ? "Yes" : "No"}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Partial obs.</span>
                          <p className="mt-0.5">{analysis.complexity.partialObservability ? "Yes" : "No"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Model Challenges */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Brain className="w-4 h-4 text-primary" />
                        Architecture Challenges
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysis.modelChallenges.map((mc, i) => (
                        <div key={i} className="space-y-1 p-2.5 rounded-md bg-accent/30">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium">{mc.architecture}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] capitalize ${difficultyColors[mc.difficulty] || ""}`}
                            >
                              {mc.difficulty}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{mc.reason}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </>
              ) : null}
            </>
          )}

          {/* Empty state for analysis panel */}
          {!analysis && !analyzing && (
            <Card>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
                <Brain className="w-8 h-8 text-muted-foreground/30" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">World Model Analysis</p>
                  <p className="text-xs text-muted-foreground/70 max-w-xs">
                    Generate an environment to see state space, dynamics, complexity, and which architectures would struggle to learn it.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
