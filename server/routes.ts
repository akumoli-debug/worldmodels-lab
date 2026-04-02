import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import Anthropic from "@anthropic-ai/sdk";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed on startup
  seedDatabase();

  // Environments
  app.get("/api/environments", (_req, res) => {
    const envs = storage.getEnvironments();
    res.json(envs);
  });

  app.get("/api/environments/:slug", (req, res) => {
    const env = storage.getEnvironmentBySlug(req.params.slug);
    if (!env) return res.status(404).json({ message: "Not found" });
    const benchmarks = storage.getBenchmarkResultsForEnvironment(env.id);
    res.json({ ...env, benchmarks });
  });

  // World Models
  app.get("/api/models", (_req, res) => {
    const models = storage.getWorldModels();
    res.json(models);
  });

  app.get("/api/models/:slug", (req, res) => {
    const model = storage.getWorldModelBySlug(req.params.slug);
    if (!model) return res.status(404).json({ message: "Not found" });
    const benchmarks = storage.getBenchmarkResultsForModel(model.id);
    res.json({ ...model, benchmarks });
  });

  // Benchmark Results
  app.get("/api/benchmarks", (_req, res) => {
    const results = storage.getBenchmarkResults();
    res.json(results);
  });

  // Analysis Dimensions
  app.get("/api/dimensions", (_req, res) => {
    const dims = storage.getAnalysisDimensions();
    res.json(dims);
  });

  // Environment Creator — LLM-powered game generation
  app.post("/api/generate-environment", async (req, res) => {
    try {
      const { prompt, previousCode, feedback } = req.body;
      if (!prompt && !feedback) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      const client = new Anthropic();

      const systemPrompt = `You are an expert Phaser 3 game developer specializing in creating interactive 2D environments and games. You generate complete, self-contained Phaser 3 game code that runs in a browser.

RULES:
1. Output ONLY valid JavaScript code — no markdown fences, no explanation text, no imports
2. The code must be a complete Phaser game that works when injected into a page that already has Phaser 3 loaded via CDN
3. Use "const config = { ... }" to define the Phaser config and "new Phaser.Game(config)" at the end
4. Set config.width to 800 and config.height to 500, with config.parent set to "game-container"
5. Use config.backgroundColor for the background color (dark: "#1a1a2e" or similar)
6. Include physics (arcade or matter) when appropriate
7. Add keyboard/mouse controls so the user can interact
8. Use simple geometric shapes (rectangles, circles) drawn with Phaser.GameObjects.Graphics — do NOT load external image assets. For shapes that need physics, use this.add.rectangle() or this.add.circle() which return GameObjects, then apply physics with this.physics.add.existing().
9. Add a HUD showing score, time, or relevant stats using this.add.text()
10. Make it visually interesting with colors, particles if appropriate, and smooth movement
11. The game should be immediately playable and demonstrate clear dynamics
12. Add comments at the top describing: STATE_SPACE (what variables define the state), ACTION_SPACE (what the player/agent can do), DYNAMICS (what physics/rules govern transitions), REWARD_SIGNAL (what constitutes success/failure)
13. CRITICAL: The code MUST produce visible output. Always verify your scene has a create() function that adds visible objects. If you use Matter.js physics, use this.matter.add.rectangle() / circle() which create visible bodies by default.
14. Keep the code robust — avoid referencing undefined variables, avoid complex dependency chains that could fail silently. Simpler is better than broken.
15. Do NOT use this.load.image() or any asset loading — everything must be drawn procedurally.

For world models research, these environments should exhibit clear, learnable dynamics — physics, collision, cause-and-effect — that a world model would need to predict.`;

      let userMessage = "";
      if (feedback && previousCode) {
        userMessage = `Here is the current Phaser 3 game code:\n\n${previousCode}\n\nThe user wants to modify it: "${feedback}"\n\nGenerate the updated complete game code. Remember: output ONLY JavaScript code, no markdown.`;
      } else {
        userMessage = `Create a Phaser 3 game/environment based on this description: "${prompt}"\n\nRemember: output ONLY JavaScript code, no markdown fences. The game should be immediately playable and demonstrate dynamics relevant to world models research.`;
      }

      const message = await client.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      });

      let code = (message.content[0] as any).text || "";
      // Strip markdown fences if model included them anyway
      code = code.replace(/^```(?:javascript|js)?\n?/gm, "").replace(/```$/gm, "").trim();

      // Extract analysis comments from the top of the code
      const analysisMatch = code.match(/\/\/ STATE_SPACE:(.*)\n\/\/ ACTION_SPACE:(.*)\n\/\/ DYNAMICS:(.*)\n\/\/ REWARD_SIGNAL:(.*)/i);
      const analysis = analysisMatch ? {
        stateSpace: analysisMatch[1].trim(),
        actionSpace: analysisMatch[2].trim(),
        dynamics: analysisMatch[3].trim(),
        rewardSignal: analysisMatch[4].trim(),
      } : null;

      res.json({ code, analysis });
    } catch (error: any) {
      console.error("Generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate environment" });
    }
  });

  // World Model Analysis — analyze generated code for world model properties
  app.post("/api/analyze-environment", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Code is required" });

      const client = new Anthropic();

      const message = await client.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 2000,
        system: `You are a world models researcher analyzing game environments. Given Phaser.js game code, produce a JSON analysis. Return ONLY valid JSON, no markdown.`,
        messages: [{ role: "user", content: `Analyze this game environment for world model research. Return a JSON object with these fields:

{
  "stateSpace": {
    "variables": ["list of state variables like position, velocity, score"],
    "dimensionality": "estimated state space dimensionality (e.g. '6D continuous + 2D discrete')",
    "observability": "fully observable / partially observable"
  },
  "actionSpace": {
    "actions": ["list of available actions"],
    "type": "discrete / continuous / hybrid",
    "size": "number or description"
  },
  "dynamics": {
    "type": "deterministic / stochastic",
    "physicsBased": true/false,
    "keyRules": ["list of 3-5 core dynamics rules"],
    "nonlinearities": ["list of nonlinear behaviors like collisions, wrapping, thresholds"]
  },
  "complexity": {
    "score": 1-10,
    "horizon": "short / medium / long (how far ahead matters)",
    "multiAgent": false,
    "partialObservability": false
  },
  "modelChallenges": [
    {
      "architecture": "RSSM (DreamerV3)",
      "difficulty": "easy/medium/hard",
      "reason": "why this architecture would struggle or succeed"
    },
    {
      "architecture": "Transformer (IRIS)",
      "difficulty": "easy/medium/hard",
      "reason": "why"
    },
    {
      "architecture": "Diffusion (Diffusion Forcing)",
      "difficulty": "easy/medium/hard",
      "reason": "why"
    },
    {
      "architecture": "MCTS + Learned Model (MuZero)",
      "difficulty": "easy/medium/hard",
      "reason": "why"
    }
  ]
}

Code:
${code}` }],
      });

      let text = (message.content[0] as any).text || "";
      text = text.replace(/^```(?:json)?\n?/gm, "").replace(/```$/gm, "").trim();
      const analysis = JSON.parse(text);
      res.json(analysis);
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: error.message || "Failed to analyze environment" });
    }
  });

  return httpServer;
}
