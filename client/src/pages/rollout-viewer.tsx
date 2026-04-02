import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send,
  RotateCcw,
  Sparkles,
  Loader2,
  Wand2,
  AlertCircle,
  Eye,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Info,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  getModulatedCurves,
  estimateReliableHorizon,
  FAILURE_CATALOG,
  type ComplexityProfile,
  type DegradationCurve,
  type FailureSignature,
} from "@/lib/empirical-data";

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

// Architecture display configs
const ARCH_CONFIG: Record<string, {
  color: string;
  stroke: string;
  bg: string;
  text: string;
  border: string;
  badgeBg: string;
}> = {
  "DIAMOND": {
    color: "#f43f5e",
    stroke: "#f43f5e",
    bg: "bg-rose-500/10",
    text: "text-rose-500 dark:text-rose-400",
    border: "border-rose-500/30",
    badgeBg: "bg-rose-500/15",
  },
  "IRIS": {
    color: "#8b5cf6",
    stroke: "#8b5cf6",
    bg: "bg-violet-500/10",
    text: "text-violet-500 dark:text-violet-400",
    border: "border-violet-500/30",
    badgeBg: "bg-violet-500/15",
  },
  "DreamerV3": {
    color: "#06b6d4",
    stroke: "#06b6d4",
    bg: "bg-cyan-500/10",
    text: "text-cyan-500 dark:text-cyan-400",
    border: "border-cyan-500/30",
    badgeBg: "bg-cyan-500/15",
  },
  "MuZero": {
    color: "#10b981",
    stroke: "#10b981",
    bg: "bg-emerald-500/10",
    text: "text-emerald-500 dark:text-emerald-400",
    border: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/15",
  },
};

const SEVERITY_CONFIG = {
  mild: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20", dot: "bg-amber-400" },
  moderate: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20", dot: "bg-orange-400" },
  severe: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/20", dot: "bg-rose-400" },
  catastrophic: { bg: "bg-red-600/10", text: "text-red-600 dark:text-red-400", border: "border-red-600/20", dot: "bg-red-500" },
};

// Build chart data from multiple curves — merged by t-value
function buildChartData(curves: DegradationCurve[]): Record<string, number | string>[] {
  const tSet = new Set<number>();
  for (const c of curves) {
    for (const point of c.curve) tSet.add(point.t);
  }
  const tValues = Array.from(tSet).sort((a, b) => a - b);

  return tValues.map((t) => {
    const row: Record<string, number | string> = { t };
    for (const c of curves) {
      const point = c.curve.find((p) => p.t === t);
      if (point) row[c.shortName] = point.quality;
    }
    return row;
  });
}

// Find which failures are active at a given step
function getActiveFailuresAtStep(curves: DegradationCurve[], step: number): {
  arch: string;
  failure: DegradationCurve["failures"][number];
}[] {
  const active: { arch: string; failure: DegradationCurve["failures"][number] }[] = [];
  for (const c of curves) {
    for (const f of c.failures) {
      if (f.onset <= step) {
        active.push({ arch: c.shortName, failure: f });
      }
    }
  }
  return active;
}

// Custom tooltip for the Recharts chart
function DegradationTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
      <p className="font-mono text-muted-foreground mb-2">t = {label} steps</p>
      {payload.map((entry: any) => {
        const cfg = ARCH_CONFIG[entry.dataKey];
        return (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: cfg?.color || entry.color }} />
              <span className="text-foreground">{entry.dataKey}</span>
            </span>
            <span className="font-mono font-semibold" style={{ color: cfg?.color || entry.color }}>
              {(entry.value * 100).toFixed(0)}%
            </span>
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground/60 mt-2 border-t border-border pt-1.5">
        Quality = modulated empirical SSIM
      </p>
    </div>
  );
}

// Failure timeline component
function FailureTimeline({ curves, selectedStep, onStepClick }: {
  curves: DegradationCurve[];
  selectedStep: number | null;
  onStepClick: (step: number) => void;
}) {
  const MAX_STEP = 1000;
  const DISPLAY_MAX = 200; // show up to 200 on timeline for readability

  return (
    <div className="space-y-2">
      {curves.map((curve) => {
        const cfg = ARCH_CONFIG[curve.shortName];
        return (
          <div key={curve.shortName} className="flex items-start gap-3">
            <span className={`text-[11px] font-medium w-24 shrink-0 pt-0.5 ${cfg?.text}`}>
              {curve.shortName}
            </span>
            <div className="relative flex-1 h-6">
              {/* Track */}
              <div className="absolute inset-y-[10px] inset-x-0 h-[2px] rounded-full bg-border" />
              {/* Failure markers */}
              {curve.failures.map((f, i) => {
                const pct = Math.min(f.onset / DISPLAY_MAX, 1) * 100;
                const sevCfg = SEVERITY_CONFIG[f.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.moderate;
                return (
                  <button
                    key={i}
                    title={`t=${f.onset}: ${f.description}`}
                    onClick={() => onStepClick(f.onset)}
                    className="absolute top-0 -translate-x-1/2 group"
                    style={{ left: `${pct}%` }}
                    data-testid={`failure-marker-${curve.shortName}-${i}`}
                  >
                    <div className={`w-3 h-3 rounded-full border-2 transition-transform group-hover:scale-125 ${sevCfg.dot} border-background`} />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                      <div className="bg-popover border border-border rounded-md shadow-lg p-2 text-[10px] w-48 whitespace-normal text-left">
                        <p className="font-mono text-muted-foreground mb-1">onset t≈{f.onset}</p>
                        <p className="text-foreground leading-relaxed">{f.description}</p>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded-sm text-[9px] font-medium ${sevCfg.bg} ${sevCfg.text}`}>
                          {f.severity}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {/* Selected step cursor */}
              {selectedStep !== null && (
                <div
                  className="absolute top-0 bottom-0 -translate-x-1/2 w-[2px] bg-primary/70 rounded-full"
                  style={{ left: `${Math.min(selectedStep / DISPLAY_MAX, 1) * 100}%` }}
                />
              )}
              {/* Step labels */}
              <div className="absolute -bottom-4 left-0 text-[9px] text-muted-foreground/50 font-mono">0</div>
              <div className="absolute -bottom-4 right-0 text-[9px] text-muted-foreground/50 font-mono">200+</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Reliable horizon bar chart
function HorizonSummary({ horizons, curves }: { horizons: Record<string, number>; curves: DegradationCurve[] }) {
  const maxHorizon = Math.max(...Object.values(horizons), 1);

  return (
    <div className="space-y-2">
      {Object.entries(horizons).map(([arch, horizon]) => {
        const cfg = ARCH_CONFIG[arch];
        const curve = curves.find((c) => c.shortName === arch);
        const pct = (horizon / Math.max(maxHorizon, 200)) * 100;
        return (
          <div key={arch} className="flex items-center gap-3">
            <span className={`text-[11px] font-medium w-24 shrink-0 ${cfg?.text}`}>{arch}</span>
            <div className="flex-1 h-5 bg-muted rounded-sm overflow-hidden relative">
              <div
                className="h-full rounded-sm transition-all duration-700"
                style={{ width: `${pct}%`, backgroundColor: cfg?.color }}
              />
            </div>
            <span className="text-[11px] font-mono text-muted-foreground w-16 text-right">
              {horizon} steps
            </span>
            {curve && (
              <a
                href={curve.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground/50 hover:text-primary transition-colors"
                title={curve.source}
                data-testid={`source-link-${arch}`}
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );
      })}
      <p className="text-[10px] text-muted-foreground/60 pt-1">
        Reliable horizon = last step where predicted quality ≥ 0.5. Modulated by environment complexity.
      </p>
    </div>
  );
}

// Active failure signatures panel
function ActiveFailures({ curves, step }: { curves: DegradationCurve[]; step: number }) {
  const activeFailures = getActiveFailuresAtStep(curves, step);

  if (activeFailures.length === 0) {
    return (
      <p className="text-xs text-muted-foreground/60 italic">
        No failure signatures active at t={step}. Quality predictions are within reliable range.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {activeFailures.map(({ arch, failure }, i) => {
        const cfg = ARCH_CONFIG[arch];
        const sevCfg = SEVERITY_CONFIG[failure.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.moderate;
        // Find matching catalog entry for source citation
        const catalogEntry = FAILURE_CATALOG.find(
          (e) =>
            e.description.toLowerCase().includes(failure.description.toLowerCase().slice(0, 30))
        );
        return (
          <div key={i} className={`rounded-md p-2.5 border ${sevCfg.bg} ${sevCfg.border}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`text-[11px] font-semibold ${cfg?.text}`}>{arch}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-medium ${sevCfg.bg} ${sevCfg.text}`}>
                {failure.severity} · onset t≈{failure.onset}
              </span>
            </div>
            <p className="text-[11px] text-foreground leading-relaxed">{failure.description}</p>
            {catalogEntry && (
              <a
                href={catalogEntry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1 mt-1.5 text-[10px] ${sevCfg.text} hover:underline opacity-80`}
              >
                <ExternalLink className="w-2.5 h-2.5" />
                {catalogEntry.source}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Source citations panel
function SourceCitations({ curves }: { curves: DegradationCurve[] }) {
  const allSources: { name: string; url: string; arch: string }[] = [];
  const seen = new Set<string>();

  for (const c of curves) {
    if (!seen.has(c.sourceUrl)) {
      allSources.push({ name: c.source, url: c.sourceUrl, arch: c.shortName });
      seen.add(c.sourceUrl);
    }
  }

  // Add FAILURE_CATALOG sources
  for (const f of FAILURE_CATALOG) {
    if (!seen.has(f.sourceUrl)) {
      allSources.push({ name: f.source, url: f.sourceUrl, arch: f.architecture });
      seen.add(f.sourceUrl);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {allSources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
          data-testid={`citation-${i}`}
        >
          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          {s.name}
        </a>
      ))}
    </div>
  );
}

export default function RolloutViewer() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [computing, setComputing] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [complexityProfile, setComplexityProfile] = useState<ComplexityProfile | null>(null);
  const [curves, setCurves] = useState<DegradationCurve[] | null>(null);
  const [horizons, setHorizons] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [chartClickStep, setChartClickStep] = useState<number | null>(null);
  const [showFailureDetail, setShowFailureDetail] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (code && iframeRef.current) {
      iframeRef.current.srcdoc = buildGameHtml(code);
    }
  }, [code]);

  // When new curves arrive, reset chart state
  useEffect(() => {
    if (curves) {
      setSelectedStep(null);
      setChartClickStep(null);
      setShowFailureDetail(false);
    }
  }, [curves]);

  const generate = async (userPrompt: string) => {
    if (!userPrompt.trim()) return;
    setError(null);
    setGenerating(true);
    setCurves(null);
    setHorizons(null);
    setComplexityProfile(null);
    setSelectedStep(null);
    setChartClickStep(null);

    try {
      // Step 1: Generate Phaser environment
      const genResponse = await apiRequest("POST", "/api/generate-environment", { prompt: userPrompt });
      const genData = await genResponse.json();

      if (genData.code) {
        setCode(genData.code);
        setGenerating(false);
        setComputing(true);

        // Step 2: Compute real analysis (no LLM rollout simulation)
        const analysisResponse = await apiRequest("POST", "/api/compute-analysis", { code: genData.code, prompt: userPrompt });
        const analysisData = await analysisResponse.json();

        const profile: ComplexityProfile = analysisData.complexityProfile;
        setComplexityProfile(profile);

        // Step 3: Compute modulated degradation curves from empirical data
        const modulatedCurves = getModulatedCurves(profile);
        setCurves(modulatedCurves);

        const reliableHorizons = estimateReliableHorizon(profile);
        setHorizons(reliableHorizons);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to generate. Try again.");
    } finally {
      setGenerating(false);
      setComputing(false);
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
    setCurves(null);
    setHorizons(null);
    setComplexityProfile(null);
    setError(null);
    setSelectedStep(null);
    setChartClickStep(null);
    if (iframeRef.current) iframeRef.current.srcdoc = "";
  };

  const handleChartMouseMove = (data: any) => {
    if (data?.activeLabel !== undefined) {
      setSelectedStep(Number(data.activeLabel));
    }
  };

  const handleChartMouseLeave = () => {
    setSelectedStep(chartClickStep);
  };

  const handleChartClick = (data: any) => {
    if (data?.activeLabel !== undefined) {
      const step = Number(data.activeLabel);
      setChartClickStep(step);
      setSelectedStep(step);
      setShowFailureDetail(true);
    }
  };

  const isLoading = generating || computing;
  const chartData = curves ? buildChartData(curves) : null;
  const displayStep = selectedStep ?? chartClickStep;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Rollout Viewer
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Generate a Phaser environment, then explore empirical degradation curves showing how DIAMOND,
          IRIS, DreamerV3, and MuZero world models degrade over rollout steps — derived from published
          research, not LLM estimates.
        </p>
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe an environment to analyze..."
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

      {/* Example prompts */}
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

      {/* Loading: generating environment */}
      {generating && !code && (
        <Card>
          <CardContent className="p-8 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Generating environment...</p>
          </CardContent>
        </Card>
      )}

      {/* Loading: computing analysis */}
      {computing && (
        <Card>
          <CardContent className="p-6 flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Computing complexity profile...</p>
            <p className="text-xs text-muted-foreground/70 text-center max-w-sm">
              Analyzing state space, action space, transition dynamics, and observability — then
              applying published degradation curves from empirical research.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main content */}
      {code && (
        <div className="space-y-4">
          {/* Row 1: Game preview + complexity profile */}
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Game preview */}
            <Card className="overflow-hidden">
              <CardHeader className="py-2 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Eye className="w-4 h-4 text-primary" />
                    Ground Truth Environment
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { if (iframeRef.current && code) iframeRef.current.srcdoc = buildGameHtml(code); }}
                      data-testid="button-restart"
                    >
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
                  style={{ height: "min(380px, 42vh)" }}
                  sandbox="allow-scripts"
                  data-testid="game-iframe"
                />
              </CardContent>
            </Card>

            {/* Complexity profile */}
            {complexityProfile ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Complexity Profile
                    <Badge variant="outline" className="ml-auto text-[10px] font-mono">
                      composite {complexityProfile.compositeScore.toFixed(1)}/10
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    { label: "State Space", value: complexityProfile.stateSpaceDim, help: "Dimensionality of observable state" },
                    { label: "Action Space", value: complexityProfile.actionSpaceDim, help: "Normalized action space size" },
                    { label: "Transition Complexity", value: complexityProfile.transitionComplexity, help: "Non-linearity of dynamics" },
                    { label: "Observability Gap", value: complexityProfile.observabilityGap, help: "Fraction of state hidden from agent" },
                    { label: "Visual Density", value: complexityProfile.visualDensity, help: "Object count / scene complexity" },
                  ].map(({ label, value, help }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-muted-foreground" title={help}>{label}</span>
                        <span className="text-[11px] font-mono tabular-nums">{(value * 100).toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${value * 100}%`,
                            backgroundColor: value > 0.7 ? "#f43f5e" : value > 0.4 ? "#f59e0b" : "#10b981",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground/60 pt-1">
                    Higher complexity accelerates degradation across all architectures. Curves below are modulated accordingly.
                  </p>
                </CardContent>
              </Card>
            ) : computing ? (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ) : null}
          </div>

          {/* Row 2: Degradation curves chart — centerpiece */}
          {curves && chartData && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Quality Degradation Over Rollout Steps
                  </CardTitle>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Info className="w-3 h-3" />
                    Click chart to inspect failures at that step
                  </div>
                </div>
                {/* Architecture legend */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {curves.map((c) => {
                    const cfg = ARCH_CONFIG[c.shortName];
                    return (
                      <a
                        key={c.shortName}
                        href={c.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
                        title={`Source: ${c.source}`}
                        data-testid={`legend-${c.shortName}`}
                      >
                        <span className="w-4 h-0.5 rounded-full inline-block" style={{ backgroundColor: cfg?.color }} />
                        <span className={`text-[11px] font-medium ${cfg?.text}`}>{c.shortName}</span>
                        <ExternalLink className="w-2.5 h-2.5 text-muted-foreground/40" />
                      </a>
                    );
                  })}
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 8, right: 16, left: -8, bottom: 0 }}
                      onMouseMove={handleChartMouseMove}
                      onMouseLeave={handleChartMouseLeave}
                      onClick={handleChartClick}
                      style={{ cursor: "crosshair" }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="t"
                        scale="log"
                        domain={[1, 1000]}
                        type="number"
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: "Rollout Steps (log scale)", position: "insideBottom", offset: -2, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        ticks={[1, 5, 10, 25, 50, 100, 200, 500, 1000]}
                      />
                      <YAxis
                        domain={[0, 1]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                        label={{ value: "Quality", angle: -90, position: "insideLeft", offset: 16, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<DegradationTooltip />} />
                      {/* Reliable horizon threshold line */}
                      <ReferenceLine
                        y={0.5}
                        stroke="hsl(var(--muted-foreground))"
                        strokeDasharray="4 4"
                        strokeOpacity={0.5}
                        label={{ value: "Reliable horizon", position: "right", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                      />
                      {/* Selected step cursor */}
                      {displayStep !== null && (
                        <ReferenceLine
                          x={displayStep}
                          stroke="hsl(var(--primary))"
                          strokeOpacity={0.7}
                          strokeWidth={1.5}
                        />
                      )}
                      {curves.map((c) => (
                        <Line
                          key={c.shortName}
                          type="monotone"
                          dataKey={c.shortName}
                          stroke={ARCH_CONFIG[c.shortName]?.color}
                          strokeWidth={2}
                          dot={{ r: 3, fill: ARCH_CONFIG[c.shortName]?.color, strokeWidth: 0 }}
                          activeDot={{ r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Methodology note */}
                <p className="text-[10px] text-muted-foreground/50 mt-2">
                  Base curves from published SSIM / dynamics-accuracy measurements. Modulated by this environment's complexity profile (composite score {complexityProfile?.compositeScore.toFixed(1)}/10).
                  Sources: {curves.map((c) => (
                    <a key={c.shortName} href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover:underline text-muted-foreground/70">
                      {c.source}
                    </a>
                  )).reduce<(JSX.Element | string)[]>((acc, el, i) => i === 0 ? [el] : [...acc, " · ", el], [])}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Row 3: Failure Timeline */}
          {curves && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Failure Timeline</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Dot position = empirical onset step. Hover for details, click to jump to that step.
                </p>
              </CardHeader>
              <CardContent className="pt-2 pb-6">
                <FailureTimeline
                  curves={curves}
                  selectedStep={displayStep}
                  onStepClick={(step) => {
                    setChartClickStep(step);
                    setSelectedStep(step);
                    setShowFailureDetail(true);
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Row 4: Reliable Horizon Summary */}
          {curves && horizons && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Reliable Horizon Summary</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  Max rollout steps before predicted quality drops below 50%. Click source links for published evidence.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <HorizonSummary horizons={horizons} curves={curves} />
              </CardContent>
            </Card>
          )}

          {/* Row 5: Failure Signature Detail (on click) */}
          {curves && (
            <Card className={chartClickStep !== null ? "border-primary/30" : ""}>
              <CardHeader className="pb-2">
                <button
                  className="flex items-center justify-between w-full text-left"
                  onClick={() => setShowFailureDetail((v) => !v)}
                  data-testid="button-toggle-failures"
                >
                  <CardTitle className="text-sm font-medium">
                    Failure Signatures
                    {chartClickStep !== null && (
                      <span className="ml-2 text-xs font-mono text-primary">@ t={chartClickStep}</span>
                    )}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-[10px]">
                      {chartClickStep !== null
                        ? `${getActiveFailuresAtStep(curves, chartClickStep).length} active`
                        : "click chart to select step"}
                    </span>
                    {showFailureDetail ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>
              </CardHeader>
              {showFailureDetail && (
                <CardContent className="pt-0">
                  {chartClickStep !== null ? (
                    <ActiveFailures curves={curves} step={chartClickStep} />
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">
                      Click a step on the degradation chart to inspect which failure signatures are active at that point.
                    </p>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Row 6: Source Citations */}
          {curves && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Published Sources</CardTitle>
                <p className="text-[11px] text-muted-foreground">
                  All degradation curves, failure signatures, and horizon estimates are derived from these papers.
                </p>
              </CardHeader>
              <CardContent className="pt-0">
                <SourceCitations curves={curves} />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty state */}
      {!code && !isLoading && (
        <Card>
          <CardContent className="p-12 flex flex-col items-center gap-4 text-center">
            <Wand2 className="w-10 h-10 text-muted-foreground/30" />
            <div className="space-y-1.5 max-w-md">
              <p className="text-sm font-medium text-muted-foreground">Empirical Rollout Analysis</p>
              <p className="text-xs text-muted-foreground/70 leading-relaxed">
                Describe an environment above. The system will generate it as a playable Phaser game,
                compute its complexity profile, then show you how DIAMOND, IRIS, DreamerV3, and MuZero
                degrade over rollout steps — using published degradation curves, not LLM estimates.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {[
                { arch: "DIAMOND", note: "NeurIPS 2024", url: "https://arxiv.org/abs/2405.12399" },
                { arch: "IRIS", note: "ICLR 2023", url: "https://arxiv.org/abs/2209.00588" },
                { arch: "DreamerV3", note: "Nature 2025", url: "https://www.nature.com/articles/s41586-025-08744-2" },
                { arch: "MuZero", note: "Nature 2020", url: "https://arxiv.org/abs/1911.08265" },
              ].map(({ arch, note, url }) => {
                const cfg = ARCH_CONFIG[arch];
                return (
                  <a
                    key={arch}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-full border ${cfg?.border} ${cfg?.badgeBg} ${cfg?.text} hover:opacity-80 transition-opacity`}
                  >
                    <span className="font-medium">{arch}</span>
                    <span className="opacity-60">{note}</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
