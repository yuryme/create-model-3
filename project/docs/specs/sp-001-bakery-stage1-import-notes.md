# Инструкция импорта — sp-001 bakery stage 1a

Случай нетривиальный: BaSYS импортирует объекты без построения графа зависимостей. Импортировать весь `metadata/` одним проходом до регистрации новых reference-типов не рекомендуется.

## Последовательность

1. `enum/nomenclature_type`, `enum/counterparty_role`.
2. `catalog/unit`, `catalog/company`, `catalog/warehouse`.
3. `catalog/counterparty`, `catalog/nomenclature`.
4. `catalog/recipe`.
5. `register/recipe_component`, `register/price_list`.
6. `records/customer_demand`, `records/production_plan`.
7. `workflow/requirement_calc`.
8. `operation/customer_order`, `operation/production_task` вместе с `.bjs` командами.
9. `data_view/customer_orders_report`, `data_view/raw_requirement_report` вместе с `.bjs` источниками данных.

`metadata/system/dataTypes.json` импортировать не нужно: локальные записи нужны только для связности редактирования; сервер пересоберёт типы после импорта объектов.

## После импорта

Вручную заведите значения перечислений:

- `nomenclature_type`: `product` / «Продукция», `semi_product` / «Полуфабрикат», `raw` / «Сырьё».
- `counterparty_role`: `customer` / «Клиент», `supplier` / «Поставщик», `both` / «Клиент и поставщик».

Меню отдельно импортировать не требуется, если на стенде активен `menu/all_metadata_objects` с `autoFill = true` для видов 1a.
