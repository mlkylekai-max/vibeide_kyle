import path from 'node:path';

export interface HardboardParsedEvent {
  kind: 'build.progress' | 'build.file' | 'flash.progress' | 'flash.file';
  progress?: number;
  file?: string;
  message?: string;
}

export function parseHardboardOutput(chunk: string): HardboardParsedEvent[] {
  const events: HardboardParsedEvent[] = [];
  const lines = chunk.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const ninja = line.match(/\[\s*(\d+)\/(\d+)\]\s+(.+)/);
    if (ninja) {
      const done = Number.parseInt(ninja[1], 10);
      const total = Number.parseInt(ninja[2], 10);
      if (Number.isFinite(done) && Number.isFinite(total) && total > 0) {
        events.push({
          kind: 'build.progress',
          progress: Math.round((done / total) * 100),
          message: line,
        });
      }
      const file = extractBuildFile(ninja[3]);
      if (file) events.push({ kind: 'build.file', file, message: line });
    }

    const flashProgress = line.match(/\(\s*(\d+)\s*%\s*\)/);
    if (flashProgress && /Writing|Hash|Compressing|Leaving|Connecting|Uploading/i.test(line)) {
      const progress = Number.parseInt(flashProgress[1], 10);
      if (Number.isFinite(progress)) {
        events.push({ kind: 'flash.progress', progress, message: line });
      }
    }

    const flashFile = line.match(/(?:Writing|Compressed)\s+(.+?\.(?:bin|elf))(?:\s|$)/i);
    if (flashFile?.[1]) {
      events.push({ kind: 'flash.file', file: path.basename(flashFile[1]), message: line });
    }
  }
  return events;
}

function extractBuildFile(value: string): string | null {
  const match = value.match(/(?:Building|Linking|Generating)\s+(?:C|CXX|ASM)?\s*(?:object|executable|binary)?\s*(.+)$/i);
  const candidate = match?.[1] || value;
  const source = candidate.match(/([^\s]+\.(?:c|cc|cpp|cxx|S|s|a|elf|bin))/);
  if (source?.[1]) return source[1].replace(/\\/g, '/');
  return null;
}
