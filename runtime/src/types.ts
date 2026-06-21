// Runtime 类型定义 — 对应参考代码 config.py 的 Pydantic 模型

export interface BrowserConfig {
  headless: boolean;
  cdpPort: number;
  viewport: { width: number; height: number };
}

export interface ExtractConfig {
  type: 'text' | 'cards' | 'table';
  selector: string;
  maxRows: number;
  maxChars: number;
  detail?: CardDetailConfig;
  pagination?: CardPaginationConfig;
}

export interface CardDetailSectionConfig {
  name: string;
  selector: string;
  multiple: boolean;
}

export interface CardDetailConfig {
  clickSelector: string;
  waitFor: string;
  closeSelector: string;
  timeoutMs: number;
  maxChars?: number;
  sections?: CardDetailSectionConfig[];
}

export interface CardPaginationConfig {
  nextSelector: string;
  disabledClass: string;
  maxPages: number;
  waitAfterClickMs: number;
}

export interface PageAction {
  name: string;
  kind: 'click' | 'fill' | 'click_text' | 'wait';
  selector: string;
  text?: string;
  value?: string;
  exact?: boolean;
  timeoutMs: number;
  waitAfterMs: number;
}

export interface TaskConfig {
  name: string;
  url: string;
  waitFor: string;
  timeoutMs: number;
  actions: PageAction[];
  extract: ExtractConfig;
}

export interface WorkspaceManifest {
  taskId: string;
  workspace: string;
  status: 'running' | 'completed' | 'failed';
  artifacts: Record<string, string>;
}
