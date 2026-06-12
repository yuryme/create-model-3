# Инструкция импорта — sp-001-bakery-stage1b

## Назначение

Импорт metadata этапа 1b хлебозавода: склад сырья, выпуск продукции, регистры движений и отчёты.

## Важное ограничение BaSYS

Сервер BaSYS импортирует metadata по алфавитному порядку kind-папок и объектов, без построения dependency graph. В 1b есть cross-kind references:

- новые `operation/*` ссылаются на новые `records/*` в `recordsSettings`;
- `operation/production_output` ссылается на существующий `operation/production_task` и `records/production_plan`;
- новые `data_view/*` читают новые и существующие records;
- `metadata/system/dataTypes.json` локально дополнен тремя operation-типами.

Поэтому импортировать всю папку `metadata/` одним проходом не рекомендуется.

## Рекомендуемая последовательность

### Пакет 0. Baseline 1a

Перед импортом 1b на стенде должны уже существовать объекты 1a:

- `catalog/company`
- `catalog/warehouse`
- `catalog/counterparty`
- `catalog/nomenclature`
- `catalog/recipe`
- `register/recipe_component`
- `operation/production_task`
- `records/production_plan`

Если 1a не импортирован, сначала импортировать 1a и проверить базовые сценарии 1a.

### Пакет 1. Новые records

Импортировать:

- `metadata/records/raw_movement/`
- `metadata/records/raw_cost_movement/`
- `metadata/records/finished_goods_movement/`
- `metadata/records/supplier_debt_movement/`

Проверить, что четыре регистра создались без ошибок.

### Пакет 2. Data types для новых operations

Импортировать/применить `metadata/system/dataTypes.json`, если стенд требует зарегистрировать новые operation-типы до импорта операций.

Локальные append-записи:

- `operation/raw_receipt`
- `operation/raw_inventory`
- `operation/production_output`

Существующие записи в `dataTypes.json` не должны изменяться вручную. После серверного импорта/экспорта сервер может регенерировать файл — это штатно.

### Пакет 3. Новые operations

Импортировать:

- `metadata/operation/raw_receipt/`
- `metadata/operation/raw_inventory/`
- `metadata/operation/production_output/`

Вместе с JSON должны импортироваться companion `.bjs` файлы команд:

- `operation.raw_inventory.command.fill_current_stock.bjs`
- `operation.production_output.command.fill_from_task.bjs`
- `operation.production_output.command.calc_raw_writeoff.bjs`

Проверить, что операции открываются в автоформах и видят созданные records-назначения.

### Пакет 4. Data views

Импортировать:

- `metadata/data_view/raw_stock_report/`
- `metadata/data_view/production_plan_report/`
- `metadata/data_view/fg_stock_report/`

Вместе с JSON должны импортироваться data source `.bjs` файлы `*.data_source.rows.bjs`.

### Пакет 5. Меню

`metadata/menu/all_metadata_objects/` не менялся. В нём уже есть `autoFill = true` для `records`, `operation`, `data_view`, поэтому отдельный импорт меню для 1b не нужен.

## Если на стенде уже были эксперименты 1b

Если на стенде уже существуют одноимённые объекты 1b с другими UID, перед импортом нужно pre-clean решение PM:

1. удалить экспериментальные объекты 1b на стенде и импортировать текущие файлы как новые; или
2. выполнить ручной merge/modify под фактические UID стенда.

Без pre-clean возможны конфликты UID/name и broken references в `recordsSettings`.

## Функциональная проверка после импорта

Минимум:

1. Создать `raw_receipt` с двумя строками сырья и сохранить с `create_records = true`.
2. Проверить записи в `raw_movement`, `raw_cost_movement`, `supplier_debt_movement`.
3. Открыть `raw_stock_report` на дату поступления.
4. Создать `raw_inventory`, выполнить `fill_current_stock`, ввести факт, сохранить и проверить корректировку `raw_movement`.
5. Создать `production_output`, заполнить `outputs`, выполнить `calc_raw_writeoff`, сохранить.
6. Проверить записи в `finished_goods_movement`, `raw_movement`, `production_plan`.
7. Открыть `production_plan_report` и `fg_stock_report`.
