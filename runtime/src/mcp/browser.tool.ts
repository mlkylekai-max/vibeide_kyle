import * as z from 'zod/v4';
import path from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { connectBrowser, getBrowserState } from '../browser.js';
import { RUNTIME_DIRS } from '../paths.js';
import { navigate, click, fill, scroll, wait, screenshot } from '../actions.js';
import { extractCards, extractTable, extractText } from '../extract.js';
import { startRecord, stopRecord } from '../record.js';
import { replaySession } from '../replay.js';
import { loadLatestRecording, loadRecording, saveRecording, listRecordings } from '../recordings.js';
import { saveWorkspace } from '../storage.js';
import { listWorkflowSummaries, loadWorkflow, saveWorkflow } from '../workflows.js';
import type { ExtractConfig, PageAction } from '../types.js';

export function registerBrowserTools(server: McpServer) {
  const runExtract = async (config: Pick<ExtractConfig, 'type' | 'selector' | 'maxRows' | 'maxChars'>): Promise<unknown> => {
    switch (config.type) {
      case 'cards':
        return extractCards(config);
      case 'table':
        return extractTable(config);
      default:
        return extractText(config);
    }
  };

  const resolveRecording = async (file?: string, label?: string): Promise<{ file: string; actions: PageAction[] }> => {
    if (file) {
      return { file, actions: await loadRecording(file) };
    }

    const latest = await loadLatestRecording();
    if (!latest) {
      throw new Error('暂无录制文件');
    }

    if (!label) {
      return latest;
    }

    const files = await listRecordings();
    const safe = label.replace(/[^a-zA-Z0-9._-]+/g, '-');
    const matched = files.find((name) => name.includes(safe));
    if (!matched) {
      throw new Error(`未找到录制: ${label}`);
    }
    const resolvedFile = matched.startsWith('/') ? matched : path.resolve(RUNTIME_DIRS.root, 'recordings', matched);
    return { file: resolvedFile, actions: await loadRecording(resolvedFile) };
  };

  server.registerTool('browser.navigate', {
    description: '导航到指定 URL',
    inputSchema: { url: z.string().describe('目标 URL') },
  }, async ({ url }) => {
    await connectBrowser();
    await navigate(url);
    const state = await getBrowserState();
    return { content: [{ type: 'text', text: `已导航到: ${state.url} — ${state.title}` }] };
  });

  server.registerTool('browser.click', {
    description: '点击匹配选择器的元素',
    inputSchema: { selector: z.string().describe('CSS 选择器') },
  }, async ({ selector }) => {
    await connectBrowser();
    await click(selector);
    return { content: [{ type: 'text', text: `已点击: ${selector}` }] };
  });

  server.registerTool('browser.fill', {
    description: '填写输入框',
    inputSchema: {
      selector: z.string().describe('CSS 选择器'),
      value: z.string().describe('填入的文字'),
    },
  }, async ({ selector, value }) => {
    await connectBrowser();
    await fill(selector, value);
    return { content: [{ type: 'text', text: `已在 ${selector} 填入: ${value}` }] };
  });

  server.registerTool('browser.scroll', {
    description: '滚动页面',
    inputSchema: {
      direction: z.enum(['up', 'down']).describe('滚动方向'),
      pixels: z.number().optional().describe('滚动像素，默认 500'),
    },
  }, async ({ direction, pixels }) => {
    await connectBrowser();
    await scroll(direction, pixels);
    return { content: [{ type: 'text', text: `已${direction === 'down' ? '向下' : '向上'}滚动 ${pixels ?? 500}px` }] };
  });

  server.registerTool('browser.wait', {
    description: '等待元素出现',
    inputSchema: {
      selector: z.string().describe('CSS 选择器'),
      timeoutMs: z.number().optional().describe('超时毫秒，默认 10000'),
    },
  }, async ({ selector, timeoutMs }) => {
    await connectBrowser();
    await wait(selector, timeoutMs);
    return { content: [{ type: 'text', text: `元素已出现: ${selector}` }] };
  });

  server.registerTool('browser.screenshot', {
    description: '截取当前页面（返回 base64 PNG）',
  }, async () => {
    await connectBrowser();
    const b64 = await screenshot();
    return {
      content: [
        { type: 'text', text: '截图完成（见下图）' },
        { type: 'image', data: b64, mimeType: 'image/png' },
      ],
    };
  });

  server.registerTool('browser.extract', {
    description: '从页面提取数据',
    inputSchema: {
      type: z.enum(['text', 'cards', 'table']).describe('提取类型'),
      selector: z.string().describe('CSS 选择器'),
      maxRows: z.number().optional().describe('最大行数/卡片数，默认 50'),
      maxChars: z.number().optional().describe('最大字符数，默认 12000'),
    },
  }, async ({ type, selector, maxRows, maxChars }) => {
    await connectBrowser();
    const config = { type, selector, maxRows: maxRows ?? 50, maxChars: maxChars ?? 12000 } as const;
    const result = await runExtract(config);

    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
  });

  server.registerTool('browser.getState', {
    description: '获取当前浏览器状态（URL、标题）',
  }, async () => {
    await connectBrowser();
    const state = await getBrowserState();
    return { content: [{ type: 'text', text: `${state.title}\n${state.url}` }] };
  });

  server.registerTool('browser.recording_start', {
    description: '开始录制当前页面上的用户操作，供之后回放和沉淀工作流使用',
  }, async () => {
    await connectBrowser();
    await startRecord();
    const state = await getBrowserState();
    return { content: [{ type: 'text', text: `已开始录制：${state.title}\n${state.url}` }] };
  });

  server.registerTool('browser.recording_stop', {
    description: '停止录制并以指定名字保存录制文件',
    inputSchema: {
      label: z.string().optional().describe('录制名称，例如 bilibili-top10'),
    },
  }, async ({ label }) => {
    await connectBrowser();
    const actions = await stopRecord();
    const file = await saveRecording(actions, label ?? 'browser-recording');
    return {
      content: [{ type: 'text', text: `录制已保存: ${file}\n动作数: ${actions.length}` }],
    };
  });

  server.registerTool('browser.recordings_list', {
    description: '列出当前所有录制文件',
  }, async () => {
    const files = await listRecordings();
    return { content: [{ type: 'text', text: files.length ? files.join('\n') : '(空)' }] };
  });

  server.registerTool('browser.recording_replay', {
    description: '按文件路径或录制名字回放一个录制',
    inputSchema: {
      file: z.string().optional().describe('录制文件绝对路径；和 label 二选一'),
      label: z.string().optional().describe('录制名片段，例如 bilibili-top10'),
    },
  }, async ({ file, label }) => {
    await connectBrowser();
    const recording = await resolveRecording(file, label);
    await replaySession(recording.actions);
    return {
      content: [{ type: 'text', text: `已回放录制: ${recording.file}\n动作数: ${recording.actions.length}` }],
    };
  });

  server.registerTool('browser.workflow_save', {
    description: '把最近录制和当前页面提取规则保存成一套可复用工作流',
    inputSchema: {
      name: z.string().describe('工作流名称，例如 bilibili-top10'),
      recordingFile: z.string().optional().describe('录制文件路径；不填则使用最新录制'),
      recordingLabel: z.string().optional().describe('录制名片段；不填则使用最新录制'),
      extractType: z.enum(['text', 'cards', 'table']).describe('提取类型'),
      selector: z.string().describe('提取用 CSS 选择器'),
      workspace: z.string().optional().describe('默认保存目标 workspace'),
      maxRows: z.number().optional().describe('默认最大卡片/行数'),
      maxChars: z.number().optional().describe('默认最大字符数'),
    },
  }, async ({ name, recordingFile, recordingLabel, extractType, selector, workspace, maxRows, maxChars }) => {
    await connectBrowser();
    const state = await getBrowserState();
    const recording = await resolveRecording(recordingFile, recordingLabel);
    const file = await saveWorkflow({
      name,
      createdAt: new Date().toISOString(),
      sourceUrl: state.url,
      sourceTitle: state.title,
      recordingFile: recording.file,
      workspace,
      extract: {
        type: extractType,
        selector,
        maxRows: maxRows ?? 50,
        maxChars: maxChars ?? 12000,
      },
    });
    return {
      content: [{ type: 'text', text: `工作流已保存: ${file}\n录制: ${recording.file}` }],
    };
  });

  server.registerTool('browser.workflows_list', {
    description: '列出已保存的工作流摘要，供按名字直接复用',
  }, async () => {
    const workflows = await listWorkflowSummaries();
    return { content: [{ type: 'text', text: workflows.length ? JSON.stringify(workflows, null, 2) : '(空)' }] };
  });

  server.registerTool('browser.workflow_run', {
    description: '执行已保存工作流：回放录制，再按预设规则提取当前页面数据',
    inputSchema: {
      name: z.string().describe('工作流名称'),
      workspace: z.string().optional().describe('覆盖默认 workspace'),
    },
  }, async ({ name, workspace }) => {
    await connectBrowser();
    const loaded = await loadWorkflow(name);
    if (!loaded) {
      throw new Error(`工作流不存在: ${name}`);
    }

    const actions = await loadRecording(loaded.workflow.recordingFile);
    await replaySession(actions);
    const result = await runExtract(loaded.workflow.extract);
    const targetWorkspace = workspace ?? loaded.workflow.workspace;
    if (targetWorkspace) {
      await saveWorkspace(targetWorkspace, {
        workflow: loaded.workflow.name,
        workflowFile: loaded.file,
        recordingFile: loaded.workflow.recordingFile,
        sourceUrl: loaded.workflow.sourceUrl,
        sourceTitle: loaded.workflow.sourceTitle,
        extract: loaded.workflow.extract,
        result,
      });
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          workflow: loaded.workflow.name,
          workflowFile: loaded.file,
          recordingFile: loaded.workflow.recordingFile,
          savedToWorkspace: targetWorkspace ?? null,
          result,
        }, null, 2),
      }],
    };
  });
}
