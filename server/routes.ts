import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";
import Anthropic from "@anthropic-ai/sdk";
import { analyzeCode as computeCodeAnalysis } from "./code-analysis";

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

  // Created Environments (for leaderboard)
  app.get("/api/created-environments", (_req, res) => {
    const envs = storage.getCreatedEnvironments();
    res.json(envs);
  });

  app.get("/api/created-environments/:id", (req, res) => {
    const env = storage.getCreatedEnvironment(Number(req.params.id));
    if (!env) return res.status(404).json({ message: "Not found" });
    res.json(env);
  });

  app.post("/api/created-environments", (req, res) => {
    try {
      const { name, prompt, code, analysis, complexityScore } = req.body;
      if (!name || !code || !analysis) {
        return res.status(400).json({ message: "name, code, and analysis are required" });
      }
      const env = storage.createCreatedEnvironment({
        name,
        prompt: prompt || "",
        code,
        analysis: typeof analysis === "string" ? analysis : JSON.stringify(analysis),
        complexityScore: complexityScore || 1,
        createdAt: new Date().toISOString(),
      });
      res.json(env);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.delete("/api/created-environments/:id", (req, res) => {
    storage.deleteCreatedEnvironment(Number(req.params.id));
    res.json({ ok: true });
  });

  // Rollout Comparison — simulate how different architectures would dream forward
  app.post("/api/simulate-rollouts", async (req, res) => {
    try {
      const { code, analysis } = req.body;
      if (!code) return res.status(400).json({ message: "Code is required" });

      const client = new Anthropic();

      const message = await client.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 4000,
        system: `You are a world models researcher. Given a game environment's code and analysis, simulate how different world model architectures would perform at dreaming/predicting rollouts of this environment. Focus on where each architecture's predictions would diverge from ground truth over time.

Return ONLY valid JSON, no markdown fences.`,
        messages: [{ role: "user", content: `Given this game environment, simulate rollout predictions for 4 architectures over 5 timesteps (t=1, t=5, t=10, t=25, t=50).

For each architecture and timestep, describe:
- What the model would predict (brief description)
- A confidence score (0-100, how accurate the prediction would be)
- Key errors or artifacts that would appear

Return JSON:
{
  "environmentSummary": "1-2 sentence description of the key dynamics",
  "groundTruth": [
    { "t": 1, "description": "what actually happens at t=1" },
    { "t": 5, "description": "..." },
    { "t": 10, "description": "..." },
    { "t": 25, "description": "..." },
    { "t": 50, "description": "..." }
  ],
  "architectures": [
    {
      "name": "RSSM (DreamerV3)",
      "rollouts": [
        { "t": 1, "prediction": "...", "confidence": 95, "errors": "..." },
        { "t": 5, "prediction": "...", "confidence": 85, "errors": "..." },
        { "t": 10, "prediction": "...", "confidence": 60, "errors": "..." },
        { "t": 25, "prediction": "...", "confidence": 30, "errors": "..." },
        { "t": 50, "prediction": "...", "confidence": 10, "errors": "..." }
      ],
      "summary": "1-2 sentence overall assessment"
    },
    {
      "name": "Transformer (IRIS)",
      "rollouts": [...]
    },
    {
      "name": "Diffusion (DIAMOND)",
      "rollouts": [...]
    },
    {
      "name": "MCTS + Learned (MuZero)",
      "rollouts": [...]
    }
  ]
}

Be realistic about how each architecture would actually fail. RSSM tends to blur, Transformers can hallucinate novel objects, Diffusion models struggle with temporal consistency, MCTS needs accurate value functions.

Code:
${code}

${analysis ? `Analysis: ${typeof analysis === "string" ? analysis : JSON.stringify(analysis)}` : ""}` }],
      });

      let text = (message.content[0] as any).text || "";
      text = text.replace(/^```(?:json)?\n?/gm, "").replace(/```$/gm, "").trim();
      const rollouts = JSON.parse(text);
      res.json(rollouts);
    } catch (error: any) {
      console.error("Rollout simulation error:", error);
      res.status(500).json({ message: error.message || "Failed to simulate rollouts" });
    }
  });

  // Computed Code Analysis — real metrics, no LLM
  app.post("/api/compute-analysis", (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Code is required" });
      const metrics = computeCodeAnalysis(code);
      res.json(metrics);
    } catch (error: any) {
      console.error("Compute analysis error:", error);
      res.status(500).json({ message: error.message || "Failed to analyze code" });
    }
  });

  // World Model Analysis — LLM for qualitative aspects + computed metrics
  app.post("/api/analyze-environment", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Code is required" });

      // First: compute real metrics
      const computed = computeCodeAnalysis(code);

      // Then: LLM for qualitative assessments only (dynamics rules, challenge reasoning)
      const client = new Anthropic();

      const message = await client.messages.create({
        model: "claude_sonnet_4_6",
        max_tokens: 2000,
        system: `You are a world models researcher. Given game code AND its computed metrics, provide ONLY the qualitative analysis that cannot be computed. Focus on dynamics rules, nonlinearities, and architecture-specific challenges. Return ONLY valid JSON, no markdown.`,
        messages: [{ role: "user", content: `Given this game code and its computed analysis, provide qualitative assessments.

Computed metrics (already available — do NOT re-derive these):
- State variables: ${computed.stateVariables.length} (${computed.observability.observedVars} observed, ${computed.observability.hiddenVars} hidden)
- Action space: ${computed.actionSpace.size} ${computed.actionSpace.type} inputs (${computed.actionSpace.inputs.join(", ")})
- Cyclomatic complexity: ${computed.updateComplexity.cyclomaticComplexity}
- Collision handlers: ${computed.updateComplexity.collisionHandlers}
- Observability: ${computed.observability.verdict} (${Math.round(computed.observability.observabilityRatio * 100)}%)
- Composite complexity: ${computed.complexityProfile.compositeScore}/10

Return JSON with ONLY these qualitative fields:
{
  "dynamics": {
    "type": "deterministic / stochastic",
    "physicsBased": true/false,
    "keyRules": ["3-5 core dynamics rules described concisely"],
    "nonlinearities": ["nonlinear behaviors: collisions, wrapping, thresholds, etc."]
  },
  "modelChallenges": [
    {
      "architecture": "RSSM (DreamerV3)",
      "difficulty": "easy/medium/hard",
      "reason": "specific reason based on the computed metrics and code"
    },
    {
      "architecture": "Transformer (IRIS)",
      "difficulty": "easy/medium/hard",
      "reason": "specific reason"
    },
    {
      "architecture": "Diffusion (DIAMOND)",
      "difficulty": "easy/medium/hard",
      "reason": "specific reason"
    },
    {
      "architecture": "MCTS + Learned (MuZero)",
      "difficulty": "easy/medium/hard",
      "reason": "specific reason"
    }
  ],
  "horizon": "short / medium / long",
  "multiAgent": false
}

Code:
${code}` }],
      });

      let text = (message.content[0] as any).text || "";
      text = text.replace(/^```(?:json)?\n?/gm, "").replace(/```$/gm, "").trim();
      const qualitative = JSON.parse(text);

      // Merge computed + qualitative
      const merged = {
        computed, // all computed metrics
        qualitative, // LLM-derived qualitative assessments
        // Legacy format for backward compatibility
        stateSpace: {
          variables: computed.stateVariables.map(v => v.name),
          dimensionality: `${computed.stateVariables.length} variables (${computed.stateVariables.filter(v => v.type === 'position' || v.type === 'velocity').length} continuous, ${computed.stateVariables.filter(v => v.type === 'counter' || v.type === 'boolean').length} discrete)`,
          observability: computed.observability.verdict,
        },
        actionSpace: {
          actions: computed.actionSpace.inputs,
          type: computed.actionSpace.type,
          size: String(computed.actionSpace.size),
        },
        dynamics: qualitative.dynamics,
        complexity: {
          score: computed.complexityProfile.compositeScore,
          horizon: qualitative.horizon || "medium",
          multiAgent: qualitative.multiAgent || false,
          partialObservability: computed.observability.verdict !== "fully observable",
        },
        modelChallenges: qualitative.modelChallenges,
      };

      res.json(merged);
    } catch (error: any) {
      console.error("Analysis error:", error);
      res.status(500).json({ message: error.message || "Failed to analyze environment" });
    }
  });

  return httpServer;
}
