import { ipcMain, BrowserWindow } from 'electron';
import { PythonBridge } from '../bridge';

export function registerIpcHandlers(bridge: PythonBridge): void {

  // --- Warehouse ---
  ipcMain.handle('warehouse:stats', async () => {
    return bridge.call('warehouse.stats');
  });

  ipcMain.handle('warehouse:list', async (_event, params) => {
    return bridge.call('warehouse.list', params || {});
  });

  ipcMain.handle('warehouse:get', async (_event, businessId) => {
    return bridge.call('warehouse.get', { business_id: businessId });
  });

  ipcMain.handle('warehouse:coverage', async (_event, params) => {
    return bridge.call('warehouse.coverage', params || {});
  });

  // --- Search ---
  ipcMain.handle('search:resolve', async (_event, phrase) => {
    return bridge.call('search.resolve', { phrase });
  });

  ipcMain.handle('search:run', async (_event, params) => {
    return bridge.call('search.run', params);
  });

  // --- Run Management ---
  ipcMain.handle('run:start', async (_event, params) => {
    return bridge.call('run.start', params);
  });

  ipcMain.handle('run:status', async (_event, runId) => {
    return bridge.call('run.status', { run_id: runId });
  });

  ipcMain.handle('run:cancel', async (_event, runId) => {
    return bridge.call('run.cancel', { run_id: runId });
  });

  ipcMain.handle('run:list', async () => {
    return bridge.call('run.list', {});
  });

  ipcMain.handle('run:log', async (_event, runId) => {
    return bridge.call('run.log', { run_id: runId });
  });

  // --- Batch ---
  ipcMain.handle('batch:load_csv', async (_event, path) => {
    return bridge.call('batch.load_csv', { path });
  });

  ipcMain.handle('batch:run', async (_event, params) => {
    return bridge.call('batch.run', params);
  });

  // --- Enrich, Qualify, Verify ---
  ipcMain.handle('enrich:single', async (_event, params) => {
    return bridge.call('enrich.single', params);
  });

  ipcMain.handle('qualify:score', async (_event, params) => {
    return bridge.call('qualify.score', params);
  });

  ipcMain.handle('verify:lead', async (_event, params) => {
    return bridge.call('verify.lead', params);
  });

  ipcMain.handle('activity:detect', async (_event, params) => {
    return bridge.call('activity.detect', params);
  });

  ipcMain.handle('knockout:apply', async (_event, params) => {
    return bridge.call('knockout.apply', params);
  });

  ipcMain.handle('warehouse:provenance', async (_event, businessId) => {
    return bridge.call('warehouse.provenance', { business_id: businessId });
  });

  // --- Studio ---
  ipcMain.handle('studio:snapshot', async (_event, params) => {
    return bridge.call('studio.snapshot', params);
  });

  ipcMain.handle('studio:analyze', async (_event, params) => {
    return bridge.call('studio.analyze', params);
  });

  ipcMain.handle('studio:vision_pipeline', async (_event, params) => {
    return bridge.call('studio.vision_pipeline', params);
  });

  ipcMain.handle('studio:content_brief', async (_event, params) => {
    return bridge.call('studio.content_brief', params);
  });

  ipcMain.handle('studio:theme_generate', async (_event, params) => {
    return bridge.call('studio.theme_generate', params);
  });

  ipcMain.handle('studio:deploy', async (_event, params) => {
    return bridge.call('studio.deploy', params);
  });

  // --- Config ---
  ipcMain.handle('config:get', async () => {
    return bridge.call('config.get');
  });

  ipcMain.handle('config:set', async (_event, key, value) => {
    return bridge.call('config.set', { key, value });
  });

  ipcMain.handle('config:test_api', async (_event, service) => {
    return bridge.call('config.test_api', { service });
  });

  // --- Raw CLI ---
  ipcMain.handle('cli:raw', async (_event, command, args) => {
    return bridge.call('cli.raw', { command, args });
  });

  // --- Bridge status ---
  ipcMain.handle('bridge:status', async () => {
    return { ready: bridge.isReady() };
  });

  // Forward progress events from Python bridge to renderer
  bridge.onProgress((method, params) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send('bridge:progress', method, params);
    }
  });
}
