const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const electronRoot = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(electronRoot, 'package.json'), 'utf-8'));
const exePath = path.join(electronRoot, 'dist-package', 'win-unpacked', '奥德赛0.0.exe');
const builder = path.join(electronRoot, 'node_modules', 'electron-builder', 'cli.js');
const stamp = path.join(electronRoot, 'scripts', 'stamp_win_exe_version.cjs');
// PE 版本可使用 pkg.peVersion 指定 4 段版本（如 0.4.0.71618），不填则用 pkg.version
const peVersion = pkg.peVersion || pkg.version;

const result = spawnSync(process.execPath, [builder, '--win', '--x64', '--dir'], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0 && !fs.existsSync(exePath)) {
  process.exit(result.status || 1);
}

if (result.status !== 0) {
  console.warn('[pack:win] electron-builder failed after creating win-unpacked; continuing to stamp the unpacked exe.');
}

// ─── 修正打包产物中的硬编码路径 ───────────────────────────
fixHardcodedPaths(path.join(electronRoot, 'dist-package', 'win-unpacked'));

// ─── 清理构建产物和运行时状态 (减小体积、避免污染) ─────────
cleanupPackagedOutput(path.join(electronRoot, 'dist-package', 'win-unpacked'));

const stampResult = spawnSync(process.execPath, [stamp, exePath, peVersion], {
  cwd: electronRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(stampResult.status || 0);

// ──────────────────────────────────────────────────────────
// 以下为辅助函数
// ──────────────────────────────────────────────────────────

/**
 * 修正打包产物中的硬编码路径，使应用可在任意目录运行。
 *
 * 问题背景：
 * - Python venv 的 pyvenv.cfg 中 'home' 指向打包机的绝对路径
 * - portable Python 的 esp-idf.pth 包含打包机的绝对路径
 * - 这些路径在目标机器上不存在，导致 Python 相关功能异常
 */
function fixHardcodedPaths(unpackedDir) {
  const resourcesDir = path.join(unpackedDir, 'resources');
  if (!fs.existsSync(resourcesDir)) {
    console.warn('[pack:win] resources dir not found, skipping path fixup');
    return;
  }

  // 1. 修正 ESP-IDF Python venv 的 pyvenv.cfg
  fixPyvenvCfg(resourcesDir);

  // 2. 重写 portable Python 的 esp-idf.pth（使用相对路径）
  fixEspIdfPth(resourcesDir);

  // 3. 清理 portable Python 中 Lib/site-packages 下的 esp-idf.pth
  fixEspIdfSitePth(resourcesDir);
}

/**
 * 修正 pyvenv.cfg 中的 'home' 路径。
 *
 * venv 的 home 指向基础 Python 安装目录。打包机上的绝对路径在目标机不存在，
 * 需要改为相对路径。Python 3.12+ 的 venv 支持相对 home 路径。
 */
function fixPyvenvCfg(resourcesDir) {
  const cfgPath = path.join(
    resourcesDir,
    'runtime', 'hardboard', 'esptools', 'idf-tools',
    'python_env', 'idf5.4_py3.12_env', 'pyvenv.cfg'
  );

  if (!fs.existsSync(cfgPath)) {
    console.warn('[pack:win] pyvenv.cfg not found, skipping venv fixup');
    return;
  }

  let content = fs.readFileSync(cfgPath, 'utf-8');
  const oldHome = content.match(/^home\s*=\s*(.+)$/m)?.[1];

  // 相对路径：从 pyvenv.cfg 所在目录到 runtime/python/
  // pyvenv.cfg 位置: resources/runtime/hardboard/esptools/idf-tools/python_env/idf5.4_py3.12_env/
  // 目标位置:       resources/runtime/python/
  // 相对路径: ../../../../../python
  const relativeHome = '..\\..\\..\\..\\..\\python';

  content = content.replace(/^home\s*=.*$/m, `home = ${relativeHome}`);
  fs.writeFileSync(cfgPath, content, 'utf-8');
  console.log(`[pack:win] pyvenv.cfg home fixed: "${oldHome}" → "${relativeHome}"`);
}

/**
 * 重写 portable Python 根目录的 esp-idf.pth，使用相对路径。
 *
 * esp-idf.pth 在打包机上记录了 ESP-IDF 工具的绝对路径；
 * 修正为相对于 portable Python 目录的路径。
 */
function fixEspIdfPth(resourcesDir) {
  const pthPath = path.join(resourcesDir, 'runtime', 'python', 'esp-idf.pth');
  if (!fs.existsSync(pthPath)) {
    console.warn('[pack:win] esp-idf.pth not found, skipping');
    return;
  }

  // ESP-IDF Python 依赖和工具的相对路径
  // esp-idf.pth 位置: resources/runtime/python/
  const entries = [
    // venv site-packages (ESP-IDF 所需的 Python 包)
    '..\\hardboard\\esptools\\idf-tools\\python_env\\idf5.4_py3.12_env\\Lib\\site-packages',
    // ESP-IDF tools 目录
    '..\\hardboard\\esptools\\esp-idf-v5.4.3\\esp-idf\\tools',
    '..\\hardboard\\esptools\\esp-idf-v5.4.3\\esp-idf\\tools\\esp_python_api',
  ];

  fs.writeFileSync(pthPath, entries.join('\n') + '\n', 'utf-8');
  console.log('[pack:win] esp-idf.pth rewritten with relative paths');
}

/**
 * 重写 Lib/site-packages 下的 esp-idf.pth，使用相对路径。
 */
function fixEspIdfSitePth(resourcesDir) {
  const pthPath = path.join(resourcesDir, 'runtime', 'python', 'Lib', 'site-packages', 'esp-idf.pth');
  if (!fs.existsSync(pthPath)) {
    console.warn('[pack:win] Lib/site-packages/esp-idf.pth not found, skipping');
    return;
  }

  const original = fs.readFileSync(pthPath, 'utf-8');
  // 提取原始文件中所有指向 esp-idf/tools 子目录的行
  const lines = original.split(/\r?\n/).filter(line => {
    const trimmed = line.trim();
    return trimmed && trimmed.includes('esp-idf/tools');
  });

  // 转换为相对路径
  // pth 位置: resources/runtime/python/Lib/site-packages/
  // 目标:     resources/runtime/hardboard/esptools/esp-idf-v5.4.3/esp-idf/tools/...
  const prefix = '..\\..\\..\\..\\hardboard\\esptools\\esp-idf-v5.4.3\\esp-idf';

  const converted = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // 提取 esp-idf/tools 之后的部分
    const match = trimmed.match(/esp-idf[/\\]tools[/\\]?(.*)$/i);
    if (match) {
      const suffix = match[1] || '';
      converted.push(suffix ? `${prefix}\\tools\\${suffix}` : `${prefix}\\tools`);
    }
  }

  if (converted.length > 0) {
    fs.writeFileSync(pthPath, converted.join('\n') + '\n', 'utf-8');
    console.log(`[pack:win] Lib/site-packages/esp-idf.pth rewritten (${converted.length} entries)`);
  }
}

/**
 * 清理打包产物中的开发/运行时残留文件。
 *
 * 这些文件来自打包机，在目标机上：
 * - 无意义（端口号、进程 PID 等状态信息）
 * - 可能造成冲突（Cookie、Chrome profile）
 * - 增大包体积（构建产物）
 */
function cleanupPackagedOutput(unpackedDir) {
  const resourcesDir = path.join(unpackedDir, 'resources');
  if (!fs.existsSync(resourcesDir)) return;

  const toRemove = [
    // 运行时状态文件（不应随包分发）
    'runtime/state.json',
    'runtime/ports.json',
    'runtime/pids',
    'runtime/tasks',
    'runtime/logs',
    'runtime/chrome_profile',
    'runtime/cookies',
    'runtime/browser_runtime',
    // Hardboard 运行时状态
    'runtime/hardboard/logs',
    'runtime/hardboard/events',
    // Hardboard 构建产物（目标机需重新构建）
    'runtime/hardboard/projects/*/build',
    // Python __pycache__ 缓存
    'runtime/python/Lib/site-packages/__pycache__',
  ];

  for (const pattern of toRemove) {
    if (pattern.includes('*')) {
      // 简单通配符支持 (仅支持路径末尾的 *)
      const baseDir = pattern.replace(/\/\*\/.+$/, '');
      const suffix = pattern.replace(/^.*\/\*\//, '');
      const fullBase = path.join(resourcesDir, baseDir);
      if (!fs.existsSync(fullBase)) continue;

      try {
        const entries = fs.readdirSync(fullBase, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          const target = path.join(fullBase, entry.name, suffix);
          if (fs.existsSync(target)) {
            fs.rmSync(target, { recursive: true, force: true });
            console.log(`[pack:win] cleaned: ${path.relative(resourcesDir, target)}`);
          }
        }
      } catch (err) {
        console.warn(`[pack:win] cleanup warning for ${pattern}: ${err.message}`);
      }
    } else {
      const fullPath = path.join(resourcesDir, pattern);
      if (fs.existsSync(fullPath)) {
        try {
          fs.rmSync(fullPath, { recursive: true, force: true });
          console.log(`[pack:win] cleaned: ${pattern}`);
        } catch (err) {
          console.warn(`[pack:win] cleanup warning for ${pattern}: ${err.message}`);
        }
      }
    }
  }
}
