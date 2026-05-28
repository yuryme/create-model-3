---
description: Single-agent BaSYS metadata autopilot for medium tasks using one shared context, internal role simulation, and concise artifacts
agent: build
---

Run the reusable single-agent BaSYS metadata autopilot.

Input task or design/spec path:
$ARGUMENTS

Use this command for medium metadata tasks where known project patterns apply and independent multi-agent review is not worth the cost. Examples: several catalogs, known operations/records patterns, import dependencies that can be checked in one context.

Authorization:
This command is explicit PM authorization for this autonomous run. Do not ask for intermediate approvals unless there is a genuine business/architecture ambiguity. Do not commit or push.

Process references:
@PROJECT_CONTEXT.md
@OPEN_QUESTIONS.md
@project/docs/workflow.md
@project/docs/autopilot-workflow.md
@project/docs/patterns/metadata-workflow.md
@project/docs/decisions.md
@project/docs/glossary.md

Role protocol inside one context:

1. Analyst role: produce or refine the minimum necessary specification. If the input is already precise, do not create a long spec file.
2. PM Assistant role: review only for critical defects that would break import, references, approved scope, or core acceptance.
3. Engineer role: produce a concise implementation plan only if the task is non-trivial.
4. PM Assistant role: review the plan by the same criticality rule.
5. Engineer role: implement metadata in `project/metadata/`.
6. PM Assistant role: self-audit the diff and fix critical defects.
7. Final response: changed files, critical defects fixed, non-critical notes, import sequence, stand acceptance steps, durable lessons.

Artifact discipline:

- `project/metadata/` is the working mirror of the BaSYS stand.
- Do not create list/edit forms by default. If forms, assigned forms, UX, layout, buttons, hidden/grouped fields, or a user-facing workflow are not explicit requirements, leave `ListFormUid`/`ItemFormUid = null` and use BaSYS autoforms. If forms seem necessary, ask the PM first.
- Avoid persisted `*-review.md` and `*-audit.md` files in single-agent mode.
- Keep specs/plans/import notes concise and only when they will be reused.
- Extract durable lessons to `project/docs/patterns/`, ADR, workflow, or skills; do not keep full experiment logs in active context.

Mandatory constraints:

- Load `basys-metadata` before editing `project/metadata/`.
- Use `project/metadata/system/` as the only source of kind/type/standard-column UIDs.
- New object/table/column `Name` values must be Latin `snake_case`, <=30 chars, not SQL reserved words.
- Do not edit `reference/`, `basys-docs/`, `basys-cursor-rules/`, or generated BaSYS skills.
- Do not commit or push.
