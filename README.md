# WorldModels Lab

An open-source environment analysis platform for world models research. Browse environments, compare model architectures, and build intuition about dynamics prediction across games, physics, and robotics.

![WorldModels Lab](https://img.shields.io/badge/world--models-lab-00a5b5?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

## What is this?

WorldModels Lab is a practical tool for researchers working on world models — AI systems that learn internal representations of environment dynamics. It helps you:

- **Explore environments** — Atari games, MuJoCo physics, SmallWorld benchmarks, board games, navigation tasks
- **Compare model architectures** — RSSM (Dreamer), Transformer (IRIS), Diffusion, Neural ODE, Hybrid (MuZero)
- **Cross-reference benchmarks** — performance tables, radar charts, environment coverage maps
- **Build intuition** — understand which architectures excel at which dynamics (gravity, collisions, multi-object tracking, long-horizon prediction)

## Features

- **12 curated environments** across 5 domains (physics, game, robotics, navigation, reasoning)
- **8 world model architectures** with strengths, limitations, and paper links
- **38 benchmark results** cross-referencing models × environments
- **10 analysis dimensions** (gravitational dynamics, collision physics, spatial memory, etc.)
- **Interactive comparison** — radar charts, cross-tables with best-value highlighting
- **Dark/light mode** with system preference detection
- **Filterable, searchable** environment and model catalogs

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui + Recharts
- **Backend**: Express + SQLite (better-sqlite3) + Drizzle ORM
- **Build**: Vite

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/worldmodels-lab.git
cd worldmodels-lab

# Install
npm install

# Push database schema
npx drizzle-kit push

# Run dev server
npm run dev
```

The database is auto-seeded on first startup with curated environment and model data.

## Project Structure

```
├── client/src/
│   ├── pages/           # Dashboard, Environments, Models, Compare
│   ├── components/      # Layout, shadcn UI components
│   └── lib/             # Data hooks, query client
├── server/
│   ├── routes.ts        # API endpoints
│   ├── storage.ts       # Database access layer
│   └── seed.ts          # Initial data seed
├── shared/
│   └── schema.ts        # Drizzle ORM schema (environments, models, benchmarks)
└── README.md
```

## API

| Endpoint | Description |
|---|---|
| `GET /api/environments` | List all environments |
| `GET /api/environments/:slug` | Environment detail + benchmarks |
| `GET /api/models` | List all world models |
| `GET /api/models/:slug` | Model detail + benchmarks |
| `GET /api/benchmarks` | All benchmark results |
| `GET /api/dimensions` | Analysis dimensions |

## Contributing

Contributions are welcome. Some ideas:

- **Add more environments** — Minecraft, Habitat, RoboSuite, DMLab
- **Add more models** — TD-MPC, JEPA, world model variants
- **Add benchmark data** — real published results with citations
- **Interactive simulators** — embed simple environment demos
- **Paper annotations** — link key findings to specific environments/dimensions

To add a new environment or model, edit `server/seed.ts` and follow the existing data structure.

## Key References

- [SmallWorld Benchmark](https://arxiv.org/abs/2511.23465) — Isolated dynamics evaluation
- [DreamerV3](https://arxiv.org/abs/2301.04104) — General world model
- [IRIS](https://arxiv.org/abs/2209.00588) — Transformer world model
- [Diffusion Forcing](https://arxiv.org/abs/2407.01392) — Diffusion-based prediction
- [MuZero](https://arxiv.org/abs/1911.08265) — Learned model for planning

## License

MIT
