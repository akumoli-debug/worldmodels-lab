import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import {
  Globe,
  Layers,
  Box,
  BarChart3,
  FlaskConical,
  BookOpen,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { path: "/", label: "Overview", icon: Globe },
  { path: "/environments", label: "Environments", icon: Box },
  { path: "/models", label: "Models", icon: Layers },
  { path: "/compare", label: "Compare", icon: BarChart3 },
  { path: "/sandbox", label: "Sandbox", icon: FlaskConical },
  { path: "/resources", label: "Resources", icon: BookOpen },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isDark, setIsDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : true
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 h-14 px-4 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center gap-2.5 cursor-pointer select-none" data-testid="logo">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-label="WorldModels Lab logo">
                <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
                <circle cx="16" cy="16" r="8" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" fill="none" />
                <circle cx="16" cy="16" r="3" fill="hsl(var(--primary-foreground))" />
                <path d="M16 8 L16 4" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M16 28 L16 24" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M8 16 L4 16" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M28 16 L24 16" stroke="hsl(var(--primary-foreground))" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="font-semibold text-sm tracking-tight">
                WorldModels <span className="text-muted-foreground font-normal">Lab</span>
              </span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location === "/"
                  : location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path}>
                  <button
                    data-testid={`nav-${item.label.toLowerCase()}`}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isActive
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              data-testid="theme-toggle"
              className="h-8 w-8"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden h-8 w-8"
              data-testid="mobile-menu"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border px-4 py-2 bg-background">
            {navItems.map((item) => {
              const isActive =
                item.path === "/"
                  ? location === "/"
                  : location.startsWith(item.path);
              return (
                <Link key={item.path} href={item.path}>
                  <button
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm ${
                      isActive
                        ? "bg-accent text-foreground font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-[1400px] mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
