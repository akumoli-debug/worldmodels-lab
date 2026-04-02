# WorldModels Lab

An open-source environment analysis platform for world models research. Generate interactive environments, compute their complexity profiles, and see how different world model architectures would handle them — grounded in published empirical data, not LLM estimates.

![WorldModels Lab](https://img.shields.io/badge/world--models-lab-00a5b5?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## What This Does

WorldModels Lab is a research tool for anyone working on world models. It answers three questions:

1. **What makes this environment hard to learn?** — Computed code analysis extracts state variables, action space, transition complexity, and observability from generated Phaser.js environments. Hidden causal variables — state that affects dynamics but isn't rendered — are flagged as the fundamental limitation.

2. **How would different architectures degrade?** — Empirical degradation curves from DIAMOND, IRIS, DreamerV3, and MuZero papers, modulated by the environment's computed complexity profile. No LLM-generated predictions.

3. **Which architecture should I use?** — Transparent scoring of four architecture families against a configurable complexity profile, with per-dimension breakdowns and published benchmark citations.

## Research Grounding

Every computational feature maps to a specific paper or finding:

| Feature | Grounded In | Key Insight |
|---|---|---|
| **Observability Analyzer** | [When Do World Models Successfully Learn Dynamical Systems?](https://arxiv.org/abs/2507.04898) (Jul 2025) | World models fail iff the dynamical system lacks observability under the tokenization map. Hidden causal variables are fundamentally limiting regardless of architecture or scale. |
| **Complexity Dimensions** | [AutumnBench](https://arxiv.org/abs/2510.19788) (Oct 2025) | Environment complexity is multidimensional: #Objects, #Latent variables, #Event handlers, Stochasticity, #Colors, Grid size. Our computed metrics align: `objectCreationCount` ≈ #Objects, `stateVariables` ≈ #Latent, `collisionHandlers + timerEvents` ≈ #Event handlers, `colorCount` ≈ #Colors. |
| **Perception ≠ Function** | [WorldArena](https://arxiv.org/abs/2602.08971) (Feb 2026) | Visual quality metrics correlate only r=0.36 with action planning performance. EWMScore shows a significant perception–functionality gap across 14 models. This is why we show degradation curves and failure signatures instead of visual fidelity scores. |
| **Degradation Curves** | [DIAMOND](https://arxiv.org/abs/2405.12399) (NeurIPS 2024), [LIVE](https://arxiv.org/abs/2505.21996) (NeurIPS 2025) | DIAMOND's EDM variant stays stable for 1000+ steps; DDPM degrades within 100 (DIAMOND Fig 3). All autoregressive baselines degrade catastrophically past 64 frames; VRAG achieves SSIM 0.349 over 1200 frames (LIVE Table 2). Compounding error is inherently irreducible in autoregressive video generation. |
| **Failure Signatures** | [DIAMOND](https://arxiv.org/abs/2405.12399), [IRIS](https://arxiv.org/abs/2209.00588), [DreamerV3](https://www.nature.com/articles/s41586-025-08744-2) | IRIS: inter-frame token inconsistency at ~30 steps (DIAMOND Fig 5). DreamerV3: progressive blurring at ~15-20 steps ([Hierarchical WMs](https://www.nature.com/articles/s41598-024-76719-w)). DIAMOND: spatial drift in low-data regions at ~200 steps. |
| **Architecture Profiles** | [DreamerV3](https://www.nature.com/articles/s41586-025-08744-2) (Nature 2025), [IRIS](https://arxiv.org/abs/2209.00588) (ICLR 2023), [DIAMOND](https://arxiv.org/abs/2405.12399) (NeurIPS 2024), [MuZero](https://arxiv.org/abs/1911.08265) (Nature 2020) | Capability profiles derived from published benchmark results. DreamerV3: 150+ tasks with fixed hyperparams. IRIS: competitive at Atari 100K with 2x fewer params. DIAMOND: mean HNS 1.46 on Atari 100K. MuZero: superhuman in Go, Chess, Shogi, 57 Atari games. |

## Design Philosophy

**Computed vs. Estimated.** Every metric is labeled either ✓ Computed (from code analysis — auditable) or ~ Estimated (LLM-derived — qualitative). The LLM is used only for dynamics rule descriptions and architecture challenge reasoning, clearly separated from computed data. A researcher can audit a compression ratio. They cannot audit an LLM's opinion.

**Transparent formulas.** The composite complexity score uses a weighted formula shown to the user: `0.20×state + 0.15×action + 0.30×transitions + 0.20×observability + 0.15×visual`. The weights reflect that transition dynamics are the primary bottleneck for world model learning, per DreamerV3 and DIAMOND ablations.

**No fictional simulations.** The original Rollout Viewer had an LLM narrating how architectures "would" behave — pure confabulation. The current version uses published empirical degradation data parameterized by environment complexity. Every data point cites its source.

## Pages

### Creator
Generate Phaser.js environments via natural language. The system produces playable games with geometric shapes (no external assets), then runs two analyses:
- **Computed code analysis** — AST parsing extracts state variables, action space, update complexity, compression ratio, observability
- **LLM qualitative analysis** — dynamics rules, nonlinearities, architecture-specific challenges (clearly labeled as estimated)

### Rollout Viewer
Generate an environment, then see empirical degradation curves for four architectures over rollout steps. Curves are from published data modulated by the environment's computed complexity profile. Failure timeline shows documented failure modes with onset steps and paper citations.

### Architecture Picker
Interactive tool: set 5 complexity sliders (or use presets: Atari Pong, Breakout, DMC Humanoid, Minecraft, Go) and see which architecture is best suited. Radar chart overlays architecture capability ceilings against environment demands. Expandable details show scoring breakdowns, best-when/avoid-when conditions, and published results with links.

### Resources
Curated papers (12), code repositories (8), courses (6), community links (6), plus absorbed reference catalogs: 12 standard environments, 8 world model architectures, cross-reference benchmark tables with radar charts.

## Computed Analysis Pipeline

```
Phaser.js code
    │
    ├── AST parsing (acorn) ──→ state variables, function count, nesting depth
    ├── Regex patterns ──→ action inputs (keyboard/mouse), collision handlers, timers
    ├── Observability classifier ──→ causal vs. non-causal, observed vs. hidden
    ├── zlib compression ──→ compression ratio (code redundancy)
    ├── Visual extraction ──→ object count, color count, particles, animation type
    │
    └── Complexity Profile (5 dimensions, 0-1 normalized)
         ├── stateSpaceDim = min(1, varCount / 20)
         ├── actionSpaceDim = min(1, actionCount / 10)
         ├── transitionComplexity = min(1, cyclomaticComplexity / 30)
         ├── observabilityGap = 1 - (observedVars / totalVars)
         └── visualDensity = min(1, (objectCount + colorCount) / 30)
```

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express + SQLite (better-sqlite3) + Drizzle ORM
- **Code Analysis**: acorn (AST parsing) + acorn-walk + zlib
- **LLM**: Anthropic SDK (Claude) for environment generation and qualitative analysis only
- **Build**: Vite

## Getting Started

```bash
git clone https://github.com/akumoli-debug/worldmodels-lab.git
cd worldmodels-lab
npm install
npx drizzle-kit push
npm run dev
```

The database is auto-seeded on first startup with curated environment and model data.

Note: Environment generation and qualitative analysis require an `ANTHROPIC_API_KEY` environment variable.

## API

| Endpoint | Description | Source |
|---|---|---|
| `POST /api/generate-environment` | LLM generates Phaser.js game from description | LLM |
| `POST /api/compute-analysis` | Computed code metrics (no LLM) | Code analysis |
| `POST /api/analyze-environment` | Computed metrics + LLM qualitative | Hybrid |
| `POST /api/simulate-rollouts` | Architecture rollout simulation | LLM |
| `GET /api/environments` | Reference environment catalog | Database |
| `GET /api/models` | Reference model catalog | Database |
| `GET /api/benchmarks` | Cross-reference benchmark data | Database |

## Project Structure

```
├── client/src/
│   ├── pages/
│   │   ├── creator.tsx          # Environment generator + analysis panel
│   │   ├── rollout-viewer.tsx   # Empirical degradation curves
│   │   ├── arch-picker.tsx      # Architecture recommendation tool
│   │   └── resources.tsx        # Papers, code, catalogs, benchmarks
│   ├── components/
│   │   └── app-layout.tsx       # Navigation + dark mode
│   └── lib/
│       ├── empirical-data.ts    # Published degradation curves + failure catalog
│       ├── data-hooks.ts        # React Query hooks
│       └── queryClient.ts       # API client
├── server/
│   ├── routes.ts                # API endpoints
│   ├── code-analysis.ts         # AST-based code analysis (508 lines)
│   ├── storage.ts               # Database access layer
│   └── seed.ts                  # Initial data (12 envs, 8 models, 38 benchmarks)
├── shared/
│   └── schema.ts                # Drizzle ORM schema
└── README.md
```

## Key References

### Theoretical Foundation
- [When Do World Models Successfully Learn Dynamical Systems?](https://arxiv.org/abs/2507.04898) — Observability theory for world models
- [AutumnBench: Benchmarking World-Model Learning](https://arxiv.org/abs/2510.19788) — Environment complexity attributes
- [WorldArena](https://arxiv.org/abs/2602.08971) — Perception-functionality gap in embodied world models

### Architecture Papers
- [DreamerV3: Mastering Diverse Domains through World Models](https://www.nature.com/articles/s41586-025-08744-2) — Nature 2025
- [IRIS: Transformers are Sample-Efficient World Models](https://arxiv.org/abs/2209.00588) — ICLR 2023
- [DIAMOND: Diffusion for World Modeling](https://arxiv.org/abs/2405.12399) — NeurIPS 2024
- [MuZero: Mastering Atari, Go, Chess and Shogi](https://arxiv.org/abs/1911.08265) — Nature 2020

### Empirical Data Sources
- [LIVE: Learning World Models for Interactive Video Generation](https://arxiv.org/abs/2505.21996) — NeurIPS 2025, compounding error data
- [Hierarchical World Models](https://www.nature.com/articles/s41598-024-76719-w) — Nature SR 2024, rollout stability data
- [GAIA-1](https://arxiv.org/abs/2309.17080) — Autonomous driving world model

## License

MIT
