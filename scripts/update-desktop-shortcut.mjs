import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceTemplate = path.join(projectRoot, 'desktop-launcher');
const projectApp = path.join(projectRoot, '哑巴说话-新版.app');
const desktopApp = path.join(os.homedir(), 'Desktop', '哑巴说话.app');
const desktopCommand = path.join(os.homedir(), 'Desktop', '哑巴说话.command');
const projectCommand = path.join(projectRoot, '哑巴说话.command');
const iconSource = path.join(projectRoot, 'assets', 'yaba-icon.icns');
const appSupportDir = path.join(os.homedir(), 'Library', 'Application Support');
const progressDir = path.join(appSupportDir, 'travel-english-floating-window');
const progressBackupRoot = path.join(appSupportDir, '哑巴说话进度备份');
const progressBackupLatest = path.join(progressBackupRoot, 'latest');

function copyDirectory(from, to) {
  fs.rmSync(to, { force: true, recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

function chmodExecutable(filePath) {
  try {
    fs.chmodSync(filePath, 0o755);
  } catch {
    // macOS may block chmod on Desktop under sandboxed automation; the user-facing repair script can retry.
  }
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  fs.rmSync(to, { force: true, recursive: true });
  fs.cpSync(from, to, { recursive: true });
  return true;
}

function backupProgress() {
  if (!fs.existsSync(progressDir)) {
    console.log('未发现已有学习进度目录，跳过进度备份。');
    return;
  }

  fs.mkdirSync(progressBackupLatest, { recursive: true });
  const copiedItems = [
    ['Local Storage', 'Local Storage'],
    ['IndexedDB', 'IndexedDB'],
    ['Session Storage', 'Session Storage'],
    ['Preferences', 'Preferences']
  ].filter(([sourceName, targetName]) => copyIfExists(path.join(progressDir, sourceName), path.join(progressBackupLatest, targetName)));

  fs.writeFileSync(
    path.join(progressBackupLatest, 'backup-info.json'),
    JSON.stringify(
      {
        source: progressDir,
        updatedAt: new Date().toISOString(),
        copiedItems: copiedItems.map(([sourceName]) => sourceName)
      },
      null,
      2
    )
  );

  console.log(`学习进度已备份：${progressBackupLatest}`);
}

function ensureProjectLauncher() {
  if (!fs.existsSync(sourceTemplate)) {
    throw new Error(`找不到启动器模板：${sourceTemplate}`);
  }
  if (!fs.existsSync(projectCommand)) {
    throw new Error(`找不到启动脚本：${projectCommand}`);
  }

  copyDirectory(sourceTemplate, projectApp);
  fs.copyFileSync(iconSource, path.join(projectApp, 'Contents', 'Resources', 'yaba-icon.icns'));
  chmodExecutable(path.join(projectApp, 'Contents', 'MacOS', 'launch'));
}

function updateDesktopLauncher() {
  copyDirectory(projectApp, desktopApp);
  fs.copyFileSync(projectCommand, desktopCommand);
  chmodExecutable(path.join(desktopApp, 'Contents', 'MacOS', 'launch'));
  chmodExecutable(desktopCommand);
}

console.log('正在生成最新版快捷方式...');
backupProgress();
ensureProjectLauncher();
console.log(`项目内新版启动器已更新：${projectApp}`);

try {
  updateDesktopLauncher();
  console.log(`桌面快捷方式已更新：${desktopApp}`);
  console.log(`桌面备用脚本已更新：${desktopCommand}`);
} catch (error) {
  console.log('\n桌面快捷方式暂时无法自动覆盖。');
  console.log(`原因：${error.message}`);
  console.log('\n可以双击项目里的“修复桌面快捷方式.command”，或手动把“哑巴说话-新版.app”拖到桌面替换旧版。');
  process.exitCode = 1;
}
