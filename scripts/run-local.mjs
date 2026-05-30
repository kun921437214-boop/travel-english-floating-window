import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const setupOnly = process.argv.includes('--setup-only');
const isWindows = process.platform === 'win32';

function run(command, args, label) {
  console.log(`\n${label}`);
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: isWindows
  });

  if (result.status !== 0) {
    const code = result.status ?? 1;
    console.error(`\n${label}失败，退出码：${code}`);
    process.exit(code);
  }
}

function hasDependencies() {
  const requiredPaths = [
    path.join(projectRoot, 'node_modules', 'vite'),
    path.join(projectRoot, 'node_modules', 'electron'),
    path.join(projectRoot, 'node_modules', 'react'),
    path.join(projectRoot, 'node_modules', 'react-dom'),
    path.join(projectRoot, 'node_modules', 'xlsx')
  ];
  return requiredPaths.every((item) => fs.existsSync(item));
}

function assertNodeVersion() {
  const major = Number(process.versions.node.split('.')[0]);
  if (Number.isNaN(major) || major < 18) {
    console.error(`当前 Node.js 版本是 ${process.version}，请安装 Node.js 18 或更高版本。`);
    process.exit(1);
  }
}

assertNodeVersion();

if (!hasDependencies()) {
  run('npm', ['install', '--no-audit', '--no-fund', '--progress=false'], '正在安装依赖 npm install');
} else {
  console.log('依赖已存在，跳过 npm install。');
}

run('npm', ['run', 'convert:data'], '正在转换 Excel 数据');

if (setupOnly) {
  console.log('\n准备完成。之后可以运行：npm start');
  process.exit(0);
}

run('npm', ['run', 'dev'], '正在启动应用');
