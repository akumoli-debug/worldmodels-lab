import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Circle } from "lucide-react";

type Scenario = "freefall" | "collision" | "projectile" | "pendulum";

interface PhysicsState {
  objects: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
    mass: number;
    color: string;
    trail: { x: number; y: number }[];
  }[];
  time: number;
}

const CANVAS_W = 600;
const CANVAS_H = 400;
const G = 9.81 * 30; // scaled gravity

const scenarios: Record<Scenario, { label: string; description: string; setup: () => PhysicsState }> = {
  freefall: {
    label: "Free Fall",
    description: "Two objects of different mass dropped from the same height. Tests whether a world model correctly predicts mass-independent gravitational acceleration.",
    setup: () => ({
      objects: [
        { x: 200, y: 50, vx: 0, vy: 0, radius: 12, mass: 1, color: "hsl(192, 80%, 50%)", trail: [] },
        { x: 400, y: 50, vx: 0, vy: 0, radius: 20, mass: 5, color: "hsl(262, 60%, 55%)", trail: [] },
      ],
      time: 0,
    }),
  },
  collision: {
    label: "Elastic Collision",
    description: "Two objects approach each other. Tests conservation of momentum and energy transfer — a fundamental challenge for world models.",
    setup: () => ({
      objects: [
        { x: 100, y: 200, vx: 120, vy: 0, radius: 15, mass: 2, color: "hsl(192, 80%, 50%)", trail: [] },
        { x: 450, y: 200, vx: -60, vy: 0, radius: 22, mass: 4, color: "hsl(350, 65%, 55%)", trail: [] },
      ],
      time: 0,
    }),
  },
  projectile: {
    label: "Projectile Motion",
    description: "Object launched at an angle. Tests whether the model captures the parabolic arc and the decomposition of velocity into independent horizontal and vertical components.",
    setup: () => ({
      objects: [
        { x: 60, y: 350, vx: 150, vy: -220, radius: 10, mass: 1, color: "hsl(38, 75%, 55%)", trail: [] },
      ],
      time: 0,
    }),
  },
  pendulum: {
    label: "Pendulum",
    description: "Simple pendulum motion. Tests understanding of restoring forces, energy exchange between potential and kinetic, and periodic motion.",
    setup: () => ({
      objects: [
        { x: 300 + 150 * Math.sin(Math.PI / 3), y: 50 + 150 * (1 - Math.cos(Math.PI / 3)), vx: 0, vy: 0, radius: 14, mass: 2, color: "hsl(142, 55%, 45%)", trail: [] },
      ],
      time: 0,
    }),
  },
};

export default function Sandbox() {
  const [scenario, setScenario] = useState<Scenario>("freefall");
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState([1]);
  const [state, setState] = useState<PhysicsState>(scenarios.freefall.setup());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const stateRef = useRef(state);
  stateRef.current = state;

  const PIVOT = { x: 300, y: 50 };
  const PEND_L = 150;

  const reset = useCallback(() => {
    setRunning(false);
    cancelAnimationFrame(animRef.current);
    setState(scenarios[scenario].setup());
  }, [scenario]);

  useEffect(() => {
    reset();
  }, [scenario, reset]);

  // Physics step
  const step = useCallback((dt: number) => {
    setState((prev) => {
      const next = { ...prev, time: prev.time + dt };
      next.objects = prev.objects.map((obj) => {
        const o = { ...obj, trail: [...obj.trail] };

        if (scenario === "pendulum") {
          // Pendulum physics
          const dx = o.x - PIVOT.x;
          const dy = o.y - PIVOT.y;
          const angle = Math.atan2(dx, dy);
          const angularAccel = -(G / PEND_L) * Math.sin(angle);

          // Derive angular velocity from current velocity
          const currentAngVel = (o.vx * Math.cos(angle) - o.vy * Math.sin(angle)) / PEND_L;
          const newAngVel = currentAngVel + angularAccel * dt;
          const newAngle = angle + newAngVel * dt;

          o.x = PIVOT.x + PEND_L * Math.sin(newAngle);
          o.y = PIVOT.y + PEND_L * Math.cos(newAngle);
          o.vx = PEND_L * newAngVel * Math.cos(newAngle);
          o.vy = -PEND_L * newAngVel * Math.sin(newAngle);
        } else {
          // Standard physics
          o.vy += G * dt;
          o.x += o.vx * dt;
          o.y += o.vy * dt;

          // Floor bounce
          if (o.y + o.radius > CANVAS_H) {
            o.y = CANVAS_H - o.radius;
            o.vy = -o.vy * 0.8;
            if (Math.abs(o.vy) < 10) o.vy = 0;
          }
          // Wall bounce
          if (o.x - o.radius < 0) { o.x = o.radius; o.vx = -o.vx * 0.9; }
          if (o.x + o.radius > CANVAS_W) { o.x = CANVAS_W - o.radius; o.vx = -o.vx * 0.9; }
        }

        // Trail
        o.trail.push({ x: o.x, y: o.y });
        if (o.trail.length > 120) o.trail.shift();

        return o;
      });

      // Collision detection (for collision scenario)
      if (scenario === "collision" && next.objects.length === 2) {
        const [a, b] = next.objects;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < a.radius + b.radius && dist > 0) {
          // Elastic collision
          const nx = dx / dist;
          const ny = dy / dist;
          const relVx = a.vx - b.vx;
          const relVy = a.vy - b.vy;
          const relVn = relVx * nx + relVy * ny;
          if (relVn > 0) {
            const j = (2 * relVn) / (a.mass + b.mass);
            a.vx -= j * b.mass * nx;
            a.vy -= j * b.mass * ny;
            b.vx += j * a.mass * nx;
            b.vy += j * a.mass * ny;
            // Separate
            const overlap = (a.radius + b.radius - dist) / 2;
            a.x -= overlap * nx;
            a.y -= overlap * ny;
            b.x += overlap * nx;
            b.y += overlap * ny;
          }
        }
      }

      return next;
    });
  }, [scenario]);

  // Animation loop
  useEffect(() => {
    if (!running) return;

    const animate = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05) * speed[0];
      lastTimeRef.current = timestamp;
      step(dt);
      animRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = 0;
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [running, step, speed]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#0f1114" : "#f5f7fa";
    const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
    const textColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)";
    const floorColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_W; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_H; y += 50) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
    }

    // Floor
    ctx.strokeStyle = floorColor;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, CANVAS_H - 1); ctx.lineTo(CANVAS_W, CANVAS_H - 1); ctx.stroke();

    // Pendulum rod
    if (scenario === "pendulum" && state.objects.length > 0) {
      ctx.strokeStyle = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PIVOT.x, PIVOT.y);
      ctx.lineTo(state.objects[0].x, state.objects[0].y);
      ctx.stroke();
      // Pivot
      ctx.fillStyle = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.3)";
      ctx.beginPath(); ctx.arc(PIVOT.x, PIVOT.y, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Objects
    state.objects.forEach((obj) => {
      // Trail
      if (obj.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(obj.trail[0].x, obj.trail[0].y);
        for (let i = 1; i < obj.trail.length; i++) {
          ctx.lineTo(obj.trail[i].x, obj.trail[i].y);
        }
        ctx.strokeStyle = obj.color.replace(")", ", 0.25)").replace("hsl(", "hsla(");
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Object
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
      ctx.fillStyle = obj.color;
      ctx.fill();

      // Mass label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`${obj.mass}`, obj.x, obj.y);
    });

    // Time
    ctx.fillStyle = textColor;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`t = ${state.time.toFixed(2)}s`, 8, 8);

    // Velocity vectors
    state.objects.forEach((obj) => {
      const scale = 0.3;
      const vLen = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
      if (vLen > 5) {
        ctx.strokeStyle = obj.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(obj.x, obj.y);
        ctx.lineTo(obj.x + obj.vx * scale, obj.y + obj.vy * scale);
        ctx.stroke();
        // Arrowhead
        const angle = Math.atan2(obj.vy, obj.vx);
        ctx.beginPath();
        ctx.moveTo(obj.x + obj.vx * scale, obj.y + obj.vy * scale);
        ctx.lineTo(
          obj.x + obj.vx * scale - 6 * Math.cos(angle - 0.4),
          obj.y + obj.vy * scale - 6 * Math.sin(angle - 0.4)
        );
        ctx.moveTo(obj.x + obj.vx * scale, obj.y + obj.vy * scale);
        ctx.lineTo(
          obj.x + obj.vx * scale - 6 * Math.cos(angle + 0.4),
          obj.y + obj.vy * scale - 6 * Math.sin(angle + 0.4)
        );
        ctx.stroke();
      }
    });
  }, [state, scenario]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight" data-testid="text-page-title">Physics Sandbox</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Interactive physics simulations that illustrate the dynamics world models must learn to predict. 
          Observe ground-truth behavior, then consider what each architecture gets right or wrong.
        </p>
      </div>

      {/* Scenario selector */}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(scenarios) as Scenario[]).map((key) => (
          <button
            key={key}
            onClick={() => setScenario(key)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all border ${
              scenario === key
                ? "border-primary bg-primary/10 text-foreground font-medium"
                : "border-border bg-card text-muted-foreground hover:border-primary/50"
            }`}
            data-testid={`scenario-${key}`}
          >
            {scenarios[key].label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Canvas */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              className="w-full"
              style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
              data-testid="physics-canvas"
            />
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={running ? "secondary" : "default"}
                  onClick={() => setRunning(!running)}
                  data-testid="button-play"
                >
                  {running ? <Pause className="w-3.5 h-3.5 mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                  {running ? "Pause" : "Play"}
                </Button>
                <Button size="sm" variant="outline" onClick={reset} data-testid="button-reset">
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Reset
                </Button>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Speed</span>
                <div className="w-24">
                  <Slider value={speed} onValueChange={setSpeed} min={0.25} max={3} step={0.25} />
                </div>
                <span className="font-mono w-8 text-right">{speed[0]}x</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{scenarios[scenario].label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {scenarios[scenario].description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">What to observe</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {scenario === "freefall" && (
                <>
                  <ObsItem>Both objects fall at the same rate regardless of mass</ObsItem>
                  <ObsItem>Velocity vectors grow linearly (constant acceleration)</ObsItem>
                  <ObsItem>RSSM models often predict mass-dependent fall rates</ObsItem>
                  <ObsItem>Neural ODEs handle this well due to continuous dynamics</ObsItem>
                </>
              )}
              {scenario === "collision" && (
                <>
                  <ObsItem>Total momentum is conserved before and after impact</ObsItem>
                  <ObsItem>Heavier object barely changes velocity</ObsItem>
                  <ObsItem>Transformer models struggle with instantaneous state changes</ObsItem>
                  <ObsItem>Diffusion models capture the distribution of post-collision states</ObsItem>
                </>
              )}
              {scenario === "projectile" && (
                <>
                  <ObsItem>Horizontal velocity stays constant (no air resistance)</ObsItem>
                  <ObsItem>Vertical velocity increases linearly due to gravity</ObsItem>
                  <ObsItem>Path forms a parabola — a key geometric test</ObsItem>
                  <ObsItem>Long-horizon prediction errors compound along the arc</ObsItem>
                </>
              )}
              {scenario === "pendulum" && (
                <>
                  <ObsItem>Energy exchanges between potential (height) and kinetic (speed)</ObsItem>
                  <ObsItem>Period depends on length, not mass or amplitude (small angles)</ObsItem>
                  <ObsItem>Tests periodic/oscillatory dynamics understanding</ObsItem>
                  <ObsItem>RSSM models often fail to maintain energy conservation</ObsItem>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">State</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {state.objects.map((obj, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-mono">
                    <Circle className="w-3 h-3 shrink-0" style={{ color: obj.color, fill: obj.color }} />
                    <span className="text-muted-foreground">
                      m={obj.mass} pos=({obj.x.toFixed(0)},{obj.y.toFixed(0)}) v=({obj.vx.toFixed(0)},{obj.vy.toFixed(0)})
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ObsItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
      <span className="text-xs text-muted-foreground">{children}</span>
    </div>
  );
}
