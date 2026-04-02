import { db } from "./db";
import { environments, worldModels, benchmarkResults, analysisDimensions } from "@shared/schema";

export function seedDatabase() {
  // Check if already seeded
  const existing = db.select().from(environments).all();
  if (existing.length > 0) return;

  // Seed Environments
  const envData = [
    {
      name: "Atari Pong",
      slug: "atari-pong",
      category: "game",
      description: "Classic paddle game with simple physics. Agent controls paddle to bounce ball past opponent. Tests basic object tracking and trajectory prediction.",
      observationSpace: "210x160 RGB",
      actionSpace: "Discrete(6)",
      dynamicsType: "deterministic",
      horizonLength: "medium",
      complexity: 2,
      keyDynamics: JSON.stringify(["ball trajectory", "paddle collision", "score tracking"]),
      imageUrl: null,
    },
    {
      name: "Atari Breakout",
      slug: "atari-breakout",
      category: "game",
      description: "Brick-breaking game requiring trajectory prediction and strategic aim. Ball bounces off paddle to destroy bricks. Tests multi-object tracking and physics understanding.",
      observationSpace: "210x160 RGB",
      actionSpace: "Discrete(4)",
      dynamicsType: "deterministic",
      horizonLength: "medium",
      complexity: 3,
      keyDynamics: JSON.stringify(["elastic collision", "angle reflection", "block destruction", "score accumulation"]),
      imageUrl: null,
    },
    {
      name: "Atari Space Invaders",
      slug: "atari-space-invaders",
      category: "game",
      description: "Shoot-em-up with advancing alien formations. Tests understanding of multiple moving entities, projectile physics, and pattern recognition.",
      observationSpace: "210x160 RGB",
      actionSpace: "Discrete(6)",
      dynamicsType: "stochastic",
      horizonLength: "long",
      complexity: 3,
      keyDynamics: JSON.stringify(["projectile motion", "formation movement", "collision detection", "spawning patterns"]),
      imageUrl: null,
    },
    {
      name: "CartPole",
      slug: "cartpole",
      category: "physics",
      description: "Balance an inverted pendulum on a cart by applying horizontal forces. Fundamental test of understanding gravitational dynamics and angular momentum.",
      observationSpace: "State vector (4D)",
      actionSpace: "Discrete(2)",
      dynamicsType: "deterministic",
      horizonLength: "short",
      complexity: 1,
      keyDynamics: JSON.stringify(["gravity", "angular momentum", "balance control", "tipping threshold"]),
      imageUrl: null,
    },
    {
      name: "MuJoCo HalfCheetah",
      slug: "mujoco-halfcheetah",
      category: "robotics",
      description: "2D running robot with 6 joints. Tests understanding of articulated body dynamics, ground contact forces, and locomotion coordination.",
      observationSpace: "State vector (17D)",
      actionSpace: "Continuous(6D)",
      dynamicsType: "deterministic",
      horizonLength: "long",
      complexity: 4,
      keyDynamics: JSON.stringify(["joint torques", "ground friction", "momentum transfer", "gait coordination"]),
      imageUrl: null,
    },
    {
      name: "MuJoCo Humanoid",
      slug: "mujoco-humanoid",
      category: "robotics",
      description: "Full humanoid robot with 17 joints in 3D. Complex dynamics involving balance, walking, and multi-limb coordination. A challenging benchmark for long-horizon prediction.",
      observationSpace: "State vector (376D)",
      actionSpace: "Continuous(17D)",
      dynamicsType: "deterministic",
      horizonLength: "long",
      complexity: 5,
      keyDynamics: JSON.stringify(["bipedal balance", "multi-joint coordination", "contact dynamics", "center of mass"]),
      imageUrl: null,
    },
    {
      name: "MuJoCo Walker2D",
      slug: "mujoco-walker2d",
      category: "robotics",
      description: "2D bipedal walker with 6 joints. Tests understanding of bipedal locomotion dynamics, foot contact, and stability control.",
      observationSpace: "State vector (17D)",
      actionSpace: "Continuous(6D)",
      dynamicsType: "deterministic",
      horizonLength: "long",
      complexity: 4,
      keyDynamics: JSON.stringify(["bipedal gait", "ground contact", "balance recovery", "energy efficiency"]),
      imageUrl: null,
    },
    {
      name: "SmallWorld Gravity",
      slug: "smallworld-gravity",
      category: "physics",
      description: "Isolated free-fall and projectile motion tasks. Objects fall under gravity with varying masses and initial conditions. Pure test of gravitational understanding.",
      observationSpace: "State vector (6D)",
      actionSpace: "None (observation only)",
      dynamicsType: "deterministic",
      horizonLength: "medium",
      complexity: 2,
      keyDynamics: JSON.stringify(["gravitational acceleration", "projectile arc", "mass independence", "terminal state"]),
      imageUrl: null,
    },
    {
      name: "SmallWorld Collision",
      slug: "smallworld-collision",
      category: "physics",
      description: "Elastic and inelastic collisions between rigid bodies. Tests conservation of momentum and energy transfer understanding in isolated settings.",
      observationSpace: "State vector (12D)",
      actionSpace: "None (observation only)",
      dynamicsType: "deterministic",
      horizonLength: "medium",
      complexity: 3,
      keyDynamics: JSON.stringify(["momentum conservation", "elastic rebound", "energy transfer", "mass ratio effects"]),
      imageUrl: null,
    },
    {
      name: "Go (Board Game)",
      slug: "go-board",
      category: "reasoning",
      description: "19x19 board game requiring deep strategic reasoning. Tests logical understanding, pattern recognition, and very long-horizon planning capabilities.",
      observationSpace: "19x19 board state",
      actionSpace: "Discrete(362)",
      dynamicsType: "deterministic",
      horizonLength: "long",
      complexity: 5,
      keyDynamics: JSON.stringify(["territory control", "influence patterns", "life and death", "ko rules"]),
      imageUrl: null,
    },
    {
      name: "Memory Maze",
      slug: "memory-maze",
      category: "navigation",
      description: "3D maze navigation requiring persistent spatial memory. The agent must explore, remember layout, and navigate efficiently. Tests long-term memory and spatial reasoning.",
      observationSpace: "64x64 RGB (egocentric)",
      actionSpace: "Discrete(7)",
      dynamicsType: "deterministic",
      horizonLength: "long",
      complexity: 4,
      keyDynamics: JSON.stringify(["spatial memory", "path planning", "exploration strategy", "landmark recognition"]),
      imageUrl: null,
    },
    {
      name: "DMControl Reacher",
      slug: "dmcontrol-reacher",
      category: "robotics",
      description: "2-link robotic arm reaching a target position. Tests understanding of inverse kinematics and precise motor control in a simple articulated system.",
      observationSpace: "State vector (6D)",
      actionSpace: "Continuous(2D)",
      dynamicsType: "deterministic",
      horizonLength: "short",
      complexity: 2,
      keyDynamics: JSON.stringify(["joint angles", "target reaching", "torque control", "arm inertia"]),
      imageUrl: null,
    },
  ];

  for (const env of envData) {
    db.insert(environments).values(env).run();
  }

  // Seed World Models
  const modelData = [
    {
      name: "DreamerV3",
      slug: "dreamerv3",
      architecture: "RSSM",
      year: 2023,
      paper: "https://arxiv.org/abs/2301.04104",
      description: "General-purpose world model that masters diverse domains without hyperparameter tuning. Uses categorical representations and KL balancing for stable learning across games, robotics, and board games.",
      strengths: JSON.stringify(["Broad domain generalization", "No per-task hyperparameters", "Stable long-horizon imagination", "Human-level Atari performance"]),
      weaknesses: JSON.stringify(["High compute for imagination rollouts", "Latent space limited by RSSM capacity", "Struggles with very long-term dependencies"]),
      latentType: "discrete",
      planningMethod: "imagination",
    },
    {
      name: "DreamerV2",
      slug: "dreamerv2",
      architecture: "RSSM",
      year: 2021,
      paper: "https://arxiv.org/abs/2010.02193",
      description: "First world model to achieve human-level performance on Atari. Introduced discrete latent representations for world modeling, enabling more precise capture of environment dynamics.",
      strengths: JSON.stringify(["Human-level Atari", "Efficient imagination (500B imagined steps)", "Discrete representations improve precision"]),
      weaknesses: JSON.stringify(["Requires task-specific hyperparameter tuning", "Limited to visual observations", "Compounding errors on very long horizons"]),
      latentType: "discrete",
      planningMethod: "imagination",
    },
    {
      name: "IRIS",
      slug: "iris",
      architecture: "Transformer",
      year: 2023,
      paper: "https://arxiv.org/abs/2209.00588",
      description: "Transformer-based world model that uses discrete tokens (from VQ-VAE) and an autoregressive transformer to predict future observations. Achieves strong Atari performance with a simpler architecture.",
      strengths: JSON.stringify(["Simple architecture", "Strong Atari 100K results", "Scalable attention mechanism", "Explicit temporal modeling"]),
      weaknesses: JSON.stringify(["Quadratic attention cost", "Token discretization loses detail", "Limited to short context windows"]),
      latentType: "discrete",
      planningMethod: "imagination",
    },
    {
      name: "Diffusion Forcing",
      slug: "diffusion-forcing",
      architecture: "Diffusion",
      year: 2024,
      paper: "https://arxiv.org/abs/2407.01392",
      description: "Applies diffusion models to sequential prediction, enabling robust long-horizon world modeling. Handles noise at varying levels across timesteps, providing natural uncertainty estimation.",
      strengths: JSON.stringify(["Excellent long-horizon stability", "Natural uncertainty quantification", "Implicit noise handling", "State-of-the-art on SmallWorld"]),
      weaknesses: JSON.stringify(["Slow iterative denoising at inference", "High memory usage", "Complex training procedure"]),
      latentType: "continuous",
      planningMethod: "shooting",
    },
    {
      name: "MuZero",
      slug: "muzero",
      architecture: "Hybrid",
      year: 2020,
      paper: "https://arxiv.org/abs/1911.08265",
      description: "Learns a world model for planning without requiring environment dynamics rules. Uses MCTS with a learned model to achieve superhuman performance in Go, Chess, Shogi, and Atari.",
      strengths: JSON.stringify(["Superhuman board game play", "No environment model needed", "Effective MCTS planning", "Works across diverse domains"]),
      weaknesses: JSON.stringify(["Very high compute cost", "Latent space not interpretable", "Requires enormous search budget"]),
      latentType: "continuous",
      planningMethod: "MCTS",
    },
    {
      name: "MoSim (Neural ODE)",
      slug: "mosim",
      architecture: "Neural ODE",
      year: 2024,
      paper: null,
      description: "Uses continuous-time neural ODEs to model environment dynamics. Captures smooth physical transitions naturally, particularly suited for physics-based environments.",
      strengths: JSON.stringify(["Continuous-time dynamics", "Energy conservation", "Smooth trajectory predictions", "Strong physics understanding"]),
      weaknesses: JSON.stringify(["Slow ODE solver integration", "Limited to smooth dynamics", "Struggles with discrete events"]),
      latentType: "continuous",
      planningMethod: "shooting",
    },
    {
      name: "Genie 2",
      slug: "genie2",
      architecture: "Transformer",
      year: 2024,
      paper: "https://deepmind.google/discover/blog/genie-2-a-large-scale-foundation-world-model/",
      description: "Google DeepMind's foundation world model for generating interactive 3D environments from single images. Produces consistent, controllable worlds at scale.",
      strengths: JSON.stringify(["3D world generation", "Real-time interaction", "Foundation model scale", "Single image conditioning"]),
      weaknesses: JSON.stringify(["Not publicly available", "Enormous compute requirements", "Limited to visual domains"]),
      latentType: "discrete",
      planningMethod: "imagination",
    },
    {
      name: "Cosmos (NVIDIA)",
      slug: "cosmos-nvidia",
      architecture: "Diffusion",
      year: 2025,
      paper: "https://arxiv.org/abs/2501.03575",
      description: "NVIDIA's world foundation model platform. Includes Cosmos-Predict for future state simulation, Cosmos-Transfer for spatially-conditioned generation, and Cosmos-Reason for physical AI reasoning.",
      strengths: JSON.stringify(["Multi-modal platform", "Open source components", "Physical AI focus", "Synthetic data generation"]),
      weaknesses: JSON.stringify(["Primarily video-focused", "Requires NVIDIA hardware", "Not trained for RL control"]),
      latentType: "continuous",
      planningMethod: "shooting",
    },
  ];

  for (const model of modelData) {
    db.insert(worldModels).values(model).run();
  }

  // Seed Analysis Dimensions
  const dimensionData = [
    { name: "Gravitational Dynamics", description: "Understanding of free-fall, projectile motion, and gravitational acceleration. How well does the model predict objects under gravity?", category: "physical" },
    { name: "Collision Physics", description: "Conservation of momentum, elastic vs. inelastic collisions, energy transfer between objects.", category: "physical" },
    { name: "Articulated Body Dynamics", description: "Joint torques, multi-link coordination, ground contact forces in robotic systems.", category: "physical" },
    { name: "Geometric Coherence", description: "Maintaining spatial structure and geometric relationships over time. Does the model preserve shapes and relative positions?", category: "geometric" },
    { name: "Long-Horizon Stability", description: "How prediction quality degrades over extended rollouts. Does error compound or stay bounded?", category: "temporal" },
    { name: "Multi-Object Tracking", description: "Tracking multiple independently moving objects. Does the model maintain distinct identities and trajectories?", category: "geometric" },
    { name: "Strategic Reasoning", description: "Planning and decision-making that requires looking many steps ahead. Does the model capture game-theoretic or strategic structure?", category: "logical" },
    { name: "Spatial Memory", description: "Retaining information about previously visited or observed spatial locations. Does the model build persistent maps?", category: "temporal" },
    { name: "Stochastic Transitions", description: "Handling randomness and uncertainty in environment dynamics. Can the model represent distributions over outcomes?", category: "physical" },
    { name: "Contact Dynamics", description: "Understanding surface contact, friction, and support forces. Critical for locomotion and manipulation.", category: "physical" },
  ];

  for (const dim of dimensionData) {
    db.insert(analysisDimensions).values(dim).run();
  }

  // Seed Benchmark Results (model_id x environment_id)
  // Simulated but realistic relative performance data
  const benchData = [
    // DreamerV3 (id 1)
    { modelId: 1, environmentId: 1, metric: "reward", value: 20.8, horizon: 200, notes: "Near-perfect Pong" },
    { modelId: 1, environmentId: 2, metric: "reward", value: 380, horizon: 200, notes: "Strong Breakout" },
    { modelId: 1, environmentId: 3, metric: "reward", value: 1520, horizon: 200, notes: null },
    { modelId: 1, environmentId: 4, metric: "reward", value: 498, horizon: 500, notes: "Near-optimal" },
    { modelId: 1, environmentId: 5, metric: "reward", value: 8200, horizon: 1000, notes: null },
    { modelId: 1, environmentId: 6, metric: "reward", value: 5400, horizon: 1000, notes: null },
    { modelId: 1, environmentId: 8, metric: "MSE", value: 0.012, horizon: 100, notes: "Low error" },
    { modelId: 1, environmentId: 9, metric: "MSE", value: 0.018, horizon: 100, notes: null },
    { modelId: 1, environmentId: 10, metric: "reward", value: 42, horizon: 500, notes: "Board game adaptation" },
    { modelId: 1, environmentId: 11, metric: "reward", value: 62, horizon: 1000, notes: null },

    // DreamerV2 (id 2)
    { modelId: 2, environmentId: 1, metric: "reward", value: 20.2, horizon: 200, notes: null },
    { modelId: 2, environmentId: 2, metric: "reward", value: 320, horizon: 200, notes: null },
    { modelId: 2, environmentId: 3, metric: "reward", value: 1210, horizon: 200, notes: null },
    { modelId: 2, environmentId: 4, metric: "reward", value: 490, horizon: 500, notes: null },
    { modelId: 2, environmentId: 5, metric: "reward", value: 6800, horizon: 1000, notes: null },
    { modelId: 2, environmentId: 8, metric: "MSE", value: 0.022, horizon: 100, notes: null },
    { modelId: 2, environmentId: 9, metric: "MSE", value: 0.028, horizon: 100, notes: null },

    // IRIS (id 3)
    { modelId: 3, environmentId: 1, metric: "reward", value: 19.5, horizon: 200, notes: "Atari 100K setting" },
    { modelId: 3, environmentId: 2, metric: "reward", value: 290, horizon: 200, notes: null },
    { modelId: 3, environmentId: 3, metric: "reward", value: 980, horizon: 200, notes: null },
    { modelId: 3, environmentId: 4, metric: "reward", value: 475, horizon: 500, notes: null },
    { modelId: 3, environmentId: 8, metric: "MSE", value: 0.019, horizon: 100, notes: null },
    { modelId: 3, environmentId: 9, metric: "MSE", value: 0.025, horizon: 100, notes: null },

    // Diffusion Forcing (id 4)
    { modelId: 4, environmentId: 4, metric: "reward", value: 495, horizon: 500, notes: null },
    { modelId: 4, environmentId: 5, metric: "reward", value: 7600, horizon: 1000, notes: null },
    { modelId: 4, environmentId: 8, metric: "MSE", value: 0.008, horizon: 100, notes: "Best on SmallWorld" },
    { modelId: 4, environmentId: 9, metric: "MSE", value: 0.011, horizon: 100, notes: "Best on SmallWorld" },
    { modelId: 4, environmentId: 8, metric: "MSE", value: 0.035, horizon: 500, notes: "Long horizon" },
    { modelId: 4, environmentId: 9, metric: "MSE", value: 0.042, horizon: 500, notes: "Long horizon" },

    // MuZero (id 5)
    { modelId: 5, environmentId: 1, metric: "reward", value: 21.0, horizon: 200, notes: "Superhuman" },
    { modelId: 5, environmentId: 2, metric: "reward", value: 420, horizon: 200, notes: "Superhuman" },
    { modelId: 5, environmentId: 3, metric: "reward", value: 1780, horizon: 200, notes: null },
    { modelId: 5, environmentId: 10, metric: "reward", value: 98, horizon: 500, notes: "Near-superhuman Go" },

    // MoSim (id 6)
    { modelId: 6, environmentId: 4, metric: "reward", value: 497, horizon: 500, notes: null },
    { modelId: 6, environmentId: 5, metric: "reward", value: 7100, horizon: 1000, notes: null },
    { modelId: 6, environmentId: 8, metric: "MSE", value: 0.009, horizon: 100, notes: "Strong on physics" },
    { modelId: 6, environmentId: 9, metric: "MSE", value: 0.013, horizon: 100, notes: null },
    { modelId: 6, environmentId: 12, metric: "reward", value: 890, horizon: 500, notes: null },
  ];

  for (const bench of benchData) {
    db.insert(benchmarkResults).values(bench).run();
  }

  console.log("Database seeded successfully");
}
