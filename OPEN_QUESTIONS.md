# Открытые вопросы

## Обсуждается сейчас

- sp-002 — план `sp-002-seed-data-1a-plan.md` переведён в `approved`; engineer реализует два workflow `seed_refs_1a`/`seed_docs_1a` в `metadata/`.
- sp-001 часть 1b — детализация `review` возвращена analyst (PM-chat review 2026-06-02, `needs changes`). Findings к исправлению до повторного ревью:
  - **Major 1.** `raw_inventory` проведение в `raw_stock`: условия Plus/Minus через `||` (`diff_qty`/`diff_amount`) при разных знаках дают двойную искажённую запись. Сделать условия взаимоисключающими (один знаковый драйвер) либо блокировать сохранение при разных знаках через команду/валидацию, а не «контролем пользователя».
  - **Major 2.** `production_plan_report`: план пишется с `period = plan_date`, факт — с `period = production_output.date`; группировка по точной дате разводит план и факт в разные строки. Группировать по продукции/складу/организации за период, дату — только фильтром.
  - **Medium 3.** Деление на ноль в средней цене: `avg_price` в `calc_raw_writeoff` (остаток) и `amount/quantity` в `raw_stock_report` — добавить защиту при нулевом количестве (в отчёте явно отсутствует).
  - **Minor.** `production_output.production_task` необязателен, но `fill_from_task` без него не работает — добавить понятную ошибку; подкрепить чтение чужой detail-table ссылкой на `queryBuilder.md`; явно зафиксировать, что себестоимость ГП в 1b не ведётся (решение для 1c).
  - Проверено ок: перенос `supplier_settlements` в 1b, средневзвешенное списание через `raw_writeoff` без RecordsSource-DB-запроса (evidence), факт в `production_plan` как `planned_qty=0/output_qty=факт`, исключение текущего документа по `meta_object+object_uid`, имена/служебные колонки, чек-листы 1b A/B/C.

## В очереди

- Функциональная приёмка 1a на стенде (чек-лист C): заявка → проведение в `customer_demand` → задание → `fill_from_orders`/`calc_requirement` → отчёты. После приёмки — `implemented` для ТЗ и плана.
- sp-002: PM подтверждает на стенде отсутствие конфликта seed-ключей `code`/`title` (§5.3) до запуска workflow.
- sp-002 реализация: при создании workflow JSON писать в camelCase по образцу `metadata/workflow/requirement_calc/workflow.requirement_calc.json` и примеров доков, НЕ в PascalCase из `reference/` (риск отказа импорта); поправить счётчик `.bjs` в плане §5 на 14.
- Детализировать части 1b и 1c в `sp-001-bakery-stage1.md` после приёмки 1a.
- Проверить UX рецептур (шапка `catalog/recipe` + строки `register/recipe_component`) на приёмке; при неудобстве — форма-конструктор во вторую очередь.

## Отложено

_(пока пусто)_

## Решено

- sp-002 — план реализации `sp-002-seed-data-1a-plan.md` `approved` (2026-06-02): scope = только два новых workflow, без правок существующей metadata и `system/dataTypes.json`, dataset используется буквально, composite `SearchBy` вынесен как bench-риск. При approve зафиксированы две обязательные правки для реализации: JSON в camelCase (как `requirement_calc.json`, не PascalCase reference) и счётчик `.bjs` = 14.
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
