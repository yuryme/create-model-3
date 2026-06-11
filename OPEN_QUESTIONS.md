# Открытые вопросы

## Обсуждается сейчас

- Этап 1c: определить scope, цели и входные данные; затем analyst-дизайн и ТЗ spec-json.

## В очереди

- Судьба legacy `sp-001-bakery-stage1b.md`: 1b принят, можно архивировать или удалить — нужно решение PM.
- Перевести статусы ТЗ/планов 1a и 1b в `implemented` в файлах specs (приёмка пройдена, статусы в файлах не обновлены).
- `supplier_debt_report` отложен из 1b (OQ-003) — кандидат в scope 1c.
- Документ закрытия месяца (списание стоимости сырья, средневзвешенная оценка) отложен из 1b (OQ-001, ADR 2026-06-10) — кандидат в scope будущих этапов.
- Проверить UX рецептур (шапка `catalog/recipe` + строки `register/recipe_component`); при неудобстве — форма-конструктор во вторую очередь.

## Отложено

_(пока пусто)_

## Решено

- Этап 1b завершён (подтверждено PM 2026-06-11): metadata реализованы по `sp-001-bakery-stage1b.json` + `sp-001-bakery-stage1b-plan.md`, закоммичены (`5062183` в `metadata/`), импортированы на стенд и функционально приняты. Артефакты: `sp-001-bakery-stage1b-implementation-report.md`, `sp-001-bakery-stage1b-import-notes.md`.
- Этап 1a функционально принят на стенде; sp-002 seed-workflow (`seed_refs_1a`/`seed_docs_1a`) реализованы и выполнены (подтверждено PM 2026-06-11).
- Формат ТЗ переведён на `spec-json-v0.1` (PM 2026-06-10): ТЗ — JSON `<sp-id>.json` по `_spec-json.schema.json` (draft 2020-12), валидация `validate_spec.py` (Python+jsonschema) обязательна. Решения PM: формат везде (ручной и autopilot); полная JSON-schema + валидация; 1b сконвертирован как первый носитель (`sp-001-bakery-stage1b.json`). Markdown-ТЗ `_template.md` deprecated. Агенты и процессные доки обновлены (ADR 2026-06-10). Требуется перезапуск OpenCode для применения изменений `.opencode/agents/*`.
- sp-001 1b design-пакет — PM одобрил направление и правки (N1/N2/M1/M2) 2026-06-10: openQuestions синхронизированы, контракт `production_plan` (1a §4.12) зафиксирован, проведение инвентаризации разбито на Plus/Minus, долг поставщику построчно. ТЗ 1b теперь ведётся как `sp-001-bakery-stage1b.json`.
- sp-002 — план реализации `sp-002-seed-data-1a-plan.md` `approved` (2026-06-02): scope = только два новых workflow, без правок существующей metadata и `system/dataTypes.json`, dataset используется буквально, composite `SearchBy` вынесен как bench-риск. При approve зафиксированы две обязательные правки для реализации: JSON в camelCase (как `requirement_calc.json`, не PascalCase reference) и счётчик `.bjs` = 14.
- sp-001 1b — PM 2026-06-10 изменил архитектурное решение по стоимости сырья и именованию регистров: `raw_movement` ведёт движения количества сырья; `raw_cost_movement` хранит движения стоимости сырья; `finished_goods_movement` ведёт движения готовой продукции; `supplier_debt_movement` ведёт движения долга поставщикам. Расход стоимости сырья и средневзвешенная оценка переносятся в будущий документ закрытия месяца; инвентаризация 1b корректирует только количество.
- sp-002 — ТЗ `sp-002-seed-data-1a.md` `approved` (2026-06-02) после двух кругов ревью: закрыты уникальность seed-ключей (§5.3), исключение из `create-fill-workflow` title-prefix для multi-target `seed_refs_1a`, запрет engineer генерировать enum `code` без PM. Тестовый набор `sp-002-seed-data-1a-dataset.md` создан PM-chat и `approved` как вход §5.2 (3 рецептуры, многоуровневая цепочка P-001 → S-001 → сырьё, 2 заявки, 1 задание).
- sp-002 — методика загрузки тестовых данных 1a `approved` (2026-06-02) после трёх кругов ревью. Архитектура: два ручных workflow `seed_refs_1a` (enum/catalog/register + рецептуры/прайс) и `seed_docs_1a` (документы с `CreateRecords=true`), без оркестратора. Операции — только Create, `number` не маппится, документы неидемпотентны (маркер в `comment`). Введено правило доказательности (ADR-2026-06-02) после двух инцидентов с фантазийными допущениями.
- Metadata части 1a реализованы Engineer и импортированы в BaSYS без ошибок импорта (2026-06-02); 17 metaobject закоммичены локально в `metadata/` (`bd7bbe9`). План реализации + import-notes закоммичены и запушены в workspace-репо. ТЗ/план остаются `approved` до функциональной приёмки.
- sp-002 (сеялка) опирается на skill `create-fill-workflow` для слоёв enum/catalog/register; операции/документы этот skill не покрывает — для них используется `data_object_loader` с `TableMapping` + `CreateRecords` (подтверждено документацией и reference).
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
