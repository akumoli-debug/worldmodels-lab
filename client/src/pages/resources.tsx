import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ExternalLink,
  Github,
  BookOpen,
  Wrench,
  Users,
  GraduationCap,
  Video,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ResourceCategory = "papers" | "code" | "courses" | "community";

interface Paper {
  title: string;
  authors: string;
  year: number;
  venue: string;
  url: string;
  tags: string[];
  summary: string;
}

interface CodeRepo {
  name: string;
  description: string;
  url: string;
  stars?: string;
  language: string;
}

interface CourseItem {
  title: string;
  provider: string;
  url: string;
  type: "course" | "lecture" | "tutorial" | "blog";
  description: string;
}

interface CommunityItem {
  name: string;
  description: string;
  url: string;
  type: "forum" | "discord" | "newsletter" | "org";
}

const papers: Paper[] = [
  {
    title: "World Models",
    authors: "Ha & Schmidhuber",
    year: 2018,
    venue: "NeurIPS",
    url: "https://arxiv.org/abs/1803.10122",
    tags: ["foundational", "VAE", "RNN"],
    summary: "Seminal paper introducing the idea of learning a compressed spatial and temporal representation of the environment — V (vision) model + M (memory) model + C (controller).",
  },
  {
    title: "Dream to Control: Learning Behaviors by Latent Imagination",
    authors: "Hafner et al.",
    year: 2020,
    venue: "ICLR",
    url: "https://arxiv.org/abs/1912.01603",
    tags: ["DreamerV1", "RSSM", "latent-imagination"],
    summary: "Introduces Dreamer, which learns long-horizon behaviors purely from predicted latent trajectories using an RSSM world model.",
  },
  {
    title: "Mastering Diverse Domains through World Models",
    authors: "Hafner et al.",
    year: 2023,
    venue: "arXiv",
    url: "https://arxiv.org/abs/2301.04104",
    tags: ["DreamerV3", "RSSM", "multi-domain"],
    summary: "DreamerV3 masters a broad range of domains with fixed hyperparameters — from Atari to Minecraft diamond collection — by learning robust world models.",
  },
  {
    title: "Mastering Atari, Go, Chess and Shogi by Planning with a Learned Model",
    authors: "Schrittwieser et al.",
    year: 2020,
    venue: "Nature",
    url: "https://arxiv.org/abs/1911.08265",
    tags: ["MuZero", "planning", "MCTS"],
    summary: "MuZero learns a model of the environment dynamics without access to the true game rules, achieving superhuman performance through learned planning.",
  },
  {
    title: "Transformers are Sample-Efficient World Models (IRIS)",
    authors: "Micheli et al.",
    year: 2023,
    venue: "ICLR",
    url: "https://arxiv.org/abs/2209.00588",
    tags: ["IRIS", "transformer", "discrete-tokens"],
    summary: "IRIS uses a discrete autoencoder and autoregressive transformer as the world model, achieving strong Atari performance with 100K environment steps.",
  },
  {
    title: "Diffusion Forcing: Next-Token Prediction Meets Full-Sequence Diffusion",
    authors: "Chen et al.",
    year: 2024,
    venue: "NeurIPS",
    url: "https://arxiv.org/abs/2407.01392",
    tags: ["diffusion", "video-prediction", "planning"],
    summary: "Combines next-token prediction with diffusion to generate flexible-horizon, variable-noise sequences — enabling both planning and video generation from a single model.",
  },
  {
    title: "Genie: Generative Interactive Environments",
    authors: "Bruce et al.",
    year: 2024,
    venue: "ICML",
    url: "https://arxiv.org/abs/2402.15391",
    tags: ["Genie", "video-generation", "interactive"],
    summary: "Learns a generative model from internet videos that can produce diverse, playable 2D environments from a single image prompt.",
  },
  {
    title: "Learning General World Models in a Handful of Reward-Free Deployments",
    authors: "Ye et al.",
    year: 2023,
    venue: "NeurIPS",
    url: "https://arxiv.org/abs/2210.12719",
    tags: ["reward-free", "exploration", "general-world-model"],
    summary: "Proposes a framework for building general-purpose world models through reward-free exploration, enabling rapid adaptation to downstream tasks.",
  },
  {
    title: "Recurrent Experience Replay in Distributed Reinforcement Learning (R2D2)",
    authors: "Kapturowski et al.",
    year: 2019,
    venue: "ICLR",
    url: "https://openreview.net/forum?id=r1lyTjAqYX",
    tags: ["recurrent", "distributed-RL", "experience-replay"],
    summary: "Addresses challenges of training recurrent RL agents at scale with a novel stored-state and burn-in strategy — foundational for recurrent world model architectures.",
  },
  {
    title: "Video PreTraining (VPT): Learning to Act by Watching Unlabeled Online Videos",
    authors: "Baker et al.",
    year: 2022,
    venue: "NeurIPS",
    url: "https://arxiv.org/abs/2206.11795",
    tags: ["video-pretraining", "Minecraft", "foundation"],
    summary: "Pre-trains agents on large-scale internet gameplay videos, then fine-tunes on Minecraft tasks including diamond collection — demonstrating scalable world understanding from video.",
  },
  {
    title: "COSMOS: World Foundation Model Platform for Physical AI",
    authors: "NVIDIA",
    year: 2025,
    venue: "arXiv",
    url: "https://arxiv.org/abs/2501.03575",
    tags: ["COSMOS", "video-generation", "robotics"],
    summary: "NVIDIA's platform for building world foundation models focused on physical AI — generating physics-aware video for robotics and autonomous driving simulation.",
  },
  {
    title: "SmallWorld: Benchmarking Physical Understanding in Language Models",
    authors: "Various",
    year: 2024,
    venue: "arXiv",
    url: "https://arxiv.org/abs/2502.07024",
    tags: ["benchmark", "physical-reasoning", "LLM"],
    summary: "A benchmark evaluating whether language models understand the physical world — spatial reasoning, object permanence, gravity, collisions, and causal dynamics.",
  },
];

const codeRepos: CodeRepo[] = [
  {
    name: "danijar/dreamerv3",
    description: "Official DreamerV3 implementation — general-purpose world model agent that masters diverse domains with fixed hyperparameters.",
    url: "https://github.com/danijar/dreamerv3",
    stars: "1.5k+",
    language: "Python / JAX",
  },
  {
    name: "eloialonso/iris",
    description: "Official IRIS implementation — a sample-efficient world model using discrete autoencoders and transformers.",
    url: "https://github.com/eloialonso/iris",
    stars: "700+",
    language: "Python / PyTorch",
  },
  {
    name: "google-deepmind/mctx",
    description: "Monte Carlo Tree Search library used in MuZero-style planning with learned world models.",
    url: "https://github.com/google-deepmind/mctx",
    stars: "2k+",
    language: "Python / JAX",
  },
  {
    name: "opendilab/LightZero",
    description: "Unified benchmark for MCTS-based RL algorithms (MuZero, EfficientZero, Sampled MuZero, etc.).",
    url: "https://github.com/opendilab/LightZero",
    stars: "1k+",
    language: "Python / PyTorch",
  },
  {
    name: "google-deepmind/dm_control",
    description: "DeepMind Control Suite — a standard benchmarking environment for continuous control with physics simulation.",
    url: "https://github.com/google-deepmind/dm_control",
    stars: "3.5k+",
    language: "Python",
  },
  {
    name: "Farama-Foundation/Gymnasium",
    description: "The standard API for RL environments (successor to OpenAI Gym) — Atari, MuJoCo, classic control, and more.",
    url: "https://github.com/Farama-Foundation/Gymnasium",
    stars: "7k+",
    language: "Python",
  },
  {
    name: "facebookresearch/habitat-sim",
    description: "High-performance 3D simulator for embodied AI research — navigation, manipulation, and rearrangement tasks.",
    url: "https://github.com/facebookresearch/habitat-sim",
    stars: "2.5k+",
    language: "C++ / Python",
  },
  {
    name: "NVlabs/cosmos-predict1",
    description: "NVIDIA Cosmos world foundation model for physical AI — video generation conditioned on actions and physics.",
    url: "https://github.com/NVlabs/cosmos-predict1",
    language: "Python / PyTorch",
  },
];

const courses: CourseItem[] = [
  {
    title: "Model-Based Reinforcement Learning",
    provider: "Berkeley CS 285",
    url: "https://rail.eecs.berkeley.edu/deeprlcourse/",
    type: "course",
    description: "Deep RL course covering model-based methods, latent dynamics, and world models in the context of policy learning.",
  },
  {
    title: "World Models and Predictive Coding",
    provider: "Yann LeCun (AAAI 2024)",
    url: "https://www.youtube.com/results?search_query=yann+lecun+world+models+aaai+2024",
    type: "lecture",
    description: "LeCun's vision for how world models and energy-based self-supervised learning can lead to more capable AI systems.",
  },
  {
    title: "Dreamer Series Explained",
    provider: "Yannic Kilcher",
    url: "https://www.youtube.com/results?search_query=yannic+kilcher+dreamerv3",
    type: "tutorial",
    description: "Accessible video walkthroughs of the Dreamer line of work, covering architecture evolution from V1 to V3.",
  },
  {
    title: "The Bitter Lesson & World Models",
    provider: "Rich Sutton / David Silver talks",
    url: "http://www.incompleteideas.net/IncIdeas/BitterLesson.html",
    type: "blog",
    description: "Sutton's influential essay arguing that leveraging computation (including learned world models) beats hand-engineered approaches.",
  },
  {
    title: "World Models — A Survey",
    provider: "Various authors",
    url: "https://arxiv.org/abs/2402.10787",
    type: "blog",
    description: "Comprehensive survey covering the landscape of world models: taxonomy, architectures, applications, and future directions.",
  },
  {
    title: "David Ha — World Models (NeurIPS talk)",
    provider: "YouTube / NeurIPS",
    url: "https://www.youtube.com/results?search_query=david+ha+world+models+neurips",
    type: "lecture",
    description: "Presentation of the original World Models paper, explaining the V-M-C architecture with interactive demos.",
  },
];

const community: CommunityItem[] = [
  {
    name: "r/reinforcementlearning",
    description: "Active Reddit community for RL discussions. Frequent threads on world model architectures, benchmarks, and new papers.",
    url: "https://www.reddit.com/r/reinforcementlearning/",
    type: "forum",
  },
  {
    name: "Farama Foundation Discord",
    description: "Discord for Gymnasium and PettingZoo maintainers — discuss RL environments, bugs, and world model integration.",
    url: "https://discord.gg/PfR7a79FpQ",
    type: "discord",
  },
  {
    name: "The Gradient",
    description: "Research publication with in-depth articles on ML advances including world models and model-based RL.",
    url: "https://thegradient.pub/",
    type: "newsletter",
  },
  {
    name: "DeepMind Research",
    description: "DeepMind's research homepage — MuZero, Genie, and related world model work.",
    url: "https://deepmind.google/research/",
    type: "org",
  },
  {
    name: "NVIDIA AI Research",
    description: "NVIDIA's AI research hub — Cosmos world models, Isaac Sim, and physical AI foundations.",
    url: "https://www.nvidia.com/en-us/research/",
    type: "org",
  },
  {
    name: "Hugging Face Model Hub",
    description: "Browse open-source world model checkpoints, datasets, and demos shared by the community.",
    url: "https://huggingface.co/models?search=world+model",
    type: "forum",
  },
];

const tagColors: Record<string, string> = {
  foundational: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  RSSM: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  transformer: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  diffusion: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  planning: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  benchmark: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  "video-generation": "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

const categoryIcons: Record<ResourceCategory, typeof FileText> = {
  papers: FileText,
  code: Github,
  courses: GraduationCap,
  community: Users,
};

const categoryLabels: Record<ResourceCategory, string> = {
  papers: "Key Papers",
  code: "Code & Tools",
  courses: "Courses & Talks",
  community: "Community",
};

export default function Resources() {
  const [category, setCategory] = useState<ResourceCategory>("papers");
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
          Curated papers, repositories, courses, and community links for world models research. 
          A starting point for understanding the field and building on it.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(categoryLabels) as ResourceCategory[]).map((key) => {
          const Icon = categoryIcons[key];
          return (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all border ${
                category === key
                  ? "border-primary bg-primary/10 text-foreground font-medium"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
              data-testid={`tab-${key}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {categoryLabels[key]}
            </button>
          );
        })}
      </div>

      {/* Papers */}
      {category === "papers" && (
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
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                            data-testid={`paper-link-${i}`}
                          >
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
                          <Badge
                            key={tag}
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 font-normal ${tagColors[tag] || ""}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      {isOpen && (
                        <p className="text-xs text-muted-foreground leading-relaxed pl-6 pt-1">
                          {paper.summary}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleExpand(key)}
                      className="text-muted-foreground hover:text-foreground transition-colors mt-0.5 shrink-0"
                      data-testid={`toggle-paper-${i}`}
                    >
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Code & Tools */}
      {category === "code" && (
        <div className="grid md:grid-cols-2 gap-3">
          {codeRepos.map((repo, i) => (
            <Card key={i} className="transition-all hover:border-primary/30">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <Github className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium font-mono hover:text-primary transition-colors inline-flex items-center gap-1"
                      data-testid={`repo-link-${i}`}
                    >
                      {repo.name}
                      <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                    </a>
                  </div>
                  {repo.stars && (
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      ★ {repo.stars}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">
                  {repo.description}
                </p>
                <div className="pl-6">
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {repo.language}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Courses & Talks */}
      {category === "courses" && (
        <div className="space-y-3">
          {courses.map((item, i) => {
            const typeIcon = item.type === "course" ? BookOpen : item.type === "lecture" ? Video : item.type === "tutorial" ? Video : BookOpen;
            const TypeIcon = typeIcon;
            return (
              <Card key={i} className="transition-all hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <TypeIcon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                          data-testid={`course-link-${i}`}
                        >
                          {item.title}
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {item.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.provider}
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Community */}
      {category === "community" && (
        <div className="grid md:grid-cols-2 gap-3">
          {community.map((item, i) => {
            const typeLabel: Record<string, string> = {
              forum: "Forum",
              discord: "Discord",
              newsletter: "Publication",
              org: "Organization",
            };
            return (
              <Card key={i} className="transition-all hover:border-primary/30">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <Users className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:text-primary transition-colors inline-flex items-center gap-1"
                          data-testid={`community-link-${i}`}
                        >
                          {item.name}
                          <ExternalLink className="w-3 h-3 shrink-0 opacity-50" />
                        </a>
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabel[item.type] || item.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
