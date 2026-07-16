/**
 * fix_win_unpacked.cjs — 修正已有 win-unpacked 目录中的硬编码路径
 *
 * 用途：在打包后或已复制的 win-unpacked 目录上运行，修正使应用可在任意目录运行。
 * 用法：node scripts/fix_win_unpacked.cjs [path/to/win-unpacked]
 *       不传参数时默认查找 electron/dist-package/win-unpacked
 *
 * 修正内容：
 * 1. ESP-IDF Python venv 的 pyvenv.cfg — home 路径从绝对改为相对
 * 2. portable Python 的 esp-idf.pth — 使用相对路径
 * 3. 清理运行时状态文件（state.json、ports.json、logs 等）
 */

const fs = require('node:fs');
const path = require('node:path');

const electronRoot = path.resolve(__dirname, '..');
const defaultUnpacked = path.join(electronRoot, 'dist-package', 'win-unpacked');
const unpackedRoot = process.argv[2] ? path.resolve(process.argv[2]) : defaultUnpacked;

console.log(`[fix] Target: ${unpackedRoot}`);

const resourcesDir = path.join(unpackedRoot, 'resources');
if (!fs.existsSync(resourcesDir)) {
  console.error(`[fix] ERROR: resources directory not found at ${resourcesDir}`);
  console.error('[fix] Make sure the win-unpacked directory is correct.');
  process.exit(1);
}

let fixed = 0;

// ─── 1. 修正 ESP-IDF Python venv 的 pyvenv.cfg ─────────────────

function fixPyvenvCfg() {
  const cfgPath = path.join(
    resourcesDir,
    'runtime', 'hardboard', 'esptools', 'idf-tools',
    'python_env', 'idf5.4_py3.12_env', 'pyvenv.cfg'
  );

  if (!fs.existsSync(cfgPath)) {
    console.log('[fix] SKIP: pyvenv.cfg not found (ESP-IDF venv not bundled)');
    return;
  }

  let content = fs.readFileSync(cfgPath, 'utf-8');
  const oldHome = content.match(/^home\s*=\s*(.+)$/m)?.[1] || '';

  if (oldHome && !path.isAbsolute(oldHome)) {
    console.log(`[fix] SKIP: pyvenv.cfg home is already relative: ${oldHome}`);
    return;
  }

  // 相对路径：pyvenv.cfg → runtime/python/
  // pyvenv.cfg at: resources/runtime/hardboard/esptools/idf-tools/python_env/idf5.4_py3.12_env/
  // base Python at: resources/runtime/python/
  // relative: ../../../../../python
  const relativeHome = '..\\..\\..\\..\\..\\python';

  content = content.replace(/^home\s*=.*$/m, `home = ${relativeHome}`);
  fs.writeFileSync(cfgPath, content, 'utf-8');
  console.log(`[fix] OK: pyvenv.cfg home: "${oldHome}" → "${relativeHome}"`);
  fixed++;
}

// ─── 2. 重写 portable Python 的 esp-idf.pth ────────────────────

function fixEspIdfPth() {
  const pthPath = path.join(resourcesDir, 'runtime', 'python', 'esp-idf.pth');
  if (!fs.existsSync(pthPath)) {
    console.log('[fix] SKIP: esp-idf.pth not found');
    return;
  }

  const entries = [
    '..\\hardboard\\esptools\\idf-tools\\python_env\\idf5.4_py3.12_env\\Lib\\site-packages',
    '..\\hardboard\\esptools\\esp-idf-v5.4.3\\esp-idf\\tools',
    '..\\hardboard\\esptools\\esp-idf-v5.4.3\\esp-idf\\tools\\esp_python_api',
  ];

  const oldContent = fs.readFileSync(pthPath, 'utf-8');
  if (oldContent.trim() === entries.join('\n').trim()) {
    console.log('[fix] SKIP: esp-idf.pth already has relative paths');
    return;
  }

  fs.writeFileSync(pthPath, entries.join('\n') + '\n', 'utf-8');
  console.log('[fix] OK: esp-idf.pth rewritten with relative paths');
  fixed++;
}

// ─── 3. 重写 Lib/site-packages/esp-idf.pth ─────────────────────

function fixEspIdfSitePth() {
  const pthPath = path.join(resourcesDir, 'runtime', 'python', 'Lib', 'site-packages', 'esp-idf.pth');
  if (!fs.existsSync(pthPath)) {
    console.log('[fix] SKIP: Lib/site-packages/esp-idf.pth not found');
    return;
  }

  const original = fs.readFileSync(pthPath, 'utf-8');
  const lines = original.split(/\r?\n/).filter(line => {
    const trimmed = line.trim();
    return trimmed && trimmed.includes('esp-idf');
  });

  const prefix = '..\\..\\..\\..\\hardboard\\esptools\\esp-idf-v5.4.3\\esp-idf';

  const converted = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/esp-idf[/\\]tools[/\\]?(.*)$/i);
    if (match) {
      const suffix = match[1] || '';
      converted.push(suffix ? `${prefix}\\tools\\${suffix}` : `${prefix}\\tools`);
    }
  }

  if (converted.length === 0) {
    console.log('[fix] SKIP: no esp-idf paths found in site-packages/esp-idf.pth');
    return;
  }

  const newContent = converted.join('\n') + '\n';
  if (original.trim() === newContent.trim()) {
    console.log('[fix] SKIP: site-packages/esp-idf.pth already has relative paths');
    return;
  }

  fs.writeFileSync(pthPath, newContent, 'utf-8');
  console.log(`[fix] OK: site-packages/esp-idf.pth rewritten (${converted.length} entries)`);
  fixed++;
}

// ─── 4. 清理运行时状态文件 ─────────────────────────────────────

function cleanupStateFiles() {
  const toRemove = [
    'runtime/state.json',
    'runtime/ports.json',
    'runtime/pids',
    'runtime/tasks',
    'runtime/logs',
    'runtime/chrome_profile',
    'runtime/cookies',
    'runtime/browser_runtime',
    'runtime/hardboard/logs',
    'runtime/hardboard/events',
  ];

  for (const relPath of toRemove) {
    const fullPath = path.join(resourcesDir, relPath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      console.log(`[fix] CLEANED: ${relPath}`);
      fixed++;
    }
  }
}

// ─── 执行 ──────────────────────────────────────────────────────

fixPyvenvCfg();
fixEspIdfPth();
fixEspIdfSitePth();
cleanupStateFiles();

console.log(`\n[fix] Done. ${fixed} fix(es) applied to ${unpackedRoot}`);
if (fixed === 0) {
  console.log('[fix] Everything looks clean — no fixes needed.');
}
