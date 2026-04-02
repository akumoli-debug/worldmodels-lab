import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  ExternalLink,
  Github,
  BookOpen,
  Users,
  GraduationCap,
  Video,
  ChevronDown,
  ChevronUp,
  Box,
  Layers,
  BarChart3,
  Compass,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useEnvironments,
  useModels,
  useBenchmarks,
  useDimensions,
  categoryConfig,
  architectureConfig,
} from "@/lib/data-hooks";
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

type TopTab = "papers" | "code" | "courses" | "community" | "environments" | "models" | "benchmarks";

// ─── Static data ──────────────────────────────────────────

interface Paper {
  title: string;
  authors: string;
  year: number;
  venue: string;
  url: string;
  tags: string[];
  summary: string;
}

const papers: Paper[] = [
  { title: "World Models", authors: "Ha & Schmidhuber", year: 2018, venue: "NeurIPS", url: "https://arxiv.org/abs/1803.10122", tags: ["foundational", "VAE", "RNN"], summary: "Seminal paper introducing the idea of learning a compressed spatial and temporal representation of the environment — V model + M model + C controller." },
  { title: "Dream to Control: Learning Behaviors by Latent Imagination", authors: "Hafner et al.", year: 2020, venue: "ICLR", url: "https://arxiv.org/abs/1912.01603", tags: ["DreamerV1", "RSSM", "latent-imagination"], summary: "Introduces Dreamer, which learns long-horizon behaviors purely from predicted latent trajectories using an RSSM world model." },
  { title: "Mastering Diverse Domains through World Models", authors: "Hafner et al.", year: 2023, venue: "arXiv", url: "https://arxiv.org/abs/2301.04104", tags: ["DreamerV3", "RSSM", "multi-domain"], summary: "DreamerV3 masters a broad range of domains with fixed hyperparameters — from Atari to Minecraft diamond collection." },
  { title: "Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model", authors: "Schrittwieser et al.", year: 2020, venue: "Nature", url: "https://arxiv.org/abs/1911.08265", tags: ["MuZero", "planning", "MCTS"], summary: "MuZero learns environment dynamics without access to game rules, achieving superhuman performance through learned planning." },
  { title: "Transformers are Sample-Efficient World Models (IRIS)", authors: "Micheli et al.", year: 2023, venue: "ICLR", url: "https://arxiv.org/abs/2209.00588", tags: ["IRIS", "transformer", "discrete-tokens"], summary: "IRIS uses a discrete autoencoder and autoregressive transformer as the world model, achieving strong Atari performance with 100K steps." },
  { title: "Diffusion Forcing: Next-Token Prediction Meets Full-Sequence Diffusion", authors: "Chen et al.", year: 2024, venue: "NeurIPS", url: "https://arxiv.org/abs/2407.01392", tags: ["diffusion", "video-prediction", "planning"], summary: "Combines next-token prediction with diffusion for flexible-horizon sequences — enabling both planning and video generation." },
  { title: "Genie: Generative Interactive Environments", authors: "Bruce et al.", year: 2024, venue: "ICML", url: "https://arxiv.org/abs/2402.15391", tags: ["Genie", "video-generation", "interactive"], summary: "Learns from internet videos to produce diverse, playable 2D environments from a single image prompt." },
  { title: "DIAMOND: Diffusion for World Modeling", authors: "Alonso et al.", year: 2024, venue: "NeurIPS", url: "https://arxiv.org/abs/2405.12399", tags: ["DIAMOND", "diffusion", "Atari"], summary: "First diffusion-based world model to achieve competitive Atari performance — trained on raw pixels, generates crisp rollouts." },
  { title: "Video PreTraining (VPT)", authors: "Baker et al.", year: 2022, venue: "NeurIPS", url: "https://arxiv.org/abs/2206.11795", tags: ["video-pretraining", "Minecraft", "foundation"], summary: "Pre-trains agents on large-scale gameplay videos, then fine-tunes on Minecraft tasks including diamond collection." },
  { title: "COSMOS: World Foundation Model Platform", authors: "NVIDIA", year: 2025, venue: "arXiv", url: "https://arxiv.org/abs/2501.03575", tags: ["COSMOS", "video-generation", "robotics"], summary: "NVIDIA's platform for building world foundation models focused on physical AI — physics-aware video for robotics simulation." },
  { title: "GAIA-1: A Generative World Model for Autonomous Driving", authors: "Hu et al.", year: 2023, venue: "arXiv", url: "https://arxiv.org/abs/2309.17080", tags: ["GAIA-1", "autonomous-driving", "video"], summary: "Generates realistic driving scenarios conditioned on text, action, and map inputs — pioneering world models for autonomous driving." },
  { title: "SmallWorld: Benchmarking Physical Understanding in LMs", authors: "Various", year: 2024, venue: "arXiv", url: "https://arxiv.org/abs/2502.07024", tags: ["benchmark", "physical-reasoning", "LLM"], summary: "Benchmark evaluating whether language models understand the physical world — spatial reasoning, object permanence, gravity." },
];

interface CodeRepo { name: string; description: string; url: string; stars?: string; language: string; }

const codeRepos: CodeRepo[] = [
  { name: "danijar/dreamerv3", description: "Official DreamerV3 — general-purpose world model agent.", url: "https://github.com/danijar/dreamerv3", stars: "1.5k+", language: "Python / JAX" },
  { name: "eloialonso/iris", description: "Official IRIS — sample-efficient world model using transformers.", url: "https://github.com/eloialonso/iris", stars: "700+", language: "Python / PyTorch" },
  { name: "eloialonso/diamond", description: "Official DIAMOND — diffusion-based world model for Atari.", url: "https://github.com/eloialonso/diamond", stars: "500+", language: "Python / PyTorch" },
  { name: "google-deepmind/mctx", description: "Monte Carlo Tree Search library for MuZero-style planning.", url: "https://github.com/google-deepmind/mctx", stars: "2k+", language: "Python / JAX" },
  { name: "opendilab/LightZero", description: "Unified benchmark for MCTS-based RL algorithms.", url: "https://github.com/opendilab/LightZero", stars: "1k+", language: "Python / PyTorch" },
  { name: "Farama-Foundation/Gymnasium", description: "Standard API for RL environments (successor to OpenAI Gym).", url: "https://github.com/Farama-Foundation/Gymnasium", stars: "7k+", language: "Python" },
  { name: "google-deepmind/dm_control", description: "DeepMind Control Suite — continuous control benchmarks.", url: "https://github.com/google-deepmind/dm_control", stars: "3.5k+", language: "Python" },
  { name: "NVlabs/cosmos-predict1", description: "NVIDIA Cosmos world foundation model for physical AI.", url: "https://github.com/NVlabs/cosmos-predict1", language: "Python / PyTorch" },
];

interface CourseItem { title: string; provider: string; url: string; type: "course" | "lecture" | "tutorial" | "blog"; description: string; }

const courses: CourseItem[] = [
  { title: "Model-Based Reinforcement Learning", provider: "Berkeley CS 285", url: "https://rail.eecs.berkeley.edu/deeprlcourse/", type: "course", description: "Deep RL course covering model-based methods, latent dynamics, and world models." },
  { title: "World Models and Predictive Coding", provider: "Yann LeCun (AAAI 2024)", url: "https://www.youtube.com/results?search_query=yann+lecun+world+models+aaai+2024", type: "lecture", description: "LeCun's vision for energy-based self-supervised learning and world models." },
  { title: "Dreamer Series Explained", provider: "Yannic Kilcher", url: "https://www.youtube.com/results?search_query=yannic+kilcher+dreamerv3", type: "tutorial", description: "Video walkthroughs of Dreamer V1 to V3 architecture evolution." },
  { title: "The Bitter Lesson & World Models", provider: "Rich Sutton", url: "http://www.incompleteideas.net/IncIdeas/BitterLesson.html", type: "blog", description: "Sutton's essay arguing that leveraging computation (including learned world models) beats hand-engineered approaches." },
  { title: "World Models — A Survey", provider: "Various authors", url: "https://arxiv.org/abs/2402.10787", type: "blog", description: "Comprehensive survey: taxonomy, architectures, applications, and future directions." },
  { title: "David Ha — World Models (NeurIPS)", provider: "YouTube / NeurIPS", url: "https://www.youtube.com/results?search_query=david+ha+world+models+neurips", type: "lecture", description: "Presentation of the original World Models paper with interactive demos." },
];

interface CommunityItem { name: string; description: string; url: string; type: "forum" | "discord" | "newsletter" | "org"; }

const community: CommunityItem[] = [
  { name: "r/reinforcementlearning", description: "Active Reddit community for RL. Frequent threads on world model architectures.", url: "https://www.reddit.com/r/reinforcementlearning/", type: "forum" },
  { name: "Farama Foundation Discord", description: "Discord for Gymnasium and PettingZoo — RL environments and world model integration.", url: "https://discord.gg/PfR7a79FpQ", type: "discord" },
  { name: "The Gradient", description: "In-depth ML articles including world models and model-based RL.", url: "https://thegradient.pub/", type: "newsletter" },
  { name: "DeepMind Research", description: "MuZero, Genie, and related world model research.", url: "https://deepmind.google/research/", type: "org" },
  { name: "NVIDIA AI Research", description: "Cosmos world models, Isaac Sim, and physical AI.", url: "https://www.nvidia.com/en-us/research/", type: "org" },
  { name: "Hugging Face Model Hub", description: "Open-source world model checkpoints and demos.", url: "https://huggingface.co/models?search=world+model", type: "forum" },
];

const tagColors: Record<string, string> = {
  foundational: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  RSSM: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  transformer: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  diffusion: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  planning: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  benchmark: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "video-generation": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  DIAMOND: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "GAIA-1": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
};

// ─── Component ──────────────────────────────────────────

export default function Resources() {
  const [tab, setTab] = useState<TopTab>("papers");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          Resources
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Papers, code, courses, community, and reference catalogs for world models research.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "papers" as TopTab, label: "Papers", icon: FileText },
          { key: "code" as TopTab, label: "Code", icon: Github },
          { key: "courses" as TopTab, label: "Courses", icon: GraduationCap },
          { key: "community" as TopTab, label: "Community", icon: Users },
          { key: "environments" as TopTab, label: "Env Catalog", icon: Box },
          { key: "models" as TopTab, label: "Model Catalog", icon: Layers },
          { key: "benchmarks" as TopTab, label: "Benchmarks", icon: BarChart3 },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border ${
              tab === key
                ? "border-primary bg-primary/10 text-foreground font-medium"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
            data-testid={`tab-${key}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Papers */}
      {tab === "papers" && (
        <div className="space-y-3">
          {papers.map((paper, i) => {
            const key = `paper-${i}`;
            const isOpen = expanded.has(key);
            return (
              <Card key={i} className="transition-all hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1" data-testid={`paper-link-${i}`}>
                            {paper.title}
                            <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                          </a>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {paper.authors} · {paper.venue} {paper.year}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 pl-6">
                        {paper.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className={`text-[10px] px-1.5 py-0 font-normal ${tagColors[tag] || ""}`}>
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {isOpen && (
                        <p className="text-xs text-muted-foreground leading-relaxed pl-6 pt-1">{paper.summary}</p>
                      )}
                    </div>
                    <button onClick={() => toggleExpand(key)} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0" data-testid={`toggle-paper-${i}`}>
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Code */}
      {tab === "code" && (
        <div className="grid md:grid-cols-2 gap-3">
          {codeRepos.map((repo, i) => (
            <Card key={i} className="transition-all hover:border-primary/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Github className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium font-mono hover:text-primary transition-colors inline-flex items-center gap-1" data-testid={`repo-link-${i}`}>
                      {repo.name}
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                    </a>
                  </div>
                  {repo.stars && <Badge variant="secondary" className="text-[10px] shrink-0">★ {repo.stars}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">{repo.description}</p>
                <div className="pl-6"><Badge variant="outline" className="text-[10px] font-mono">{repo.language}</Badge></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Courses */}
      {tab === "courses" && (
        <div className="space-y-3">
          {courses.map((item, i) => {
            const TypeIcon = item.type === "course" ? BookOpen : item.type === "lecture" || item.type === "tutorial" ? Video : BookOpen;
            return (
              <Card key={i} className="transition-all hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <TypeIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1" data-testid={`course-link-${i}`}>
                          {item.title}
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                        <Badge variant="secondary" className="text-[10px] capitalize">{item.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.provider}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Community */}
      {tab === "community" && (
        <div className="grid md:grid-cols-2 gap-3">
          {community.map((item, i) => {
            const typeLabel: Record<string, string> = { forum: "Forum", discord: "Discord", newsletter: "Publication", org: "Organization" };
            return (
              <Card key={i} className="transition-all hover:border-primary/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1" data-testid={`community-link-${i}`}>
                          {item.name}
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                        <Badge variant="outline" className="text-[10px]">{typeLabel[item.type] || item.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Environments Catalog (absorbed from old page) */}
      {tab === "environments" && <EnvironmentsCatalog />}

      {/* Models Catalog (absorbed from old page) */}
      {tab === "models" && <ModelsCatalog />}

      {/* Benchmarks (absorbed from old compare page) */}
      {tab === "benchmarks" && <BenchmarksView />}
    </div>
  );
}

// ─── Environment Catalog sub-component ──────────────────

function EnvironmentsCatalog() {
  const { data: environments, isLoading } = useEnvironments();
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const categories = environments?.reduce((acc, env) => {
    acc[env.category] = (acc[env.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filtered = filterCategory
    ? environments?.filter((e) => e.category === filterCategory)
    : environments;

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Reference catalog of 12 standard environments used in world models research.</p>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
            !filterCategory ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-card text-muted-foreground hover:border-primary/50"
          }`}
          data-testid="filter-all-envs"
        >
          All ({environments?.length || 0})
        </button>
        {categories && Object.entries(categories).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
          const config = categoryConfig[cat] || { color: "text-foreground", bgColor: "bg-muted", label: cat };
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
                filterCategory === cat ? "border-primary bg-primary/10 text-foreground font-medium" : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
              data-testid={`filter-${cat}`}
            >
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered?.map((env) => {
          const config = categoryConfig[env.category] || { color: "text-foreground", bgColor: "bg-muted", label: env.category };
          const dynamics = JSON.parse(env.keyDynamics || "[]") as string[];
          return (
            <Card key={env.slug} className="transition-all hover:border-primary/30" data-testid={`env-card-${env.slug}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium">{env.name}</h3>
                  <Badge variant="secondary" className={`text-[10px] shrink-0 ${config.color} ${config.bgColor} border-0`}>
                    {config.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{env.description}</p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px] font-mono">{env.actionSpace}</Badge>
                  <Badge variant="outline" className="text-[10px]">{env.dynamicsType}</Badge>
                  <Badge variant="outline" className="text-[10px]">Complexity {env.complexity}/5</Badge>
                </div>
                {dynamics.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {dynamics.slice(0, 3).map((d, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Models Catalog sub-component ──────────────────

function ModelsCatalog() {
  const { data: models, isLoading } = useModels();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Reference catalog of 8 world model architectures with their strengths, weaknesses, and design philosophy.</p>
      <div className="space-y-3">
        {models?.map((model) => {
          const config = architectureConfig[model.architecture] || { color: "text-foreground", bgColor: "bg-muted" };
          const isOpen = expanded.has(model.id);
          const strengths = JSON.parse(model.strengths || "[]") as string[];
          const weaknesses = JSON.parse(model.weaknesses || "[]") as string[];
          return (
            <Card key={model.id} className="transition-all hover:border-primary/30" data-testid={`model-card-${model.slug}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm font-medium">{model.name}</span>
                      <Badge className={`text-[10px] font-mono ${config.color} ${config.bgColor} border-0`}>
                        {model.architecture}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{model.year}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6">{model.description}</p>
                    <div className="flex flex-wrap gap-1 pl-6">
                      <Badge variant="outline" className="text-[10px] font-mono">{model.latentType} latent</Badge>
                      <Badge variant="outline" className="text-[10px]">{model.planningMethod}</Badge>
                      {model.paper && (
                        <a href={model.paper} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] text-primary hover:underline">
                          Paper <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                    {isOpen && (
                      <div className="grid sm:grid-cols-2 gap-3 pl-6 pt-2">
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Strengths</span>
                          {strengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-rose-600 dark:text-rose-400">Weaknesses</span>
                          {weaknesses.map((w, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                              <div className="w-1 h-1 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => toggle(model.id)} className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0" data-testid={`toggle-model-${model.id}`}>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Benchmarks sub-component (from old Compare page) ──────

function BenchmarksView() {
  const { data: models, isLoading: modelsLoading } = useModels();
  const { data: environments, isLoading: envsLoading } = useEnvironments();
  const { data: benchmarks } = useBenchmarks();
  const { data: dimensions } = useDimensions();
  const [selectedModels, setSelectedModels] = useState<number[]>([]);

  const isLoading = modelsLoading || envsLoading;

  const toggleModel = (id: number) => {
    setSelectedModels((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const crossTable = useMemo(() => {
    if (!benchmarks || !models || !environments) return { headers: [], rows: [] };
    const envIds = [...new Set(benchmarks.map((b) => b.environmentId))];
    const envMap = new Map(environments.map((e) => [e.id, e]));
    const modelMap = new Map(models.map((m) => [m.id, m]));
    const headers = envIds.map((id) => envMap.get(id)).filter(Boolean).sort((a, b) => a!.name.localeCompare(b!.name));
    const activeModelIds = selectedModels.length > 0 ? selectedModels : models.map((m) => m.id);
    const rows = activeModelIds.map((modelId) => {
      const model = modelMap.get(modelId);
      const cells = headers.map((env) => {
        const bench = benchmarks.find((b) => b.modelId === modelId && b.environmentId === env!.id);
        return bench ? { value: bench.value, metric: bench.metric } : null;
      });
      return { model, cells };
    });
    return { headers, rows };
  }, [benchmarks, models, environments, selectedModels]);

  const radarData = useMemo(() => {
    if (!benchmarks || !models || !environments || selectedModels.length < 2) return [];
    const envIds = [...new Set(benchmarks.map((b) => b.environmentId))];
    const envMap = new Map(environments.map((e) => [e.id, e]));
    return envIds.map((envId) => {
      const env = envMap.get(envId);
      const envBenchmarks = benchmarks.filter((b) => b.environmentId === envId);
      if (envBenchmarks.length === 0) return null;
      const isLowerBetter = envBenchmarks[0].metric === "MSE";
      const values = envBenchmarks.map((b) => b.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const point: Record<string, any> = { env: env?.name ?? `Env ${envId}` };
      selectedModels.forEach((modelId) => {
        const bench = envBenchmarks.find((b) => b.modelId === modelId);
        const model = models.find((m) => m.id === modelId);
        if (bench && model) {
          const normalized = isLowerBetter ? 1 - (bench.value - min) / range : (bench.value - min) / range;
          point[model.name] = Math.round(normalized * 100);
        }
      });
      return point;
    }).filter(Boolean);
  }, [benchmarks, models, environments, selectedModels]);

  const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) return <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Cross-reference model performance against environments. Select models to compare.</p>
      {/* Model selector */}
      <div className="flex flex-wrap gap-2">
        {models?.map((model) => {
          const config = architectureConfig[model.architecture] || { color: "text-foreground", bgColor: "bg-muted" };
          const isSelected = selectedModels.includes(model.id);
          return (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
                isSelected ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
              data-testid={`toggle-bench-model-${model.slug}`}
            >
              <span className="font-medium">{model.name}</span>
              <span className={`ml-1.5 font-mono text-[10px] ${config.color}`}>{model.architecture}</span>
            </button>
          );
        })}
      </div>

      {selectedModels.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/50 text-sm text-muted-foreground">
          <Info className="w-4 h-4 shrink-0" />
          Select 2+ models to see the radar chart. The table shows all models by default.
        </div>
      )}

      {/* Cross-table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Performance Cross-Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Model</TableHead>
                {crossTable.headers.map((env) => (
                  <TableHead key={env!.id} className="text-center min-w-[100px] text-xs">{env!.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {crossTable.rows.map((row) => (
                <TableRow key={row.model?.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                    {row.model?.name}
                    <span className="block text-[10px] text-muted-foreground font-mono">{row.model?.architecture}</span>
                  </TableCell>
                  {row.cells.map((cell, i) => {
                    const colValues = crossTable.rows.map((r) => r.cells[i]).filter(Boolean).map((c) => c!.value);
                    const isLowerBetter = cell?.metric === "MSE";
                    const best = isLowerBetter ? Math.min(...colValues) : Math.max(...colValues);
                    const isBest = cell?.value === best && colValues.length > 1;
                    return (
                      <TableCell key={i} className="text-center text-xs tabular-nums">
                        {cell ? (
                          <span className={isBest ? "text-primary font-semibold" : "text-muted-foreground"}>
                            {cell.metric === "MSE" ? cell.value.toFixed(3) : cell.value.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Radar chart */}
      {selectedModels.length >= 2 && radarData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Normalized Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="env" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} stroke="hsl(var(--border))" />
                  {selectedModels.map((modelId, idx) => {
                    const model = models?.find((m) => m.id === modelId);
                    if (!model) return null;
                    return (
                      <Radar key={modelId} name={model.name} dataKey={model.name} stroke={chartColors[idx % chartColors.length]} fill={chartColors[idx % chartColors.length]} fillOpacity={0.15} strokeWidth={2} />
                    );
                  })}
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analysis dimensions */}
      {dimensions && dimensions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Compass className="w-4 h-4" />
              Analysis Dimensions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {dimensions.map((dim) => {
              const catColors: Record<string, string> = { physical: "bg-blue-500", logical: "bg-rose-500", geometric: "bg-amber-500", temporal: "bg-purple-500" };
              return (
                <div key={dim.id} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${catColors[dim.category] ?? "bg-muted"}`} />
                  <div>
                    <div className="text-xs font-medium">{dim.name}</div>
                    <div className="text-[11px] text-muted-foreground">{dim.description}</div>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{dim.category}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
