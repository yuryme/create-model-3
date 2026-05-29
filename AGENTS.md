# BaSYS-AI Workspace For OpenCode

Read these files at the beginning of every project session:

- `PROJECT_CONTEXT.md` - current project state: where we are, what is done, what is next.
- `OPEN_QUESTIONS.md` - open questions and accepted decisions.
- `project/docs/workflow.md` - mandatory PM -> analyst -> engineer workflow with review loops.
- `project/docs/patterns/metadata-workflow.md` - reusable metadata workflow lessons and artifact-retention rules.

Without these files, recommendations about the project are likely to be stale.

## Agents

The workspace uses specialized OpenCode agents in separate chats:

- `analyst` - designs solution methodologies and specifications in `project/docs/specs/`.
- `engineer` - implements approved specifications and maintains project infrastructure.
- PM assistant - the coordinating chat: helps the human PM coordinate agents, review artifacts, and maintain workspace documentation.

PM assistant coordinates the workflow but does not replace `analyst` for design work or `engineer` for metadata implementation.

The human PM approves business decisions, scope, and the functional result on a BaSYS stand. The PM is not expected to read or approve metadata JSON line-by-line; technical metadata checks are the responsibility of agents and tools.

## OpenCode Infrastructure

Before changing `opencode.json`, `.opencode/agents/`, `.opencode/skills/`, plugins, MCP, providers, commands, or permission rules, use the user-level skill `opencode-docs` and verify exact config shapes against `https://opencode.ai/config.json`.

## BaSYS Skills Source Of Truth

Rules for creating, editing, and deleting BaSYS metadata JSON and related `.bjs`/form/report artifacts are owned by colleagues in `https://github.com/BaSysTeam/BaSYS.CursorRules` (`main`). The local clone is `basys-cursor-rules/` and is treated as read-only.

Do not manually edit generated BaSYS skills:

- `.opencode/skills/basys-metadata/`
- `.opencode/skills/excel-import-to-detail/`
- `.opencode/skills/create-list-form/`
- `.opencode/skills/create-edit-form/`
- `.opencode/skills/create-catalog/`
- `.opencode/skills/create-enum/`
- `.opencode/skills/create-operation/`
- `.opencode/skills/create-records/`
- `.opencode/skills/create-register/`

Update them only through the `basys-cursor-rules-sync` skill and commit generated output after PM approval.

## Path Convention

OpenCode is launched from the workspace root `create-model-3/`. Paths in project instructions are relative to this root.

Exception: `$schema` paths inside BaSYS metadata JSON files are relative to the JSON file itself.

## Workspace Structure

- `project/` - Git repository with project metadata, specifications, ADRs, reusable patterns, and documentation.
- `project/metadata/` - working mirror of the current BaSYS stand. Sync it from the real stand before experiments; apply/import it to the stand after implementation. Do not treat experimental metadata as a separate promoted artifact unless the PM explicitly asks for an isolated branch/worktree.
- `project/docs/patterns/` - reusable lessons and implementation patterns extracted from runs. Keep durable rules here instead of preserving full experiment transcripts.
- `basys-docs/` - local clone of official BaSYS documentation, treated as read-only.
- `basys-cursor-rules/` - local clone of BaSYS.CursorRules, treated as read-only source for generated BaSYS skills.
- `basys-docs-index.md` - local map of `basys-docs/ru/`.
- `reference/` - read-only reference export from another BaSYS installation; use for patterns, not UID values.
- `inbox/` - incoming materials for analysis.
- `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md` - workspace-level working documents.

## Safety Rules

- Do not edit `reference/` unless explicitly asked.
- Do not edit `basys-docs/` except explicit documentation update operations.
- Do not edit `basys-cursor-rules/`; update it only with `git pull --ff-only` during sync.
- Before creating, editing, or deleting files, provide a concise action plan and wait for explicit PM approval.
- Do not preserve full experiment outputs in active context by default; extract durable lessons into `project/docs/patterns/`, ADR, workflow, or skills.
- Legacy Claude Code project files have been removed; use `.opencode/agents/`, `.opencode/skills/`, and `opencode.json` for project instructions.
