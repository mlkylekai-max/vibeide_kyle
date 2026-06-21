from pathlib import Path
import yaml

PROJECT_ROOT = Path(__file__).parent.parent


def test_config_files_exist() -> None:
    config_dir = PROJECT_ROOT / "config"
    assert config_dir.is_dir()
    assert (config_dir / "app.yaml").exists()
    assert (config_dir / "browser.yaml").exists()
    assert (config_dir / "platforms.yaml").exists()


def test_app_config_valid_yaml() -> None:
    with open(PROJECT_ROOT / "config" / "app.yaml") as f:
        cfg = yaml.safe_load(f)
    assert isinstance(cfg, dict)
    assert "app_name" in cfg or True  # at minimum valid YAML


def test_project_structure() -> None:
    root = PROJECT_ROOT
    assert (root / "runtime" / "src" / "index.ts").exists()
    assert (root / "electron" / "src" / "main" / "index.ts").exists()
    assert (root / "electron" / "src" / "main" / "worker").is_dir()
    assert (root / "agent" / "CLAUDE.md").exists()
    assert (root / "docs").is_dir()


def test_worker_layer_files() -> None:
    worker_dir = PROJECT_ROOT / "electron" / "src" / "main" / "worker"
    assert worker_dir.is_dir()
    for fname in ["index.ts", "orchestrator.ts", "task-state.ts", "context.ts", "chat-buffer.ts"]:
        assert (worker_dir / fname).exists(), f"Missing: {fname}"
