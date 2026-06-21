const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function readApiKey(file) {
  const text = fs.readFileSync(file, 'utf-8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^DEEPSEEK_API_KEY\s*=\s*(.+)$/);
    return match?.[1]?.trim() || line;
  }
  throw new Error(`No API key found in ${file}`);
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const agentDir = process.env.VIBEIDE_AGENT_DIR || path.join(repoRoot, 'agent');
  const apiKeyFile = process.env.VIBEIDE_API_KEY_FILE || path.join(repoRoot, 'apikey.txt');
  const claudeBin = path.join(agentDir, 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
  const apiKey = readApiKey(apiKeyFile);
  const env = {
    ...process.env,
    ANTHROPIC_AUTH_TOKEN: apiKey,
    ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL || 'https://api.deepseek.com/anthropic',
    ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'deepseek-v4-pro',
  };

  const proc = spawn(claudeBin, [
    '-p',
    '--dangerously-skip-permissions',
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--verbose',
    '--replay-user-messages',
  ], {
    cwd: agentDir,
    env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  const pid = proc.pid;
  let buffer = '';
  let resultCount = 0;
  let stderr = '';
  let resolved = false;

  const send = (text) => {
    proc.stdin.write(JSON.stringify({
      type: 'user',
      message: {
        role: 'user',
        content: text,
      },
    }) + '\n');
  };

  const done = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timed out waiting for two agent results. results=${resultCount} stderr=${stderr.slice(-800)}`));
    }, Number(process.env.VIBEIDE_VERIFY_AGENT_TIMEOUT_MS || 90000));

    proc.stdout.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if (msg.type === 'result') {
          resultCount += 1;
          if (resultCount === 1) {
            if (proc.pid !== pid) {
              reject(new Error(`PID changed after first result: ${pid} -> ${proc.pid}`));
              return;
            }
            send('只回复 SECOND_OK，不要解释。');
          } else if (resultCount === 2) {
            if (proc.pid !== pid) {
              reject(new Error(`PID changed after second result: ${pid} -> ${proc.pid}`));
              return;
            }
            clearTimeout(timeout);
            resolved = true;
            resolve();
          }
        }
      }
    });

    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    proc.on('exit', (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`Agent exited before two results. code=${code} results=${resultCount} stderr=${stderr.slice(-800)}`));
      }
    });
  });

  send('只回复 FIRST_OK，不要解释。');
  await done;
  proc.kill('SIGKILL');
  console.log(`persistent-agent smoke ok: pid=${pid}, results=${resultCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
