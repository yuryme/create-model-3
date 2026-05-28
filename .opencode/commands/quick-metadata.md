---
description: Quick BaSYS metadata workflow for simple changes: one chat, direct project/metadata edits, self-check, no persistent review/audit files by default
agent: build
---

Run the quick BaSYS metadata workflow for a simple metadata task.

Task:
$ARGUMENTS

Use this command only when the task is small and low-risk: 1-3 metaobjects, known kind/patterns, no new business methodology, no complex `.bjs`, no complex cross-kind import graph.

Authorization:
This command is explicit PM authorization for this specific quick run. Do not ask for intermediate approvals unless the task has a real business or architecture ambiguity. Do not commit or push.

Process references:
@PROJECT_CONTEXT.md
@OPEN_QUESTIONS.md
@project/docs/workflow.md
@project/docs/autopilot-workflow.md
@project/docs/patterns/metadata-workflow.md
@project/docs/decisions.md

Execution:

1. Confirm the task fits quick metadata. If it does not, stop and recommend `metadata-autopilot` or multi-agent.
2. Treat `project/metadata/` as the working mirror of the current BaSYS stand.
3. Load `basys-metadata` before changing `project/metadata/`. Load form/import skills only when needed.
4. Implement the smallest correct metadata change directly in `project/metadata/`.
5. Do not create list/edit forms by default. If the task does not explicitly ask for forms, assigned forms, UX, layout, buttons, hidden/grouped fields, or a user-facing workflow, leave `ListFormUid`/`ItemFormUid = null` and use BaSYS autoforms. If forms seem necessary, ask the PM first.
6. Do not create design/review/audit/report files by default. Create a short spec/import note only if the task or PM explicitly needs it.
7. Run/perform self-checks appropriate to the change: JSON validity, `$schema` paths, UID/type/kind references, reserved words, forbidden paths, import sequence.
8. Final response must include changed files, self-checks, import/test steps for the BaSYS stand, and any durable lesson that should be moved to rules/patterns.

Hard constraints:

- Do not edit `reference/`, `basys-docs/`, `basys-cursor-rules/`, or generated BaSYS skills.
- Do not edit `project/metadata/system/` except allowed `dataTypes.json` updates for reference-kind metadata.
- Do not preserve experiment artifacts in active context unless they are needed for future work.
