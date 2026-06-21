from pathlib import Path

from coddecat.common import TaskRequest, load_app_config
from coddecat.gateway import GatewayApp


def test_load_config() -> None:
    config = load_app_config("config")
    assert config.app_name == "coddecat"
    assert config.browser.debug_port == 9222
    assert "data_agent" in config.agents
    assert "douyin" in config.platforms


def test_demo_task_creates_workspace(tmp_path: Path) -> None:
    config = load_app_config("config")
    config.runtime_dir = str(tmp_path / "runtime")
    config.workplaces_dir = str(tmp_path / "workplaces")
    config.package_dir = str(tmp_path / "package")
    app = GatewayApp(config)

    result = app.run_demo_task(TaskRequest(goal="demo", url="https://example.com"))

    workspace = Path(result.workspace)
    assert workspace.exists()
    assert (workspace / "input.json").exists()
    assert (workspace / "task_state.json").exists()
    assert (workspace / "html" / "page.html").exists()
    assert (workspace / "screenshots" / "001-page.png").exists()
    assert (workspace / "extracted_data.json").exists()
    assert (workspace / "result.json").exists()
    assert (workspace / "workspace_manifest.json").exists()
    assert (workspace / "raw" / "snapshot.json").exists()
    assert (workspace / "parsed" / "analysis.json").exists()


def test_scaffold_init_and_package_build(tmp_path: Path) -> None:
    config = load_app_config("config")
    config.runtime_dir = str(tmp_path / "runtime")
    config.workplaces_dir = str(tmp_path / "workplaces")
    app = GatewayApp(config)

    init_result = app.initialize_scaffold()
    assert Path(init_result["runtime_dir"]).exists()
    assert (Path(config.runtime_dir) / "state.json").exists()
    assert (Path(config.runtime_dir) / "ports.json").exists()

    output = app.build_package_bundle()
    output_dir = Path(output["output_dir"])
    assert output_dir.exists()
    assert (output_dir / "package_manifest.json").exists()
    assert (output_dir / "runtime" / "state.json").exists()
    assert (output_dir / "runtime" / "ports.json").exists()


def test_list_tasks_returns_workspace_summaries(tmp_path: Path) -> None:
    config = load_app_config("config")
    config.runtime_dir = str(tmp_path / "runtime")
    config.workplaces_dir = str(tmp_path / "workplaces")
    app = GatewayApp(config)
    app.run_demo_task(TaskRequest(goal="demo", url="https://example.com", platform="douyin"))

    tasks = app.list_tasks(limit=5)
    assert tasks["count"] == 1
    assert tasks["tasks"][0]["platform"] == "douyin"
