---
sp-id: 001
title: Хлебозавод — план реализации 1a: продажи, планирование, рецептуры
kind: plan
status: approved
author: engineer
created: 2026-06-02
updated: 2026-06-02
depends-on:
  - sp-001-bakery-stage1.md
  - sp-001-bakery-stage1-design.md
---

# План реализации — Хлебозавод 1a: продажи, планирование, рецептуры

> **Назначение документа.** Зафиксировать, как Инженер реализует одобренное ТЗ `sp-001-bakery-stage1.md` по под-этапу **1a**. План согласуется с PM до правок в `metadata/`. Архитектуру ТЗ не пересматриваем без отдельного возврата к PM/Analyst.

---

## Как читать этот документ

- **Раздел 1** — краткий состав реализации 1a.
- **Раздел 2** — инженерные решения по разделу 8 ТЗ.
- **Раздел 3** — этапы реализации metadata и промежуточные проверки.
- **Раздел 4** — предварительная последовательность импорта на стенд.
- **Раздел 5** — оценка и технические риски.
- **Раздел 6** — открытые вопросы к PM.
- **Раздел 7** — история статусов плана.

---

## 1. Контекст и состав работы

Реализуется approved-ТЗ `sp-001-bakery-stage1.md`, только под-этап **1a — продажи, планирование, рецептуры**. В составе 17 новых metaobject: 2 enum, 6 catalog, 2 register, 2 records, 2 operation, 1 workflow, 2 data_view; metadata 1b/1c не создаются.

Работа выполняется в `metadata/` по правилам `basys-metadata` и профильных skills для enum/catalog/register/records/operation. Формы списка/редактирования не создаются: используются автоформы BaSYS, `ListFormUid`/`ItemFormUid` остаются пустыми.

---

## 2. Решения по открытым вопросам ТЗ

| № вопроса ТЗ | Выбранный вариант | Обоснование | Риск, если есть |
|---|---|---|---|
| 8.1 Архитектурные вопросы | Открытых архитектурных вопросов нет | ТЗ и design имеют `status: approved`; C1/C2 закрыты в ТЗ и ADR от 2026-06-02. | нет |
| 8.2 Рецептуры | `catalog/recipe` + `register/recipe_component` | Соответствует ТЗ и ADR: у `catalog` `useDetailsTables = false`, поэтому состав рецептуры хранится отдельным регистром. | UX автоформы менее удобен, но это принятое ограничение 1a. |
| 8.3 Стартовые значения enum | Ручной ввод при приёмке | ТЗ прямо фиксирует: отдельный fill-workflow не входит в 1a. В отчёте Инженера будет инструкция PM по ручному заведению значений. | PM должен внести значения до функциональной проверки C. |

Дополнительное инженерное решение: `menu/all_metadata_objects` уже содержит `autoFill = true` для catalog, enum, register, records, operation, data_view и workflow, поэтому ручные пункты меню не планируются. После реализации будет проверено, что новые объекты попадают в авторазделы.

---

## 3. Декомпозиция на этапы

### Этап 1. Базовые reference-типы

- **Что делается:** создать `enum/nomenclature_type`, `enum/counterparty_role`, затем независимые справочники `unit`, `company`, `warehouse`.
- **Файлы:**
  - `metadata/enum/nomenclature_type/enum.nomenclature_type.json`
  - `metadata/enum/counterparty_role/enum.counterparty_role.json`
  - `metadata/catalog/unit/catalog.unit.json`
  - `metadata/catalog/company/catalog.company.json`
  - `metadata/catalog/warehouse/catalog.warehouse.json`
  - локальные добавления в `metadata/system/dataTypes.json` только для новых reference-kind типов текущей сессии.
- **Промежуточная проверка:** стандартные колонки взяты из `metadata/system/kinds/`; `Memo` заполнены; `Name` латиница `snake_case`; enum не содержит форм/табличных частей.

### Этап 2. Справочники со ссылками и ручные регистры

- **Что делается:** создать `counterparty`, `nomenclature`, `recipe`, `recipe_component`, `price_list` с зависимостями на уже созданные типы.
- **Файлы:**
  - `metadata/catalog/counterparty/catalog.counterparty.json`
  - `metadata/catalog/nomenclature/catalog.nomenclature.json`
  - `metadata/catalog/recipe/catalog.recipe.json`
  - `metadata/register/recipe_component/register.recipe_component.json`
  - `metadata/register/price_list/register.price_list.json`
  - локальные добавления в `metadata/system/dataTypes.json` для новых catalog reference-типов.
- **Промежуточная проверка:** у `recipe.output_item` нет уникальности; `recipe_component` является register, а не detail table; ссылки используют UID из локального `dataTypes.json`; регистры не добавляются в `dataTypes.json`.

### Этап 3. Регистры записей и операции проведения

- **Что делается:** создать `records/customer_demand`, `records/production_plan`, затем операции `customer_order` и `production_task` с табличными частями и recordsSettings.
- **Файлы:**
  - `metadata/records/customer_demand/records.customer_demand.json`
  - `metadata/records/production_plan/records.production_plan.json`
  - `metadata/operation/customer_order/operation.customer_order.json`
  - `metadata/operation/production_task/operation.production_task.json`
  - command scripts рядом с `production_task`:
    - `operation.production_task.command.fill_from_orders.bjs`
    - `operation.production_task.command.calc_requirement.bjs`
  - локальные добавления в `metadata/system/dataTypes.json` для новых operation reference-типов.
- **Промежуточная проверка:** табличные части операций начинаются с `id`, `object_uid`, `row_number`; `customer_order` пишет `products` в `customer_demand`; `production_task` пишет `plan_products` в `production_plan`; команды объявлены в JSON и имеют отдельные `.bjs`.

### Этап 4. Workflow разузлования

- **Что делается:** создать `workflow/requirement_calc` и JS-шаги для загрузки сохранённого задания, проверки входа, загрузки рецептур, рекурсивного разузлования и возврата результата.
- **Файлы:**
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.json`
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.step.load_task.bjs`
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.step.validate_input.bjs`
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.step.load_recipes.bjs`
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.step.explode_bom.bjs`
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.step.return_result.bjs`, если по схеме workflow нужен отдельный завершающий шаг; если результат возвращается из `explode_bom`, это будет явно отражено в отчёте.
- **Промежуточная проверка:** workflow принимает только скалярный `task_number`; не пишет регистры и не создаёт объекты; ошибки 0/>1 активной рецептуры, `output_qty <= 0`, циклы и компонент типа `product` обрабатываются понятными сообщениями.

### Этап 5. Панели данных и меню

- **Что делается:** создать `data_view/customer_orders_report` и `data_view/raw_requirement_report`; проверить, что `menu/all_metadata_objects` с `autoFill = true` покрывает новые объекты.
- **Файлы:**
  - `metadata/data_view/customer_orders_report/data_view.customer_orders_report.json`
  - `metadata/data_view/customer_orders_report/data_view.customer_orders_report.data_source.rows.bjs`
  - `metadata/data_view/raw_requirement_report/data_view.raw_requirement_report.json`
  - `metadata/data_view/raw_requirement_report/data_view.raw_requirement_report.data_source.raw_rows.bjs`
  - `metadata/data_view/raw_requirement_report/data_view.raw_requirement_report.data_source.semi_rows.bjs`
  - `metadata/menu/all_metadata_objects/menu.all_metadata_objects.json` — только если проверка покажет, что autoFill недостаточен; сейчас правка меню не планируется.
- **Промежуточная проверка:** `customer_orders_report` читает `records/customer_demand`; `raw_requirement_report` читает сохранённые таблицы потребности `production_task`; для ссылочных полей в отчётах выводятся человекочитаемые display-значения.

### Этап 6. Финальная самопроверка и отчёт

- **Что делается:** выполнить чек-лист A/B из ТЗ, проверить UID/ссылки/имена файлов `.bjs`, подготовить import instruction и краткий отчёт PM.
- **Файлы:** новые файлы не планируются, кроме возможного `sp-001-bakery-stage1-import-notes.md`, если по фактической последовательности импорта потребуется companion-файл.
- **Промежуточная проверка:** все пункты A/B из ТЗ закрыты или явно отмечены как требующие стендовой проверки PM; группа C остаётся для PM на стенде.

---

## 4. Импорт на стенд

Случай нетривиальный: есть перекрёстные ссылки между видами, а импорт BaSYS идёт по алфавиту без графа зависимостей. Поэтому весь `metadata/` одним проходом импортировать нельзя до регистрации зависимостей.

Предварительная последовательность импорта:

1. `enum/nomenclature_type`, `enum/counterparty_role`.
2. `catalog/unit`, `catalog/company`, `catalog/warehouse`.
3. `catalog/counterparty`, `catalog/nomenclature`.
4. `catalog/recipe`.
5. `register/recipe_component`, `register/price_list`.
6. `records/customer_demand`, `records/production_plan`.
7. `workflow/requirement_calc`.
8. `operation/customer_order`, `operation/production_task`.
9. `data_view/customer_orders_report`, `data_view/raw_requirement_report`.
10. `menu/all_metadata_objects` импортировать не требуется, если autoFill на стенде уже активен; если меню отличается от локального — проверить отдельно.

В итоговом отчёте Инженера будет короткая инструкция импорта. Если реализация подтвердит необходимость более подробной последовательности или pre-clean на стенде, будет создан companion-файл `project/docs/specs/sp-001-bakery-stage1-import-notes.md`.

---

## 5. Оценка и риски

| Метрика | Оценка |
|---|---|
| Общий объём работы | 17 metaobject + ориентировочно 7–8 `.bjs`-файлов; 6 этапов реализации. |
| Самый рискованный этап | Workflow `requirement_calc` и команда `calc_requirement`: сохранение текущего документа, запуск workflow, возврат DataTable и загрузка ссылочных полей с `*_display`. |
| Технические риски | Рекурсивное разузлование и детект циклов; QueryBuilder по табличным частям операций; корректный `runWorkflow`/получение результата в команде; порядок импорта из-за ссылок между видами; ручной ввод enum-значений перед приёмкой. |

Снижение рисков:

- workflow использует только скалярный параметр `task_number`;
- строки потребности загружаются в форму с парами `field` + `field_display`;
- `recipe_component` вынесен в register, без табличных частей у catalog;
- import instruction будет разбита на batches по зависимостям.

---

## 6. Открытые вопросы к PM

Открытых вопросов к PM нет. План не расширяет scope ТЗ; стартовые значения перечислений остаются ручным вводом при приёмке 1a.

---

## 7. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-02 | review | Создано Инженером на основе approved-ТЗ `sp-001-bakery-stage1.md`; передано PM на ревью. |
| 2026-06-02 | approved | PM одобрил план; Инженер приступает к правкам в `metadata/`. |
