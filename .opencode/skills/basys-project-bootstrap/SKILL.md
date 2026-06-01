---
name: basys-project-bootstrap
description: Create a new clean BaSYS/OpenCode project workspace from a previous workspace. Use when the user asks to create, clone, bootstrap, initialize, or prepare a new BaSYS project/workspace from an existing one.
---

# BaSYS Project Bootstrap

This skill guides creation of a clean BaSYS/OpenCode workspace from a completed project workspace.

Source of truth: `project/docs/patterns/project-bootstrap-workflow.md`.

## When To Use

- User wants a new project/workspace based on the current or previous BaSYS workspace.
- User wants to preserve OpenCode agents, commands, skills, workflow docs, templates, and durable patterns.
- User wants to avoid carrying old metadata/specs/task artifacts into the new project.
- User asks to push the new workspace to GitHub after bootstrap.

## Core Rule

Do not treat bootstrap as a blind copy. It is a controlled allowlist migration with checks and approval gates.

Before every action that creates, edits, or deletes files, present a concise plan and wait for explicit PM approval.

## Default Process

1. Read the mandatory project context files in the source workspace when present: `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md`, `project/docs/workflow.md`, and `project/docs/patterns/metadata-workflow.md`.
2. Read `project/docs/patterns/project-bootstrap-workflow.md` from the source or current workspace.
3. Identify source path, target path, target project name, and optional GitHub remote.
4. Ask PM for missing decisions using the native question UI when available.
5. Copy only the allowlist from the workflow document.
6. Create clean `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md`, `metadata/.gitkeep`, and `inbox/.gitkeep`.
7. Replace stale source project path/name references in active instructions.
8. Keep `reference/`, `basys-docs/`, and `basys-cursor-rules/` ignored by Git unless PM explicitly approves another policy.
9. Run staged checks for whitespace, old task markers, ignored corpora, and secret markers.
10. Commit only after checks pass and PM approval is clear.
11. Push only after remote/visibility/branch are clear and PM approves.

## Default Allowlist

- `AGENTS.md`
- `opencode.json`
- `.opencode/agents/`
- `.opencode/commands/`, excluding task-specific commands
- `.opencode/skills/`
- `project/docs/workflow.md`
- `project/docs/autopilot-workflow.md`
- `project/docs/patterns/`
- `project/docs/glossary.md`
- `project/docs/decisions.md`
- `project/docs/specs/_*.md`
- `project/docs/interviews/`
- `basys-docs-index.md`

## Default Exclusions

- Old `metadata/` contents.
- Old task specs, plans, reports, reviews, audits, and summaries.
- Old `inbox/` contents.
- Task-specific OpenCode commands.
- Source `.git/` history.
- Local read-only corpora from Git tracking.

## Safety Checks

Before commit, verify:

- `git status --short --ignored`
- `git diff --cached --stat`
- `git diff --cached --check`
- tracked file list contains no ignored corpora by default
- staged content has no unexplained secret markers
- staged content has no old task markers except intentional provenance notes

## Output

Final response should include:

- target path;
- commit hash if committed;
- remote URL and pushed refs if pushed;
- ignored local corpora;
- any remaining manual next steps, especially syncing `metadata/` from the new BaSYS stand.
