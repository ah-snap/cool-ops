import { spawn } from "child_process";
import type { ChildProcessWithoutNullStreams } from "child_process";
import type { PortForwardDefinition } from "./definitions.ts";
import { portForwardDefinitions } from "./definitions.ts";

export type PortForwardStatus = "idle" | "starting" | "running" | "stopped" | "error";

type PortForwardLogEntry = {
  id: number;
  timestamp: string;
  stream: "stdout" | "stderr" | "system";
  message: string;
};

type PortForwardState = {
  definition: PortForwardDefinition;
  status: PortForwardStatus;
  pid: number | null;
  lastStartedAt: string | null;
  lastExitedAt: string | null;
  exitCode: number | null;
  errorMessage: string | null;
  updatedAt: string;
  logs: PortForwardLogEntry[];
};

type PortForwardEvent = {
  id: string;
  type: "status" | "log";
  state: ReturnType<PortForwardManager["getSummaryById"]>;
  entry?: PortForwardLogEntry;
};

type PortForwardEventHandler = (event: PortForwardEvent) => void;

const MAX_LOG_ENTRIES = 1000;

function formatProcessError(error: Error): string {
  const err = error as NodeJS.ErrnoException;
  if (err.code === "ENOENT") {
    return `Executable not found in PATH: \"${err.path || "unknown"}\". Install AWS CLI in the API runtime environment.`;
  }

  return err.message;
}

class PortForwardManager {
  private readonly states = new Map<string, PortForwardState>();
  private readonly processes = new Map<string, ChildProcessWithoutNullStreams>();
  private nextLogEntryId = 1;
  private eventHandler: PortForwardEventHandler | null = null;

  constructor(definitions: PortForwardDefinition[]) {
    const now = new Date().toISOString();

    definitions.forEach((definition) => {
      this.states.set(definition.id, {
        definition,
        status: "idle",
        pid: null,
        lastStartedAt: null,
        lastExitedAt: null,
        exitCode: null,
        errorMessage: null,
        updatedAt: now,
        logs: []
      });
    });
  }

  setEventHandler(handler: PortForwardEventHandler): void {
    this.eventHandler = handler;
  }

  listSummaries() {
    return Array.from(this.states.values()).map((state) => this.toSummary(state));
  }

  getSummaryById(id: string) {
    const state = this.getState(id);
    return this.toSummary(state);
  }

  getLogs(id: string, limit = 300): PortForwardLogEntry[] {
    const state = this.getState(id);
    const safeLimit = Math.max(1, Math.min(limit, MAX_LOG_ENTRIES));
    return state.logs.slice(-safeLimit);
  }

  start(id: string) {
    const state = this.getState(id);

    if (state.status === "running" || state.status === "starting") {
      return this.toSummary(state);
    }

    state.status = "starting";
    state.exitCode = null;
    state.errorMessage = null;
    state.lastStartedAt = new Date().toISOString();
    state.updatedAt = state.lastStartedAt;
    this.emitStatus(id);

    this.appendLog(id, "system", `Starting command: ${state.definition.command} ${state.definition.args.join(" ")}`);

    const child = spawn(state.definition.command, state.definition.args, {
      env: process.env,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"]
    });

    this.processes.set(id, child);

    child.on("spawn", () => {
      state.pid = child.pid ?? null;
      state.status = "running";
      state.updatedAt = new Date().toISOString();
      this.appendLog(id, "system", `Port-forward process started (pid ${state.pid ?? "unknown"}).`);
      this.emitStatus(id);
    });

    child.stdout.on("data", (chunk: Buffer) => {
      this.appendLog(id, "stdout", chunk.toString("utf8"));
    });

    child.stderr.on("data", (chunk: Buffer) => {
      this.appendLog(id, "stderr", chunk.toString("utf8"));
    });

    child.on("error", (err) => {
      const processError = formatProcessError(err);
      state.status = "error";
      state.errorMessage = processError;
      state.pid = null;
      state.updatedAt = new Date().toISOString();
      this.appendLog(id, "system", `Process error: ${processError}`);
      this.emitStatus(id);
    });

    child.on("close", (code) => {
      this.processes.delete(id);
      state.pid = null;
      state.lastExitedAt = new Date().toISOString();
      state.exitCode = code;
      state.status = code === 0 ? "stopped" : "error";
      state.updatedAt = state.lastExitedAt;

      const codeLabel = code === null ? "unknown" : String(code);
      this.appendLog(id, "system", `Port-forward process exited with code ${codeLabel}.`);
      this.emitStatus(id);
    });

    return this.toSummary(state);
  }

  async restart(id: string) {
    await this.stop(id);
    return this.start(id);
  }

  async stop(id: string) {
    const state = this.getState(id);
    const processRef = this.processes.get(id);

    if (!processRef) {
      state.status = "stopped";
      state.updatedAt = new Date().toISOString();
      this.emitStatus(id);
      return this.toSummary(state);
    }

    this.appendLog(id, "system", "Stopping port-forward process...");

    await new Promise<void>((resolve) => {
      let done = false;
      const finish = () => {
        if (done) {
          return;
        }
        done = true;
        resolve();
      };

      processRef.once("close", () => finish());

      const signaled = processRef.kill();
      if (!signaled) {
        finish();
      }

      setTimeout(() => {
        if (done) {
          return;
        }

        const forceKilled = processRef.kill("SIGKILL");
        if (forceKilled) {
          this.appendLog(id, "system", "Forced termination issued (SIGKILL)." );
        }
      }, 4000);
    });

    return this.toSummary(this.getState(id));
  }

  private getState(id: string): PortForwardState {
    const state = this.states.get(id);
    if (!state) {
      throw new Error(`Unknown port-forward id: ${id}`);
    }

    return state;
  }

  private appendLog(id: string, stream: PortForwardLogEntry["stream"], message: string): void {
    const state = this.getState(id);
    const lines = message
      .replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => line.length > 0);

    if (lines.length === 0) {
      return;
    }

    for (const line of lines) {
      const entry: PortForwardLogEntry = {
        id: this.nextLogEntryId++,
        timestamp: new Date().toISOString(),
        stream,
        message: line
      };

      state.logs.push(entry);
      if (state.logs.length > MAX_LOG_ENTRIES) {
        state.logs.shift();
      }

      this.emitLog(id, entry);
    }

    state.updatedAt = new Date().toISOString();
  }

  private toSummary(state: PortForwardState) {
    return {
      id: state.definition.id,
      name: state.definition.name,
      description: state.definition.description,
      command: state.definition.command,
      args: state.definition.args,
      status: state.status,
      pid: state.pid,
      lastStartedAt: state.lastStartedAt,
      lastExitedAt: state.lastExitedAt,
      exitCode: state.exitCode,
      errorMessage: state.errorMessage,
      updatedAt: state.updatedAt
    };
  }

  private emitStatus(id: string): void {
    if (!this.eventHandler) {
      return;
    }

    this.eventHandler({
      id,
      type: "status",
      state: this.getSummaryById(id)
    });
  }

  private emitLog(id: string, entry: PortForwardLogEntry): void {
    if (!this.eventHandler) {
      return;
    }

    this.eventHandler({
      id,
      type: "log",
      state: this.getSummaryById(id),
      entry
    });
  }
}

export const portForwardManager = new PortForwardManager(portForwardDefinitions);
