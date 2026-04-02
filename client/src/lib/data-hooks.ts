import { useQuery } from "@tanstack/react-query";
import type { Environment, WorldModel, BenchmarkResult, AnalysisDimension } from "@shared/schema";

export function useEnvironments() {
  return useQuery<Environment[]>({
    queryKey: ["/api/environments"],
  });
}

export function useEnvironment(slug: string) {
  return useQuery<Environment & { benchmarks: BenchmarkResult[] }>({
    queryKey: ["/api/environments", slug],
  });
}

export function useModels() {
  return useQuery<WorldModel[]>({
    queryKey: ["/api/models"],
  });
}

export function useModel(slug: string) {
  return useQuery<WorldModel & { benchmarks: BenchmarkResult[] }>({
    queryKey: ["/api/models", slug],
  });
}

export function useBenchmarks() {
  return useQuery<BenchmarkResult[]>({
    queryKey: ["/api/benchmarks"],
  });
}

export function useDimensions() {
  return useQuery<AnalysisDimension[]>({
    queryKey: ["/api/dimensions"],
  });
}

// Category colors and icons
export const categoryConfig: Record<string, { color: string; bgColor: string; label: string }> = {
  physics: { color: "text-blue-500 dark:text-blue-400", bgColor: "bg-blue-500/10", label: "Physics" },
  game: { color: "text-emerald-500 dark:text-emerald-400", bgColor: "bg-emerald-500/10", label: "Game" },
  robotics: { color: "text-amber-500 dark:text-amber-400", bgColor: "bg-amber-500/10", label: "Robotics" },
  navigation: { color: "text-purple-500 dark:text-purple-400", bgColor: "bg-purple-500/10", label: "Navigation" },
  reasoning: { color: "text-rose-500 dark:text-rose-400", bgColor: "bg-rose-500/10", label: "Reasoning" },
};

export const architectureConfig: Record<string, { color: string; bgColor: string }> = {
  RSSM: { color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/10" },
  Transformer: { color: "text-violet-600 dark:text-violet-400", bgColor: "bg-violet-500/10" },
  Diffusion: { color: "text-rose-600 dark:text-rose-400", bgColor: "bg-rose-500/10" },
  "Neural ODE": { color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-500/10" },
  Hybrid: { color: "text-emerald-600 dark:text-emerald-400", bgColor: "bg-emerald-500/10" },
};
