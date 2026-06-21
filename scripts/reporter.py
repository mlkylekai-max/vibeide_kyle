#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from html import escape
from pathlib import Path
from typing import Any


def _render_value(value: Any) -> str:
    if isinstance(value, dict):
        if not value:
            return '<div class="empty">空对象</div>'
        rows = []
        for key, item in value.items():
            rows.append(
                "<div class=\"kv-row\">"
                f"<div class=\"kv-key\">{escape(str(key))}</div>"
                f"<div class=\"kv-value\">{_render_value(item)}</div>"
                "</div>"
            )
        return f"<div class=\"kv-list\">{''.join(rows)}</div>"

    if isinstance(value, list):
        if not value:
            return '<div class="empty">空数组</div>'
        items = [f"<li>{_render_value(item)}</li>" for item in value]
        return f"<ol class=\"value-list\">{''.join(items)}</ol>"

    if value is None:
        return '<span class="value-null">null</span>'

    text = str(value).strip()
    if "\n" in text or len(text) > 120:
        return f"<pre>{escape(text)}</pre>"
    return f"<span>{escape(text or '-')}</span>"


def _page(title: str, body: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{escape(title)}</title>
  <style>
    :root {{
      --bg: #f4efe6;
      --panel: #fffdf9;
      --line: #e5d8c5;
      --text: #1f2937;
      --muted: #6b7280;
      --accent: #9a3412;
    }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; background: linear-gradient(180deg, #f7f2ea 0%, var(--bg) 100%); color: var(--text); font-family: "PingFang SC", "Noto Sans SC", sans-serif; }}
    main {{ max-width: 1100px; margin: 0 auto; padding: 24px; }}
    .hero, .section {{ background: var(--panel); border: 1px solid var(--line); border-radius: 20px; padding: 24px; }}
    .section {{ margin-top: 20px; }}
    .target-list, .kv-list, .value-list {{ display: grid; gap: 12px; }}
    .target-item, .kv-row, .value-list > li {{ background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 14px; }}
    .target-item {{ display: block; text-decoration: none; color: inherit; }}
    .target-item strong {{ display: block; margin-bottom: 8px; color: var(--accent); }}
    .kv-row {{ grid-template-columns: minmax(140px, 220px) minmax(0, 1fr); }}
    .kv-key {{ color: var(--accent); font-weight: 700; }}
    .empty, .value-null {{ color: var(--muted); }}
    pre {{ white-space: pre-wrap; word-break: break-word; margin: 0; }}
    @media (max-width: 720px) {{
      main {{ padding: 16px; }}
      .hero, .section {{ padding: 18px; }}
      .kv-row {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>
  <main>{body}</main>
</body>
</html>
"""


class HTMLReporter:
    def __init__(self, output_dir: Path) -> None:
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write_target(self, payload: dict[str, Any]) -> Path:
        normalized = payload.get("normalized", {})
        path = self.output_dir / f"{payload['name']}.html"
        path.write_text(
            _page(
                f"{payload['name']} 采集报告",
                (
                    "<section class=\"hero\">"
                    f"<h1>{escape(payload['name'])} 采集报告</h1>"
                    f"<p>{escape(payload.get('url', ''))}</p>"
                    "</section>"
                    "<section class=\"section\">"
                    "<h2>结构化数据</h2>"
                    f"{_render_value(normalized)}"
                    "</section>"
                    "<section class=\"section\">"
                    "<h2>JSON 预览</h2>"
                    f"<pre>{escape(json.dumps(normalized, ensure_ascii=False, indent=2))}</pre>"
                    "</section>"
                ),
            ),
            encoding="utf-8",
        )
        return path

    def build(self, results: list[dict[str, Any]]) -> Path:
        for payload in results:
            self.write_target(payload)

        items = []
        for payload in results:
            normalized = payload.get("normalized", {})
            summary = normalized.get("summary") if isinstance(normalized, dict) else ""
            items.append(
                "<a class=\"target-item\" href=\""
                f"{escape(payload['name'])}.html\">"
                f"<strong>{escape(payload['name'])}</strong>"
                f"<span>{escape(payload.get('url', ''))}</span>"
                f"<span>{escape(str(summary or '无 summary 字段'))}</span>"
                "</a>"
            )

        index_path = self.output_dir / "index.html"
        index_path.write_text(
            _page(
                "采集结果报告",
                (
                    "<section class=\"hero\">"
                    "<h1>采集结果报告</h1>"
                    "<p>每个目标都已生成独立 HTML 页面。</p>"
                    "</section>"
                    "<section class=\"section\">"
                    "<h2>目标列表</h2>"
                    f"<div class=\"target-list\">{''.join(items) or '<div class=\"empty\">暂无结果</div>'}</div>"
                    "</section>"
                ),
            ),
            encoding="utf-8",
        )
        return index_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Build HTML report from parsed JSON files.")
    parser.add_argument("--parsed-dir", required=True, help="已解析 JSON 目录")
    parser.add_argument("--output-dir", required=True, help="HTML 输出目录")
    args = parser.parse_args()

    parsed_dir = Path(args.parsed_dir)
    results = [json.loads(path.read_text(encoding="utf-8")) for path in sorted(parsed_dir.glob("*.json"))]
    index_path = HTMLReporter(Path(args.output_dir)).build(results)
    print(str(index_path))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
