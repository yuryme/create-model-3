# BaSYS-AI Workspace For OpenCode

At the beginning of every project session, read the fast-start files first:

- `PROJECT_CONTEXT.md` - current project state: where we are, what is done, what is next.
- `OPEN_QUESTIONS.md` - open questions and accepted decisions.
- `project/docs/session-state.md` - current run state and compaction-safe operational memory.

Load workflow/pattern files lazily by task type:

- `project/docs/workflow.md` - mandatory PM -> analyst -> engineer workflow with review loops.
- `project/docs/patterns/metadata-workflow.md` - reusable metadata workflow lessons and artifact-retention rules.

Use `project/docs/workflow.md` when coordinating specs, reviews, analyst/engineer work, approvals or autopilot. Use `project/docs/patterns/metadata-workflow.md` when creating, editing or reviewing BaSYS metadata, forms, reports, commands, workflows, records or menus. For pure informational questions, quick status checks or OpenCode infrastructure discussion, do not pre-read the lazy files unless the task needs them.

Without the fast-start files, recommendations about the project are likely to be stale. Without the lazy files, workflow/metadata recommendations may be incomplete.

## Evidence Rule (Facts Only)

`analyst` and `engineer` design and implement only on confirmed BaSYS
capabilities. Never design, recommend, or build a mechanism whose existence is
not confirmed.

A platform capability counts as confirmed only if at least one holds:
1. It is explicitly described in `basys-docs/ru/` (cite the file/section).
2. A working example in `reference/metadata/` demonstrates it (cite the path).

If neither exists, the capability is unconfirmed:
- do not base a recommended design, methodology, specification, plan, or
  implementation on it;
- record it as an open risk/question and verify it on the bench or escalate to
  the PM before any other decision depends on it.

For any non-trivial capability, the author must cite the evidence (doc file or
reference path) in the artifact. PM-chat review returns any artifact that
relies on an unconfirmed capability taken on faith.

`reference/` confirms only that a capability exists; UIDs and values from
foreign `reference/` are still never copied (ADR 2026-05-15).

## Agents

The workspace uses specialized OpenCode agents in separate chats:

- `analyst` - designs solution methodologies and specifications in `project/docs/specs/`.
- `engineer` - implements approved specifications and maintains project infrastructure.
- PM assistant - the coordinating chat: helps the human PM coordinate agents, review artifacts, and maintain workspace documentation.

PM assistant coordinates the workflow but does not replace `analyst` for design work or `engineer` for metadata implementation.

The human PM approves business decisions, scope, and the functional result on a BaSYS stand. The PM is not expected to read or approve metadata JSON line-by-line; technical metadata checks are the responsibility of agents and tools.

## Specification Format (spec-json)

The ТЗ (specification) is written in the `spec-json-v0.1` format: a JSON file `project/docs/specs/<sp-id>.json` validated against `project/docs/specs/_spec-json.schema.json` (example `_spec-template.json`). Architecture rationale stays in `*-design.md` / `*.design.json`; the ТЗ is the buildable contract for the engineer. Spec status lives in `meta.status`. Validate with `python project/docs/specs/validate_spec.py <path>` (Python + `jsonschema`); validation is an obligatory review gate. The markdown ТЗ template `_template.md` is deprecated (ADR 2026-06-10); do not write new ТЗ in markdown. Designs, plans, reviews, reports, import-notes and audits stay in markdown.

## Specification Companion Artifacts

When an Analyst artifact in `project/docs/specs/` has companion structured or visual files, they are part of the same review package and must be updated in the same editing pass as the source document. This includes files such as `*.design.json`, `*.architecture-view.json` and `*.architecture-view.html`.

Do not leave companion visualization/design files stale after changing the methodology or specification. If a companion cannot be updated in the same pass, explicitly mark it stale in the user response and in `project/docs/session-state.md`; otherwise PM-chat review treats the package as inconsistent.

## Session Memory

`project/docs/session-state.md` is the operational memory for the current OpenCode run. It is short-lived state, not a project history archive.

Update `project/docs/session-state.md` when at least one applies:

- a long or autonomous run starts;
- PM makes an important decision that affects the current run;
- active files, blockers or next steps change materially;
- the session is likely to compact before the work is finished.

At the end of a meaningful work chapter, move durable facts into `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md`, ADRs or `project/docs/patterns/`, then reset `session-state.md` for the next run. Do not preserve full experiment transcripts there.

OpenCode compaction is assisted by `.opencode/plugins/session-memory.ts`, which injects `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md` and `project/docs/session-state.md` into the compaction context. Restart OpenCode after changing plugin files.

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
- `metadata/` - working mirror of the current BaSYS stand. Sync it from the real stand before experiments; apply/import it to the stand after implementation. Do not treat experimental metadata as a separate promoted artifact unless the PM explicitly asks for an isolated branch/worktree.
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
