import fs from 'node:fs';
import path from 'node:path';
import type { PageAction } from './types.js';
import { RUNTIME_DIRS } from './paths.js';

const RECORDINGS_DIR = path.resolve(RUNTIME_DIRS.root, 'recordings');

function ensureRecordingsDir(): void {
  fs.mkdirSync(RECORDINGS_DIR, { recursive: true });
}

function buildRecordingPath(label?: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const safeLabel = (label ?? 'session').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'session';
  return path.join(RECORDINGS_DIR, `${ts}-${safeLabel}.json`);
}

export async function saveRecording(actions: PageAction[], label?: string): Promise<string> {
  ensureRecordingsDir();
  const file = buildRecordingPath(label);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        actionCount: actions.length,
        actions,
      },
      null,
      2
    ),
    'utf-8'
  );
  return file;
}

export async function loadRecording(file: string): Promise<PageAction[]> {
  const payload = JSON.parse(fs.readFileSync(file, 'utf-8')) as { actions?: PageAction[] };
  return payload.actions ?? [];
}

export async function loadLatestRecording(): Promise<{ file: string; actions: PageAction[] } | null> {
  ensureRecordingsDir();
  const files = fs.readdirSync(RECORDINGS_DIR).filter((name) => name.endsWith('.json')).sort().reverse();
  if (files.length === 0) return null;

  const file = path.join(RECORDINGS_DIR, files[0]);
  return { file, actions: await loadRecording(file) };
}

export async function listRecordings(): Promise<string[]> {
  ensureRecordingsDir();
  return fs.readdirSync(RECORDINGS_DIR).filter((name) => name.endsWith('.json')).sort().reverse();
}
