---
description: Bootstrap a clean BaSYS/OpenCode workspace from an existing workspace using allowlist copy, approval gates, checks, optional commit and push
agent: build
---

Bootstrap a new BaSYS/OpenCode project workspace.

Arguments:
$ARGUMENTS

Expected argument shape, if the user provides it:

```text
source=<path> target=<path> name=<project-name> remote=<optional-github-url-or-owner/repo> push=<yes|no>
```

Load `basys-project-bootstrap` first, then follow the workflow in `project/docs/patterns/project-bootstrap-workflow.md`.

Process references:

@PROJECT_CONTEXT.md
@OPEN_QUESTIONS.md
@project/docs/workflow.md
@project/docs/patterns/metadata-workflow.md
@project/docs/patterns/project-bootstrap-workflow.md

Authorization and approval:

This command is not blanket authorization to create, edit, delete, commit, or push files. Before file operations, show a concise action plan and wait for explicit PM approval. Ask again before commit and before push if those actions were not explicitly requested in the command arguments.

Required behavior:

1. Parse arguments and identify missing decisions.
2. Use the native question UI for missing choices when available.
3. Build an allowlist-based copy plan; do not blindly clone the source directory.
4. Create a clean target workspace with fresh context files and empty `metadata/`.
5. Exclude old metadata, old specs, old inbox materials, reports, audits, summaries, and task-specific commands unless PM explicitly approves them.
6. Keep `reference/`, `basys-docs/`, and `basys-cursor-rules/` ignored by Git by default.
7. Check for stale source project references and old task markers in tracked files.
8. Check staged content for secret markers before commit.
9. If commit is approved, create a single initialization commit.
10. If push is approved, configure/verify the remote, push `main`, and verify remote refs.

Final response must include target path, commit hash, remote push result if any, ignored local corpora, and next step to sync `metadata/` from the new BaSYS stand.
