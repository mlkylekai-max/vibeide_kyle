export function killProcessTree(pid: number): void {
  try {
    process.kill(pid);
  } catch {
    // Best-effort placeholder. Windows task-tree killing can be added here.
  }
}
