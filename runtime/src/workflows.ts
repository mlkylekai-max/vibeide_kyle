import fs from 'node:fs';
import path from 'node:path';
import type { ExtractConfig } from './types.js';
import { RUNTIME_DIRS } from './paths.js';

const WORKFLOWS_DIR = path.resolve(RUNTIME_DIRS.root, 'workflows');

export interface SavedWorkflow {
  name: string;
  createdAt: string;
  sourceUrl: string;
  sourceTitle: string;
  recordingFile: string;
  workspace?: string;
  extract: Pick<ExtractConfig, 'type' | 'selector' | 'maxRows' | 'maxChars'>;
}

export interface WorkflowSummary {
  file: string;
  name: string;
  createdAt: string;
  sourceUrl: string;
  sourceTitle: string;
  recordingFile: string;
  workspace?: string;
  extract: Pick<ExtractConfig, 'type' | 'selector' | 'maxRows' | 'maxChars'>;
}

function ensureWorkflowsDir(): void {
  fs.mkdirSync(WORKFLOWS_DIR, { recursive: true });
}

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64) || 'workflow';
}

function buildWorkflowPath(name: string): string {
  return path.join(WORKFLOWS_DIR, `${sanitizeName(name)}.json`);
}

export async function saveWorkflow(definition: SavedWorkflow): Promise<string> {
  ensureWorkflowsDir();
  const file = buildWorkflowPath(definition.name);
  fs.writeFileSync(file, JSON.stringify(definition, null, 2), 'utf-8');
  return file;
}

export async function loadWorkflow(name: string): Promise<{ file: string; workflow: SavedWorkflow } | null> {
  ensureWorkflowsDir();
  const exact = buildWorkflowPath(name);
  if (fs.existsSync(exact)) {
    const workflow = JSON.parse(fs.readFileSync(exact, 'utf-8')) as SavedWorkflow;
    return { file: exact, workflow };
  }

  const safe = sanitizeName(name);
  const files = fs.readdirSync(WORKFLOWS_DIR).filter((file) => file.endsWith('.json')).sort();
  const matched = files.find((file) => file.includes(safe));
  if (!matched) return null;

  const file = path.join(WORKFLOWS_DIR, matched);
  const workflow = JSON.parse(fs.readFileSync(file, 'utf-8')) as SavedWorkflow;
  return { file, workflow };
}

export async function listWorkflows(): Promise<string[]> {
  ensureWorkflowsDir();
  return fs.readdirSync(WORKFLOWS_DIR).filter((file) => file.endsWith('.json')).sort();
}

export async function listWorkflowSummaries(): Promise<WorkflowSummary[]> {
  const files = await listWorkflows();
  return files.flatMap((name) => {
    const file = path.join(WORKFLOWS_DIR, name);
    try {
      const workflow = JSON.parse(fs.readFileSync(file, 'utf-8')) as SavedWorkflow;
      return [{
        file,
        name: workflow.name,
        createdAt: workflow.createdAt,
        sourceUrl: workflow.sourceUrl,
        sourceTitle: workflow.sourceTitle,
        recordingFile: workflow.recordingFile,
        workspace: workflow.workspace,
        extract: workflow.extract,
      }];
    } catch {
      return [];
    }
  });
}
