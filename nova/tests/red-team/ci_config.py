"""
CI configuration for red-team suite.

Wires the red-team suite into CI with re-run triggers on:
- Model changes
- Prompt changes
- Schema changes
- Connector changes
- Dependency changes
- Policy changes
- Infrastructure changes
"""

import os
import yaml
from typing import Dict, Any, List


# Trigger paths that should cause red-team suite to re-run
RED_TEAM_TRIGGERS = {
    "model": [
        "nova/services/model-gateway/",
        "nova/services/agent-orchestrator/orchestrator/workflows/",
        "nova/tests/fixtures/fake-model/",
    ],
    "prompt": [
        "nova/services/agent-orchestrator/orchestrator/prompts/",
        "nova/services/agent-orchestrator/orchestrator/router/",
    ],
    "schema": [
        "nova/packages/contracts/",
        "nova/services/policy-approval-service/src/policy/families.yaml",
    ],
    "connector": [
        "nova/services/*/connectors/",
        "nova/infra/compose/",
    ],
    "dependency": [
        "nova/**/package.json",
        "nova/**/requirements.txt",
        "nova/**/pyproject.toml",
    ],
    "policy": [
        "nova/services/policy-approval-service/src/policy/families.yaml",
        "nova/services/policy-approval-service/src/policy/policy-schema.ts",
        "nova/services/policy-approval-service/src/policy/deny-list.ts",
    ],
    "infrastructure": [
        "nova/infra/",
        "nova/db/",
        "nova/docs/plan/",
    ],
}


def generate_github_actions_workflow() -> Dict[str, Any]:
    """Generate the GitHub Actions workflow for red-team suite."""
    return {
        "name": "Red-Team Suite",
        "on": {
            "push": {
                "paths": [path for paths in RED_TEAM_TRIGGERS.values() for path in paths],
            },
            "pull_request": {
                "paths": [path for paths in RED_TEAM_TRIGGERS.values() for path in paths],
            },
            "schedule": [
                {"cron": "0 2 * * *"}  # Daily at 2 AM
            ],
            "workflow_dispatch": {},  # Manual trigger
        },
        "jobs": {
            "red-team": {
                "runs-on": "ubuntu-latest",
                "timeout-minutes": 30,
                "steps": [
                    {"uses": "actions/checkout@v4"},
                    {
                        "name": "Set up Python",
                        "uses": "actions/setup-python@v5",
                        "with": {"python-version": "3.12"},
                    },
                    {
                        "name": "Install dependencies",
                        "run": "pip install pytest pytest-asyncio httpx",
                    },
                    {
                        "name": "Start test stack",
                        "run": "cd nova/infra/compose && docker compose -f compose.yaml -f compose.platform.yaml up -d",
                    },
                    {
                        "name": "Wait for services",
                        "run": "sleep 10 && curl -f http://localhost:8000/health || exit 1",
                    },
                    {
                        "name": "Run red-team suite",
                        "run": "cd nova && python -m pytest tests/red-team/ -v --tb=short",
                    },
                    {
                        "name": "Upload results",
                        "uses": "actions/upload-artifact@v4",
                        "if": "always()",
                        "with": {
                            "name": "red-team-results",
                            "path": "nova/tests/red-team/results/",
                        },
                    },
                ],
            },
        },
    }


def write_workflow_file(output_path: str = ".github/workflows/red-team.yml") -> None:
    """Write the workflow file to disk."""
    workflow = generate_github_actions_workflow()
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w") as f:
        yaml.dump(workflow, f, sort_keys=False)
    print(f"Written workflow to {output_path}")


if __name__ == "__main__":
    write_workflow_file()