---
description: Curate new patterns from current project/metadata into reference/ — add genuinely new patterns to reference/<pattern-name>/ and update reference/PATTERNS.md
agent: build
subtask: true
---

Run the reference curation workflow. The goal is to lift genuinely new metadata patterns from `project/metadata/` into `reference/` so the next project can reuse them, without duplicating examples that are already in `reference/PATTERNS.md`.

Optional argument — single metaobject name to curate (e.g. `recognition_usage`):
$ARGUMENTS

If the argument is empty, scan `project/metadata/` and propose a candidate list to the PM. If a metaobject name is given, curate only that metaobject and its directly required supporting objects.

Process references:
@project/docs/patterns/metadata-workflow.md
@reference/PATTERNS.md
@reference/INDEX.md
@PROJECT_CONTEXT.md
@OPEN_QUESTIONS.md

Authorization: this command is explicit PM authorization for a curation run. Do not ask for intermediate approvals on mechanical steps (directory creation, file copy, README skeleton), but you MUST stop and ask the PM at the explicit confirmation points listed below.

## Workflow

1. **Read rules.** Re-read the section «Курирование reference/» in `project/docs/patterns/metadata-workflow.md`. Treat the 6-step checklist there as authoritative.

2. **Build the dedup map.** Open `reference/PATTERNS.md` and build a list of business-capability sections and their entries. Note `reference/INDEX.md` and `reference/metadata/` exist as the legacy export of an unrelated system; do not curate from there, but you may consult `reference/INDEX-*.md` to check whether a given capability is already exemplified in the legacy export.

3. **Identify candidates.** Scan `project/metadata/` (or only the metaobject from `$ARGUMENTS`). Strong candidates:
   - operations with `.bjs` command scripts (JS-логика, обычно нестандартная);
   - operations with non-trivial RecordsSettings or non-obvious posting rules;
   - workflows other than plain Excel-import (already covered by skill `excel-import-to-detail`);
   - records registers with non-standard dimensions, resources, or computed columns;
   - register objects or catalogs with non-trivial computed columns or unusual structure.
   Skip plain catalogs (контрагент, единицы измерения и т.п.), enums, menus, system, and standard excel-import operations.

4. **Deduplicate.** For each candidate, ask: is this business capability already represented in `reference/PATTERNS.md`? Use capability matching, not metaobject-name matching. Skip if yes AND the candidate does not use a principally different mechanism (workflow vs computed-column vs JS-команда vs records-расчёт). Log every skip with reason for the final report.

5. **PM confirmation gate (stop here).** Present surviving candidates to the PM as a single list. For each candidate include:
   - proposed kebab-case directory name (e.g. `fifo-minutes-distribution`);
   - file list to copy, including supporting objects without which the example would be unreadable (records register the operation posts to; input operation that seeds the balance);
   - the `PATTERNS.md` section the new entry will go into (existing section, or a new one — name it).
   Use the native interactive choice UI for the confirmation. Wait for explicit PM approval per candidate. Do not copy anything before this gate clears.

6. **Create the pattern directory.** For every approved candidate, use bash (PowerShell). The `readonly-guard` plugin blocks `edit`/`write`/`apply_patch` inside `reference/`; bash is not gated:
   ```
   New-Item -ItemType Directory -Path "reference\<pattern-name>\metadata" | Out-Null
   Copy-Item -LiteralPath "project\metadata\<kind>\<name>" -Destination "reference\<pattern-name>\metadata\<kind>\<name>" -Recurse
   ```
   Do not modify the copied files in any way. Copy 1:1.

7. **Fill README.** Compose `reference/<pattern-name>/README.md` with exactly five sections:
   - **Status** — `готов` or `WIP — <причина>`.
   - **Бизнес-сценарий** — base it on `project/docs/specs/<sp-id>/spec.md` (or `design.md`) if it exists and its `status` is `approved`. Otherwise stop and ask the PM to dictate. Do not fabricate.
   - **Что демонстрирует паттерн** — derive from reading the actual `.bjs` / workflow / RecordsSettings / computed-column code. Explain the mechanism choice (JS-команда vs workflow vs computed-column vs records-расчёт) and why. Be specific about technical decisions visible in the code.
   - **Файлы** — every file copied, with role and approximate size in КБ.
   - **Источник** — project name, source path on disk, source spec path, выгрузки date (use today).
   Write the README via bash + PowerShell here-string + `Set-Content -Encoding UTF8`.

8. **Update PATTERNS.md.** Add a new bullet under the relevant business-capability section (Allocation / Distribution, Import, Records / Balances, Workflows, or a new section). One bullet per pattern: bolded name, link to directory, two-to-three-line description of what it demonstrates. Rewrite the whole file via `Set-Content -Encoding UTF8` rather than appending — it is small.

9. **Final report.** Output to the PM:
   - candidates considered and skipped, with one-line reason per skip;
   - patterns added, with directory name and PATTERNS.md section;
   - any pattern left as WIP and why (typically: missing business-context dictation);
   - suggested next step (commit changes, run another curation iteration, or stop).

## Hard rules

- Do NOT modify `reference/metadata/` (эталонный экспорт) or any `reference/INDEX*.md` file. Only the new top-level pattern directories and `reference/PATTERNS.md` are produced by this command.
- Do NOT skip the dedup step (step 4). Reference bloat is the main risk this command exists to avoid.
- Do NOT proceed past the PM confirmation gate (step 5) without explicit per-candidate approval.
- Do NOT copy Excel-import operations, plain catalogs, enums, menus, or system objects.
- Do NOT fabricate business scenarios. If no approved spec exists in the source project, ask the PM and stop the affected candidate until you have material.
- Do NOT commit or push.
- Use bash (`Copy-Item`, `Set-Content`, `Add-Content`, `New-Item`) for every write under `reference/`.
