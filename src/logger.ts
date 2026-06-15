/**
 * Orin.LAB · Logger
 * Simple namespaced logger for agents and services.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  if (raw in LEVELS) return raw as LogLevel;
  return "info";
}

export function getLogger(name: string) {
  const minLevel = currentLevel();

  function log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (LEVELS[level] < LEVELS[minLevel]) return;
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${name}]`;
    if (level === "error") console.error(prefix, message, ...args);
    else if (level === "warn") console.warn(prefix, message, ...args);
    else console.log(prefix, message, ...args);
  }

  return {
    debug: (message: string, ...args: unknown[]) => log("debug", message, ...args),
    info: (message: string, ...args: unknown[]) => log("info", message, ...args),
    warn: (message: string, ...args: unknown[]) => log("warn", message, ...args),
    error: (message: string, ...args: unknown[]) => log("error", message, ...args),
  };
}
