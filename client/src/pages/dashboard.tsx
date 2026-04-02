import { Link } from "wouter";
import { useEnvironments, useModels, useBenchmarks, useDimensions, categoryConfig, architectureConfig } from "@/lib/data-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Box, Layers, BarChart3, Compass, ArrowRight, Zap, Brain, Atom } from "lucide-react";

export default function Dashboard() {
  const { data: environments, isLoading: envsLoading } = useEnvironments();
  const { data: models, isLoading: modelsLoading } = useModels();
  const { data: benchmarks } = useBenchmarks();
  const { data: dimensions } = useDimensions();

  const isLoading = envsLoading || modelsLoading;

  // Quick stats
  const envCount = environments?.length ?? 0;
  const modelCount = models?.length ?? 0;
  const benchCount = benchmarks?.length ?? 0;
  const dimCount = dimensions?.length ?? 0;

  // Category breakdown
  const categories = environments?.reduce((acc, env) => {
    acc[env.category] = (acc[env.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">
          World Models Lab
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Explore environments, compare world model architectures, and build intuition about dynamics prediction across games, physics, and robotics.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Environments", value: envCount, icon: Box, href: "/environments" },
          { label: "World Models", value: modelCount, icon: Layers, href: "/models" },
          { label: "Benchmarks", value: benchCount, icon: BarChart3, href: "/compare" },
          { label: "Analysis Dimensions", value: dimCount, icon: Compass, href: "/compare" },
        ].map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="cursor-pointer hover-elevate transition-colors" data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                </div>
                {isLoading ? (
                  <Skeleton className="h-7 w-12" />
                ) : (
                  <div className="text-lg font-semibold">{stat.value}</div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two-column: environments by category + model architectures */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Environments by Category */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Box className="w-4 h-4" />
              Environments by Domain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : (
              categories && Object.entries(categories)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => {
                  const config = categoryConfig[cat] || { color: "text-foreground", bgColor: "bg-muted", label: cat };
                  return (
                    <Link key={cat} href={`/environments?category=${cat}`}>
                      <div className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent/50 cursor-pointer transition-colors" data-testid={`category-${cat}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${config.bgColor}`}>
                            <div className={`w-2 h-2 rounded-full ${config.color.replace('text-', 'bg-')}`} />
                          </div>
                          <span className="text-sm">{config.label}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs tabular-nums">{count}</Badge>
                      </div>
                    </Link>
                  );
                })
            )}
          </CardContent>
        </Card>

        {/* Model Architectures */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Model Architectures
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : (
              models && (() => {
                const archs = models.reduce((acc, m) => {
                  acc[m.architecture] = (acc[m.architecture] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                return Object.entries(archs)
                  .sort((a, b) => b[1] - a[1])
                  .map(([arch, count]) => {
                    const config = architectureConfig[arch] || { color: "text-foreground", bgColor: "bg-muted" };
                    return (
                      <div key={arch} className="flex items-center justify-between px-3 py-2 rounded-md" data-testid={`arch-${arch}`}>
                        <div className="flex items-center gap-2.5">
                          <div className={`px-1.5 py-0.5 rounded text-xs font-mono ${config.color} ${config.bgColor}`}>
                            {arch}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{count} model{count > 1 ? 's' : ''}</span>
                      </div>
                    );
                  });
              })()
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Concepts */}
      <div>
        <h2 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">Key Analysis Dimensions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { icon: Atom, title: "Physical Dynamics", desc: "Gravity, collisions, contact forces — does the model understand physics?" },
            { icon: Brain, title: "Long-Horizon Stability", desc: "How prediction quality degrades over extended rollouts." },
            { icon: Zap, title: "Multi-Object Tracking", desc: "Maintaining distinct identities and trajectories for multiple objects." },
          ].map((concept) => (
            <div key={concept.title} className="flex gap-3 p-3 rounded-lg bg-card border border-card-border">
              <concept.icon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div>
                <div className="text-sm font-medium">{concept.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{concept.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent environments preview */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Featured Environments</h2>
          <Link href="/environments">
            <button className="text-xs text-primary hover:underline flex items-center gap-1" data-testid="link-view-all-envs">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {isLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))
            : environments?.slice(0, 6).map((env) => {
                const config = categoryConfig[env.category] || { color: "text-foreground", bgColor: "bg-muted", label: env.category };
                return (
                  <Link key={env.slug} href={`/environments/${env.slug}`}>
                    <Card className="cursor-pointer hover-elevate transition-colors h-full" data-testid={`card-env-${env.slug}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="text-sm font-medium">{env.name}</h3>
                          <Badge variant="secondary" className={`text-xs shrink-0 ${config.color} ${config.bgColor} border-0`}>
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {env.description}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="font-mono">{env.actionSpace}</span>
                          <span>·</span>
                          <span>Complexity {env.complexity}/5</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
        </div>
      </div>
    </div>
  );
}
