# Session State

> Operational memory for the current OpenCode run. Keep this file short. It is not a project history archive.

## Current Task

- Topic: introduce spec-json-v0.1 as the ТЗ format (everywhere), with full JSON-schema + validation; convert 1b ТЗ as the first carrier.
- Goal: replace markdown ТЗ with structured spec-json; adapt all agents; deliver validated `sp-001-bakery-stage1b.json`.
- Prior chapter (done): 1b design package fixes (N1/N2/M1/M2) applied to `sp-001-bakery-stage1b.design.json` and `.md`.

## Status

- PM approved the Analyst correction direction: use movement registers (`raw_movement`, `raw_cost_movement`, `finished_goods_movement`, `supplier_debt_movement`); keep `raw_inventory` quantity-only.
- ADR addition approved by PM.
- Analyst updated `sp-001-bakery-stage1b.design.json` as the main 1b review result, plus `.md` specs, visualization files, glossary and workflow rules.
- PM-chat review of 1b design package done; verdict was "needs changes (minor)". Analyst applied fixes on 2026-06-10:
  - N1: `design.json.openQuestions` filled with OQ-001..OQ-003 (mirror of ТЗ §8), all non-blocking.
  - N2: ТЗ §4.7 now fixes explicit column contract of existing 1a `production_plan` (ref `sp-001-bakery-stage1a.md` §4.12).
  - M1: `POSTING-raw-inventory-to-raw-movement` split into `-plus`/`-minus` flows with `$r.diff_qty` sign conditions; arch view posting list updated.
  - M2: ТЗ §4.4 supplier debt posting fixed to строчное (per-row from `raw_items`), removed "или агрегатом" ambiguity.
- Verification done: design.json + arch-view.json valid (openQuestions=3, postingFlows=8), `git diff --check` clean. Arch-view JSON/HTML not content-affected by these fixes.

## PM Decisions

- 2026-06-10: `raw_cost_movement` is the name of the new records register for raw material cost movements.
- 2026-06-10: movement registers are named as movements, not balances: `raw_movement`, `finished_goods_movement`, `supplier_debt_movement`.
- 2026-06-10: raw inventory in 1b does not correct cost; it corrects quantity only.
- 2026-06-10: raw material cost write-off is not calculated during `production_output`; it belongs to a future month-closing document.
- 2026-06-10: for 1b review, `sp-001-bakery-stage1b.design.json` is the main result; `.md` and architecture-view files are submitted together and must stay synchronized.
- 2026-06-10: architecture visualization must include a separate calculations view.

## Active Files

- `project/docs/decisions.md`
- `project/docs/glossary.md`
- `project/docs/specs/sp-001-bakery-stage1-design.md`
- `project/docs/specs/sp-001-bakery-stage1b.md`
- `project/docs/specs/sp-001-bakery-stage1b.design.json`
- `project/docs/specs/sp-001-bakery-stage1b.architecture-view.json`
- `project/docs/specs/sp-001-bakery-stage1b.architecture-view.html`
- `AGENTS.md`
- `project/docs/workflow.md`
- `OPEN_QUESTIONS.md`
- `project/docs/session-state.md`

## spec-json Infra (2026-06-10)

- Created: `project/docs/specs/_spec-json.schema.json` (draft 2020-12), `_spec-template.json`, `validate_spec.py`.
- Converted: `project/docs/specs/sp-001-bakery-stage1b.json` (first carrier; validates; content equivalent to `.md`).
- Agents updated: `autopilot-analyst` (spec/revision -> JSON), `autopilot-reviewer` (spec-review vs schema), `autopilot-engineer` + `metadata-auditor` (read JSON ТЗ), manual `analyst`/`engineer`; `autopilot-orchestrator` got narrow bash allow `python*validate_spec.py*` + Phase 2 validation step.
- Docs updated: `workflow.md`, `autopilot-workflow.md`, `spec-to-metadata-multi`, `metadata-autopilot`, `_template.md` (deprecated banner), `decisions.md` (ADR 2026-06-10), `AGENTS.md`.
- Validation status: schema valid; template + 1b validate (exit 0).

## Action Required After This Run

- RESTART OpenCode so changed `.opencode/agents/*` prompts and orchestrator permission take effect.

## Next Steps

- Decide fate of legacy `sp-001-bakery-stage1b.md` (keep until 1b acceptance, then archive) vs delete now.
- 1b design package was approved by PM; the spec-json ТЗ `sp-001-bakery-stage1b.json` is the buildable contract. Next: engineer plan/implementation for 1b (manual or `/spec-to-metadata-multi`).
- Old markdown ТЗ (1a, sp-002) stay as-is; migrate to spec-json only if needed.

## Blockers / Risks

- Companion visualization/design files must be updated in the same pass as the specs; leaving them stale is now a workflow defect.
