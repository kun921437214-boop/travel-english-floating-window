import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const binDir = path.join(projectRoot, 'node_modules', '.bin');
const viteBin = path.join(binDir, isWindows ? 'vite.cmd' : 'vite');
const electronBin = path.join(binDir, isWindows ? 'electron.cmd' : 'electron');
const devUrl = 'http://127.0.0.1:5173';

function assertBin(filePath, label) {
  if (!fs.existsSync(filePath)) {
    console.error(`缺少 ${label}，请先运行：npm install`);
    process.exit(1);
  }
}

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: isWindows,
    ...options
  });
}

async function waitForVite(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }
  throw new Error(`Vite 启动超时：${url}`);
}

assertBin(viteBin, 'Vite');
assertBin(electronBin, 'Electron');

console.log('正在启动 Vite...');
const vite = spawnProcess(viteBin, ['--host', '127.0.0.1', '--port', '5173']);

let electron = null;
let shuttingDown = false;

function stopAll(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (electron && !electron.killed) electron.kill();
  if (vite && !vite.killed) vite.kill();
  process.exit(code);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

vite.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`Vite 已退出，退出码：${code ?? 0}`);
    stopAll(code ?? 1);
  }
});

try {
  await waitForVite(devUrl);
  console.log('正在启动 Electron 悬浮窗...');
  electron = spawnProcess(electronBin, ['.'], {
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: devUrl
    }
  });

  electron.on('exit', (code) => {
    stopAll(code ?? 0);
  });
} catch (error) {
  console.error(error.message);
  stopAll(1);
}
