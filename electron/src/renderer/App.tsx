import React, { useState, useEffect, useCallback } from 'react';
import ChatPanel from './components/ChatPanel';
import BrowserPanel from './components/BrowserPanel';
import TaskProgress from './components/TaskProgress';
import ResultPanel from './components/ResultPanel';
import type { BrowserTab, ChatMessage, RecordingSummary, TaskStep, WorkbenchOverview } from './types';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [steps, setSteps] = useState<TaskStep[]>([]);
  const [browserUrl, setBrowserUrl] = useState('about:blank');
  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSummary, setRecordingSummary] = useState('未开始录制');
  const [activeRecordingName, setActiveRecordingName] = useState('');
  const [recordings, setRecordings] = useState<RecordingSummary[]>([]);
  const [workbench, setWorkbench] = useState<WorkbenchOverview | null>(null);

  const refreshWorkbench = useCallback(async () => {
    const [overview, recordingResult] = await Promise.all([
      window.electronAPI?.getWorkbenchOverview(),
      window.electronAPI?.listBrowserRecordingSummaries(),
    ]);
    if (overview) {
      setWorkbench(overview);
    }
    if (recordingResult) {
      setRecordings(recordingResult.recordings);
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onMessage((msg) => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          text: msg.text,
          role: 'agent',
          timestamp: msg.timestamp,
          error: msg.error,
        }]);
      });

      window.electronAPI.onTaskProgress((result) => {
        setSteps(result.steps);
      });

      window.electronAPI.onTaskComplete((result) => {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          text: result.code === 0 ? '任务完成' : `任务失败 (code: ${result.code})`,
          role: 'agent',
          timestamp: Date.now(),
          error: result.code !== 0,
        }]);
      });

      window.electronAPI.onBrowserTabs((result) => {
        setTabs(result.tabs);
        const active = result.tabs.find((tab) => tab.active);
        if (active) {
          setBrowserUrl(active.url);
        }
      });

      window.electronAPI.listBrowserTabs().then((result) => {
        setTabs(result.tabs);
        const active = result.tabs.find((tab) => tab.active);
        if (active) {
          setBrowserUrl(active.url);
        }
      });

      void refreshWorkbench();
    }
  }, [refreshWorkbench]);

  const handleSend = useCallback((text: string) => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text,
      role: 'user',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, msg]);

    setSteps([]);

    window.electronAPI?.sendMessage(text);
  }, []);

  const handleNavigate = useCallback((url: string) => {
    setBrowserUrl(url);
    window.electronAPI?.navigateBrowser(url);
  }, []);

  const handleActivateTab = useCallback((id: string) => {
    window.electronAPI?.activateBrowserTab(id);
  }, []);

  const handleCloseTab = useCallback((id: string) => {
    window.electronAPI?.closeBrowserTab(id);
  }, []);

  const handleStartRecording = useCallback(async (label: string) => {
    await window.electronAPI?.startBrowserRecording();
    setActiveRecordingName(label);
    setIsRecording(true);
    setRecordingSummary(label ? `录制中: ${label}` : '录制中...');
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      text: label ? `浏览器录制已开始: ${label}` : '浏览器录制已开始',
      role: 'agent',
      timestamp: Date.now(),
    }]);
  }, []);

  const handleStopRecording = useCallback(async (label: string) => {
    const finalLabel = label || activeRecordingName || 'browser-recording';
    const result = await window.electronAPI?.stopBrowserRecording(finalLabel);
    setIsRecording(false);
    setActiveRecordingName('');
    if (!result) return;
    setRecordingSummary(`最近录制: ${finalLabel} · ${result.actionCount} 个动作`);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      text: `录制已保存: ${finalLabel}\n${result.file} (${result.actionCount} 个动作)`,
      role: 'agent',
      timestamp: Date.now(),
    }]);
    void refreshWorkbench();
  }, [activeRecordingName, refreshWorkbench]);

  const handleReplayRecording = useCallback(async (target: string) => {
    const result = target
      ? await window.electronAPI?.replayBrowserRecording(target)
      : await window.electronAPI?.replayLatestBrowserRecording();
    if (!result) return;
    if (!result.ok) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        text: result.error ?? '回放失败',
        role: 'agent',
        timestamp: Date.now(),
        error: true,
      }]);
      return;
    }
    setRecordingSummary(`最近回放: ${result.actionCount} 个动作`);
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      text: `已回放录制: ${result.file} (${result.actionCount} 个动作)`,
      role: 'agent',
      timestamp: Date.now(),
    }]);
  }, []);

  const handleRefreshWorkbench = useCallback(async () => {
    await refreshWorkbench();
  }, [refreshWorkbench]);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-title">coffecat v0.2.0</span>
        <span className="app-status">Runtime OK</span>
      </header>
      <div className="app-body">
        <div className="left-panel">
          <ChatPanel messages={messages} onSend={handleSend} />
          <TaskProgress steps={steps} />
          <ResultPanel />
        </div>
        <div className="right-panel">
          <BrowserPanel
            url={browserUrl}
            onNavigate={handleNavigate}
            tabs={tabs}
            onActivateTab={handleActivateTab}
            onCloseTab={handleCloseTab}
            isRecording={isRecording}
            recordingSummary={recordingSummary}
            recordings={recordings}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            onReplayRecording={handleReplayRecording}
            workbench={workbench}
            onRefreshWorkbench={handleRefreshWorkbench}
          />
        </div>
      </div>
    </div>
  );
}
