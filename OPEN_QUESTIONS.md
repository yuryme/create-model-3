# Открытые вопросы

## Обсуждается сейчас

- sp-002 — генератор тестовых данных (сеялка) для цепочки 1a: поручение на методику/ТЗ передаётся аналитику (PM передаёт сам).

## В очереди

- Функциональная приёмка 1a на стенде (чек-лист C): заявка → проведение в `customer_demand` → задание → `fill_from_orders`/`calc_requirement` → отчёты. После приёмки — `implemented` для ТЗ и плана.
- sp-002: методика `sp-002-seed-design.md`, затем ТЗ; ключевой вопрос — bootstrap операций (вне scope `create-fill-workflow`).
- Детализировать части 1b и 1c в `sp-001-bakery-stage1.md` после приёмки 1a.
- Проверить UX рецептур (шапка `catalog/recipe` + строки `register/recipe_component`) на приёмке; при неудобстве — форма-конструктор во вторую очередь.

## Отложено

_(пока пусто)_

## Решено

- Metadata части 1a реализованы Engineer и импортированы в BaSYS без ошибок импорта (2026-06-02); 17 metaobject закоммичены локально в `metadata/` (`bd7bbe9`). План реализации + import-notes закоммичены и запушены в workspace-репо. ТЗ/план остаются `approved` до функциональной приёмки.
- sp-002 (сеялка) опирается на skill `create-fill-workflow` для слоёв enum/catalog/register; операции/документы этот skill не покрывает и требуют отдельного механизма (решается в методике sp-002).
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
