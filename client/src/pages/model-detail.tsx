import { useRoute, Link } from "wouter";
import { useModel, useEnvironments, architectureConfig } from "@/lib/data-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, ExternalLink, CheckCircle2, AlertTriangle, Boxes, Brain, Target } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export default function ModelDetail() {
  const [, params] = useRoute("/models/:slug");
  const slug = params?.slug ?? "";
  const { data: model, isLoading } = useModel(slug);
  const { data: environments } = useEnvironments();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!model) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Model not found.
      </div>
    );
  }

  const archConfig = architectureConfig[model.architecture] || { color: "text-foreground", bgColor: "bg-muted" };
  const strengths = JSON.parse(model.strengths) as string[];
  const weaknesses = JSON.parse(model.weaknesses) as string[];

  // Chart: performance across environments
  const rewardBenchmarks = model.benchmarks
    ?.filter((b) => b.metric === "reward")
    .map((b) => {
      const env = environments?.find((e) => e.id === b.environmentId);
      return {
        env: env?.name ?? `Env ${b.environmentId}`,
        value: b.value,
        horizon: b.horizon,
      };
    }) ?? [];

  const mseBenchmarks = model.benchmarks
    ?.filter((b) => b.metric === "MSE")
    .filter((b, i, arr) => arr.findIndex((x) => x.environmentId === b.environmentId) === i)
    .map((b) => {
      const env = environments?.find((e) => e.id === b.environmentId);
      return {
        env: env?.name ?? `Env ${b.environmentId}`,
        value: b.value,
        horizon: b.horizon,
      };
    }) ?? [];

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/models">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors" data-testid="button-back">
            <ArrowLeft className="w-3.5 h-3.5" />
            All Models
          </button>
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-semibold tracking-tight" data-testid="text-model-name">
                {model.name}
              </h1>
              <Badge variant="secondary" className={`font-mono ${archConfig.color} ${archConfig.bgColor} border-0`}>
                {model.architecture}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground max-w-2xl">
              {model.description}
            </p>
          </div>
          {model.paper && (
            <a
              href={model.paper}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
              data-testid="link-paper"
            >
              Paper <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Properties */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Architecture", value: model.architecture, icon: Boxes },
          { label: "Year", value: model.year.toString(), icon: Brain },
          { label: "Latent Type", value: model.latentType, icon: Target },
          { label: "Planning", value: model.planningMethod, icon: Brain },
        ].map((prop) => (
          <Card key={prop.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <prop.icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{prop.label}</span>
              </div>
              <div className="text-sm font-mono font-medium">{prop.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Strengths + Weaknesses */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {strengths.map((s) => (
              <div key={s} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span className="text-sm">{s}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Limitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {weaknesses.map((w) => (
              <div key={w} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                <span className="text-sm">{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reward Chart */}
      {rewardBenchmarks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Performance — Reward</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rewardBenchmarks} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="env" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MSE Chart */}
      {mseBenchmarks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Prediction Accuracy — MSE <span className="text-xs text-muted-foreground font-normal">(lower is better)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mseBenchmarks} margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="env" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [value.toFixed(4), "MSE"]}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
