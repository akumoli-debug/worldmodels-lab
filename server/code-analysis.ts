/**
 * Computational analysis of Phaser.js game code.
 * Replaces LLM-as-oracle with actual code parsing and metrics.
 * 
 * All metrics are either COMPUTED (from code/frames) or clearly marked as ESTIMATED.
 */

import * as acorn from "acorn";
import * as walk from "acorn-walk";
import { deflateSync } from "zlib";

// ─── Types ──────────────────────────────────────────

export interface ComputedMetrics {
  // Code-derived (all COMPUTED)
  stateVariables: StateVariable[];
  actionSpace: ActionSpaceAnalysis;
  updateComplexity: UpdateComplexity;
  codeMetrics: CodeMetrics;
  observability: ObservabilityAnalysis;
  // Frame-derived (COMPUTED from code structure, not actual rendering)
  estimatedVisualComplexity: VisualComplexityEstimate;
  // Composite
  complexityProfile: ComplexityProfile;
}

export interface StateVariable {
  name: string;
  type: "position" | "velocity" | "counter" | "boolean" | "timer" | "reference" | "unknown";
  scope: "scene" | "object" | "global";
  causallyRelevant: boolean; // affects transitions/update logic
  observed: boolean; // appears in rendering/display logic
  confidence: "high" | "medium";
}

export interface ActionSpaceAnalysis {
  inputs: string[]; // detected input keys/actions
  type: "discrete" | "continuous" | "hybrid";
  size: number;
  source: "computed";
}

export interface UpdateComplexity {
  branchCount: number; // if/else/switch in update
  loopCount: number; // for/while in update
  collisionHandlers: number;
  timerEvents: number;
  maxNestingDepth: number;
  cyclomaticComplexity: number;
  source: "computed";
}

export interface CodeMetrics {
  totalLines: number;
  functionCount: number;
  objectCreationCount: number; // new Phaser.*, this.add.*
  physicsBodyCount: number;
  compressedSize: number; // zlib compressed code size
  compressionRatio: number; // raw/compressed — higher = more redundant
  source: "computed";
}

export interface ObservabilityAnalysis {
  totalStateVars: number;
  observedVars: number;
  hiddenVars: number;
  observabilityRatio: number; // observed/total
  hiddenCausalVars: StateVariable[]; // the critical ones — hidden but causally relevant
  verdict: "fully observable" | "partially observable" | "mostly observable";
  source: "computed";
}

export interface VisualComplexityEstimate {
  estimatedObjectCount: number;
  usesParticles: boolean;
  usesText: boolean;
  colorCount: number; // distinct hex/rgb colors in code
  animationComplexity: "static" | "simple" | "moderate" | "complex";
  source: "computed";
}

export interface ComplexityProfile {
  // Each dimension 0-1 normalized, COMPUTED
  stateSpaceDim: number; // from state variable count
  actionSpaceDim: number; // from action count
  transitionComplexity: number; // from update analysis
  observabilityGap: number; // 1 - observability ratio
  visualDensity: number; // from object/color count
  // Composite (weighted, transparent formula)
  compositeScore: number; // 0-10, formula shown to user
  formula: string; // the actual formula used
  source: "computed";
}

// ─── AST Analysis ──────────────────────────────────

function parseCode(code: string): acorn.Node | null {
  try {
    return acorn.parse(code, {
      ecmaVersion: 2020,
      sourceType: "script",
      allowReservedWords: true,
    });
  } catch {
    // Phaser code may have some parsing issues, try loose
    try {
      return acorn.parse(code, {
        ecmaVersion: 2020,
        sourceType: "script",
        allowReservedWords: true,
        allowReturnOutsideFunction: true,
      });
    } catch {
      return null;
    }
  }
}

function extractStateVariables(code: string, ast: acorn.Node | null): StateVariable[] {
  const vars: StateVariable[] = [];
  const seen = new Set<string>();

  // Pattern 1: this.* assignments (scene properties)
  const thisAssignments = code.matchAll(/this\.(\w+)\s*=\s*([^;]+)/g);
  for (const match of thisAssignments) {
    const name = match[1];
    const value = match[2].trim();
    if (seen.has(name)) continue;
    seen.add(name);

    // Skip Phaser internals
    if (["physics", "add", "input", "cameras", "scene", "load", "game", "sys", "sound", "time", "anims", "tweens", "make", "matter", "events"].includes(name)) continue;

    const type = inferVarType(name, value);
    const causallyRelevant = isCausallyRelevant(name, code);
    const observed = isObserved(name, code);

    vars.push({
      name: `this.${name}`,
      type,
      scope: "scene",
      causallyRelevant,
      observed,
      confidence: "high",
    });
  }

  // Pattern 2: let/var/const in create/update functions
  const localVarPattern = /(?:let|var|const)\s+(\w+)\s*=\s*([^;]+)/g;
  for (const match of code.matchAll(localVarPattern)) {
    const name = match[1];
    const value = match[2].trim();
    if (seen.has(name)) continue;
    if (["config", "game", "Phaser", "scene"].includes(name)) continue;
    seen.add(name);

    const type = inferVarType(name, value);
    const causallyRelevant = isCausallyRelevant(name, code);
    const observed = isObserved(name, code);

    vars.push({
      name,
      type,
      scope: "global",
      causallyRelevant,
      observed,
      confidence: "medium",
    });
  }

  return vars;
}

function inferVarType(name: string, value: string): StateVariable["type"] {
  const n = name.toLowerCase();
  if (/(?:vel|speed|vx|vy|acceleration|dx|dy)/.test(n)) return "velocity";
  if (/(?:pos|x|y|angle|rotation|left|top|width|height)/.test(n)) return "position";
  if (/(?:score|count|lives|health|points|level|wave)/.test(n)) return "counter";
  if (/(?:timer|time|interval|delay|cooldown|spawn)/.test(n)) return "timer";
  if (/(?:is|has|can|active|alive|dead|paused|game.*over|enabled|visible)/.test(n)) return "boolean";
  if (/(?:this\.add\.|this\.physics\.|new Phaser|this\.matter)/.test(value)) return "reference";
  if (/^(?:true|false)$/.test(value.trim())) return "boolean";
  if (/^\d+$/.test(value.trim())) return "counter";
  return "unknown";
}

function isCausallyRelevant(name: string, code: string): boolean {
  // Variable is causal if it appears in:
  // 1. if/while conditions in update logic
  // 2. physics calculations (velocity, position changes)
  // 3. collision handlers
  // 4. timer callbacks

  const updateSection = extractUpdateSection(code);
  const collisionSection = extractCollisionSection(code);

  const relevant = updateSection + " " + collisionSection;

  // Check if variable is read (not just assigned) in update/collision logic
  const readPattern = new RegExp(`(?:if|while|&&|\\|\\||\\?|<|>|===?|!==?|\\+|\\-|\\*)\\s*[^=]*\\b${escapeRegex(name)}\\b`, "g");
  const assignTarget = new RegExp(`\\b${escapeRegex(name)}\\b\\s*(?:\\+|-|\\*)?=`, "g");

  return readPattern.test(relevant) || assignTarget.test(relevant);
}

function isObserved(name: string, code: string): boolean {
  // Variable is observed if it appears in:
  // 1. setText/setPosition/setAngle on visible objects
  // 2. Graphics draw calls
  // 3. Camera follow targets
  // 4. Directly controls a visible game object's property

  const renderPatterns = [
    `${name}.*\\.setPosition`,
    `${name}.*\\.setAngle`,
    `${name}.*\\.x\\s*=`,
    `${name}.*\\.y\\s*=`,
    `\\.setText.*${name}`,
    `\\.setScale.*${name}`,
    `\\.setAlpha.*${name}`,
    `\\.fillRect.*${name}`,
    `\\.fillCircle.*${name}`,
    `\\.lineTo.*${name}`,
    `\\.setVisible.*${name}`,
    `cameras.*follow.*${name}`,
    `\\.body\\.velocity.*${name}`,
    `\\.setVelocity.*${name}`,
  ];

  // Also: if the variable IS a game object, it's inherently visible
  const isGameObject = new RegExp(`${escapeRegex(name)}\\s*=\\s*this\\.(?:add|physics\\.add|matter\\.add)`, "g").test(code);

  if (isGameObject) return true;

  for (const pattern of renderPatterns) {
    try {
      if (new RegExp(pattern, "g").test(code)) return true;
    } catch { /* skip invalid regex */ }
  }

  return false;
}

function extractUpdateSection(code: string): string {
  // Extract the update function body
  const match = code.match(/update\s*\([^)]*\)\s*\{([\s\S]*?)(?:\n\s*\}|\n\s*\},)/);
  return match ? match[1] : "";
}

function extractCollisionSection(code: string): string {
  // Extract collision/overlap handlers
  const matches = code.matchAll(/(?:overlap|collider|collide)\s*\([^)]+,\s*[^)]+,\s*(?:function\s*\([^)]*\)\s*\{([\s\S]*?)\}|(?:\([^)]*\)|\w+)\s*=>\s*\{([\s\S]*?)\})/g);
  let sections = "";
  for (const m of matches) {
    sections += (m[1] || m[2] || "") + " ";
  }
  return sections;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Input Analysis ──────────────────────────────────

function analyzeActionSpace(code: string): ActionSpaceAnalysis {
  const inputs: string[] = [];

  // Keyboard inputs
  const keyPatterns = [
    /createCursorKeys/g,
    /keyboard\.addKey\s*\(\s*(?:Phaser\.Input\.Keyboard\.KeyCodes\.)?(\w+)/g,
    /keyboard\.isDown\s*\(\s*(?:Phaser\.Input\.Keyboard\.KeyCodes\.)?(\w+)/g,
    /cursors\.(\w+)/g,
    /input\.keyboard/g,
  ];

  const keyNames = new Set<string>();

  if (/createCursorKeys/.test(code)) {
    keyNames.add("UP");
    keyNames.add("DOWN");
    keyNames.add("LEFT");
    keyNames.add("RIGHT");
  }

  for (const match of code.matchAll(/keyboard\.addKey\s*\(\s*(?:Phaser\.Input\.Keyboard\.KeyCodes\.)?['"]?(\w+)['"]?\)/g)) {
    keyNames.add(match[1]);
  }

  // Check for WASD
  if (/['"](W|A|S|D)['"]/g.test(code)) {
    for (const k of ["W", "A", "S", "D"]) {
      if (code.includes(`'${k}'`) || code.includes(`"${k}"`)) keyNames.add(k);
    }
  }

  // Check for SPACE
  if (/SPACE|space/g.test(code)) keyNames.add("SPACE");

  // Mouse/pointer
  const hasMouse = /pointer|mouse|activePointer|input\.on\('pointer/g.test(code);
  if (hasMouse) {
    keyNames.add("MOUSE_X");
    keyNames.add("MOUSE_Y");
    if (/isDown|pointer.*Down|click/g.test(code)) keyNames.add("MOUSE_CLICK");
  }

  const inputList = Array.from(keyNames);
  const hasContinuous = hasMouse || /velocity|speed|acceleration/i.test(code);

  return {
    inputs: inputList,
    type: hasContinuous ? (inputList.length > 2 ? "hybrid" : "continuous") : "discrete",
    size: inputList.length,
    source: "computed",
  };
}

// ─── Update Complexity ──────────────────────────────

function analyzeUpdateComplexity(code: string): UpdateComplexity {
  const updateBody = extractUpdateSection(code);
  const fullCode = code; // also scan collision handlers

  // Branch counting
  const branchCount = (fullCode.match(/\b(?:if|else\s+if|switch|case)\b/g) || []).length;
  const loopCount = (fullCode.match(/\b(?:for|while|forEach|\.each)\b/g) || []).length;
  const collisionHandlers = (fullCode.match(/(?:overlap|collider|addCollidesWith)/g) || []).length;
  const timerEvents = (fullCode.match(/(?:addEvent|setTimeout|setInterval|time\.add|delayedCall)/g) || []).length;

  // Nesting depth
  let maxDepth = 0;
  let depth = 0;
  for (const char of fullCode) {
    if (char === "{") { depth++; maxDepth = Math.max(maxDepth, depth); }
    if (char === "}") depth--;
  }

  // Cyclomatic complexity approximation
  const cyclomaticComplexity = 1 + branchCount + loopCount + collisionHandlers;

  return {
    branchCount,
    loopCount,
    collisionHandlers,
    timerEvents,
    maxNestingDepth: maxDepth,
    cyclomaticComplexity,
    source: "computed",
  };
}

// ─── Code Metrics ──────────────────────────────────

function analyzeCodeMetrics(code: string): CodeMetrics {
  const totalLines = code.split("\n").length;
  const functionCount = (code.match(/function\s+\w+|=>\s*\{|(?:create|update|preload)\s*\(/g) || []).length;
  const objectCreationCount = (code.match(/this\.add\.\w+|this\.physics\.add\.\w+|this\.matter\.add\.\w+|new Phaser/g) || []).length;
  const physicsBodyCount = (code.match(/this\.physics\.add\.\w+|this\.matter\.add\.\w+|physics\.add\.existing|setImmovable|setBounce|setCollideWorldBounds/g) || []).length;

  const compressed = deflateSync(Buffer.from(code));
  const compressedSize = compressed.length;
  const compressionRatio = code.length / compressedSize;

  return {
    totalLines,
    functionCount,
    objectCreationCount,
    physicsBodyCount,
    compressedSize,
    compressionRatio: Math.round(compressionRatio * 100) / 100,
    source: "computed",
  };
}

// ─── Visual Complexity ──────────────────────────────

function estimateVisualComplexity(code: string): VisualComplexityEstimate {
  const objectCount = (code.match(/this\.add\.\w+|this\.physics\.add\.\w+|this\.matter\.add\.\w+/g) || []).length;
  const usesParticles = /particle|emitter/i.test(code);
  const usesText = /this\.add\.text|setText/g.test(code);

  // Count distinct colors
  const hexColors = new Set<string>();
  for (const m of code.matchAll(/(0x[0-9a-fA-F]{6}|#[0-9a-fA-F]{6})/g)) {
    hexColors.add(m[1].toLowerCase());
  }
  for (const m of code.matchAll(/['"]#([0-9a-fA-F]{3,6})['"]/g)) {
    hexColors.add(`#${m[1].toLowerCase()}`);
  }

  const colorCount = hexColors.size;

  let animationComplexity: VisualComplexityEstimate["animationComplexity"] = "static";
  if (/tween|animate|lerp/i.test(code)) animationComplexity = "complex";
  else if (/velocity|speed|setVelocity/i.test(code)) animationComplexity = "moderate";
  else if (/update\s*\(/.test(code)) animationComplexity = "simple";

  return {
    estimatedObjectCount: objectCount,
    usesParticles,
    usesText,
    colorCount,
    animationComplexity,
    source: "computed",
  };
}

// ─── Complexity Profile ──────────────────────────────

function computeComplexityProfile(
  stateVars: StateVariable[],
  actionSpace: ActionSpaceAnalysis,
  updateComplexity: UpdateComplexity,
  observability: ObservabilityAnalysis,
  visualComplexity: VisualComplexityEstimate
): ComplexityProfile {
  // Normalize each dimension 0-1
  const stateSpaceDim = Math.min(1, stateVars.length / 20); // 20+ vars = max
  const actionSpaceDim = Math.min(1, actionSpace.size / 10); // 10+ inputs = max
  const transitionComplexity = Math.min(1, updateComplexity.cyclomaticComplexity / 30); // 30+ = max
  const observabilityGap = 1 - observability.observabilityRatio;
  const visualDensity = Math.min(1, (visualComplexity.estimatedObjectCount + visualComplexity.colorCount) / 30);

  // Composite: weighted sum with transparent weights
  // Weights based on what actually makes environments hard for world models
  const weights = {
    stateSpace: 0.20,
    actionSpace: 0.15,
    transitions: 0.30, // most important — complex transitions are hardest to learn
    observability: 0.20, // hidden state is fundamentally limiting
    visual: 0.15,
  };

  const compositeRaw =
    weights.stateSpace * stateSpaceDim +
    weights.actionSpace * actionSpaceDim +
    weights.transitions * transitionComplexity +
    weights.observability * observabilityGap +
    weights.visual * visualDensity;

  const compositeScore = Math.round(compositeRaw * 10 * 10) / 10; // 0-10, 1 decimal

  return {
    stateSpaceDim: Math.round(stateSpaceDim * 100) / 100,
    actionSpaceDim: Math.round(actionSpaceDim * 100) / 100,
    transitionComplexity: Math.round(transitionComplexity * 100) / 100,
    observabilityGap: Math.round(observabilityGap * 100) / 100,
    visualDensity: Math.round(visualDensity * 100) / 100,
    compositeScore,
    formula: `0.20×state + 0.15×action + 0.30×transitions + 0.20×observability + 0.15×visual`,
    source: "computed",
  };
}

// ─── Main Entry Point ──────────────────────────────

export function analyzeCode(code: string): ComputedMetrics {
  const ast = parseCode(code);
  const stateVariables = extractStateVariables(code, ast);
  const actionSpace = analyzeActionSpace(code);
  const updateComplexity = analyzeUpdateComplexity(code);
  const codeMetrics = analyzeCodeMetrics(code);
  const visualComplexity = estimateVisualComplexity(code);

  // Observability
  const causalVars = stateVariables.filter((v) => v.causallyRelevant);
  const observedCausalVars = causalVars.filter((v) => v.observed);
  const hiddenCausalVars = causalVars.filter((v) => !v.observed);
  const totalStateVars = stateVariables.length;
  const observedVars = stateVariables.filter((v) => v.observed).length;
  const hiddenVars = totalStateVars - observedVars;
  const observabilityRatio = totalStateVars > 0 ? observedVars / totalStateVars : 1;

  let verdict: ObservabilityAnalysis["verdict"] = "fully observable";
  if (observabilityRatio < 0.7) verdict = "partially observable";
  else if (observabilityRatio < 1) verdict = "mostly observable";

  const observability: ObservabilityAnalysis = {
    totalStateVars,
    observedVars,
    hiddenVars,
    observabilityRatio: Math.round(observabilityRatio * 100) / 100,
    hiddenCausalVars,
    verdict,
    source: "computed",
  };

  const complexityProfile = computeComplexityProfile(
    stateVariables,
    actionSpace,
    updateComplexity,
    observability,
    visualComplexity
  );

  return {
    stateVariables,
    actionSpace,
    updateComplexity,
    codeMetrics,
    observability,
    estimatedVisualComplexity: visualComplexity,
    complexityProfile,
  };
}
