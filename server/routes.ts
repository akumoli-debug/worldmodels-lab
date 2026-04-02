import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { seedDatabase } from "./seed";

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

  return httpServer;
}
