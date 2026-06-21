import fs from 'node:fs';
import path from 'node:path';
import { RUNTIME_DIRS } from './paths.js';

const WORKPLACES_DIR = path.resolve(RUNTIME_DIRS.root, '..', 'workplaces');

function ensureDir(): void {
  fs.mkdirSync(WORKPLACES_DIR, { recursive: true });
}

export async function saveWorkspace(workspace: string, data: Record<string, unknown>): Promise<void> {
  ensureDir();
  const dir = path.join(WORKPLACES_DIR, workspace);
  fs.mkdirSync(dir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `data_${ts}.json`);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

export async function readWorkspace(workspace: string): Promise<Record<string, unknown> | null> {
  const dir = path.join(WORKPLACES_DIR, workspace);
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().reverse();
  if (files.length === 0) return null;

  const raw = fs.readFileSync(path.join(dir, files[0]), 'utf-8');
  return JSON.parse(raw);
}

export async function listWorkspaces(): Promise<string[]> {
  ensureDir();
  return fs.readdirSync(WORKPLACES_DIR).filter(f =>
    fs.statSync(path.join(WORKPLACES_DIR, f)).isDirectory()
  );
}
