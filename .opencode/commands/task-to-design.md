---
description: Phase 1 of multi-agent autopilot. From a business-language task, produce a BaSYS design (status: review) with independent design review. Stops at the PM approval gate.
agent: autopilot-orchestrator
subtask: true
---

Run Phase 1 of the multi-agent autopilot defined in `project/docs/autopilot-workflow.md`.

Use this command only when the task satisfies the multi-agent criteria in `project/docs/autopilot-workflow.md`. For simple metadata changes use `/quick-metadata`; for medium known-pattern tasks use `/metadata-autopilot`.

Input (business task):
$ARGUMENTS

If `$ARGUMENTS` is empty, stop and ask the PM for a path to a business-task file (typically under `inbox/`) or for the business-task text inline.

Authorization:

This command is an explicit PM authorization for the Phase 1 autonomous run. Do not ask the PM for intermediate approvals during this cycle. Do not commit, do not push, do not run Phase 2 automatically.

Process references (read these before starting):
@project/docs/autopilot-workflow.md
@project/docs/workflow.md
@PROJECT_CONTEXT.md
@OPEN_QUESTIONS.md
@project/docs/decisions.md
@project/docs/glossary.md
@project/docs/patterns/metadata-workflow.md

Execution:

1. Interpret `$ARGUMENTS`:
   - if it is a path to an existing file, read that file as the business task;
   - otherwise treat it as inline business-task text.
2. Derive a short Latin `snake_case` identifier `<sp-id>` from the task. Use a stable name suitable for filenames (e.g., `smoke-employee`, `sp-021-shipment`).
3. Execute Phase 1 of the cycle from `project/docs/autopilot-workflow.md`:
   - autopilot-analyst (design mode) writes `project/docs/specs/<sp-id>-design.md` with `status: review`;
   - autopilot-reviewer (type: design) writes `project/docs/specs/<sp-id>-design-review.md`;
   - loop on critical defects: revision through autopilot-analyst (revision mode), then reviewer again;
   - stop when reviewer verdict is `approved`. The design status remains `review`; the PM must approve it manually.
4. Produce the Phase 1 PM report.

Hard constraints:

- Do not write the design or review files yourself; only via subagents.
- Do not change the design status to `approved`. PM does that manually after reviewing.
- Do not run Phase 2. Phase 2 is `/spec-to-metadata-multi` and requires PM approval of the design first.
- Do not paraphrase or soften review findings.
- Treat design/review files as multi-agent handoff artifacts. After the run, recommend extracting durable lessons and cleaning up temporary files that are not needed for future work.
- Stop and ask the PM only if the cycle cannot complete due to a genuine contradiction in the business task vs project decisions, or if a subagent fails twice in a row on the same artifact.
