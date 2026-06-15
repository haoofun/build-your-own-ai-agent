// logger.ts — a tiny leveled logger with zero dependencies.
export type Level = "debug" | "info" | "warn" | "error";

const ORDER: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Lines below the configured threshold are dropped. The sink defaults to
// console.log but is injectable so tests can capture output.
export class Logger {
  constructor(
    private threshold: Level = "info",
    private sink: (line: string) => void = console.log,
  ) {}

  private emit(level: Level, msg: string): void {
    if (ORDER[level] < ORDER[this.threshold]) return;
    const ts = new Date().toISOString();
    this.sink(`${ts} [${level.toUpperCase()}] ${msg}`);
  }

  debug(m: string): void { this.emit("debug", m); }
  info(m: string): void { this.emit("info", m); }
  warn(m: string): void { this.emit("warn", m); }
  error(m: string): void { this.emit("error", m); }

  // A child logger prefixes every line, handy for per-task scoping.
  child(prefix: string): Logger {
    return new Logger(this.threshold, (line) => this.sink(`${prefix} ${line}`));
  }
}
