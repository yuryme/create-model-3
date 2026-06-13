---
sp-id: sp-003-recipe-doc
title: Implementation report — документ рецепта и регистр норм
kind: implementation-report
status: implemented
author: engineer
created: 2026-06-13
updated: 2026-06-13
depends-on:
  - project/docs/specs/sp-003-recipe-doc.json
  - project/docs/specs/sp-003-recipe-doc-plan.md
  - project/docs/specs/sp-003-recipe-doc-import-notes.md
---

# Отчёт реализации — `sp-003-recipe-doc`

## 1. Diff summary

Создано:

- `metadata/records/recipe_norm/records.recipe_norm.json`
- `metadata/operation/recipe_doc/operation.recipe_doc.json`
- `metadata/operation/recipe_doc/operation.recipe_doc.command.check_recipe.bjs`
- `metadata/operation/recipe_doc/operation.recipe_doc.form.list_r3cP9a.json`
- `metadata/operation/recipe_doc/operation.recipe_doc.form.edit_q8N2bV.json`
- `metadata/workflow/migrate_recipe_docs/workflow.migrate_recipe_docs.json`
- `metadata/workflow/migrate_recipe_docs/workflow.migrate_recipe_docs.step.data_recipe_head.bjs`
- `metadata/workflow/migrate_recipe_docs/workflow.migrate_recipe_docs.step.data_recipe_rows.bjs`
- `project/docs/specs/sp-003-recipe-doc-import-notes.md`

Изменено:

- `project/docs/specs/sp-003-recipe-doc-plan.md` — статус `approved`.
- `metadata/system/dataTypes.json` — append для `operation/recipe_doc`.
- `metadata/workflow/requirement_calc/workflow.requirement_calc.json` — version/memo.
- `metadata/workflow/requirement_calc/workflow.requirement_calc.step.load_recipes.bjs` — чтение `records.recipe_norm`.
- `metadata/workflow/requirement_calc/workflow.requirement_calc.step.explode_bom.bjs` — актуальный рецепт по max(period) <= `plan_date`.
- `metadata/operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs` — чтение `records.recipe_norm`.
- `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md`, `project/docs/session-state.md` — Durable Memory Checkpoint.

Не изменено:

- `metadata/catalog/recipe/catalog.recipe.json` и `metadata/register/recipe_component/register.recipe_component.json` оставлены как архив/источник миграции.
- `metadata/operation/production_task/operation.production_task.command.calc_requirement.bjs` оставлен без изменения; контракт `requirement_calc` сохранён.

## 2. Acceptance checklist A — fileSelfCheck

| Пункт ТЗ | Статус | Комментарий |
|---|---|---|
| Созданы `records/recipe_norm`, `operation/recipe_doc`, `workflow/migrate_recipe_docs`, формы list/edit | done | Файлы созданы. |
| Все JSON валидируются по schemas | done | `jsonschema.Draft4Validator` прошёл для новых metadata JSON/form/workflow. |
| Новые `Name` latin snake_case <=30 | done | `recipe_norm`, `recipe_doc`, `components`, `migrate_recipe_docs`. |
| `operation/recipe_doc` добавлен в `dataTypes.json`; records/workflow не добавлены | done | Append только для `operation/recipe_doc`. |
| `recipe_doc.components` начинается со служебных колонок `id`, `object_uid`, `row_number` | done | Порядок соблюдён. |
| `recordsSettings` пишет в `recipe_norm`, direction Plus, condition guard, `component_qty_per_unit` | done | Condition: `$r.quantity > 0 && $h.output_qty > 0`; expression: `$r.quantity / $h.output_qty`. |
| `requirement_calc` больше не читает старые recipe objects | done | grep по папке `requirement_calc` не нашёл `catalog.recipe` / `register.recipe_component`. |
| `production_task.calc_requirement` сохранён/совместим | done | Команда не изменена, `return_result` contract сохраняет `kind`, `item`, `quantity`, `unit`, `unit_display`. |
| `calc_raw_writeoff` больше не читает старые recipe objects | done | grep по `operation/production_output/*.bjs` не нашёл старые recipe reads. |
| Старые `catalog/recipe` и `register/recipe_component` не удалены | done | Файлы не менялись. |

## 3. Acceptance checklist B — declarativeJson

| Пункт ТЗ | Статус | Комментарий |
|---|---|---|
| `recipe_norm` содержит required поля и standard records columns | done | `id`, `period`, `object_kind`, `meta_object`, `object_uid`, `row` + поля норм. |
| `recipe_doc` содержит header и detail table по ТЗ | done | Header: `output_item`, `output_qty`, `output_unit`, `comment`; detail `components`. |
| `recipe_doc` не содержит бизнес-поля `is_active` | done | Есть только platform top-level `isActive`; business-column `is_active` не создана. |
| `recipe_doc` имеет команду `check_recipe` и формы list/edit | done | Команда и две constructor forms созданы и назначены. |
| `migrate_recipe_docs` использует data_object_loader с TableMapping и CreateRecords=true | done | Step `create_recipe_docs`, `createRecords: true`, `tableMapping` на `components`. |
| Дата миграции не позже earliest `production_task.plan_date` / `production_output.date` | done in workflow, bench value pending | Workflow вычисляет дату при запуске; фактическое значение нужно зафиксировать после запуска на стенде. |
| Актуальный рецепт выбирается по max(period) <= дата расчёта и одному object_uid | done | Реализовано в `requirement_calc.explode_bom` и `production_output.calc_raw_writeoff`. |

## 4. Verification commands

- `python project/docs/specs/validate_spec.py project/docs/specs/sp-003-recipe-doc.json` → `VALID`.
- `python -m json.tool` для новых/изменённых JSON → OK.
- `jsonschema.Draft4Validator` для `records.recipe_norm`, `operation.recipe_doc`, обеих forms, `workflow.migrate_recipe_docs` → OK.
- `grep catalog.recipe|register.recipe_component` в `metadata/workflow/requirement_calc` → no matches.
- `grep catalog.recipe|register.recipe_component` в `metadata/operation/production_output/*.bjs` → no matches.
- `git diff --check` → OK.

## 5. Import instruction

Полная последовательность: `project/docs/specs/sp-003-recipe-doc-import-notes.md`.

Кратко: импортировать партиями `records/recipe_norm` → `operation/recipe_doc` + forms/command + `dataTypes.json` append → `workflow/migrate_recipe_docs` → обновлённый `workflow/requirement_calc` → обновлённый `operation/production_output` command; затем запустить `migrate_recipe_docs` и проверить checklist C на стенде.

## 6. Known bench checks pending

- Фактическая дата миграции после запуска workflow.
- Открытие list/edit forms на стенде.
- Поведение `data_object_loader` с numeric reference ids из старых recipe-объектов.
- Команды `check_recipe`, `production_task.calc_requirement`, `production_output.calc_raw_writeoff` на реальных данных.

## 7. Durable memory delta

- `sp-003-recipe-doc-plan.md` approved PM 2026-06-13.
- Metadata implementation for `sp-003-recipe-doc` completed locally and awaits import/bench acceptance.
- Created new objects: `records/recipe_norm`, `operation/recipe_doc`, `workflow/migrate_recipe_docs`.
- Updated calculations to read `records.recipe_norm` instead of old recipe objects.
