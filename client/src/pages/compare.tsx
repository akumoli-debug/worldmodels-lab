import { useState, useMemo } from "react";
import { useModels, useEnvironments, useBenchmarks, useDimensions, architectureConfig, categoryConfig } from "@/lib/data-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Info, BarChart3, Grid3x3, Lightbulb } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  ZAxis,
} from "recharts";

export default function Compare() {
  const { data: models, isLoading: modelsLoading } = useModels();
  const { data: environments, isLoading: envsLoading } = useEnvironments();
  const { data: benchmarks } = useBenchmarks();
  const { data: dimensions } = useDimensions();
  const [selectedModels, setSelectedModels] = useState<number[]>([]);

  const isLoading = modelsLoading || envsLoading;

  // Toggle model selection
  const toggleModel = (id: number) => {
    setSelectedModels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Build cross-table: models × environments
  const crossTable = useMemo(() => {
    if (!benchmarks || !models || !environments) return { headers: [], rows: [] };

    const envIds = [...new Set(benchmarks.map((b) => b.environmentId))];
    const envMap = new Map(environments.map((e) => [e.id, e]));
    const modelMap = new Map(models.map((m) => [m.id, m]));

    const headers = envIds
      .map((id) => envMap.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.name.localeCompare(b!.name));

    const activeModelIds = selectedModels.length > 0
      ? selectedModels
      : models.map((m) => m.id);

    const rows = activeModelIds.map((modelId) => {
      const model = modelMap.get(modelId);
      const cells = headers.map((env) => {
        const bench = benchmarks.find(
          (b) =>
            b.modelId === modelId &&
            b.environmentId === env!.id
        );
        return bench ? { value: bench.value, metric: bench.metric } : null;
      });
      return { model, cells };
    });

    return { headers, rows };
  }, [benchmarks, models, environments, selectedModels]);

  // Radar chart: normalize scores per environment
  const radarData = useMemo(() => {
    if (!benchmarks || !models || !environments || selectedModels.length < 2) return [];

    const envIds = [...new Set(benchmarks.map((b) => b.environmentId))];
    const envMap = new Map(environments.map((e) => [e.id, e]));

    return envIds.map((envId) => {
      const env = envMap.get(envId);
      const envBenchmarks = benchmarks.filter((b) => b.environmentId === envId);
      if (envBenchmarks.length === 0) return null;

      const isLowerBetter = envBenchmarks[0].metric === "MSE";
      const values = envBenchmarks.map((b) => b.value);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;

      const point: Record<string, any> = { env: env?.name ?? `Env ${envId}` };

      selectedModels.forEach((modelId) => {
        const bench = envBenchmarks.find((b) => b.modelId === modelId);
        const model = models.find((m) => m.id === modelId);
        if (bench && model) {
          const normalized = isLowerBetter
            ? 1 - (bench.value - min) / range
            : (bench.value - min) / range;
          point[model.name] = Math.round(normalized * 100);
        }
      });

      return point;
    }).filter(Boolean);
  }, [benchmarks, models, environments, selectedModels]);

  // Scatter: complexity vs model count
  const scatterData = useMemo(() => {
    if (!environments || !benchmarks) return [];
    return environments.map((env) => {
      const envBenchCount = benchmarks.filter((b) => b.environmentId === env.id).length;
      return {
        name: env.name,
        complexity: env.complexity,
        benchmarks: envBenchCount,
        category: env.category,
      };
    });
  }, [environments, benchmarks]);

  const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Compare</h1>
        <p className="text-sm text-muted-foreground">
          Cross-reference model performance against environments. Select models to compare.
        </p>
      </div>

      {/* Model selector */}
      <div className="flex flex-wrap gap-2">
        {models?.map((model) => {
          const config = architectureConfig[model.architecture] || { color: "text-foreground", bgColor: "bg-muted" };
          const isSelected = selectedModels.includes(model.id);
          return (
            <button
              key={model.id}
              onClick={() => toggleModel(model.id)}
              className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
                isSelected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/50"
              }`}
              data-testid={`toggle-model-${model.slug}`}
            >
              <span className="font-medium">{model.name}</span>
              <span className={`ml-1.5 font-mono text-[10px] ${config.color}`}>{model.architecture}</span>
            </button>
          );
        })}
      </div>

      {selectedModels.length === 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/50 text-sm text-muted-foreground">
          <Info className="w-4 h-4 shrink-0" />
          Select 2+ models above to see radar comparison. The table below shows all models.
        </div>
      )}

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table" className="gap-1.5">
            <Grid3x3 className="w-3.5 h-3.5" />
            Cross-Table
          </TabsTrigger>
          <TabsTrigger value="radar" className="gap-1.5" disabled={selectedModels.length < 2}>
            <BarChart3 className="w-3.5 h-3.5" />
            Radar
          </TabsTrigger>
          <TabsTrigger value="landscape" className="gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Landscape
          </TabsTrigger>
        </TabsList>

        {/* Cross-table */}
        <TabsContent value="table">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10 min-w-[140px]">Model</TableHead>
                    {crossTable.headers.map((env) => (
                      <TableHead key={env!.id} className="text-center min-w-[100px] text-xs">
                        {env!.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crossTable.rows.map((row) => (
                    <TableRow key={row.model?.id}>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium text-sm">
                        {row.model?.name}
                        <span className="block text-[10px] text-muted-foreground font-mono">{row.model?.architecture}</span>
                      </TableCell>
                      {row.cells.map((cell, i) => {
                        // Find best value for this column
                        const colValues = crossTable.rows
                          .map((r) => r.cells[i])
                          .filter(Boolean)
                          .map((c) => c!.value);
                        const isLowerBetter = cell?.metric === "MSE";
                        const best = isLowerBetter
                          ? Math.min(...colValues)
                          : Math.max(...colValues);
                        const isBest = cell?.value === best && colValues.length > 1;

                        return (
                          <TableCell key={i} className="text-center text-xs tabular-nums">
                            {cell ? (
                              <span className={isBest ? "text-primary font-semibold" : "text-muted-foreground"}>
                                {cell.metric === "MSE" ? cell.value.toFixed(3) : cell.value.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground mt-2">
            Best values per environment highlighted. MSE environments show lower-is-better; reward environments show higher-is-better.
          </p>
        </TabsContent>

        {/* Radar */}
        <TabsContent value="radar">
          {selectedModels.length >= 2 && radarData.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Normalized Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="env" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} stroke="hsl(var(--border))" />
                      {selectedModels.map((modelId, idx) => {
                        const model = models?.find((m) => m.id === modelId);
                        if (!model) return null;
                        return (
                          <Radar
                            key={modelId}
                            name={model.name}
                            dataKey={model.name}
                            stroke={chartColors[idx % chartColors.length]}
                            fill={chartColors[idx % chartColors.length]}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        );
                      })}
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Scores normalized 0-100 per environment (100 = best in selection).
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Select at least 2 models to see the radar comparison.
            </div>
          )}
        </TabsContent>

        {/* Landscape */}
        <TabsContent value="landscape">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Environment Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="complexity" name="Complexity" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Complexity", position: "bottom", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis dataKey="benchmarks" name="Benchmarks" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" label={{ value: "Benchmarks", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                      <ZAxis range={[40, 200]} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: any, name: string) => [value, name]}
                        labelFormatter={(label: any) => {
                          const point = scatterData.find((d) => d.complexity === label);
                          return point?.name ?? "";
                        }}
                      />
                      <Scatter data={scatterData} fill="hsl(var(--primary))" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Environments plotted by complexity vs. number of model benchmarks. Sparse areas indicate gaps in evaluation coverage.
                </p>
              </CardContent>
            </Card>

            {/* Analysis Dimensions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Analysis Dimensions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dimensions?.map((dim) => {
                  const catColors: Record<string, string> = {
                    physical: "bg-blue-500",
                    logical: "bg-rose-500",
                    geometric: "bg-amber-500",
                    temporal: "bg-purple-500",
                  };
                  return (
                    <div key={dim.id} className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${catColors[dim.category] ?? "bg-muted"}`} />
                      <div>
                        <div className="text-sm font-medium">{dim.name}</div>
                        <div className="text-xs text-muted-foreground">{dim.description}</div>
                        <Badge variant="secondary" className="text-[10px] mt-1">{dim.category}</Badge>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
