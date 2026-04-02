import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Environments catalog
export const environments = sqliteTable("environments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  category: text("category").notNull(), // physics, game, robotics, navigation, reasoning
  description: text("description").notNull(),
  observationSpace: text("observation_space").notNull(), // e.g. "84x84 RGB", "State vector (17D)"
  actionSpace: text("action_space").notNull(), // e.g. "Discrete(18)", "Continuous(6D)"
  dynamicsType: text("dynamics_type").notNull(), // deterministic, stochastic
  horizonLength: text("horizon_length").notNull(), // short, medium, long
  complexity: integer("complexity").notNull(), // 1-5
  keyDynamics: text("key_dynamics").notNull(), // JSON array of strings
  imageUrl: text("image_url"),
});

// World models catalog
export const worldModels = sqliteTable("world_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  architecture: text("architecture").notNull(), // RSSM, Transformer, Diffusion, Neural ODE, Hybrid
  year: integer("year").notNull(),
  paper: text("paper"), // arxiv link
  description: text("description").notNull(),
  strengths: text("strengths").notNull(), // JSON array
  weaknesses: text("weaknesses").notNull(), // JSON array
  latentType: text("latent_type").notNull(), // continuous, discrete, hybrid
  planningMethod: text("planning_method").notNull(), // imagination, MCTS, CEM, shooting
});

// Benchmark results: model × environment
export const benchmarkResults = sqliteTable("benchmark_results", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  modelId: integer("model_id").notNull(),
  environmentId: integer("environment_id").notNull(),
  metric: text("metric").notNull(), // MSE, SSIM, FVD, reward
  value: real("value").notNull(),
  horizon: integer("horizon").notNull(), // prediction horizon steps
  notes: text("notes"),
});

// Analysis dimensions for intuition building
export const analysisDimensions = sqliteTable("analysis_dimensions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // physical, logical, geometric, temporal
});

export const insertEnvironmentSchema = createInsertSchema(environments).omit({ id: true });
export const insertWorldModelSchema = createInsertSchema(worldModels).omit({ id: true });
export const insertBenchmarkResultSchema = createInsertSchema(benchmarkResults).omit({ id: true });
export const insertAnalysisDimensionSchema = createInsertSchema(analysisDimensions).omit({ id: true });

export type Environment = typeof environments.$inferSelect;
export type InsertEnvironment = z.infer<typeof insertEnvironmentSchema>;
export type WorldModel = typeof worldModels.$inferSelect;
export type InsertWorldModel = z.infer<typeof insertWorldModelSchema>;
export type BenchmarkResult = typeof benchmarkResults.$inferSelect;
export type InsertBenchmarkResult = z.infer<typeof insertBenchmarkResultSchema>;
export type AnalysisDimension = typeof analysisDimensions.$inferSelect;
export type InsertAnalysisDimension = z.infer<typeof insertAnalysisDimensionSchema>;
