import React from 'react';
import type { WorkbenchItem, WorkbenchOverview, WorkbenchSection } from '../types';

interface Props {
  overview: WorkbenchOverview | null;
  onRefresh: () => void;
  onImportFolder: () => void;
  onRemoveImportedFolder: (folderPath: string) => void;
  onOpenItem: (targetPath: string) => void;
  onEditItem: (item: WorkbenchItem) => void;
}

function formatTime(value: number | null): string {
  if (!value) return '未知时间';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(value: number | null): string {
  if (value == null) return '目录';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function isBrowserRunnable(item: WorkbenchItem): boolean {
  return item.kind === 'file' && /\.(html?|svg)$/i.test(item.name);
}

function isEditable(item: WorkbenchItem): boolean {
  return item.kind === 'file' && /(?:CMakeLists\.txt|\.c|\.h|\.cpp|\.hpp|\.S|\.md|\.json|\.txt|\.yaml|\.yml)$/i.test(item.name);
}

function renderSection(section: WorkbenchSection, onOpenItem: (item: WorkbenchItem) => void, onRemoveImportedFolder: (folderPath: string) => void) {
  return (
    <section key={section.id} className="workspace-section nes-container is-rounded">
      <div className="workspace-section-header">
        <div>
          <h3>{section.title}</h3>
          <p>{section.description}</p>
        </div>
        <div className="workspace-section-tools">
          <code>{section.folderPath}</code>
          {section.removable ? (
            <button className="nes-btn is-error" type="button" onClick={() => onRemoveImportedFolder(section.folderPath)}>移除</button>
          ) : null}
        </div>
      </div>
      <div className="workspace-items">
        {section.items.length ? section.items.map((item: WorkbenchItem) => (
          <button
            key={item.path}
            type="button"
            className="workspace-item workspace-item-button nes-container is-rounded"
            onClick={() => onOpenItem(item)}
            title={`打开 ${item.path}`}
            data-workbench-path={item.path}
          >
            <div className="workspace-item-kind">{item.kind === 'dir' ? 'DIR' : isBrowserRunnable(item) ? 'RUN' : isEditable(item) ? 'EDIT' : 'FILE'}</div>
            <div className="workspace-item-body">
              <strong title={item.summary || item.label || item.name}>{item.summary || item.label || item.name}</strong>
              <span title={item.detail || item.path}>{item.detail || item.path}</span>
              {item.sourceUrl ? <em title={item.sourceUrl}>{item.sourceUrl}</em> : null}
            </div>
            <div className="workspace-item-meta">
              <span>{formatSize(item.size)}</span>
              <span>{formatTime(item.updatedAt)}</span>
            </div>
          </button>
        )) : (
          <div className="workspace-empty">{section.emptyText}</div>
        )}
      </div>
    </section>
  );
}

export default function WorkspacePanel({ overview, onRefresh, onImportFolder, onRemoveImportedFolder, onOpenItem, onEditItem }: Props) {
  const handleOpenItem = async (item: WorkbenchItem) => {
    if (window.electronAPI?.isWorkbenchSmokeTest) {
      onOpenItem(item.path);
      return;
    }

    if (item.kind === 'dir' || isBrowserRunnable(item) || !isEditable(item)) {
      onOpenItem(item.path);
      return;
    }
    onEditItem(item);
  };

  return (
    <div className="workspace-panel">
      <div className="workspace-hero">
        <div>
          <span className="workspace-eyebrow">Repository</span>
          <h2>硬件仓库与施工文件</h2>
          <p>只保留 skills、Agent 生成文件、硬件工程、参考代码和施工文档。HTML 直接运行，源码和 Markdown 可预览修改。</p>
        </div>
        <div className="workspace-actions">
          <button className="nes-btn is-primary" type="button" onClick={onImportFolder}>导入文件夹</button>
          <button className="nes-btn" type="button" onClick={onRefresh}>刷新目录</button>
        </div>
      </div>
      <div className="workspace-grid">
        {overview?.sections.map((section) => renderSection(section, handleOpenItem, onRemoveImportedFolder))}
      </div>
    </div>
  );
}
