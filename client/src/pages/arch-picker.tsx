import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Zap,
  Eye,
  Target,
  ExternalLink,
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { getModulatedCurves, estimateReliableHorizon, FAILURE_CATALOG, type ComplexityProfile } from "@/lib/empirical-data";

// ─── Architecture knowledge base (from published literature) ────────

interface ArchProfile {
  name: string;
  shortName: string;
  family: string;
  color: string;
  colorBg: string;
  colorBorder: string;
  /** Strengths on each complexity dimension (0-1, higher = better at handling it) */
  strengths: {
    stateSpace: number;
    actionSpace: number;
    transitions: number;
    observability: number;
    visual: number;
  };
  /** Key architectural properties */
  properties: {
    latentType: string;
    predictionSpace: string;
    planningMethod: string;
    sampleEfficiency: string;
  };
  /** When to use — empirically grounded conditions */
  bestWhen: string[];
  /** When NOT to use — known failure conditions */
  avoidWhen: string[];
  /** Published performance highlights */
  highlights: { claim: string; source: string; url: string }[];
}

const ARCHITECTURES: ArchProfile[] = [
  {
    name: "RSSM (DreamerV3)",
    shortName: "DreamerV3",
    family: "Recurrent State-Space",
    color: "text-cyan-600 dark:text-cyan-400",
    colorBg: "bg-cyan-500/10",
    colorBorder: "border-cyan-500/30",
    strengths: { stateSpace: 0.8, actionSpace: 0.9, transitions: 0.7, observability: 0.5, visual: 0.6 },
    properties: {
      latentType: "Hybrid (continuous + discrete categorical)",
      predictionSpace: "Latent → decoded to pixels",
      planningMethod: "Latent imagination (actor-critic in dream)",
      sampleEfficiency: "High — learns from ~100K frames",
    },
    bestWhen: [
      "Continuous control with dense rewards (DMC, MuJoCo)",
      "Environments with moderate visual complexity",
      "Large action spaces (continuous 6D+)",
      "Multi-domain deployment with fixed hyperparameters",
    ],
    avoidWhen: [
      "High visual detail matters (pixel-level predictions blur)",
      "Partial observability with long memory requirements",
      "Environments needing pixel-perfect prediction fidelity",
    ],
    highlights: [
      { claim: "Outperforms specialized methods across 150+ tasks with fixed hyperparams", source: "DreamerV3 (Nature 2025)", url: "https://www.nature.com/articles/s41586-025-08744-2" },
      { claim: "1000x data efficiency vs IMPALA/R2D2+ on DMLab", source: "DreamerV3 (Nature 2025)", url: "https://www.nature.com/articles/s41586-025-08744-2" },
      { claim: "First world model to collect diamond in Minecraft", source: "DreamerV3 (arXiv 2023)", url: "https://arxiv.org/abs/2301.04104" },
    ],
  },
  {
    name: "Transformer (IRIS)",
    shortName: "IRIS",
    family: "Autoregressive Transformer",
    color: "text-violet-600 dark:text-violet-400",
    colorBg: "bg-violet-500/10",
    colorBorder: "border-violet-500/30",
    strengths: { stateSpace: 0.7, actionSpace: 0.6, transitions: 0.8, observability: 0.7, visual: 0.7 },
    properties: {
      latentType: "Discrete tokens (VQ-VAE codebook)",
      predictionSpace: "Token sequence → decoded to pixels",
      planningMethod: "Actor-critic on imagined token sequences",
      sampleEfficiency: "Very high — competitive at Atari 100K",
    },
    bestWhen: [
      "Discrete, structured environments (Atari, board games)",
      "Sample efficiency is critical (100K interaction budget)",
      "Environment has compositional/object-like structure",
      "Short-to-medium rollout horizons needed",
    ],
    avoidWhen: [
      "Long rollout horizons (token inconsistencies compound)",
      "Many visually similar objects (tokens collide in codebook)",
      "Continuous control (tokenization loses precision)",
    ],
    highlights: [
      { claim: "Matches DreamerV3 on Atari 100K with 2x fewer parameters", source: "IRIS (ICLR 2023)", url: "https://arxiv.org/abs/2209.00588" },
      { claim: "Discrete tokens capture object-level semantics naturally", source: "IRIS (ICLR 2023)", url: "https://arxiv.org/abs/2209.00588" },
    ],
  },
  {
    name: "Diffusion (DIAMOND)",
    shortName: "DIAMOND",
    family: "Diffusion World Model",
    color: "text-rose-600 dark:text-rose-400",
    colorBg: "bg-rose-500/10",
    colorBorder: "border-rose-500/30",
    strengths: { stateSpace: 0.7, actionSpace: 0.7, transitions: 0.6, observability: 0.8, visual: 0.95 },
    properties: {
      latentType: "None — operates directly on pixels",
      predictionSpace: "Pixel space (denoising diffusion)",
      planningMethod: "Actor-critic on imagined pixel trajectories",
      sampleEfficiency: "High — competitive at Atari 100K",
    },
    bestWhen: [
      "Visual fidelity is critical for downstream learning",
      "Environment has rich visual detail (textures, effects)",
      "Pixel-level accuracy matters for reward detection",
      "Long rollout stability needed (EDM variant stable 1000+ steps)",
    ],
    avoidWhen: [
      "Inference speed is critical (diffusion is slow)",
      "Complex transition dynamics with many interacting objects",
      "Very large action spaces (action conditioning is weaker)",
    ],
    highlights: [
      { claim: "Mean HNS 1.46 on Atari 100K — new SOTA for world-model agents", source: "DIAMOND (NeurIPS 2024)", url: "https://arxiv.org/abs/2405.12399" },
      { claim: "EDM variant stable for 1000+ steps with single denoising step", source: "DIAMOND (NeurIPS 2024)", url: "https://arxiv.org/abs/2405.12399" },
      { claim: "Preserves visual details lost by latent-variable methods", source: "DIAMOND (NeurIPS 2024)", url: "https://arxiv.org/abs/2405.12399" },
    ],
  },
  {
    name: "MCTS + Learned Model (MuZero)",
    shortName: "MuZero",
    family: "Learned Planning",
    color: "text-emerald-600 dark:text-emerald-400",
    colorBg: "bg-emerald-500/10",
    colorBorder: "border-emerald-500/30",
    strengths: { stateSpace: 0.9, actionSpace: 0.5, transitions: 0.9, observability: 0.6, visual: 0.5 },
    properties: {
      latentType: "Learned hidden state (no explicit structure)",
      predictionSpace: "Latent → reward + value + policy (no pixel prediction)",
      planningMethod: "Monte Carlo Tree Search in latent space",
      sampleEfficiency: "Moderate — requires more interaction data",
    },
    bestWhen: [
      "Complex, branching decision trees (Go, Chess, Shogi)",
      "Precise long-term planning is more important than visual prediction",
      "Environment has deep strategic structure",
      "Reward signal is sparse but informative",
    ],
    avoidWhen: [
      "Large action spaces (MCTS tree explodes)",
      "Visual prediction quality matters",
      "Real-time inference needed (MCTS is slow)",
      "Environment dynamics are highly stochastic",
    ],
    highlights: [
      { claim: "Superhuman in Go, Chess, Shogi, and 57 Atari games", source: "MuZero (Nature 2020)", url: "https://arxiv.org/abs/1911.08265" },
      { claim: "Learns environment dynamics without access to game rules", source: "MuZero (Nature 2020)", url: "https://arxiv.org/abs/1911.08265" },
    ],
  },
];

// ─── Scoring logic ────────────────────────────────

interface ArchScore {
  arch: ArchProfile;
  score: number; // 0-100
  breakdown: { dimension: string; weight: number; archStrength: number; envDemand: number; contribution: number }[];
  warnings: string[];
  advantages: string[];
  reliableHorizon: number;
}

function scoreArchitectures(profile: ComplexityProfile): ArchScore[] {
  const horizons = estimateReliableHorizon(profile);

  const dimensions = [
    { key: "stateSpace" as const, label: "State Space", demand: profile.stateSpaceDim, weight: 0.20 },
    { key: "actionSpace" as const, label: "Action Space", demand: profile.actionSpaceDim, weight: 0.15 },
    { key: "transitions" as const, label: "Transition Complexity", demand: profile.transitionComplexity, weight: 0.30 },
    { key: "observability" as const, label: "Observability Gap", demand: profile.observabilityGap, weight: 0.20 },
    { key: "visual" as const, label: "Visual Density", demand: profile.visualDensity, weight: 0.15 },
  ];

  return ARCHITECTURES.map((arch) => {
    const breakdown = dimensions.map((dim) => {
      const archStrength = arch.strengths[dim.key];
      // Score: how well does the architecture handle this demand level?
      // If demand is low, all architectures score well. If demand is high, only strong ones do.
      const gap = Math.max(0, dim.demand - archStrength);
      const contribution = (1 - gap) * dim.weight;
      return {
        dimension: dim.label,
        weight: dim.weight,
        archStrength,
        envDemand: dim.demand,
        contribution: Math.round(contribution * 100) / 100,
      };
    });

    const rawScore = breakdown.reduce((sum, b) => sum + b.contribution, 0);
    const score = Math.round(rawScore * 100);

    // Generate specific warnings based on environment properties
    const warnings: string[] = [];
    const advantages: string[] = [];

    if (profile.observabilityGap > 0.3 && arch.strengths.observability < 0.6) {
      warnings.push("Hidden state variables will cause systematic prediction errors");
    }
    if (profile.transitionComplexity > 0.6 && arch.strengths.transitions < 0.7) {
      warnings.push("Complex dynamics may exceed this architecture's capacity");
    }
    if (profile.visualDensity > 0.6 && arch.strengths.visual > 0.8) {
      advantages.push("Strong visual fidelity matches this environment's complexity");
    }
    if (profile.stateSpaceDim > 0.7 && arch.strengths.stateSpace > 0.8) {
      advantages.push("Well-suited for high-dimensional state spaces");
    }
    if (profile.actionSpaceDim > 0.5 && arch.strengths.actionSpace < 0.6) {
      warnings.push("Large action space may reduce planning effectiveness");
    }

    return {
      arch,
      score,
      breakdown,
      warnings,
      advantages,
      reliableHorizon: horizons[arch.shortName] || 0,
    };
  }).sort((a, b) => b.score - a.score);
}

// ─── Component ────────────────────────────────

export default function ArchPicker() {
  const [profile, setProfile] = useState<ComplexityProfile>({
    stateSpaceDim: 0.35,
    actionSpaceDim: 0.40,
    transitionComplexity: 0.30,
    observabilityGap: 0.10,
    visualDensity: 0.35,
    compositeScore: 3.2,
  });

  const [showDetails, setShowDetails] = useState<string | null>(null);

  const scores = useMemo(() => scoreArchitectures(profile), [profile]);

  const radarData = useMemo(() => {
    return [
      { dimension: "State Space", ...Object.fromEntries(ARCHITECTURES.map((a) => [a.shortName, a.strengths.stateSpace * 100])), environment: profile.stateSpaceDim * 100 },
      { dimension: "Action Space", ...Object.fromEntries(ARCHITECTURES.map((a) => [a.shortName, a.strengths.actionSpace * 100])), environment: profile.actionSpaceDim * 100 },
      { dimension: "Transitions", ...Object.fromEntries(ARCHITECTURES.map((a) => [a.shortName, a.strengths.transitions * 100])), environment: profile.transitionComplexity * 100 },
      { dimension: "Observability", ...Object.fromEntries(ARCHITECTURES.map((a) => [a.shortName, a.strengths.observability * 100])), environment: profile.observabilityGap * 100 },
      { dimension: "Visual", ...Object.fromEntries(ARCHITECTURES.map((a) => [a.shortName, a.strengths.visual * 100])), environment: profile.visualDensity * 100 },
    ];
  }, [profile]);

  const updateDimension = (key: keyof ComplexityProfile, value: number) => {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      // Recompute composite
      next.compositeScore = Math.round((
        0.20 * next.stateSpaceDim +
        0.15 * next.actionSpaceDim +
        0.30 * next.transitionComplexity +
        0.20 * next.observabilityGap +
        0.15 * next.visualDensity
      ) * 10 * 10) / 10;
      return next;
    });
  };

  const archColors: Record<string, string> = {
    DreamerV3: "#06b6d4",
    IRIS: "#8b5cf6",
    DIAMOND: "#f43f5e",
    MuZero: "#10b981",
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Architecture Picker
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Given an environment's complexity profile, see which world model architecture is best suited —
          with transparent scoring grounded in published empirical data.
          Adjust the sliders or generate an environment in the Creator to auto-populate.
        </p>
      </div>

      <div className="grid lg:grid-cols-[340px_1fr] gap-6">
        {/* Left: Environment sliders */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Environment Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { key: "stateSpaceDim" as const, label: "State Space", desc: "Number and dimensionality of state variables" },
                { key: "actionSpaceDim" as const, label: "Action Space", desc: "Number and type of available actions" },
                { key: "transitionComplexity" as const, label: "Transition Complexity", desc: "Branching, collisions, nonlinearities in dynamics" },
                { key: "observabilityGap" as const, label: "Observability Gap", desc: "Hidden variables that affect transitions but aren't rendered" },
                { key: "visualDensity" as const, label: "Visual Density", desc: "Number of objects, colors, effects on screen" },
              ]).map(({ key, label, desc }) => (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{label}</span>
                    <span className="text-xs font-mono text-muted-foreground tabular-nums">
                      {Math.round(profile[key] * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(profile[key] * 100)}
                    onChange={(e) => updateDimension(key, Number(e.target.value) / 100)}
                    className="w-full h-1.5 rounded-full appearance-none bg-accent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer"
                    data-testid={`slider-${key}`}
                  />
                  <p className="text-[10px] text-muted-foreground/70">{desc}</p>
                </div>
              ))}

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">Composite Score</span>
                  <Badge variant="secondary" className="font-mono text-xs">{profile.compositeScore}/10</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-1">
                  = 0.20·state + 0.15·action + 0.30·transitions + 0.20·observability + 0.15·visual
                </p>
              </div>

              {/* Presets */}
              <div className="space-y-1.5 pt-2 border-t border-border">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: "Atari Pong", p: { stateSpaceDim: 0.25, actionSpaceDim: 0.20, transitionComplexity: 0.20, observabilityGap: 0.05, visualDensity: 0.15, compositeScore: 2.0 } },
                    { label: "Atari Breakout", p: { stateSpaceDim: 0.35, actionSpaceDim: 0.30, transitionComplexity: 0.40, observabilityGap: 0.05, visualDensity: 0.30, compositeScore: 3.2 } },
                    { label: "DMC Humanoid", p: { stateSpaceDim: 0.85, actionSpaceDim: 0.85, transitionComplexity: 0.70, observabilityGap: 0.10, visualDensity: 0.50, compositeScore: 6.0 } },
                    { label: "Minecraft", p: { stateSpaceDim: 0.90, actionSpaceDim: 0.80, transitionComplexity: 0.85, observabilityGap: 0.40, visualDensity: 0.80, compositeScore: 7.6 } },
                    { label: "Go (Board)", p: { stateSpaceDim: 0.95, actionSpaceDim: 0.95, transitionComplexity: 0.95, observabilityGap: 0.0, visualDensity: 0.10, compositeScore: 6.8 } },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => setProfile(preset.p)}
                      className="text-[10px] px-2 py-1 rounded border border-border bg-card hover:border-primary/50 transition-colors"
                      data-testid={`preset-${preset.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Radar chart: architecture capabilities vs environment demands */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                Architecture Capabilities vs Environment Demands
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} stroke="hsl(var(--border))" />
                    {ARCHITECTURES.map((arch) => (
                      <Radar
                        key={arch.shortName}
                        name={arch.shortName}
                        dataKey={arch.shortName}
                        stroke={archColors[arch.shortName]}
                        fill={archColors[arch.shortName]}
                        fillOpacity={0.05}
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                      />
                    ))}
                    <Radar
                      name="Environment"
                      dataKey="environment"
                      stroke="hsl(var(--foreground))"
                      fill="hsl(var(--foreground))"
                      fillOpacity={0.08}
                      strokeWidth={2}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                      formatter={(value: number) => `${value}%`}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1">
                Dashed lines = architecture capability ceilings. Solid = environment demand. Where demand exceeds capability, expect degradation.
              </p>
            </CardContent>
          </Card>

          {/* Architecture rankings */}
          <div className="space-y-3">
            {scores.map((s, rank) => {
              const isExpanded = showDetails === s.arch.shortName;
              return (
                <Card
                  key={s.arch.shortName}
                  className={`transition-all ${rank === 0 ? `ring-1 ${s.arch.colorBorder}` : ""}`}
                  data-testid={`arch-result-${s.arch.shortName.toLowerCase()}`}
                >
                  <CardContent className="p-0">
                    <button
                      onClick={() => setShowDetails(isExpanded ? null : s.arch.shortName)}
                      className="w-full p-4 flex items-center gap-4 text-left hover:bg-accent/30 transition-colors"
                      data-testid={`toggle-${s.arch.shortName.toLowerCase()}`}
                    >
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${rank === 0 ? s.arch.colorBg + " " + s.arch.color : "bg-accent text-muted-foreground"}`}>
                        {rank + 1}
                      </div>

                      {/* Name + family */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${rank === 0 ? s.arch.color : ""}`}>{s.arch.name}</span>
                          {rank === 0 && <Badge className={`text-[10px] ${s.arch.colorBg} ${s.arch.color} border-0`}>Best fit</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{s.arch.family}</p>
                      </div>

                      {/* Score bar */}
                      <div className="flex items-center gap-2 w-32 shrink-0">
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${s.score}%`, backgroundColor: archColors[s.arch.shortName] }}
                          />
                        </div>
                        <span className="text-xs font-mono font-semibold tabular-nums w-8 text-right">{s.score}</span>
                      </div>

                      {/* Horizon */}
                      <div className="hidden sm:block text-right shrink-0 w-20">
                        <span className="text-xs text-muted-foreground">Horizon</span>
                        <p className="text-xs font-mono font-medium">{s.reliableHorizon} steps</p>
                      </div>

                      {/* Warnings indicator */}
                      <div className="shrink-0 w-6">
                        {s.warnings.length > 0 ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
                        {/* Scoring breakdown */}
                        <div className="space-y-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Scoring Breakdown</span>
                          <div className="space-y-1">
                            {s.breakdown.map((b) => (
                              <div key={b.dimension} className="flex items-center gap-2 text-xs">
                                <span className="w-32 text-muted-foreground">{b.dimension}</span>
                                <div className="flex-1 flex items-center gap-1.5">
                                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${b.archStrength * 100}%`, backgroundColor: archColors[s.arch.shortName] }}
                                    />
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground w-8">
                                    {Math.round(b.archStrength * 100)}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">vs</span>
                                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full bg-foreground/50" style={{ width: `${b.envDemand * 100}%` }} />
                                  </div>
                                  <span className="text-[10px] font-mono text-muted-foreground w-8">
                                    {Math.round(b.envDemand * 100)}%
                                  </span>
                                  <span className="text-[10px] text-muted-foreground/50 w-6">
                                    ×{b.weight}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Warnings + advantages */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          {s.advantages.length > 0 && (
                            <div className="space-y-1">
                              {s.advantages.map((a, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">{a}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {s.warnings.length > 0 && (
                            <div className="space-y-1">
                              {s.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                                  <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                  <span className="text-muted-foreground">{w}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Properties */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(s.arch.properties).map(([key, val]) => (
                            <div key={key} className="space-y-0.5">
                              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                              <p className="text-[11px]">{val}</p>
                            </div>
                          ))}
                        </div>

                        {/* Best/avoid conditions */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Best when</span>
                            {s.arch.bestWhen.map((b, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                <span>{b}</span>
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Avoid when</span>
                            {s.arch.avoidWhen.map((a, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                <div className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                                <span>{a}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Published highlights */}
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">Published Results</span>
                          {s.arch.highlights.map((h, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px]">
                              <Target className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">
                                {h.claim}{" "}
                                <a href={h.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                                  [{h.source}] <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Methodology note */}
          <Card className="bg-accent/30 border-dashed">
            <CardContent className="p-3 flex items-start gap-2 text-[11px] text-muted-foreground">
              <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Methodology.</span> Scores are computed from published capability profiles of each architecture, weighted against the environment's complexity dimensions.
                The weights (0.30 transitions, 0.20 state/observability, 0.15 action/visual) reflect that transition dynamics are the primary bottleneck for world model learning.
                Capability profiles are derived from benchmark results in DreamerV3 (Nature 2025), IRIS (ICLR 2023), DIAMOND (NeurIPS 2024), and MuZero (Nature 2020).
                This is a heuristic tool, not a guarantee — real performance depends on hyperparameters, training data, and implementation details.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
