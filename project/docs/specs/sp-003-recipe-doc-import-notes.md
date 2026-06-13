---
sp-id: sp-003-recipe-doc
title: Import notes — документ рецепта и регистр норм
kind: import-notes
status: implemented
author: engineer
created: 2026-06-13
updated: 2026-06-13
depends-on:
  - project/docs/specs/sp-003-recipe-doc.json
  - project/docs/specs/sp-003-recipe-doc-plan.md
---

# Инструкция импорта — `sp-003-recipe-doc`

## 1. Предварительные условия

- Стенд должен соответствовать текущему `metadata/` baseline с объектами `catalog/recipe`, `register/recipe_component`, `workflow/requirement_calc`, `operation/production_task`, `operation/production_output`.
- Если на стенде уже создавались экспериментальные `records/recipe_norm`, `operation/recipe_doc` или `workflow/migrate_recipe_docs`, перед импортом нужно удалить эти server objects либо отдельно согласовать импорт как MODIFY по фактическим UID. По локальному baseline таких объектов не было.
- Старые `catalog/recipe` и `register/recipe_component` не удалять.

## 2. Последовательность импорта

Из-за алфавитного порядка импорта BaSYS и cross-kind references импортировать партиями:

1. `metadata/records/recipe_norm/records.recipe_norm.json`.
2. `metadata/operation/recipe_doc/` целиком:
   - `operation.recipe_doc.json`;
   - `operation.recipe_doc.command.check_recipe.bjs`;
   - `operation.recipe_doc.form.list_r3cP9a.json`;
   - `operation.recipe_doc.form.edit_q8N2bV.json`.
3. `metadata/system/dataTypes.json` с append-записью для `operation/recipe_doc`, если стенд требует локальную регистрацию reference-type в этом же пакете. Existing records не менять вручную.
4. `metadata/workflow/migrate_recipe_docs/` целиком.
5. `metadata/workflow/requirement_calc/` целиком или минимум изменённые файлы:
   - `workflow.requirement_calc.json`;
   - `workflow.requirement_calc.step.load_recipes.bjs`;
   - `workflow.requirement_calc.step.explode_bom.bjs`.
6. `metadata/operation/production_output/` целиком или минимум изменённую команду `operation.production_output.command.calc_raw_writeoff.bjs` вместе с object folder, если импорт команд на стенде идёт только через папку объекта.

## 3. После импорта

1. Запустить workflow `migrate_recipe_docs` вручную.
2. Зафиксировать дату миграции в bench notes: workflow выбирает дату не позже earliest `production_task.plan_date` / `production_output.date`; если таких документов нет, берёт дату запуска.
3. Проверить, что миграция создала `operation/recipe_doc` с `create_records=true` и записи `records/recipe_norm`.
4. Выполнить functional checklist C из ТЗ на стенде.

## 4. Rollback / pre-clean

- До functional acceptance не удалять старые recipe-объекты.
- При неудачной миграции исправить старые данные или правила миграции и повторить после удаления частично созданных `recipe_doc`/`recipe_norm`, если они были созданы до ошибки.
- Если импорт `operation/recipe_doc` частично прошёл, повторный импорт делать как MODIFY только после сверки UID локальных файлов и server objects.
