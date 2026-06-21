#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def _read_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


class LLMClient:
    def __init__(self) -> None:
        root = Path(__file__).resolve().parent.parent
        _read_env_file(root / ".env")

        self.api_key = os.getenv("LLM_API_KEY", "").strip() or os.getenv("DEEPSEEK_API_KEY", "").strip()
        self.base_url = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").rstrip("/")
        self.model = os.getenv("LLM_MODEL", "gpt-4.1-mini")
        if not self.api_key:
            raise ValueError("LLM_API_KEY / DEEPSEEK_API_KEY 未配置。")

    def normalize(self, instruction: str, payload: dict[str, Any]) -> dict[str, Any]:
        request_payload = {
            "model": self.model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "你是电商运营数据整理助手。"
                        "你的任务是把输入页面内容整理为稳定、清晰、可机读的 JSON。"
                        "如果原始信息缺失，不要编造，使用 null 或空数组。"
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        f"整理要求:\n{instruction}\n\n"
                        "请仅输出 JSON，对结果附带一个 summary 字段，并尽量保留关键原始字段。\n\n"
                        f"原始输入:\n{json.dumps(payload, ensure_ascii=False, indent=2)}"
                    ),
                },
            ],
        }

        request = urllib.request.Request(
            f"{self.base_url}/chat/completions",
            data=json.dumps(request_payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                body = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            raise RuntimeError(f"LLM 请求失败: HTTP {exc.code} {detail}") from exc

        content = body["choices"][0]["message"]["content"]
        return json.loads(content)


def main() -> int:
    parser = argparse.ArgumentParser(description="Normalize collected runtime payload with OpenAI-compatible LLM.")
    parser.add_argument("--input", required=True, help="原始 JSON 文件路径")
    parser.add_argument("--instruction", required=True, help="结构化整理要求")
    parser.add_argument("--output", help="输出 JSON 文件路径；默认打印到 stdout")
    args = parser.parse_args()

    payload = json.loads(Path(args.input).read_text(encoding="utf-8"))
    normalized = LLMClient().normalize(args.instruction, payload)

    text = json.dumps(normalized, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
    else:
        sys.stdout.write(text + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
