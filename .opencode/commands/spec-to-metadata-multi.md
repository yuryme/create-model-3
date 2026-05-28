---
description: Run the multi-agent autopilot from an approved design through specification, plan, metadata implementation, independent review and technical audit
agent: autopilot-orchestrator
subtask: true
---

Run the multi-agent autopilot defined in `project/docs/autopilot-workflow.md`.

Use this command only when independent multi-agent review/audit is justified by risk or complexity. For simple metadata changes use `/quick-metadata`; for medium known-pattern tasks use `/metadata-autopilot`.

Input design path:
$ARGUMENTS

If `$ARGUMENTS` is empty, stop and ask the PM for the path to an approved `*-design.md` file under `project/docs/specs/`.

Authorization:

This command is an explicit PM authorization for this autonomous multi-agent run. Do not ask the PM for intermediate approvals during the cycle. Do not commit, do not push.

Process references (read these before starting):
@project/docs/autopilot-workflow.md
@project/docs/workflow.md
@PROJECT_CONTEXT.md
@OPEN_QUESTIONS.md
@project/docs/decisions.md
@project/docs/glossary.md
@project/docs/patterns/metadata-workflow.md

Execution:

1. Verify the input file has `status: approved`. If not, stop and ask the PM.
2. Derive `<sp-id>` from the design filename (strip the `-design` suffix).
3. Execute the full multi-agent cycle from `project/docs/autopilot-workflow.md`:
   - autopilot-analyst writes the spec;
   - autopilot-reviewer reviews the spec;
   - loop on critical defects until reviewer approves;
   - autopilot-engineer writes the implementation plan;
   - autopilot-reviewer reviews the plan;
   - loop on critical defects until reviewer approves;
   - autopilot-engineer implements the metadata, writes implementation report and import notes;
   - metadata-auditor audits the metadata against the spec (without reading the implementation report);
   - loop on critical defects until auditor approves.
4. Produce the final PM report.

Hard constraints:

- Do not write specs, plans, or metadata yourself; only via subagents.
- Do not pass the implementation report path to the auditor.
- Do not paraphrase or soften review or audit findings.
- Treat spec/review/plan/audit/report files as run artifacts unless they are explicitly needed for future work. Final report must recommend cleanup or extraction of durable lessons.
- Stop and ask the PM only if the cycle cannot complete due to a genuine architectural contradiction in the approved design, or if a subagent fails twice in a row on the same artifact.
