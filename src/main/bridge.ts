import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { app } from 'electron'
import { join } from 'path'

interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcNotification {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
  timer: NodeJS.Timeout
}

export class PythonBridge extends EventEmitter {
  private proc: ChildProcess | null = null
  private pending = new Map<number, PendingRequest>()
  private nextId = 1
  private buffer = ''
  private _ready = false

  get ready(): boolean {
    return this._ready
  }

  /**
   * Locate the Python bridge executable.
   * In development: uses python3 to run the bridge module directly.
   * In production: uses the PyInstaller-built binary from resources/.
   */
  private getBridgeCommand(): { command: string; args: string[]; env: Record<string, string> } {
    const daisyreachPath = process.env.DAISYREACH_PATH || join(app.getAppPath(), '..', 'DaisyReach')

    if (process.env.NODE_ENV === 'development') {
      return {
        command: 'python3',
        args: ['-m', 'cli.bridge'],
        env: {
          ...process.env,
          PYTHONPATH: daisyreachPath,
          PYTHONIOENCODING: 'utf-8',
        },
      }
    }

    // Production: use PyInstaller binary
    const bridgePath = process.platform === 'win32'
      ? join(process.resourcesPath, 'daisyreach-bridge.exe')
      : join(process.resourcesPath, 'daisyreach-bridge')

    return {
      command: bridgePath,
      args: [],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
      },
    }
  }

  async start(): Promise<void> {
    const { command, args, env } = this.getBridgeCommand()
    console.log(`[bridge] Starting: ${command} ${args.join(' ')}`)

    this.proc = spawn(command, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.env.DAISYREACH_PATH || app.getAppPath(),
    })

    this.proc.stdout?.on('data', (data: Buffer) => {
      this.buffer += data.toString('utf-8')
      this.processBuffer()
    })

    this.proc.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8').trim()
      if (text) {
        console.log(`[bridge:stderr] ${text}`)
        this.emit('stderr', text)
      }
    })

    this.proc.on('exit', (code, signal) => {
      console.log(`[bridge] Exited with code ${code}, signal ${signal}`)
      this._ready = false
      this.emit('exit', { code, signal })

      // Reject all pending requests
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timer)
        pending.reject(new Error(`Python bridge exited (${code})`))
        this.pending.delete(id)
      }
    })

    this.proc.on('error', (err) => {
      console.error(`[bridge] Error:`, err)
      this._ready = false
      this.emit('error', err)
    })

    // Wait for bridge to signal readiness
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Bridge startup timeout')), 15000)
      const onReady = (msg: JsonRpcNotification) => {
        if (msg.method === 'bridge.ready') {
          clearTimeout(timer)
          this.off('notification', onReady)
          this._ready = true
          resolve()
        }
      }
      this.on('notification', onReady as (...args: unknown[]) => void)
    })
  }

  async stop(): Promise<void> {
    if (this.proc) {
      this.proc.kill('SIGTERM')
      // Give it 3 seconds to exit gracefully
      await new Promise<void>((resolve) => {
        const timer = setTimeout(() => {
          this.proc?.kill('SIGKILL')
          resolve()
        }, 3000)
        this.proc?.on('exit', () => {
          clearTimeout(timer)
          resolve()
        })
      })
      this.proc = null
    }
  }

  /**
   * Call a method on the Python bridge. Returns the result.
   * Progress notifications are emitted via the 'notification' event.
   */
  async call(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.proc || !this.proc.stdin) {
      throw new Error('Python bridge not running')
    }

    const id = this.nextId++
    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: params ?? {},
    }

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Timeout calling ${method}`))
      }, 300_000) // 5 minute default timeout for long-running operations

      this.pending.set(id, { resolve, reject, timer })
      this.proc!.stdin!.write(JSON.stringify(request) + '\n')
    })
  }

  private processBuffer(): void {
    // JSON-RPC messages are newline-delimited
    const lines = this.buffer.split('\n')
    // Last element might be incomplete
    this.buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      try {
        const msg: JsonRpcMessage = JSON.parse(trimmed)

        if ('id' in msg && (msg as JsonRpcResponse).result !== undefined || (msg as JsonRpcResponse).error) {
          // This is a response
          const response = msg as JsonRpcResponse
          const pending = this.pending.get(response.id)
          if (pending) {
            clearTimeout(pending.timer)
            this.pending.delete(response.id)
            if (response.error) {
              pending.reject(new Error(response.error.message))
            } else {
              pending.resolve(response.result)
            }
          }
        } else if ('id' in msg && !('result' in msg) && !('error' in msg)) {
          // Request from Python (ignore for now)
        } else if (!('id' in msg)) {
          // Notification from Python
          this.emit('notification', msg)
        }
      } catch (err) {
        console.warn(`[bridge] Failed to parse line: ${trimmed}`)
      }
    }
  }
}
