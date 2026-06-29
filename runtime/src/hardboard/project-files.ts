import fs from 'node:fs';
import path from 'node:path';
import type { HardboardSourceFile } from '../eventbus/event-types.js';

const SOURCE_EXTENSIONS = new Set(['.c', '.cc', '.cpp', '.cxx', '.h', '.hpp', '.S', '.s']);

export function listProjectSourceFiles(projectDir: string): HardboardSourceFile[] {
  const files = new Map<string, HardboardSourceFile>();
  addIfExists(files, projectDir, path.join(projectDir, 'CMakeLists.txt'), 'cmake');
  addIfExists(files, projectDir, path.join(projectDir, 'main', 'CMakeLists.txt'), 'cmake');
  addIfExists(files, projectDir, path.join(projectDir, 'sdkconfig.defaults'), 'config');

  const srcs = readMainSources(projectDir);
  for (const source of srcs) {
    addIfExists(files, projectDir, path.join(projectDir, 'main', source), 'source');
  }

  const mainDir = path.join(projectDir, 'main');
  if (fs.existsSync(mainDir)) {
    for (const entry of fs.readdirSync(mainDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const ext = path.extname(entry.name);
      if (SOURCE_EXTENSIONS.has(ext)) {
        addIfExists(files, projectDir, path.join(mainDir, entry.name), 'source');
      }
    }
  }

  return [...files.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

function readMainSources(projectDir: string): string[] {
  const cmakePath = path.join(projectDir, 'main', 'CMakeLists.txt');
  if (!fs.existsSync(cmakePath)) return [];
  const content = fs.readFileSync(cmakePath, 'utf-8');
  const matches = [...content.matchAll(/SRCS\s+([^)]+)/g)];
  return matches.flatMap((match) => {
    return match[1]
      .split(/\s+/)
      .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
      .filter((entry) => entry && !entry.includes('$'));
  });
}

function addIfExists(
  files: Map<string, HardboardSourceFile>,
  projectDir: string,
  filePath: string,
  kind: HardboardSourceFile['kind'],
): void {
  try {
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return;
    const resolved = path.resolve(filePath);
    files.set(resolved, {
      path: resolved,
      name: path.basename(resolved),
      relativePath: path.relative(projectDir, resolved).replace(/\\/g, '/'),
      kind,
      size: stats.size,
      updatedAt: Math.round(stats.mtimeMs),
    });
  } catch {
    // Missing optional source files are ignored.
  }
}
