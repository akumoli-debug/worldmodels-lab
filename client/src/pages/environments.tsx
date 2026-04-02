import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useEnvironments, categoryConfig } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal } from "lucide-react";

const complexityLabels = ["", "Minimal", "Low", "Medium", "High", "Extreme"];

export default function Environments() {
  const { data: environments, isLoading } = useEnvironments();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    if (!environments) return [];
    const cats = [...new Set(environments.map((e) => e.category))];
    return cats.sort();
  }, [environments]);

  const filtered = useMemo(() => {
    if (!environments) return [];
    return environments.filter((env) => {
      const matchesSearch =
        search === "" ||
        env.name.toLowerCase().includes(search.toLowerCase()) ||
        env.description.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === "all" || env.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [environments, search, categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Environments</h1>
        <p className="text-sm text-muted-foreground">
          Browse and analyze environments used to evaluate world models — from Atari games to MuJoCo physics.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search environments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setCategoryFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
              categoryFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
            data-testid="filter-all"
          >
            All
          </button>
          {categories.map((cat) => {
            const config = categoryConfig[cat] || { label: cat };
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent"
                }`}
                data-testid={`filter-${cat}`}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No environments match your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((env) => {
            const config = categoryConfig[env.category] || { color: "text-foreground", bgColor: "bg-muted", label: env.category };
            const dynamics = JSON.parse(env.keyDynamics) as string[];
            return (
              <Link key={env.slug} href={`/environments/${env.slug}`}>
                <Card className="cursor-pointer hover-elevate transition-colors h-full" data-testid={`card-env-${env.slug}`}>
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-medium">{env.name}</h3>
                      <Badge variant="secondary" className={`text-xs shrink-0 ${config.color} ${config.bgColor} border-0`}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                      {env.description}
                    </p>

                    {/* Dynamics tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {dynamics.slice(0, 3).map((d) => (
                        <span key={d} className="px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground font-mono">
                          {d}
                        </span>
                      ))}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2.5 mt-auto">
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{env.observationSpace}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full ${
                              i < env.complexity ? "bg-primary" : "bg-muted"
                            }`}
                          />
                        ))}
                        <span className="ml-1 text-[10px]">{complexityLabels[env.complexity]}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
