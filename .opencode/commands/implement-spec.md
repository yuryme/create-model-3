---
description: Fast-track autonomous implementation of a fully approved spec-json. No questions, no plan artifacts. Engineer implements metadata directly, auditor verifies, criticals get fixed, PM gets a report.
agent: autopilot-orchestrator
subtask: true
---

Run the FAST-TRACK implementation mode defined in `project/docs/autopilot-workflow.md` (section "Fast-Track").

This mode assumes ALL uncertainty was resolved during the interactive design phase with the PM. The spec is the complete buildable contract. There is nothing to ask and nothing to decide.

Input spec path (spec-json-v0.1 file under `project/docs/specs/`):
$ARGUMENTS

Authorization:

This command is an explicit PM authorization for one autonomous fast-track run. Do NOT ask the PM anything during the run. Any blocker means STOP with a report, never a question. Do not commit, do not push.

Process references (read before starting):
@project/docs/autopilot-workflow.md
@project/docs/decisions.md
@project/docs/glossary.md
@project/docs/patterns/metadata-workflow.md

Entry gates (check ALL before any subagent call; on any failure STOP immediately and report which gate failed and why — do not ask, do not fix):

1. `$ARGUMENTS` is a path to an existing `project/docs/specs/<sp-id>.json`. If empty or missing — gate failure.
2. Schema validation passes: `python project/docs/specs/validate_spec.py project/docs/specs/<sp-id>.json` exits 0.
3. `meta.status` is exactly `approved`.
4. `openQuestions` is absent or an empty array. Any remaining open question (blocking or not) is a gate failure: fast-track requires zero open questions; decisions must already be baked into the spec body during design.

Execution (no spec-review, no plan, no plan-review):

1. Derive `<sp-id>` from the spec filename.
2. Invoke `autopilot-engineer` in **direct implementation mode**: input — spec path; outputs — metadata in `metadata/`, `<sp-id>-implementation-report.md`, `<sp-id>-import-notes.md`. No plan file is produced.
3. Collect changed metadata files via `git status` / `git diff --stat`.
4. Invoke `metadata-auditor`: spec path + changed-files list + output `<sp-id>-audit.md`. Never pass the implementation report path.
5. If the audit reports critical defects: invoke `autopilot-engineer` in fix mode, then re-audit. Maximum 2 fix iterations; if criticals remain after the second re-audit — STOP and report as blocked.
6. Produce the fast-track PM report: created/changed files, audit verdict, criticals fixed, accepted non-critical notes, import sequence reference, remaining risks.

Hard constraints:

- Do not write metadata or docs yourself; only via subagents.
- Do not invoke autopilot-analyst or autopilot-reviewer in this mode.
- Do not paraphrase or soften audit findings.
- A gate failure or blocker is reported to the PM as a stop, with the exact reason and the recommended next action (e.g., resolve open questions in design, re-approve spec).
