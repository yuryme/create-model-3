---
sp-id: sp-001-bakery-stage1b
title: Хлебозавод — этап 1b, склад сырья и выпуск
kind: plan
status: approved
author: engineer
created: 2026-06-10
updated: 2026-06-10
depends-on:
  - project/docs/specs/sp-001-bakery-stage1b.json
  - project/docs/specs/sp-001-bakery-stage1b.design.json
  - project/docs/specs/sp-001-bakery-stage1a.md
---

# План реализации — Хлебозавод, этап 1b: склад сырья и выпуск

> План создан по утверждённому ТЗ `project/docs/specs/sp-001-bakery-stage1b.json` (`meta.status: approved`, `spec-json-v0.1`). Схемная валидация ТЗ уже выполнена orchestrator'ом: `VALID`. До утверждения этого плана `metadata/` не изменяется.

---

## 1. Контекст и состав работы

Реализуется этап 1b хлебозавода: склад сырья, выпуск продукции, количественные движения сырья и готовой продукции, стоимость поступления сырья, долг поставщикам и три отчёта. Реализация опирается на импортированные объекты 1a: `company`, `warehouse`, `counterparty`, `nomenclature`, `recipe`, `recipe_component`, `production_task`, `production_plan`.

Состав по ТЗ:

| Действие | Объекты |
|---|---|
| CREATE records | `raw_movement`, `raw_cost_movement`, `finished_goods_movement`, `supplier_debt_movement` |
| MODIFY records | `production_plan` — без изменения колонок; только новое проведение из `production_output` |
| CREATE operation | `raw_receipt`, `raw_inventory`, `production_output` |
| CREATE data_view | `raw_stock_report`, `production_plan_report`, `fg_stock_report` |
| Команды `.bjs` | `fill_current_stock`, `fill_from_task`, `calc_raw_writeoff` |
| Меню | Не править, если `menu/all_metadata_objects` с `autoFill = true` покрывает `operation`, `records`, `data_view` |

Подтверждённый baseline 1a в `metadata/`:

- `metadata/catalog/company/`, `warehouse/`, `counterparty/`, `nomenclature/`, `recipe/` присутствуют.
- `metadata/register/recipe_component/` присутствует; колонки `recipe`, `component`, `quantity` подтверждены.
- `metadata/operation/production_task/` присутствует; табличная часть `plan_products` и колонка `planned_qty` подтверждены.
- `metadata/records/production_plan/` присутствует; контракт колонок `company`, `warehouse`, `product`, `planned_qty`, `output_qty` соответствует ТЗ 1b и 1a §4.12.
- `metadata/data_view/` пока отсутствует; папка будет создана при реализации отчётов.

---

## 2. Решения по открытым вопросам ТЗ

> Evidence Rule: план использует только подтверждённые возможности BaSYS. Доказательства: `basys-docs/ru/metadata/recordsCreation.md`, `basys-docs/ru/commands/programmableCommands.md`, `basys-docs/ru/calculations/queryBuilder.md`, `basys-docs/ru/reporting/dataView.md`, `basys-docs/ru/metadata/dataObject.md`; локальные правила `.opencode/skills/basys-metadata/records-creation.md`, `commands.md`, `data-view-reports.md`.

| № вопроса ТЗ | Выбранный вариант | Обоснование | Риск |
|---|---|---|---|
| OQ-001 | Закрытие месяца не реализуется в 1b | ADR 2026-06-10: `raw_cost_movement` в 1b получает только стоимость поступления; расход стоимости сырья относится к будущему документу закрытия месяца. | Накопится стоимость прихода без списания стоимости; это ожидаемое ограничение scope. |
| OQ-002 | Использовать существующий `records/production_plan` | ТЗ утверждает вариант: `production_output` пишет факт отдельной записью с `planned_qty = 0`, `output_qty = $r.quantity`; контракт 1a подтверждён фактическим JSON. | Если PM позже потребует отдельный регистр факта, это возврат к Analyst до реализации, не инженерная правка. |
| OQ-003 | Не создавать отдельный отчёт кредиторки в 1b | ТЗ создаёт `supplier_debt_movement`, но `supplier_debt_report` оставляет для 1c. | Сальдо долга поставщикам не видно отдельным отчётом в 1b; это осознанный out-of-scope. |

Неблокирующая терминологическая заметка: в `scope.assumptions` ТЗ указано `semi_finished`, тогда как глоссарий и 1a используют `semi_product`. Реализация 1b не ветвится по этому коду в metadata; в алгоритме `calc_raw_writeoff` полуфабрикаты обрабатываются как расчётные узлы по фактическим данным `catalog/recipe` и `register/recipe_component`. Исправление текста ТЗ можно выполнить позже как non-critical, без остановки реализации.

---

## 3. Декомпозиция на этапы

### Этап 1. Подготовка records-регистров

- **Что делается:** создать четыре новых регистра записей по ТЗ, со стандартными колонками вида `records` из `metadata/system/kinds/kind.records.json` и пользовательскими колонками из `metaObjects`.
- **Файлы:**
  - `metadata/records/raw_movement/records.raw_movement.json`
  - `metadata/records/raw_cost_movement/records.raw_cost_movement.json`
  - `metadata/records/finished_goods_movement/records.finished_goods_movement.json`
  - `metadata/records/supplier_debt_movement/records.supplier_debt_movement.json`
- **Правила:**
  - `raw_movement` — только количество: `company`, `warehouse`, `raw_item`, `quantity`.
  - `raw_cost_movement` — только стоимость поступления: `company`, `warehouse`, `raw_item`, `amount`.
  - `finished_goods_movement` — только количество готовой продукции: `company`, `warehouse`, `product`, `quantity`.
  - `supplier_debt_movement` — кредиторка поставщика: `company`, `supplier`, `amount`.
  - Не добавлять records в `metadata/system/dataTypes.json` (`kind.records.json`: `isReference = false`).
- **Проверка:** стандартные колонки records идут первыми (`id`, `period`, `object_kind`, `meta_object`, `object_uid`, `row`), все `Memo` заполнены, `Name` snake_case ≤30.

### Этап 2. Операция `raw_receipt`

- **Что делается:** создать документ поступления сырья с табличной частью `raw_items` и тремя правилами проведения.
- **Файлы:**
  - `metadata/operation/raw_receipt/operation.raw_receipt.json`
  - локальная запись в `metadata/system/dataTypes.json` для `operation/raw_receipt` (только append, без правки существующих записей).
- **Ключевые поля:** шапка `company`, `supplier`, `warehouse`, `comment`; строки `raw_item`, `quantity`, `price`, `amount`, `comment`.
- **RecordsSettings:**
  - `raw_items` → `records/raw_movement`, `Plus`, `quantity = $r.quantity`.
  - `raw_items` → `records/raw_cost_movement`, `Plus`, `amount = $r.amount`.
  - `raw_items` → `records/supplier_debt_movement`, `Plus`, `supplier = $h.supplier`, `amount = $r.amount`.
- **Проверка:** `create_records` стандартная колонка есть; `recordsSettings` не маппит engine-managed колонки (`object_kind`, `meta_object`, `object_uid`, `row`); `period = $h.date`.

### Этап 3. Операция `raw_inventory` и команда `fill_current_stock`

- **Что делается:** создать документ инвентаризации сырья, команду заполнения текущих остатков и раздельное проведение Plus/Minus по знаку `diff_qty`.
- **Файлы:**
  - `metadata/operation/raw_inventory/operation.raw_inventory.json`
  - `metadata/operation/raw_inventory/operation.raw_inventory.command.fill_current_stock.bjs`
  - локальная запись в `metadata/system/dataTypes.json` для `operation/raw_inventory`.
- **Ключевые поля:** шапка `company`, `warehouse`, `comment`; строки `raw_item`, `current_qty`, `fact_qty`, `diff_qty`, `comment`.
- **Команда:**
  - читает `records/raw_movement` через QueryBuilder;
  - агрегирует остаток по `company`, `warehouse`, `raw_item` на дату документа;
  - если документ уже сохранён/проводился, исключает собственные движения по паре `meta_object + object_uid`;
  - обновляет `current_qty`, не затирая ручной `fact_qty` без подтверждения/явной логики сохранения.
- **RecordsSettings:**
  - `diff_qty > 0` → `Plus`, `quantity = $r.diff_qty`.
  - `diff_qty < 0` → `Minus`, `quantity = -$r.diff_qty` как положительная величина расхода; при реализации отдельно проверить на стенде поведение направления `Minus`, так как правило `records-creation.md` указывает, что engine инвертирует decimal-поля для `Minus`.
- **Проверка:** одна строка создаёт не более одного движения; инвентаризация не пишет в `raw_cost_movement` и не создаёт долг.

### Этап 4. Операция `production_output` и команды выпуска

- **Что делается:** создать документ выпуска продукции с двумя табличными частями, двумя командами и тремя правилами проведения.
- **Файлы:**
  - `metadata/operation/production_output/operation.production_output.json`
  - `metadata/operation/production_output/operation.production_output.command.fill_from_task.bjs`
  - `metadata/operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs`
  - локальная запись в `metadata/system/dataTypes.json` для `operation/production_output`.
- **Ключевые поля:** шапка `company`, `production_task`, `fg_warehouse`, `raw_warehouse`, `comment`; строки `outputs` и `raw_writeoff`.
- **Команда `fill_from_task`:**
  - при пустом `production_task` показывает понятную ошибку и не меняет строки;
  - читает `operation.production_task.plan_products` по `object_uid` задания через QueryBuilder;
  - загружает `outputs` с парами reference-полей `product` + `product_display`;
  - при повторном запуске не теряет ручные правки без подтверждения/явной логики очистки.
- **Команда `calc_raw_writeoff`:**
  - раскрывает `outputs` через `catalog/recipe` + `register/recipe_component` по паттерну 1a `requirement_calc`;
  - полуфабрикаты остаются расчётными узлами, в складские регистры не пишутся;
  - рассчитывает только количество сырья;
  - читает `records/raw_movement` для `stock_qty_before`, при повторном расчёте исключает текущий документ по `meta_object + object_uid`;
  - блокирует расчёт при отсутствии активной рецептуры, дубле активной рецептуры, цикле рецептур, `output_qty <= 0`, компоненте типа `product`, нулевом/отрицательном/недостаточном остатке.
- **RecordsSettings:**
  - `outputs` → `finished_goods_movement`, `Plus`.
  - `raw_writeoff` → `raw_movement`, `Minus`.
  - `outputs` → существующий `production_plan`, `Plus`, `planned_qty = 0`, `output_qty = $r.quantity`.
- **Проверка:** `production_output` не рассчитывает среднюю цену, не пишет расход стоимости сырья, не пишет в `raw_cost_movement`.

### Этап 5. Data view отчёты

- **Что делается:** создать три панели данных с одним табличным indicator каждая и `.bjs` data source `rows`.
- **Файлы:**
  - `metadata/data_view/raw_stock_report/data_view.raw_stock_report.json`
  - `metadata/data_view/raw_stock_report/data_view.raw_stock_report.data_source.rows.bjs`
  - `metadata/data_view/production_plan_report/data_view.production_plan_report.json`
  - `metadata/data_view/production_plan_report/data_view.production_plan_report.data_source.rows.bjs`
  - `metadata/data_view/fg_stock_report/data_view.fg_stock_report.json`
  - `metadata/data_view/fg_stock_report/data_view.fg_stock_report.data_source.rows.bjs`
- **Правила:**
  - `data_view` использует `metadata/system/schemas/dataViewSettings.schema.json`, `kind.data_view.json` (`storeData=false`, `isReference=false`).
  - Не добавлять data_view в `metadata/system/dataTypes.json`.
  - Источники данных возвращают `DataTable`; reference display-поля получать через `.getDisplays()` и группировать вместе с UID-полями.
- **Проверка:** отчёты соответствуют чек-листу B: сырьё без стоимости/средней цены; план/факт без группировки по точной дате; остатки ГП на дату.

### Этап 6. Меню и импортные инструкции

- **Что делается:** проверить `metadata/menu/all_metadata_objects/menu.all_metadata_objects.json`.
- **Решение:** меню уже содержит `autoFill = true` для `records`, `operation`, `data_view`; ручные пункты меню не создавать, если PM отдельно не попросит предметную навигацию.
- **Файлы:** metadata/menu не менять на этом этапе.
- **Import notes:** при реализации создать `project/docs/specs/sp-001-bakery-stage1b-import-notes.md`, потому что есть cross-kind references и новые operation зависят от новых records, а data_view зависят от records.

### Этап 7. Verification перед отчётом PM

- **Что делается:** выполнить self-check A/B из ТЗ до передачи PM.
- **Проверки:**
  - JSON валидны по схемам `metadata/system/schemas/`.
  - UID уникальны в новых файлах; kind/type UIDs взяты из `metadata/system/`.
  - `metadata/system/dataTypes.json` содержит только append для трёх новых operations.
  - Все `.bjs` filenames совпадают с `expression` в JSON.
  - `recordsSettings` источники и target-колонки существуют.
  - `Minus`-direction для `raw_inventory` и `production_output` проверен особенно внимательно.
  - Acceptance A/B явно покрыты в implementation report; C остаётся для PM bench testing.

---

## 4. Импорт на стенд

Случай нетривиальный: новые `operation/*` ссылаются на новые `records/*`, а `data_view/*` читает новые и существующие records. По ADR 2026-05-16 импорт нельзя считать топологическим; сервер идёт по алфавиту kind/object и не строит dependency graph.

Предварительная стратегия импорта, уточняется в `sp-001-bakery-stage1b-import-notes.md` после реализации:

1. Импортировать новые `records/*`:
   - `raw_movement`
   - `raw_cost_movement`
   - `finished_goods_movement`
   - `supplier_debt_movement`
2. Импортировать `metadata/system/dataTypes.json` с локальными append-записями для новых operations, если стенд требует ссылаться на новые operation-типы в этом же проходе. Существующие записи не менять.
3. Импортировать новые `operation/*` вместе с `.bjs` команд:
   - `raw_receipt`
   - `raw_inventory`
   - `production_output`
4. Импортировать `data_view/*` отчёты.
5. `menu/all_metadata_objects` не импортировать, если не менялся.

Если на стенде уже существуют частично созданные объекты 1b после экспериментов, перед импортом нужна pre-clean инструкция: удалить/очистить конфликтующие server objects либо импортировать в режиме MODIFY только после сверки UID. По текущему baseline локально объектов 1b нет.

---

## 5. Оценка и риски

| Метрика | Оценка |
|---|---|
| Общий объём работы | 10 новых metaobject JSON + 6 `.bjs` + 3 append-записи в `system/dataTypes.json` + import-notes + implementation report |
| Самый рискованный этап | Команды `calc_raw_writeoff` и `fill_current_stock`: QueryBuilder, агрегации, исключение текущего документа, display-поля для ссылок |
| Риск импорта | Средний: cross-kind references records → operation → data_view требуют пакетного импорта |
| Риск проведения | Средний: нужно точно сопоставить `sourceUid` detail tables и destination column UIDs; `Minus` direction требует проверки знака |
| Риск UX | Низкий/средний: формы не создаются, используются автоформы; ограничение выбора raw/product/supplier может остаться пользовательским контролем |

Технические риски и mitigation:

1. **Фильтры типов номенклатуры/ролей контрагентов могут быть не декларативными.** Не проектировать неподтверждённый filter-механизм; оставить контроль пользователю/приёмке или добавить командные проверки только если подтверждены docs/reference.
2. **Повторный расчёт остатков может учесть текущий документ.** В командах фильтровать не только `object_uid`, а пару `meta_object + object_uid` (pattern зафиксирован в `metadata-workflow.md`).
3. **`Minus` direction и знаки.** В records-creation rule сказано, что engine инвертирует decimal-поля для `Minus`; для `raw_inventory` источник `diff_qty` отрицательный, поэтому передаётся положительная величина `-$r.diff_qty`. Это обязательно проверить на стенде по чек-листу B/C.
4. **Data view display-поля при groupBy.** При `.getDisplays()` включать в `groupBy` и UID, и `<field>_display` (pattern `metadata-workflow.md`).
5. **Алгоритм разузлования.** Не дублировать неподтверждённые новые возможности; адаптировать уже существующий подход 1a `requirement_calc` и QueryBuilder/DataTable helpers.

---

## 6. Открытые вопросы к PM

Блокирующих вопросов нет.

Неблокирующие заметки:

1. ТЗ содержит терминологическое `semi_finished` в assumptions; фактический проектный термин — `semi_product`. На реализацию 1b это не влияет, но при следующей правке ТЗ лучше заменить для согласованности.
2. Если PM хочет отдельный отчёт по `supplier_debt_movement` уже в 1b, это расширение scope; текущий план его не включает.
3. Если автоформы окажутся неудобны для `production_output`/`raw_inventory`, формы-конструкторы следует проектировать отдельным изменением, не в этом плане.

---

## 7. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-10 | review | Создан план реализации Инженером на основе approved spec-json 1b; metadata не изменялись. |
| 2026-06-10 | approved | PM одобрил план; можно переходить к реализации metadata после отдельного подтверждения плана действий. |
