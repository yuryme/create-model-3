# Implementation Report — sp-001-bakery-stage1b

## Summary

Реализованы metadata этапа 1b по approved ТЗ `project/docs/specs/sp-001-bakery-stage1b.json` и approved plan `project/docs/specs/sp-001-bakery-stage1b-plan.md`.

Metadata baseline 1a не переименовывался и не перепроектировался. `records/production_plan` не изменялся по составу колонок; факт выпуска добавлен только через `recordsSettings` новой операции `production_output`.

## Созданные/изменённые файлы

### Metadata — records

- `metadata/records/raw_movement/records.raw_movement.json`
- `metadata/records/raw_cost_movement/records.raw_cost_movement.json`
- `metadata/records/finished_goods_movement/records.finished_goods_movement.json`
- `metadata/records/supplier_debt_movement/records.supplier_debt_movement.json`

### Metadata — operations

- `metadata/operation/raw_receipt/operation.raw_receipt.json`
- `metadata/operation/raw_inventory/operation.raw_inventory.json`
- `metadata/operation/raw_inventory/operation.raw_inventory.command.fill_current_stock.bjs`
- `metadata/operation/production_output/operation.production_output.json`
- `metadata/operation/production_output/operation.production_output.command.fill_from_task.bjs`
- `metadata/operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs`

### Metadata — data_view

- `metadata/data_view/raw_stock_report/data_view.raw_stock_report.json`
- `metadata/data_view/raw_stock_report/data_view.raw_stock_report.data_source.rows.bjs`
- `metadata/data_view/production_plan_report/data_view.production_plan_report.json`
- `metadata/data_view/production_plan_report/data_view.production_plan_report.data_source.rows.bjs`
- `metadata/data_view/fg_stock_report/data_view.fg_stock_report.json`
- `metadata/data_view/fg_stock_report/data_view.fg_stock_report.data_source.rows.bjs`

### Metadata — system

- `metadata/system/dataTypes.json` — append только для трёх новых operation-типов:
  - `operation/raw_receipt`
  - `operation/raw_inventory`
  - `operation/production_output`

### Project docs

- `project/docs/specs/sp-001-bakery-stage1b-import-notes.md`
- `project/docs/specs/sp-001-bakery-stage1b-implementation-report.md`

## Acceptance checklist A — fileSelfCheck

| Пункт ТЗ | Статус | Комментарий |
|---|---|---|
| Все объекты из `metaObjects` с `CREATE` созданы | PASS | Созданы 4 records, 3 operations, 3 data_view. |
| JSON валидируются по соответствующим схемам | PASS | Read-only technical validation подтвердил JSON parse/schema-shape для новых metadata JSON. Финальная проверка — импорт BaSYS. |
| Новые `Name` — latin snake_case, <=30, не reserved | PASS | Все новые имена соответствуют ADR-001. |
| UID/kind/type из `metadata/system/`, не из `reference/` | PASS | Kind UIDs и primitive/reference dataTypeUid взяты из `metadata/system/`. |
| Новые operations добавлены в `dataTypes.json` | PASS | Добавлены `raw_receipt`, `raw_inventory`, `production_output`. |
| Records/data_view не добавлены в `dataTypes.json` | PASS | Добавлены только operations. |
| Memo заполнено | PASS | Memo заполнены у новых объектов, колонок, tables, commands/data sources. |
| Табличные части начинаются `id`, `object_uid`, `row_number` | PASS | Все operation detail tables соблюдают порядок. |
| `.bjs` filenames совпадают с `expression` | PASS | Имена command/data_source scripts совпадают с JSON `expression`. |
| Формы не создавались без требования | PASS | `listFormUid`/`itemFormUid = null`, custom forms не создавались. |

## Acceptance checklist B — declarativeJson

| Пункт ТЗ | Статус | Комментарий |
|---|---|---|
| `raw_receipt` пишет quantity в `raw_movement` Plus | PASS | `recordsSettings` source `raw_items`, condition `$r.quantity > 0`. |
| `raw_receipt` пишет cost в `raw_cost_movement` Plus | PASS | `amount = $r.amount`. |
| `raw_receipt` пишет долг в `supplier_debt_movement` | PASS | `supplier = $h.supplier`, `amount = $r.amount`. |
| `raw_inventory` содержит `fill_current_stock` и проведение разниц | PASS | Команда и два rows Plus/Minus созданы. |
| Plus/Minus inventory взаимоисключающие, без cost | PASS | Conditions `$r.diff_qty > 0` и `< 0`; `raw_cost_movement` не используется. |
| `production_output` содержит `fill_from_task` и `calc_raw_writeoff` | PASS | Две команды созданы. |
| `production_output` пишет `outputs` в `finished_goods_movement` Plus | PASS | Source `outputs`, target `finished_goods_movement`. |
| `production_output` пишет `raw_writeoff` в `raw_movement` Minus | PASS | Source `raw_writeoff`, target `raw_movement`. |
| `production_output` пишет факт в `production_plan` | PASS | `planned_qty = 0`, `output_qty = $r.quantity`. |
| `calc_raw_writeoff` quantity-only, без средней цены/суммы | PASS | Скрипт считает только `quantity` и `stock_qty_before`. |
| `$t.<table>.load(source)` с display-полями | PASS | Команды используют `.getDisplays()`; source содержит `*_display`. |
| `raw_stock_report` читает `raw_movement`, без стоимости | PASS | Data source агрегирует только `quantity`. |
| `production_plan_report` группирует без точной даты | PASS | GroupBy: company/warehouse/product, без period. |
| `fg_stock_report` читает `finished_goods_movement` | PASS | Data source создан. |

## Acceptance checklist C — functionalStand

Не выполнялся локально. Требуется проверка PM на BaSYS-стенде по сценарию ТЗ:

1. `raw_receipt` → `raw_movement`, `raw_cost_movement`, `supplier_debt_movement`.
2. `raw_inventory` + `fill_current_stock` → single-direction correction in `raw_movement`.
3. `production_output` + commands → `finished_goods_movement`, `raw_movement`, `production_plan`.
4. Отчёты `raw_stock_report`, `production_plan_report`, `fg_stock_report`.

## Known risks / notes

1. Для `direction = Minus` в BaSYS engine умножает decimal-поля на `-1`; `raw_inventory` реализован по утверждённому ТЗ с expression `-$r.diff_qty`. Этот сценарий обязательно проверить на стенде: при отрицательном `diff_qty` итоговая запись должна уменьшать остаток, а не увеличивать его.
2. Команды используют QueryBuilder и `DataTable` helpers по паттернам 1a. Если на стенде QueryBuilder иначе обрабатывает `.groupBy(...).getDisplays()`, корректировка будет технической, без изменения ТЗ.
3. Фильтрация выбора номенклатуры по типам `raw/product` и поставщика по роли не реализована декларативно, как и было зафиксировано риском ТЗ; контроль остаётся на данных/приёмке.

## Import instruction

См. `project/docs/specs/sp-001-bakery-stage1b-import-notes.md`.
