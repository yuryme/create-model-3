# Открытые вопросы

## Обсуждается сейчас

- Передача approved-ТЗ части 1a Engineer на implementation plan.

## В очереди

- Engineer: implementation plan по части 1a, затем реализация metadata.
- Синхронизировать `metadata/` со стендом BaSYS перед/после реализации 1a.
- Детализировать части 1b и 1c в `sp-001-bakery-stage1.md` после приёмки 1a.
- Проверить UX рецептур (шапка `catalog/recipe` + строки `register/recipe_component`) на приёмке; при неудобстве — форма-конструктор во вторую очередь.

## Отложено

_(пока пусто)_

## Решено

- ТЗ хлебозавода часть 1a переведено в `approved` (2026-06-02) после двух кругов ревью; критические C1/C2 и M1–M3 закрыты.
- Рецептуры: `catalog/recipe` (шапка) + `register/recipe_component` (строки состава) из-за `useDetailsTables = false` у вида `catalog` (ADR-2026-06-02).
- `requirement_calc` запускается по сохранённому `production_task` со скалярным `task_number`; передача DataTable как параметра workflow не используется.
- Стартовые значения перечислений 1a вводятся вручную при приёмке; fill-workflow вне scope 1a.
- `create-model-2` завершён, зафиксирован отдельным commit и tag `create-model-2-final`.
- `create-model-3` создаётся без metadata/specs завершённых задач `create-model-2`.
- Reusable workflow, patterns, agents, commands и skills сохраняются как основа нового workspace.
- Read-only корпуса `basys-docs/`, `basys-cursor-rules/`, `reference/` перенесены физически.
- `basys-docs/` проверен/синхронизирован до `2e6e431`, `basys-docs-index.md` приведён к текущему коммиту документации.
- `basys-cursor-rules/` проверен/синхронизирован до `e472d12`; generated BaSYS skills уже соответствуют этому коммиту, включая skills для catalog/enum/operation/records/register/fill-workflow.
