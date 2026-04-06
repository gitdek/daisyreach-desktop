import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

type ProgressCallback = (method: string, params: any) => void;

export class PythonBridge {
  private proc: ChildProcess | null = null;
  private pending = new Map<number, PendingRequest>();
  private nextId = 1;
  private buffer = '';
  private progressCallbacks: ProgressCallback[] = [];
  private ready = false;
  private readyResolve: (() => void) | null = null;
  private restartAttempts = 0;
  private maxRestarts = 3;

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.readyResolve = resolve;

      const daisyreachPath = process.env.DAISYREACH_PATH || path.resolve(__dirname, '../../..');

      // Find Python executable
      const pythonCmd = process.env.DAISYREACH_PYTHON || 'python3';

      this.proc = spawn(pythonCmd, ['-m', 'cli.bridge'], {
        cwd: daisyreachPath,
        env: {
          ...process.env,
          DAISYREACH_PATH: daisyreachPath,
          PYTHONUNBUFFERED: '1', // ensure unbuffered stdout/stderr
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      if (!this.proc.stdout || !this.proc.stderr || !this.proc.stdin) {
        reject(new Error('Failed to spawn Python bridge: missing stdio'));
        return;
      }

      this.proc.stdout.on('data', (data: Buffer) => {
        this.handleData(data.toString());
      });

      this.proc.stderr.on('data', (data: Buffer) => {
        const msg = data.toString().trim();
        if (msg) console.log(`[bridge:stderr] ${msg}`);
      });

      this.proc.on('exit', (code) => {
        console.log(`[bridge] Python process exited with code ${code}`);
        this.ready = false;
        this.proc = null;

        // Reject all pending requests
        for (const [id, req] of this.pending) {
          req.reject(new Error(`Python bridge exited (code ${code})`));
        }
        this.pending.clear();
      });

      this.proc.on('error', (err) => {
        console.error(`[bridge] Python process error:`, err);
        reject(err);
      });

      // Timeout for startup
      setTimeout(() => {
        if (!this.ready) {
          reject(new Error('Python bridge failed to start within 10s'));
        }
      }, 10000);
    });
  }

  async call(method: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.proc || !this.proc.stdin) {
      throw new Error('Python bridge not running');
    }

    const id = this.nextId++;
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.proc!.stdin!.write(JSON.stringify(request) + '\n');
    });
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.push(callback);
    return () => {
      this.progressCallbacks = this.progressCallbacks.filter(cb => cb !== callback);
    };
  }

  isReady(): boolean {
    return this.ready;
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.stdin?.end();
      // Give it a moment to exit gracefully
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          this.proc?.kill();
          resolve();
        }, 3000);
        this.proc!.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      this.proc = null;
      this.ready = false;
    }
  }

  private handleData(chunk: string): void {
    this.buffer += chunk;

    // Process complete lines
    const lines = this.buffer.split('\n');
    // Last element may be incomplete
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const msg = JSON.parse(trimmed);

        // Notification (no id) — progress event or bridge.ready
        if (!msg.id && msg.method) {
          if (msg.method === 'bridge.ready') {
            this.ready = true;
            this.restartAttempts = 0;
            this.readyResolve?.();
            this.readyResolve = null;
            console.log('[bridge] Ready');
          } else {
            // Progress notification
            for (const cb of this.progressCallbacks) {
              try {
                cb(msg.method, msg.params);
              } catch (err) {
                console.error('[bridge] Progress callback error:', err);
              }
            }
          }
          continue;
        }

        // Response (has id)
        if (msg.id !== undefined) {
          const pending = this.pending.get(msg.id);
          if (pending) {
            this.pending.delete(msg.id);
            if (msg.error) {
              pending.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              pending.resolve(msg.result);
            }
          }
        }
      } catch (err) {
        console.error(`[bridge] JSON parse error: ${trimmed.substring(0, 100)}`);
      }
    }
  }
}
