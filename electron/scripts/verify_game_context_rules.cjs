const assert = require('node:assert/strict');
const { app } = require('electron');

const tasks = [
  '帮我写一个走迷宫的游戏',
  '再帮我做个推箱子游戏',
  '你帮我写一个galgame游戏吧',
];

async function main() {
  await app.whenReady();
  const { buildContext } = require('../dist/main/worker/context');
  const { isHtmlGameTask } = require('../dist/main/worker/page-validator');

  for (const task of tasks) {
    const context = buildContext(task);
    assert.equal(isHtmlGameTask(task), true, `not detected as html game: ${task}`);
    assert(
      context.skillsFound.includes('html_game_generation.md'),
      `html_game_generation.md not loaded for: ${task}`,
    );
    assert(
      context.prompt.includes('先创建最小可运行 HTML 骨架'),
      `staged generation rule missing for: ${task}`,
    );
    assert(
      context.prompt.includes('不要长时间沉默后一次性 Write 完整大文件'),
      `silence prevention rule missing for: ${task}`,
    );
  }

  console.log('game context rules smoke ok');
  app.quit();
}

main().catch((error) => {
  console.error(error);
  app.quit();
  process.exit(1);
});
