import { environments, worldModels, benchmarkResults, analysisDimensions, createdEnvironments } from "@shared/schema";
import type { Environment, WorldModel, BenchmarkResult, AnalysisDimension, CreatedEnvironment, InsertCreatedEnvironment } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Environments
  getEnvironments(): Environment[];
  getEnvironment(id: number): Environment | undefined;
  getEnvironmentBySlug(slug: string): Environment | undefined;

  // World Models
  getWorldModels(): WorldModel[];
  getWorldModel(id: number): WorldModel | undefined;
  getWorldModelBySlug(slug: string): WorldModel | undefined;

  // Benchmarks
  getBenchmarkResults(): BenchmarkResult[];
  getBenchmarkResultsForModel(modelId: number): BenchmarkResult[];
  getBenchmarkResultsForEnvironment(environmentId: number): BenchmarkResult[];

  // Analysis Dimensions
  getAnalysisDimensions(): AnalysisDimension[];

  // Created Environments
  getCreatedEnvironments(): CreatedEnvironment[];
  getCreatedEnvironment(id: number): CreatedEnvironment | undefined;
  createCreatedEnvironment(data: InsertCreatedEnvironment): CreatedEnvironment;
  deleteCreatedEnvironment(id: number): void;
}

export class DatabaseStorage implements IStorage {
  getEnvironments(): Environment[] {
    return db.select().from(environments).all();
  }

  getEnvironment(id: number): Environment | undefined {
    return db.select().from(environments).where(eq(environments.id, id)).get();
  }

  getEnvironmentBySlug(slug: string): Environment | undefined {
    return db.select().from(environments).where(eq(environments.slug, slug)).get();
  }

  getWorldModels(): WorldModel[] {
    return db.select().from(worldModels).all();
  }

  getWorldModel(id: number): WorldModel | undefined {
    return db.select().from(worldModels).where(eq(worldModels.id, id)).get();
  }

  getWorldModelBySlug(slug: string): WorldModel | undefined {
    return db.select().from(worldModels).where(eq(worldModels.slug, slug)).get();
  }

  getBenchmarkResults(): BenchmarkResult[] {
    return db.select().from(benchmarkResults).all();
  }

  getBenchmarkResultsForModel(modelId: number): BenchmarkResult[] {
    return db.select().from(benchmarkResults).where(eq(benchmarkResults.modelId, modelId)).all();
  }

  getBenchmarkResultsForEnvironment(environmentId: number): BenchmarkResult[] {
    return db.select().from(benchmarkResults).where(eq(benchmarkResults.environmentId, environmentId)).all();
  }

  getAnalysisDimensions(): AnalysisDimension[] {
    return db.select().from(analysisDimensions).all();
  }

  getCreatedEnvironments(): CreatedEnvironment[] {
    return db.select().from(createdEnvironments).orderBy(desc(createdEnvironments.complexityScore)).all();
  }

  getCreatedEnvironment(id: number): CreatedEnvironment | undefined {
    return db.select().from(createdEnvironments).where(eq(createdEnvironments.id, id)).get();
  }

  createCreatedEnvironment(data: InsertCreatedEnvironment): CreatedEnvironment {
    return db.insert(createdEnvironments).values(data).returning().get();
  }

  deleteCreatedEnvironment(id: number): void {
    db.delete(createdEnvironments).where(eq(createdEnvironments.id, id)).run();
  }
}

export const storage = new DatabaseStorage();
