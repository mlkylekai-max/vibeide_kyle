import React, { useState } from 'react';

export default function ResultPanel() {
  const [tab, setTab] = useState<'table' | 'json' | 'report'>('table');

  return (
    <div className="result-panel">
      <div className="result-title">结果展示</div>
      <div className="result-tabs">
        {(['table', 'json', 'report'] as const).map(t => (
          <button
            key={t}
            className={`result-tab${tab === t ? ' result-tab--active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'table' ? '表格' : t === 'json' ? 'JSON' : '报告'}
          </button>
        ))}
      </div>
      <div className="result-content">
        <p className="result-empty">采集完成后结果会显示在这里</p>
      </div>
    </div>
  );
}
