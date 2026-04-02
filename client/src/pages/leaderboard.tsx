import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy,
  Brain,
  Zap,
  Eye,
  ChevronDown,
  ChevronUp,
  Trash2,
  Play,
  Loader2,
  Save,
  X,
} from "lucide-react";
import { useCreatedEnvironments, architectureConfig } from "@/lib/data-hooks";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

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

const difficultyColors: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
};

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
</style>
<script src="${PHASER_CDN}"><\/script>
</head>
<body>
<div id="game-container"></div>
<script>
window.onerror = function(msg) {
  document.body.innerHTML = '<div class="error-display"><h3>Error</h3><pre>' + msg + '</pre></div>';
};
try {
  ${gameCode}
  setTimeout(function() {
    if (!document.querySelector('canvas')) {
      document.body.innerHTML = '<div class="error-display"><h3>Failed to render</h3></div>';
    }
  }, 3000);
} catch(e) {
  document.body.innerHTML = '<div class="error-display"><h3>Error</h3><pre>' + e.message + '</pre></div>';
}
<\/script>
</body>
</html>`;
}

type FilterMode = "all" | "easy" | "medium" | "hard";

export default function Leaderboard() {
  const { data: environments, isLoading } = useCreatedEnvironments();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [filterArch, setFilterArch] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Parse analysis for each environment
  const envWithAnalysis = (environments || []).map((env) => {
    let analysis: Analysis | null = null;
    try {
      analysis = JSON.parse(env.analysis);
    } catch {}
    return { ...env, parsedAnalysis: analysis };
  });

  // Filter
  const filtered = envWithAnalysis.filter((env) => {
    if (filterMode !== "all" && env.parsedAnalysis) {
      const hasDifficulty = env.parsedAnalysis.modelChallenges.some(
        (mc) => mc.difficulty === filterMode
      );
      if (!hasDifficulty) return false;
    }
    if (filterArch && env.parsedAnalysis) {
      const archMatch = env.parsedAnalysis.modelChallenges.find(
        (mc) => mc.architecture.includes(filterArch)
      );
      if (!archMatch || archMatch.difficulty !== "hard") return false;
    }
    return true;
  });

  // Sort by complexity score descending
  const sorted = [...filtered].sort((a, b) => b.complexityScore - a.complexityScore);

  useEffect(() => {
    if (previewId && iframeRef.current) {
      const env = envWithAnalysis.find((e) => e.id === previewId);
      if (env) {
        iframeRef.current.srcdoc = buildGameHtml(env.code);
      }
    }
  }, [previewId]);

  const handleDelete = async (id: number) => {
    try {
      await apiRequest("DELETE", `/api/created-environments/${id}`);
      queryClient.invalidateQueries({ queryKey: ["/api/created-environments"] });
      if (expandedId === id) setExpandedId(null);
      if (previewId === id) setPreviewId(null);
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Complexity Leaderboard
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Environments ranked by complexity score. See which are hardest for each architecture.
          Save environments from the Creator to build this collection.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["all", "easy", "medium", "hard"] as FilterMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setFilterMode(mode)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all border capitalize ${
              filterMode === mode
                ? "border-primary bg-primary/10 text-foreground font-medium"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
            data-testid={`filter-${mode}`}
          >
            {mode === "all" ? "All" : `${mode} for some arch`}
          </button>
        ))}
        <div className="h-6 w-px bg-border self-center" />
        {["RSSM", "Transformer", "Diffusion", "MCTS"].map((arch) => (
          <button
            key={arch}
            onClick={() => setFilterArch(filterArch === arch ? null : arch)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all border font-mono ${
              filterArch === arch
                ? "border-primary bg-primary/10 text-foreground font-medium"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
            data-testid={`filter-arch-${arch}`}
          >
            Hard for {arch}
          </button>
        ))}
      </div>

      {/* Preview iframe */}
      {previewId && (
        <Card className="overflow-hidden">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Play className="w-4 h-4 text-primary" />
                Preview: {envWithAnalysis.find((e) => e.id === previewId)?.name}
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setPreviewId(null)} data-testid="button-close-preview">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <iframe
              ref={iframeRef}
              className="w-full bg-[#0f1114]"
              style={{ height: "min(400px, 45vh)" }}
              sandbox="allow-scripts"
              data-testid="preview-iframe"
            />
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sorted.length === 0 && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground/30" />
            <div className="space-y-1.5 max-w-md">
              <p className="text-sm font-medium text-muted-foreground">No environments yet</p>
              <p className="text-xs text-muted-foreground/70">
                {filterMode !== "all" || filterArch
                  ? "No environments match the current filters. Try broadening your search."
                  : "Create environments in the Creator page, then save them to the leaderboard. They'll appear here ranked by complexity."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard list */}
      {sorted.map((env, rank) => {
        const isExpanded = expandedId === env.id;
        const analysis = env.parsedAnalysis;
        return (
          <Card
            key={env.id}
            className={`transition-all ${isExpanded ? "ring-1 ring-primary/30" : ""}`}
            data-testid={`leaderboard-item-${env.id}`}
          >
            <CardContent className="p-0">
              {/* Header row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : env.id)}
                className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors"
                data-testid={`toggle-${env.id}`}
              >
                {/* Rank */}
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-xs font-semibold tabular-nums shrink-0">
                  {rank + 1}
                </div>

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{env.name}</span>
                    <Badge variant="secondary" className="text-[10px] font-mono shrink-0">
                      {env.complexityScore}/10
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {env.prompt || "No prompt"}
                  </p>
                </div>

                {/* Architecture difficulty badges */}
                {analysis && (
                  <div className="hidden sm:flex items-center gap-1">
                    {analysis.modelChallenges.slice(0, 4).map((mc) => (
                      <Badge
                        key={mc.architecture}
                        variant="outline"
                        className={`text-[9px] px-1.5 ${difficultyColors[mc.difficulty] || ""}`}
                      >
                        {mc.architecture.split(" ")[0]}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Complexity bar */}
                <div className="hidden md:flex items-center gap-2 w-24 shrink-0">
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(env.complexityScore / 10) * 100}%` }}
                    />
                  </div>
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded detail */}
              {isExpanded && analysis && (
                <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewId(previewId === env.id ? null : env.id)}
                      data-testid={`preview-${env.id}`}
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      {previewId === env.id ? "Hide Preview" : "Play"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(env.id)}
                      data-testid={`delete-${env.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>

                  {/* State / Action / Dynamics */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">State Space</span>
                      <p className="text-xs font-mono">{analysis.stateSpace.dimensionality}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{analysis.stateSpace.observability}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Action Space</span>
                      <p className="text-xs font-mono">{analysis.actionSpace.size} {analysis.actionSpace.type}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Dynamics</span>
                      <p className="text-xs capitalize">{analysis.dynamics.type}</p>
                      {analysis.dynamics.physicsBased && (
                        <Badge variant="secondary" className="text-[10px]">Physics</Badge>
                      )}
                    </div>
                  </div>

                  {/* Architecture challenges */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5" />
                      Architecture Challenges
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {analysis.modelChallenges.map((mc, i) => (
                        <div key={i} className="p-2.5 rounded-md bg-accent/30 space-y-1">
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
                    </div>
                  </div>

                  {/* Complexity breakdown */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Horizon</span>
                      <p className="capitalize mt-0.5">{analysis.complexity.horizon}</p>
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
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
