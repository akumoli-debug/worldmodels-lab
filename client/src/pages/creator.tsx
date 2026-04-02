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
  Layers,
  Zap,
  Target,
  Code2,
  BarChart3,
  Loader2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Activity,
  Hash,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Save, Check } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StateVariable {
  name: string;
  type: string;
  causal: boolean;
  observed: boolean;
}

interface ComplexityProfile {
  stateSpaceDim: number;
  actionSpaceDim: number;
  transitionComplexity: number;
  observabilityGap: number;
  visualDensity: number;
}

interface ComputedAnalysis {
  stateVariables: StateVariable[];
  actionSpace: string[];
  updateComplexity?: string;
  codeMetrics?: {
    compressionRatio?: number;
    functionCount?: number;
    physicsBodies?: number;
    cyclomaticComplexity?: number;
  };
  observability?: {
    ratio?: number;
    hiddenCount?: number;
  };
  estimatedVisualComplexity?: number;
  complexityProfile?: ComplexityProfile;
  compositeScore?: number;
}

interface QualitativeAnalysis {
  dynamics?: {
    type?: string;
    physicsBased?: boolean;
    keyRules?: string[];
    nonlinearities?: string[];
  };
  modelChallenges?: {
    architecture: string;
    difficulty: string;
    reason: string;
  }[];
  horizon?: string;
  multiAgent?: boolean;
}

interface Analysis {
  // New structured format
  computed?: ComputedAnalysis;
  qualitative?: QualitativeAnalysis;
  // Legacy format (backward compat)
  stateSpace?: {
    variables: string[];
    dimensionality: string;
    observability: string;
  };
  actionSpace?: {
    actions: string[];
    type: string;
    size: string;
  };
  dynamics?: {
    type: string;
    physicsBased: boolean;
    keyRules: string[];
    nonlinearities: string[];
  };
  complexity?: {
    score: number;
    horizon: string;
    multiAgent: boolean;
    partialObservability: boolean;
  };
  modelChallenges?: {
    architecture: string;
    difficulty: string;
    reason: string;
  }[];
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

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
  document.body.innerHTML = '<div class="error-display"><h3>Runtime Error</h3><pre>' + msg + '</pre><p style="margin-top:16px;color:#888;font-size:12px;">Try describing the environment differently, or click New to start over.</p></div>';
}

window.onerror = function(msg) { showError(msg); };

try {
  ${gameCode}

  // Verify Phaser actually started — if no canvas after 3s, show error
  setTimeout(function() {
    if (!document.querySelector('canvas')) {
      showError('Game failed to render. The generated code may not have created a valid Phaser scene.');
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getComputedScore(analysis: Analysis): number {
  if (analysis.computed?.compositeScore != null) return analysis.computed.compositeScore;
  if (analysis.complexity?.score != null) return analysis.complexity.score;
  return 0;
}

function fmt(val: number | undefined, decimals = 1): string {
  if (val == null) return "—";
  return Number(val).toFixed(decimals);
}

// Label badges for computed vs estimated
function ComputedLabel() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5">
      <CheckCircle2 className="w-2.5 h-2.5" />
      Computed
    </span>
  );
}

function EstimatedLabel() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
      <span className="font-bold leading-none">~</span>
      Estimated
    </span>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────────────

function AnalysisPanel({
  analysis,
  analyzing,
  showAnalysis,
}: {
  analysis: Analysis | null;
  analyzing: boolean;
  showAnalysis: boolean;
}) {
  // Loading skeleton
  if (analyzing && showAnalysis) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (analysis && showAnalysis) {
    const computed = analysis.computed;
    const qualitative = analysis.qualitative;

    // Radar data
    const profile = computed?.complexityProfile;
    const radarData = profile
      ? [
          { axis: "State", value: profile.stateSpaceDim },
          { axis: "Action", value: profile.actionSpaceDim },
          { axis: "Transition", value: profile.transitionComplexity },
          { axis: "Observ. Gap", value: profile.observabilityGap },
          { axis: "Visual", value: profile.visualDensity },
        ]
      : null;

    const compositeScore = getComputedScore(analysis);

    // State variables — prefer computed, fall back to legacy
    const stateVars: StateVariable[] | null =
      computed?.stateVariables?.length
        ? computed.stateVariables
        : analysis.stateSpace?.variables?.map((v) => ({
            name: v,
            type: "unknown",
            causal: false,
            observed: true,
          })) || null;

    const hiddenVars = stateVars?.filter((v) => !v.observed) || [];

    // Action space — prefer computed, fall back to legacy
    const actionList: string[] =
      computed?.actionSpace?.length
        ? computed.actionSpace
        : analysis.actionSpace?.actions || [];

    // Code metrics
    const metrics = computed?.codeMetrics;

    // Dynamics — prefer qualitative, fall back to legacy
    const dynamics = qualitative?.dynamics || analysis.dynamics;
    const modelChallenges =
      qualitative?.modelChallenges || analysis.modelChallenges || [];

    return (
      <div className="space-y-3" data-testid="analysis-panel">
        {/* ── 1. Complexity Profile (Radar) ── */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                Complexity Profile
              </CardTitle>
              <ComputedLabel />
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 space-y-2">
            {/* Composite score */}
            <div
              className="flex items-center gap-2"
              data-testid="text-composite-score"
            >
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${(compositeScore / 10) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {fmt(compositeScore)}/10
              </span>
            </div>

            {/* Formula tooltip */}
            {profile && (
              <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
                score = 0.25·state + 0.20·action + 0.25·transition + 0.20·obs_gap + 0.10·visual
              </p>
            )}

            {/* Radar */}
            {radarData ? (
              <div style={{ height: 180 }} data-testid="chart-radar">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis
                      dataKey="axis"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.18}
                      strokeWidth={1.5}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 6,
                        fontSize: 11,
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(v: number) => [fmt(v), "Score"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              /* Fallback bar if no profile */
              <div className="text-xs text-muted-foreground">
                Complexity score: {fmt(compositeScore)}/10
              </div>
            )}

            {/* Profile breakdown */}
            {profile && (
              <div className="grid grid-cols-5 gap-1 text-[10px] text-center">
                {[
                  { label: "State", val: profile.stateSpaceDim },
                  { label: "Action", val: profile.actionSpaceDim },
                  { label: "Trans.", val: profile.transitionComplexity },
                  { label: "Obs.", val: profile.observabilityGap },
                  { label: "Visual", val: profile.visualDensity },
                ].map(({ label, val }) => (
                  <div key={label} className="space-y-0.5">
                    <div className="font-mono font-medium">{fmt(val)}</div>
                    <div className="text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 2. Observability Analysis (State Variable Table) ── */}
        {stateVars && stateVars.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-primary shrink-0" />
                  Observability Analysis
                </CardTitle>
                <ComputedLabel />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {/* Summary badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {hiddenVars.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-1.5 py-0.5"
                    data-testid="badge-hidden-count"
                  >
                    <EyeOff className="w-2.5 h-2.5" />
                    {hiddenVars.length} hidden causal variable{hiddenVars.length !== 1 ? "s" : ""}
                  </span>
                )}
                {computed?.observability?.ratio != null && (
                  <span className="text-[10px] text-muted-foreground">
                    {(computed.observability.ratio * 100).toFixed(0)}% observable
                  </span>
                )}
              </div>

              {/* State variable table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]" data-testid="table-state-vars">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Variable</th>
                      <th className="text-left py-1 pr-2 text-muted-foreground font-medium">Type</th>
                      <th className="text-center py-1 pr-2 text-muted-foreground font-medium">Causal</th>
                      <th className="text-center py-1 text-muted-foreground font-medium">Observed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateVars.map((v, i) => {
                      const isHiddenCausal = v.causal && !v.observed;
                      return (
                        <tr
                          key={i}
                          className={`border-b border-border/50 ${isHiddenCausal ? "bg-rose-500/5" : ""}`}
                          data-testid={`row-state-var-${i}`}
                        >
                          <td
                            className={`py-1.5 pr-2 font-mono ${
                              isHiddenCausal
                                ? "text-rose-600 dark:text-rose-400 font-semibold"
                                : "text-foreground"
                            }`}
                          >
                            {v.name}
                            {isHiddenCausal && (
                              <span className="ml-1 text-[9px] text-rose-500 uppercase tracking-wide">hidden</span>
                            )}
                          </td>
                          <td className="py-1.5 pr-2 text-muted-foreground">{v.type}</td>
                          <td className="py-1.5 pr-2 text-center">
                            {v.causal ? (
                              <span className="text-amber-500">✓</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                          <td className="py-1.5 text-center">
                            {v.observed ? (
                              <span className="text-emerald-500">✓</span>
                            ) : (
                              <span className="text-rose-500">✗</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hiddenVars.length > 0 && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 leading-relaxed">
                  Hidden causal variables are not directly observable but drive state transitions — the core challenge for world model learning.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── 3. Code Metrics ── */}
        {metrics && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary shrink-0" />
                  Code Metrics
                </CardTitle>
                <ComputedLabel />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs" data-testid="grid-code-metrics">
                {metrics.compressionRatio != null && (
                  <div>
                    <span className="text-muted-foreground">Compression ratio</span>
                    <p className="font-mono mt-0.5">{fmt(metrics.compressionRatio, 2)}</p>
                  </div>
                )}
                {metrics.functionCount != null && (
                  <div>
                    <span className="text-muted-foreground">Functions</span>
                    <p className="font-mono mt-0.5">{metrics.functionCount}</p>
                  </div>
                )}
                {metrics.physicsBodies != null && (
                  <div>
                    <span className="text-muted-foreground">Physics bodies</span>
                    <p className="font-mono mt-0.5">{metrics.physicsBodies}</p>
                  </div>
                )}
                {metrics.cyclomaticComplexity != null && (
                  <div>
                    <span className="text-muted-foreground">Cyclomatic complexity</span>
                    <p className="font-mono mt-0.5">{metrics.cyclomaticComplexity}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── 4. Action Space (Computed) ── */}
        {actionList.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary shrink-0" />
                  Action Space
                </CardTitle>
                <ComputedLabel />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="flex flex-wrap gap-1" data-testid="list-actions">
                {actionList.map((a, i) => (
                  <Badge key={i} variant="outline" className="text-[10px] font-mono">
                    {a}
                  </Badge>
                ))}
              </div>
              {analysis.actionSpace && (
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
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Divider: LLM-Estimated sections ── */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">
            <span className="font-bold">~</span> LLM-Estimated sections below
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* ── 5. Dynamics (Estimated) ── */}
        {dynamics && (
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                  Dynamics Rules
                </CardTitle>
                <EstimatedLabel />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {dynamics.type && (
                  <Badge variant="secondary" className="capitalize text-[10px]">
                    {dynamics.type}
                  </Badge>
                )}
                {dynamics.physicsBased && (
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px]">
                    Physics-based
                  </Badge>
                )}
              </div>

              {dynamics.keyRules && dynamics.keyRules.length > 0 && (
                <div className="space-y-1" data-testid="list-key-rules">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Key rules</span>
                  {dynamics.keyRules.map((rule, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span className="text-muted-foreground">{rule}</span>
                    </div>
                  ))}
                </div>
              )}

              {dynamics.nonlinearities && dynamics.nonlinearities.length > 0 && (
                <div className="space-y-1" data-testid="list-nonlinearities">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Nonlinearities</span>
                  {dynamics.nonlinearities.map((n, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <span className="leading-relaxed">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── 6. Architecture Challenges (Estimated) ── */}
        {modelChallenges.length > 0 && (
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="w-4 h-4 text-amber-500 shrink-0" />
                  Architecture Challenges
                </CardTitle>
                <EstimatedLabel />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {modelChallenges.map((mc, i) => (
                <div
                  key={i}
                  className="space-y-1 p-2.5 rounded-md bg-accent/30"
                  data-testid={`card-challenge-${i}`}
                >
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
        )}

        {/* ── 7. Qualitative — Horizon & Multi-agent ── */}
        {(qualitative?.horizon || qualitative?.multiAgent != null || analysis.complexity) && (
          <Card className="border-amber-500/20">
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-500 shrink-0" />
                  Environment Properties
                </CardTitle>
                <EstimatedLabel />
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                {(qualitative?.horizon || analysis.complexity?.horizon) && (
                  <div>
                    <span className="text-muted-foreground">Horizon</span>
                    <p className="mt-0.5 capitalize">{qualitative?.horizon || analysis.complexity?.horizon}</p>
                  </div>
                )}
                {(qualitative?.multiAgent != null || analysis.complexity?.multiAgent != null) && (
                  <div>
                    <span className="text-muted-foreground">Multi-agent</span>
                    <p className="mt-0.5">
                      {(qualitative?.multiAgent ?? analysis.complexity?.multiAgent) ? "Yes" : "No"}
                    </p>
                  </div>
                )}
                {analysis.complexity?.partialObservability != null && (
                  <div>
                    <span className="text-muted-foreground">Partial obs.</span>
                    <p className="mt-0.5">{analysis.complexity.partialObservability ? "Yes" : "No"}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Empty state — only show on desktop
  return (
    <Card className="hidden lg:block">
      <CardContent className="p-6 flex flex-col items-center justify-center text-center gap-3">
        <Brain className="w-8 h-8 text-muted-foreground/30" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">World Model Analysis</p>
          <p className="text-xs text-muted-foreground/70 max-w-xs">
            Generate an environment to see state space, dynamics, complexity, and which architectures would struggle to learn it.
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 mt-1">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
            Computed metrics
          </span>
          <span className="flex items-center gap-1">
            <span className="text-amber-500 font-bold">~</span>
            LLM estimates
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
  const [savedToLeaderboard, setSavedToLeaderboard] = useState(false);
  const [saving, setSaving] = useState(false);
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
    setSavedToLeaderboard(false);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = "";
    }
  };

  const saveToLeaderboard = async () => {
    if (!code || !analysis) return;
    setSaving(true);
    try {
      const firstUserMessage = chatHistory.find((m) => m.role === "user")?.content || "Custom Environment";
      const name = firstUserMessage.length > 60 ? firstUserMessage.slice(0, 60) + "..." : firstUserMessage;
      // Use computed score if available, fall back to legacy
      const complexityScore = getComputedScore(analysis);
      await apiRequest("POST", "/api/created-environments", {
        name,
        prompt: firstUserMessage,
        code,
        analysis,
        complexityScore,
      });
      setSavedToLeaderboard(true);
      queryClient.invalidateQueries({ queryKey: ["/api/created-environments"] });
    } catch {
      setError("Failed to save to leaderboard.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Environment Creator
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Describe any 2D game or environment in plain language. AI generates playable Phaser.js code instantly.{" "}
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
                  style={{ height: "min(500px, 55vh)" }}
                  sandbox="allow-scripts"
                  data-testid="game-iframe"
                />
              ) : (
                <div
                  className="w-full flex flex-col items-center justify-center gap-4 text-muted-foreground"
                  style={{ height: "min(500px, 55vh)" }}
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
                    {analysis && (
                      <Button
                        size="sm"
                        variant={savedToLeaderboard ? "ghost" : "outline"}
                        onClick={saveToLeaderboard}
                        disabled={saving || savedToLeaderboard}
                        className="text-xs"
                        data-testid="button-save-leaderboard"
                      >
                        {savedToLeaderboard ? (
                          <><Check className="w-3.5 h-3.5 mr-1" />Saved</>
                        ) : saving ? (
                          <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Saving</>
                        ) : (
                          <><Save className="w-3.5 h-3.5 mr-1" />Save to Leaderboard</>
                        )}
                      </Button>
                    )}
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

          {/* Mobile analysis panel — inline below game */}
          <div className="lg:hidden">
            <AnalysisPanel analysis={analysis} analyzing={analyzing} showAnalysis={showAnalysis} />
          </div>

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

        {/* Right: World Model Analysis panel — desktop only */}
        <div className="hidden lg:block space-y-4">
          <AnalysisPanel analysis={analysis} analyzing={analyzing} showAnalysis={showAnalysis} />
        </div>
      </div>
    </div>
  );
}
