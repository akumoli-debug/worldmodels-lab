import { useRoute, Link } from "wouter";
import { useEnvironment, useModels, categoryConfig } from "@/lib/data-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Eye, Gamepad2, Activity, Timer, Layers } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function EnvironmentDetail() {
  const [, params] = useRoute("/environments/:slug");
  const slug = params?.slug ?? "";
  const { data: env, isLoading } = useEnvironment(slug);
  const { data: models } = useModels();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!env) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Environment not found.
      </div>
    );
  }

  const config = categoryConfig[env.category] || { color: "text-foreground", bgColor: "bg-muted", label: env.category };
  const dynamics = JSON.parse(env.keyDynamics) as string[];

  // Chart data: performance by model
  const chartData = env.benchmarks
    ?.filter((b, i, arr) => {
      // Deduplicate: keep first benchmark per model
      return arr.findIndex((x) => x.modelId === b.modelId && x.metric === b.metric) === i;
    })
    .map((b) => {
      const model = models?.find((m) => m.id === b.modelId);
      return {
        model: model?.name ?? `Model ${b.modelId}`,
        value: b.value,
        metric: b.metric,
        horizon: b.horizon,
      };
    })
    .sort((a, b) => {
      // For MSE, lower is better; for reward, higher is better
      if (a.metric === "MSE") return a.value - b.value;
      return b.value - a.value;
    }) ?? [];

  const primaryMetric = chartData[0]?.metric ?? "reward";
  const isLowerBetter = primaryMetric === "MSE";
  const metricChartData = chartData.filter((d) => d.metric === primaryMetric);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/environments">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors" data-testid="button-back">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Environments
          </button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight" data-testid="text-env-name">
              {env.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              {env.description}
            </p>
          </div>
          <Badge variant="secondary" className={`shrink-0 ${config.color} ${config.bgColor} border-0`}>
            {config.label}
          </Badge>
        </div>
      </div>

      {/* Properties grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Observation Space", value: env.observationSpace, icon: Eye },
          { label: "Action Space", value: env.actionSpace, icon: Gamepad2 },
          { label: "Dynamics", value: env.dynamicsType, icon: Activity },
          { label: "Horizon", value: env.horizonLength, icon: Timer },
        ].map((prop) => (
          <Card key={prop.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <prop.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{prop.label}</span>
              </div>
              <div className="text-sm font-mono font-medium" data-testid={`text-${prop.label.toLowerCase().replace(' ', '-')}`}>
                {prop.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Key Dynamics + Complexity */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Key Dynamics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {dynamics.map((d) => (
                <Badge key={d} variant="outline" className="font-mono text-xs">
                  {d}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Complexity Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono ${
                      i < env.complexity
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{env.complexity}/5</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {env.complexity <= 2
                ? "Simple, well-understood dynamics suitable for baseline testing."
                : env.complexity <= 3
                ? "Moderate complexity with multiple interacting dynamics."
                : "High complexity requiring sophisticated model architectures."}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Benchmark Chart */}
      {metricChartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Model Performance — {primaryMetric}
              {isLowerBetter && <span className="text-xs text-muted-foreground font-normal">(lower is better)</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricChartData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis type="category" dataKey="model" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={120} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value.toFixed(3), primaryMetric]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Horizon: {metricChartData[0]?.horizon} steps
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
