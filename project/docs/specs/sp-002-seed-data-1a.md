---
sp-id: 002
title: Быстрая загрузка тестовых данных 1a
status: approved
author: analyst
created: 2026-06-02
updated: 2026-06-02
depends-on:
  - sp-001-bakery-stage1.md
  - sp-002-seed-design.md
---

# ТЗ 002 — Быстрая загрузка тестовых данных 1a

> **Назначение документа.** ТЗ для Инженера на создание двух workflow, которые быстро загружают тестовые данные текущей части 1a: справочные строки и документы. Значения строк, не зафиксированные в утверждённых документах, не выдумывать: до реализации PM должен предоставить их отдельной таблицей или подтвердить конкретный набор в этом ТЗ.

---

## Как читать этот документ

- Архитектурное обоснование — `sp-002-seed-design.md`, статус `approved`.
- Разделы 1–2 фиксируют контекст и границы.
- Раздел 3 — сводка изменений metadata.
- Раздел 4 — спецификация workflow.
- Раздел 5 — контракт входных строк тестового набора.
- Раздел 6 — правила реализации и порядок импорта.
- Раздел 7 — checklist приёмки.
- Разделы 8–9 — открытые вопросы и история статусов.

Имена новых объектов и шагов — латиница `snake_case`, ≤30 символов. UID видов, шагов workflow и типов данных брать только из `metadata/system/`; UID существующих метаобъектов и колонок — только из текущих файлов `metadata/`, не из `reference/`.

---

## 1. Контекст

Часть 1a хлебозавода уже содержит справочники, регистры, документы, проведение и отчёты. Для проверки стенда нужны повторяемые исходные данные: перечисления, справочники, рецептуры, цены, заявки клиентов и производственное задание.

Ручной ввод этих данных занимает время и создаёт риск расхождения между проверками. Поэтому создаются два простых workflow: один загружает справочные данные, второй создаёт документы. Workflow не являются универсальным генератором и не очищают стенд.

Критическое ограничение: `operation.number` — целочисленный primary key операции, его нельзя использовать как строковый seed-ключ. Для операций в этом ТЗ нет идемпотентности: повторный запуск создаёт новые документы.

## 2. Состав задачи

### В составе

- Создать workflow `seed_refs_1a` для загрузки данных в существующие enum/catalog/register 1a.
- Создать workflow `seed_docs_1a` для создания документов `customer_order` и `production_task`.
- В `seed_docs_1a` проводить операции через `CreateRecords = true`.
- Не маппить `number` операций.
- Хранить seed-маркер в `comment` там, где колонка существует.
- Использовать только строки данных, явно перечисленные в этом ТЗ или отдельно предоставленные PM.

### НЕ в составе

- Создание или изменение справочников, регистров, документов 1a: они уже реализованы по `sp-001-bakery-stage1.md`.
- Запуск `workflow/requirement_calc`.
- Заполнение `production_task.semi_requirements` и `production_task.raw_requirements`.
- Запуск или изменение команд `fill_from_orders` и `calc_requirement`.
- Оркестратор, запускающий другие workflow.
- Pre-clean, soft-delete, удаление тестовых данных.
- Update/CreateUpdate для операций.
- Расширение на 1b/1c.

---

## 3. Сводка изменений в метаданных

| Действие | Вид | Name | Title | Назначение |
|---|---|---|---|---|
| CREATE | workflow | `seed_refs_1a` | Загрузка тестовых справочных данных 1a | Создаёт тестовые enum/catalog/register-строки для проверки 1a. |
| CREATE | workflow | `seed_docs_1a` | Загрузка тестовых документов 1a | Создаёт заявки клиентов и производственное задание с табличными частями и проведением. |

Меню, формы, существующие операции, отчёты и команды не изменяются.

`seed_refs_1a` не создаётся через стандартный skill `create-fill-workflow`: это multi-target workflow, который загружает несколько enum/catalog/register в одном процессе по approved-методике. Поэтому обязательный title-prefix `01.NNN` для одноцелевых fill-workflow из `create-fill-workflow` здесь не применяется.

---

## 4. Детали по метаобъектам

### 4.1. CREATE: `workflow/seed_refs_1a` — Загрузка тестовых справочных данных 1a

#### Свойства workflow

| Поле | Значение | Обязательно |
|---|---|---|
| `Name` | `seed_refs_1a` | да |
| `Title` | Загрузка тестовых справочных данных 1a | да |
| `Memo` | Создаёт тестовые значения enum, catalog и register для проверки хлебозавода 1a. | да |
| `IsActive` | `true` | да |
| `Version` | `1` | да |

Title намеренно без префикса `01.NNN`: см. исключение в разделе 3. `seed_refs_1a` — multi-target seed workflow, а не одноцелевой fill-workflow по skill `create-fill-workflow`.

#### Назначение

Создать минимальный набор справочных данных, необходимых для работы документов 1a и ручной проверки расчёта потребности.

Workflow не должен создавать операции и не должен проводить документы.

#### Общие правила loader-шагов

| Правило | Значение |
|---|---|
| `KindName` загрузчика | `data_object_loader` |
| `SaveRegime` | `1` / Create |
| `CreateRecords` | `false` |
| `SourcePath` | имя предшествующего `java_script`-шага с DataTable |
| `Condition` | пусто |
| `TableMapping` | пусто |

Если при повторном запуске Create-режим фиксирует уже существующие строки как ошибки/пропуски, это не считается дефектом, если дубликаты не созданы и workflow дошёл до загрузки остальных строк. Если loader в текущей версии BaSYS создаёт дубликаты несмотря на `SearchBy`, Инженер останавливает реализацию и возвращает вопрос, а не придумывает механизм удаления.

#### Шаги workflow

| № | Step `Name` | `KindName` | Назначение | Target | `SearchBy` |
|---:|---|---|---|---|---|
| 1 | `data_nom_type` | `java_script` | Подготовить значения типа номенклатуры. | — | — |
| 2 | `load_nom_type` | `data_object_loader` | Загрузить `enum/nomenclature_type`. | `enum/nomenclature_type` | `name` |
| 3 | `data_cp_role` | `java_script` | Подготовить роли контрагентов. | — | — |
| 4 | `load_cp_role` | `data_object_loader` | Загрузить `enum/counterparty_role`. | `enum/counterparty_role` | `name` |
| 5 | `data_unit` | `java_script` | Подготовить единицы измерения из таблицы PM. | — | — |
| 6 | `load_unit` | `data_object_loader` | Загрузить `catalog/unit`. | `catalog/unit` | `code` |
| 7 | `data_company` | `java_script` | Подготовить организации из таблицы PM. | — | — |
| 8 | `load_company` | `data_object_loader` | Загрузить `catalog/company`. | `catalog/company` | `title` |
| 9 | `data_warehouse` | `java_script` | Подготовить склады из таблицы PM. | — | — |
| 10 | `load_warehouse` | `data_object_loader` | Загрузить `catalog/warehouse`. | `catalog/warehouse` | `code` |
| 11 | `data_counterparty` | `java_script` | Подготовить контрагентов из таблицы PM. | — | — |
| 12 | `load_counterparty` | `data_object_loader` | Загрузить `catalog/counterparty`. | `catalog/counterparty` | `title` |
| 13 | `data_nomenclature` | `java_script` | Подготовить номенклатуру из таблицы PM. | — | — |
| 14 | `load_nomenclature` | `data_object_loader` | Загрузить `catalog/nomenclature`. | `catalog/nomenclature` | `code` |
| 15 | `data_recipe` | `java_script` | Подготовить шапки рецептур из таблицы PM. | — | — |
| 16 | `load_recipe` | `data_object_loader` | Загрузить `catalog/recipe`. | `catalog/recipe` | `title` |
| 17 | `data_recipe_comp` | `java_script` | Подготовить компоненты рецептур из таблицы PM. | — | — |
| 18 | `load_recipe_comp` | `data_object_loader` | Загрузить `register/recipe_component`. | `register/recipe_component` | `recipe,row_number` |
| 19 | `data_price_list` | `java_script` | Подготовить цены из таблицы PM. | — | — |
| 20 | `load_price_list` | `data_object_loader` | Загрузить `register/price_list`. | `register/price_list` | `product,valid_from` |

Шаги выполняются последовательно через `previousStepUid` в указанном порядке.

#### Маппинг `enum/nomenclature_type`

Источник строк подтверждён в `sp-001-bakery-stage1.md`, раздел 4.1.

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `name` | `name` | String | пусто | да |
| `code` | `code` | String | пусто | да |
| `title` | `title` | String | пусто | да |

Строки:

| name | title |
|---|---|
| `product` | Продукция |
| `semi_product` | Полуфабрикат |
| `raw` | Сырьё |

Коды `code` предоставляет или утверждает PM. Инженер не генерирует их без отдельного подтверждения.

#### Маппинг `enum/counterparty_role`

Источник строк подтверждён в `sp-001-bakery-stage1.md`, раздел 4.2.

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `name` | `name` | String | пусто | да |
| `code` | `code` | String | пусто | да |
| `title` | `title` | String | пусто | да |

Строки:

| name | title |
|---|---|
| `customer` | Клиент |
| `supplier` | Поставщик |
| `both` | Клиент и поставщик |

Коды `code` предоставляет или утверждает PM. Инженер не генерирует их без отдельного подтверждения.

#### Маппинг `catalog/unit`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `title` | `title` | String | пусто | да |
| `code` | `code` | String | пусто | да |
| `full_title` | `full_title` | String | пусто | нет |

Точные строки единиц измерения PM должен предоставить до реализации. Из текущих документов подтверждено только назначение колонок и примеры формата (`кг`, `шт`, `л`) в `sp-001-bakery-stage1.md`, раздел 4.3; это не готовый перечень seed-строк.

#### Маппинг `catalog/company`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `title` | `title` | String | пусто | да |
| `inn` | `inn` | String | пусто | нет |
| `legal_name` | `legal_name` | String | пусто | нет |

Точную строку организации PM должен предоставить до реализации.

#### Маппинг `catalog/warehouse`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `title` | `title` | String | пусто | да |
| `code` | `code` | String | пусто | да для seed |
| `is_raw` | `is_raw` | Boolean | пусто | нет |
| `is_finished_goods` | `is_finished_goods` | Boolean | пусто | нет |

Точные строки складов PM должен предоставить до реализации. Для seed `code` обязателен, потому что по нему ищется склад в `production_task`.

#### Маппинг `catalog/counterparty`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `title` | `title` | String | пусто | да |
| `role` | `role` | `enum/counterparty_role` | `name` | да |
| `inn` | `inn` | String | пусто | нет |
| `phone` | `phone` | String | пусто | нет |
| `email` | `email` | String | пусто | нет |
| `address` | `address` | String | пусто | нет |

Точные строки контрагентов PM должен предоставить до реализации.

#### Маппинг `catalog/nomenclature`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `title` | `title` | String | пусто | да |
| `type` | `type` | `enum/nomenclature_type` | `name` | да |
| `unit` | `unit` | `catalog/unit` | `code` | да |
| `code` | `code` | String | пусто | да для seed |
| `is_active` | `is_active` | Boolean | пусто | нет, дефолт `true` |

Точные строки номенклатуры PM должен предоставить до реализации. Для seed `code` обязателен, потому что по нему ищутся продукция, полуфабрикаты и сырьё в рецептурах, ценах и документах.

#### Маппинг `catalog/recipe`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `title` | `title` | String | пусто | да |
| `output_item` | `output_item` | `catalog/nomenclature` | `code` | да |
| `output_qty` | `output_qty` | Decimal | пусто | да |
| `is_active` | `is_active` | Boolean | пусто | нет, дефолт `true` |
| `comment` | `comment` | String | пусто | нет |

Точные строки рецептур PM должен предоставить до реализации.

#### Маппинг `register/recipe_component`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `recipe` | `recipe` | `catalog/recipe` | `title` | да |
| `row_number` | `row_number` | Int | пусто | да для seed |
| `component` | `component` | `catalog/nomenclature` | `code` | да |
| `quantity` | `quantity` | Decimal | пусто | да |
| `comment` | `comment` | String | пусто | нет |

Точные строки компонентов PM должен предоставить до реализации. `SearchBy = recipe,row_number` использует подтверждённую документацией возможность нескольких полей. Если на стенде loader не поддержит композитный поиск со ссылочным полем `recipe`, Инженер должен вернуть вопрос на пересмотр ключа.

#### Маппинг `register/price_list`

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `product` | `product` | `catalog/nomenclature` | `code` | да |
| `valid_from` | `valid_from` | DateTime | пусто | да |
| `price` | `price` | Decimal | пусто | да |
| `is_active` | `is_active` | Boolean | пусто | нет, дефолт `true` |

Точные строки цен PM должен предоставить до реализации. `SearchBy = product,valid_from`. Если композитный поиск со ссылочным полем `product` не работает на стенде, Инженер должен вернуть вопрос на пересмотр ключа.

### 4.2. CREATE: `workflow/seed_docs_1a` — Загрузка тестовых документов 1a

#### Свойства workflow

| Поле | Значение | Обязательно |
|---|---|---|
| `Name` | `seed_docs_1a` | да |
| `Title` | Загрузка тестовых документов 1a | да |
| `Memo` | Создаёт тестовые заявки клиентов и производственные задания 1a с проведением. | да |
| `IsActive` | `true` | да |
| `Version` | `1` | да |

#### Назначение

Создать тестовые документы на основе данных, загруженных `seed_refs_1a` или уже существующих на стенде.

#### Общие правила loader-шагов операций

| Правило | Значение |
|---|---|
| `KindName` загрузчика | `data_object_loader` |
| `SaveRegime` | `1` / Create |
| `SearchBy` | пусто |
| `CreateRecords` | `true` |
| `number` | не маппить |
| `SourcePath` | имя `java_script`-шага шапок |
| `Condition` | пусто |

Повторный запуск `seed_docs_1a` создаёт новые документы. Это ожидаемое поведение v1.

#### Шаги workflow

| № | Step `Name` | `KindName` | Назначение | Target |
|---:|---|---|---|---|
| 1 | `data_order_head` | `java_script` | Подготовить шапки заявок клиентов из таблицы PM. | — |
| 2 | `data_order_rows` | `java_script` | Подготовить строки `customer_order.products` из таблицы PM. | — |
| 3 | `load_customer_order` | `data_object_loader` | Создать заявки клиентов с табличной частью и проведением. | `operation/customer_order` |
| 4 | `data_task_head` | `java_script` | Подготовить шапки производственных заданий из таблицы PM. | — |
| 5 | `data_task_rows` | `java_script` | Подготовить строки `production_task.plan_products` из таблицы PM. | — |
| 6 | `load_production_task` | `data_object_loader` | Создать производственные задания с табличной частью и проведением. | `operation/production_task` |

#### `operation/customer_order`: header mapping

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `date` | `date` | DateTime | пусто | да |
| `is_deleted` | `is_deleted` | Boolean | пусто | нет, `false` |
| `is_files` | `is_files` | Boolean | пусто | нет, `false` |
| `create_records` | `create_records` | Boolean | пусто | да, `true` |
| `company` | `company` | `catalog/company` | `title` | да |
| `customer` | `customer` | `catalog/counterparty` | `title` | да |
| `delivery_date` | `delivery_date` | DateTime | пусто | да |
| `comment` | `comment` | String | пусто | нет |

`number` не маппить.

#### `operation/customer_order`: TableMapping `products`

`TableUid` взять из `metadata/operation/customer_order/operation.customer_order.json`, табличная часть `products`.

`SourcePath` табличной части: фильтр строк `_data.data_order_rows` по техническому полю связи с шапкой. Имя поля связи Инженер выбирает в скриптах, например `source_id`; оно не маппится в metadata.

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `product` | `product` | `catalog/nomenclature` | `code` | да |
| `quantity` | `quantity` | Decimal | пусто | да |
| `comment` | `comment` | String | пусто | нет |

Стандартные поля табличной части `id`, `object_uid`, `row_number` не маппить, если loader корректно заполняет их сам. Если на стенде loader требует `row_number`, Инженер добавляет его в source и mapping только после проверки на текущем BaSYS и фиксирует это в плане.

#### `operation/production_task`: header mapping

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `date` | `date` | DateTime | пусто | да |
| `is_deleted` | `is_deleted` | Boolean | пусто | нет, `false` |
| `is_files` | `is_files` | Boolean | пусто | нет, `false` |
| `create_records` | `create_records` | Boolean | пусто | да, `true` |
| `company` | `company` | `catalog/company` | `title` | да |
| `plan_date` | `plan_date` | DateTime | пусто | да |
| `warehouse` | `warehouse` | `catalog/warehouse` | `code` | да |
| `comment` | `comment` | String | пусто | нет |

`number` не маппить.

#### `operation/production_task`: TableMapping `plan_products`

`TableUid` взять из `metadata/operation/production_task/operation.production_task.json`, табличная часть `plan_products`.

`SourcePath` табличной части: фильтр строк `_data.data_task_rows` по техническому полю связи с шапкой. Имя поля связи Инженер выбирает в скриптах, например `source_id`; оно не маппится в metadata.

| source | destination | DataType | SearchBy в mapping | Обязательно |
|---|---|---|---|---|
| `product` | `product` | `catalog/nomenclature` | `code` | да |
| `ordered_qty` | `ordered_qty` | Decimal | пусто | да |
| `planned_qty` | `planned_qty` | Decimal | пусто | да |
| `comment` | `comment` | String | пусто | нет |

Не маппить `shortage_qty`, потому что в текущей metadata это формула `$r.ordered_qty - $r.planned_qty`.

Табличные части `semi_requirements` и `raw_requirements` не заполнять.

---

## 5. Контракт исходных строк тестового набора

### 5.1. Что уже подтверждено документами

Подтверждены только строки перечислений без точных `code`:

| Объект | Подтверждённые строки |
|---|---|
| `enum/nomenclature_type` | `product` / Продукция; `semi_product` / Полуфабрикат; `raw` / Сырьё |
| `enum/counterparty_role` | `customer` / Клиент; `supplier` / Поставщик; `both` / Клиент и поставщик |

Точные `code` для enum должны быть утверждены PM перед реализацией, потому что в `sp-001` перечислены `name/title`, но не `code`.

### 5.2. Что PM должен предоставить до реализации

Инженер не должен придумывать следующие строки сам. PM должен предоставить таблицу значений или утвердить их отдельным сообщением:

| Набор | Обязательные поля |
|---|---|
| `unit` | `code`, `title`; опционально `full_title` |
| `company` | `title`; опционально `inn`, `legal_name` |
| `warehouse` | `code`, `title`; опционально `is_raw`, `is_finished_goods` |
| `counterparty` | `title`, `role`; опционально `inn`, `phone`, `email`, `address` |
| `nomenclature` | `code`, `title`, `type`, `unit`; опционально `is_active` |
| `recipe` | `title`, `output_item`, `output_qty`; опционально `is_active`, `comment` |
| `recipe_component` | `recipe`, `row_number`, `component`, `quantity`; опционально `comment` |
| `price_list` | `product`, `valid_from`, `price`; опционально `is_active` |
| `customer_order` шапки | `date`, `company`, `customer`, `delivery_date`, `comment` |
| `customer_order.products` | связь с шапкой, `product`, `quantity`, опционально `comment` |
| `production_task` шапки | `date`, `company`, `plan_date`, `warehouse`, `comment` |
| `production_task.plan_products` | связь с шапкой, `product`, `ordered_qty`, `planned_qty`, опционально `comment` |

### 5.3. Требования к уникальности seed-ключей

PM-таблица должна гарантировать, что ключи, используемые в `SearchBy`, уникальны внутри seed-набора и не конфликтуют с уже существующими строками стенда.

| Объект / связь | Ключ | Требование |
|---|---|---|
| `catalog/unit` | `code` | Уникален внутри seed-набора и отсутствует у чужих строк стенда, если строка не должна быть переиспользована. |
| `catalog/warehouse` | `code` | Уникален внутри seed-набора и отсутствует у чужих строк стенда, если строка не должна быть переиспользована. |
| `catalog/nomenclature` | `code` | Уникален внутри seed-набора и отсутствует у чужих строк стенда, если строка не должна быть переиспользована. |
| `catalog/company` | `title` | Уникален внутри seed-набора и не совпадает с чужой организацией стенда. |
| `catalog/counterparty` | `title` | Уникален внутри seed-набора и не совпадает с чужим контрагентом стенда. |
| `catalog/recipe` | `title` | Уникален внутри seed-набора и не совпадает с чужой рецептурой стенда. |
| `register/recipe_component` | `recipe + row_number` | Уникален внутри строк компонентов каждой рецептуры; не должен совпадать с чужой строкой, если строка не должна быть переиспользована. |
| `register/price_list` | `product + valid_from` | Уникален внутри seed-набора; не должен совпадать с чужой ценой, если строка не должна быть переиспользована. |

Если PM не может гарантировать уникальность ключа или на стенде уже есть конфликтующая строка с другим смыслом, реализацию не начинать: ключ поиска или состав seed-строк нужно пересмотреть до передачи задачи Инженеру.

### 5.4. Минимальные бизнес-ограничения набора

- В `customer_order.products.product` и `production_task.plan_products.product` использовать только номенклатуру с типом `product`.
- В `recipe.output_item` использовать номенклатуру с типом `product` или `semi_product`.
- В `recipe_component.component` использовать номенклатуру с типом `semi_product` или `raw`; компонент типа `product` в 1a считается ошибкой рецептуры по `sp-001-bakery-stage1.md`.
- Для ручной проверки разузлования нужен минимум один многоуровневый случай `product → semi_product → raw`.

---

## 6. Порядок реализации

1. Проверить, что `sp-002-seed-design.md` имеет статус `approved`.
2. Получить от PM точные строки из раздела 5.2. Без них реализацию metadata не начинать.
3. Создать `workflow/seed_refs_1a/`:
   - JSON workflow;
   - `.bjs`-файлы `data_*` шагов.
4. Создать `workflow/seed_docs_1a/`:
   - JSON workflow;
   - `.bjs`-файлы `data_*` шагов.
5. Не изменять `system/dataTypes.json`: workflow не reference-kind.
6. Не изменять существующие объекты 1a.
7. В implementation plan отдельно перечислить UID, которые берутся из текущего `metadata/`:
   - UID вида `workflow` и kindUid шагов из `metadata/system/`;
   - UID целевых metaobject;
   - UID табличных частей `products` и `plan_products`;
   - UID DataType для каждой mapping-строки.
8. В отчёте Инженера указать порядок импорта и запуска:
   - импортировать `workflow/seed_refs_1a` и `workflow/seed_docs_1a`;
   - запустить `seed_refs_1a`;
   - затем запустить `seed_docs_1a`.

---

## 7. Checklist приёмки

### A. Импорт metadata

- [ ] Оба workflow импортируются без ошибок.
- [ ] Existing metadata 1a не изменены.
- [ ] В `system/dataTypes.json` нет ручных изменений под workflow.
- [ ] Все `.bjs`-файлы referenced из `Expression` существуют и совпадают по именам.

### B. Запуск `seed_refs_1a`

- [ ] Workflow запускается вручную из UI BaSYS.
- [ ] Созданы/загружены значения `nomenclature_type`.
- [ ] Созданы/загружены значения `counterparty_role`.
- [ ] Загружены строки `unit`, `company`, `warehouse`, `counterparty`, `nomenclature`, `recipe`, `recipe_component`, `price_list` из утверждённой PM таблицы.
- [ ] Ссылки в загруженных объектах корректно разрешены по утверждённым ключам.
- [ ] Повторный запуск не создаёт дубликаты справочных строк; если loader фиксирует ошибки «уже существует», они не приводят к дублям.

### C. Запуск `seed_docs_1a`

- [ ] Workflow запускается после `seed_refs_1a`.
- [ ] Созданы `customer_order` с заполненной табличной частью `products`.
- [ ] Созданы `production_task` с заполненной табличной частью `plan_products`.
- [ ] У операций не маппится строковый `number`; номер присвоен BaSYS.
- [ ] В `comment` виден seed-маркер тестового набора.
- [ ] `customer_order` с `CreateRecords = true` сформировал записи в `records/customer_demand`.
- [ ] `production_task` с `CreateRecords = true` сформировал записи в `records/production_plan`.
- [ ] Повторный запуск `seed_docs_1a` создаёт новые документы; это принятое поведение v1, не дефект.

### D. Ручная бизнес-проверка

- [ ] PM может открыть созданную заявку клиента и увидеть строки продукции.
- [ ] PM может открыть созданное производственное задание и увидеть строки плана.
- [ ] После ручного запуска существующего сценария расчёта потребности по `production_task` результат проверяется отдельно в рамках приёмки 1a; sp-002 не автоматизирует этот запуск.

---

## 8. Открытые вопросы / блокеры реализации

1. **Точные строки тестового набора.** PM должен предоставить или утвердить строки раздела 5.2. Без этого Инженер не должен заполнять `.bjs` произвольными значениями.
2. **Коды enum.** В `sp-001` подтверждены `name/title`, но не `code` для enum. Коды `code` предоставляет или утверждает PM; Инженер не генерирует их без отдельного подтверждения.
3. **Композитный `SearchBy` со ссылочными полями.** Документация подтверждает несколько полей через запятую, но Инженер должен проверить на стенде для `recipe,row_number` и `product,valid_from`; при проблеме вернуть на аналитика.

## 9. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-02 | review | Создано ТЗ по approved-методике `sp-002-seed-design.md`. Включены оба workflow, запрет на выдумывание строк, правило не маппить `number` операций и checklist приёмки. |
| 2026-06-02 | review | Исправлено по ревью: добавлены требования уникальности seed-ключей, явное исключение из `create-fill-workflow` title-prefix и запрет Инженеру генерировать enum `code` без PM. |
| 2026-06-02 | approved | PM утвердил ТЗ; тестовый набор предоставлен и утверждён в `sp-002-seed-data-1a-dataset.md`. Инженер переходит к implementation plan. |
