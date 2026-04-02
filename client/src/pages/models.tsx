import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useModels, architectureConfig } from "@/lib/data-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, SlidersHorizontal, ExternalLink } from "lucide-react";

export default function Models() {
  const { data: models, isLoading } = useModels();
  const [search, setSearch] = useState("");
  const [archFilter, setArchFilter] = useState<string>("all");

  const architectures = useMemo(() => {
    if (!models) return [];
    return [...new Set(models.map((m) => m.architecture))].sort();
  }, [models]);

  const filtered = useMemo(() => {
    if (!models) return [];
    return models.filter((m) => {
      const matchesSearch =
        search === "" ||
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.description.toLowerCase().includes(search.toLowerCase());
      const matchesArch = archFilter === "all" || m.architecture === archFilter;
      return matchesSearch && matchesArch;
    });
  }, [models, search, archFilter]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">World Models</h1>
        <p className="text-sm text-muted-foreground">
          Catalog of world model architectures — from RSSM-based Dreamer to Transformer and Diffusion approaches.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />
          <button
            onClick={() => setArchFilter("all")}
            className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
              archFilter === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
            data-testid="filter-all"
          >
            All
          </button>
          {architectures.map((arch) => (
            <button
              key={arch}
              onClick={() => setArchFilter(arch)}
              className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-colors ${
                archFilter === arch
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent"
              }`}
              data-testid={`filter-${arch}`}
            >
              {arch}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No models match your filters.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {filtered.map((model) => {
            const config = architectureConfig[model.architecture] || { color: "text-foreground", bgColor: "bg-muted" };
            const strengths = JSON.parse(model.strengths) as string[];
            return (
              <Link key={model.slug} href={`/models/${model.slug}`}>
                <Card className="cursor-pointer hover-elevate transition-colors h-full" data-testid={`card-model-${model.slug}`}>
                  <CardContent className="p-4 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="text-sm font-medium">{model.name}</h3>
                        <span className="text-xs text-muted-foreground">{model.year}</span>
                      </div>
                      <Badge variant="secondary" className={`text-xs shrink-0 font-mono ${config.color} ${config.bgColor} border-0`}>
                        {model.architecture}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
                      {model.description}
                    </p>

                    {/* Strengths */}
                    <div className="space-y-1 mb-3">
                      {strengths.slice(0, 2).map((s) => (
                        <div key={s} className="flex items-start gap-1.5">
                          <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="text-xs text-muted-foreground">{s}</span>
                        </div>
                      ))}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2.5 mt-auto">
                      <div className="flex items-center gap-3">
                        <span>Latent: <span className="font-mono">{model.latentType}</span></span>
                        <span>Planning: <span className="font-mono">{model.planningMethod}</span></span>
                      </div>
                      {model.paper && (
                        <ExternalLink className="w-3 h-3" />
                      )}
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
