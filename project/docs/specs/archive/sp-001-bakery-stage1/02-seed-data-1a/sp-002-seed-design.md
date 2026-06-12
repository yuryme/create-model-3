---
sp-id: 002
title: Быстрая загрузка тестовых данных 1a
kind: design
status: approved
author: analyst
created: 2026-06-02
updated: 2026-06-02
depends-on:
  - sp-001-bakery-stage1.md
---

# Методика решения — Быстрая загрузка тестовых данных 1a

> **Назначение документа.** Зафиксировать простой подтверждённый способ быстро заполнить текущую часть 1a тестовыми справочными данными и документами. Методика не проектирует будущие части 1b/1c, оркестратор, очистку стенда, обновление документов или автоматический запуск расчёта потребности.

---

## 1. Задача

Нужно быстро получить на стенде связный тестовый набор 1a:

1. Классификаторы и справочники, на которые ссылаются документы.
2. Рецептуры и цены, достаточные для ручной проверки расчёта потребности и отчётов.
3. Тестовые документы:
   - `operation/customer_order` — заявки клиентов с табличной частью `products`;
   - `operation/production_task` — производственные задания с табличной частью `plan_products`.

Цель — ускорить проверку стенда и не вводить каждый раз исходные данные руками.

Это не механизм миграции реальных данных и не полноценный генератор случайных данных.

## 2. Короткое решение

Сделать два простых workflow без оркестратора:

| Действие | Вид | Name | Назначение |
|---|---|---|---|
| CREATE | workflow | `seed_refs_1a` | Создать тестовые enum/catalog/register-данные 1a. |
| CREATE | workflow | `seed_docs_1a` | Создать тестовые документы 1a и провести их через `CreateRecords = true`. |

Запуск ручной, в таком порядке:

```text
1. seed_refs_1a
2. seed_docs_1a
```

Оба workflow строятся как последовательность `java_script`-шагов подготовки `DataTable` и `data_object_loader`-шагов загрузки. Это не «workflow, запускающий workflow»; пользователь или инженер запускает два процесса отдельно.

## 3. Подтверждение возможностей BaSYS

В методике используются только подтверждённые возможности:

| Возможность / допущение | Доказательство |
|---|---|
| Workflow состоит из последовательных шагов и может автоматизировать внутреннюю бизнес-логику | `basys-docs/ru/workflows/introduction.md`, строки 1–7 |
| `java_script`-шаг возвращает результат для следующих шагов | `basys-docs/ru/workflows/scriptStep.md`, строки 30–56 |
| `java_script` может подготовить `DataTable` через `createTable` | `basys-docs/ru/workflows/scriptStep.md`, строки 112–130 |
| `data_object_loader` создаёт или обновляет DataObject из коллекции | `basys-docs/ru/workflows/dataObjectLoaderStep.md`, строки 1–37 |
| `SaveRegime = 1` означает Create-only | `basys-docs/ru/workflows/dataObjectLoaderStep.md`, строки 21–30 |
| `SearchBy` может быть одним полем или несколькими полями через запятую | `basys-docs/ru/workflows/dataObjectLoaderStep.md`, строки 31–49 |
| Loader поддерживает ссылочные поля с поиском связанного объекта по указанному `SearchBy` | `basys-docs/ru/workflows/dataObjectLoaderStep.md`, строки 101–115 |
| Loader поддерживает табличные части через `TableMapping` | `basys-docs/ru/workflows/dataObjectLoaderStep.md`, строки 131–148 и пример строк 279–334 |
| Loader поддерживает `CreateRecords` | `basys-docs/ru/workflows/dataObjectLoaderStep.md`, строки 67–70 |
| Несколько `data_object_loader` в одном workflow встречаются в рабочем reference | `reference/metadata/workflow/create_task/workflow.create_task.json`, два loader-шагa `operation_create` и `save_history` |
| Operation + `TableMapping` + `CreateRecords = true` есть в рабочем reference | `reference/metadata/workflow/load_table_parts/workflow.load_table_parts.json` |
| `operation.number` не используется как seed-ключ: это `Int32` primary key, а не строковый бизнес-номер | `metadata/operation/customer_order/operation.customer_order.json`, колонка `number`: `dataTypeUid = b327f82a...`, `primaryKey = true`; аналогично `metadata/operation/production_task/operation.production_task.json` |

Неподтверждённые возможности не используются: запуск workflow из workflow, серверный вызов клиентских команд формы, автоматическая очистка стенда, задание строкового номера операции.

## 4. Граница scope

### Входит

- Один workflow для справочных тестовых данных: `seed_refs_1a`.
- Один workflow для тестовых документов: `seed_docs_1a`.
- Загрузка:
  - `enum/nomenclature_type`;
  - `enum/counterparty_role`;
  - `catalog/unit`;
  - `catalog/company`;
  - `catalog/warehouse`;
  - `catalog/counterparty`;
  - `catalog/nomenclature`;
  - `catalog/recipe`;
  - `register/recipe_component`;
  - `register/price_list`;
  - `operation/customer_order`;
  - `operation/production_task`.
- Для операций — только `SaveRegime = 1` / Create.
- Для операций — `CreateRecords = true`, чтобы штатные `recordsSettings` создали движения:
  - `customer_order` → `records/customer_demand`;
  - `production_task` → `records/production_plan`.
- Seed-маркер тестового набора хранится в строковых комментариях (`comment`), где такая колонка есть.

### Не входит

- Запуск `workflow/requirement_calc`.
- Заполнение табличных частей `semi_requirements` и `raw_requirements` в `production_task`.
- Запуск команд формы `fill_from_orders` и `calc_requirement`.
- Изменение существующего `operation/production_task` или его команд.
- Оркестратор, запускающий другие workflow.
- Pre-clean, soft-delete, удаление тестовых данных.
- Обновление или перепроведение уже созданных операций.
- Расширение на 1b/1c.

Если для проверки нужен расчёт потребности, PM после создания `production_task` запускает существующую команду/процесс текущим ручным сценарием стенда. sp-002 v1 не автоматизирует этот шаг.

## 5. Стратегия повторного запуска

### 5.1. Справочные данные

Для enum/catalog/register используется `SaveRegime = 1` и `SearchBy` по устойчивому ключу. Повторный запуск не должен создавать дубликаты; уже существующие строки будут найдены по ключу и пропущены/зафиксированы loader как существующие.

### 5.2. Операции

Для операций `customer_order` и `production_task` идемпотентность в v1 **не заявляется**.

Правила:

- `number` не маппить: это `Int32` primary key операции, его задаёт сервер BaSYS.
- В loader операций ставить `SearchBy = ""`.
- `SaveRegime = 1`.
- Повторный запуск `seed_docs_1a` создаёт новые документы.
- Отличать тестовые документы визуально по `comment`, например `SEED-1A 2026-06-02`.
- Если тестовые документы мешают на стенде, PM удаляет/помечает их вручную штатным UI или использует новый чистый стенд. Автоматическая очистка вне scope.

Это сознательное ограничение v1: оно дешевле и безопаснее, чем проектировать неподтверждённый бизнес-ключ для операций.

## 6. Ключи поиска и порядок загрузки

`SearchBy` у loader — статическое имя поля или список полей. Условные варианты «code, если есть, иначе title» не используются.

### 6.1. Порядок `seed_refs_1a`

| Шаг | Метаобъект | SaveRegime | SearchBy | Комментарий |
|---|---|---:|---|---|
| 1 | `enum/nomenclature_type` | 1 | `name` | Значения: продукция, полуфабрикат, сырьё. |
| 2 | `enum/counterparty_role` | 1 | `name` | Значения: клиент, поставщик, оба. |
| 3 | `catalog/unit` | 1 | `code` | `code` уникален и обязателен. |
| 4 | `catalog/company` | 1 | `title` | Для v1 достаточно одной организации. |
| 5 | `catalog/warehouse` | 1 | `code` | `code` уникален; в тестовых строках обязателен. |
| 6 | `catalog/counterparty` | 1 | `title` | Клиенты/поставщики; роль ищется по enum `name`. |
| 7 | `catalog/nomenclature` | 1 | `code` | `code` уникален; тип ищется по enum `name`, unit по `code`. |
| 8 | `catalog/recipe` | 1 | `title` | Выходная номенклатура ищется по `code`. |
| 9 | `register/recipe_component` | 1 | `recipe,row_number` | Рецепт ищется по `title`, компонент — по `code`. |
| 10 | `register/price_list` | 1 | `product,valid_from` | Продукт ищется по `code`. |

Для объектов без уникального индекса по выбранному `SearchBy` это остаётся бизнес-соглашением тестового набора. В ТЗ нужно выбрать такие тестовые значения, чтобы ключи были уникальны внутри стенда.

### 6.2. Порядок `seed_docs_1a`

| Шаг | Метаобъект | SaveRegime | SearchBy | CreateRecords | Комментарий |
|---|---|---:|---|---:|---|
| 1 | `operation/customer_order` | 1 | пусто | true | Номер не маппится. |
| 2 | `operation/production_task` | 1 | пусто | true | Номер не маппится. |

## 7. Правила маппинга справочных данных

### 7.1. `enum/nomenclature_type`

Маппить стандартные строки:

| name | code | title |
|---|---|---|
| `product` | `001` | Продукция |
| `semi_product` | `002` | Полуфабрикат |
| `raw` | `003` | Сырьё |

### 7.2. `enum/counterparty_role`

| name | code | title |
|---|---|---|
| `customer` | `001` | Клиент |
| `supplier` | `002` | Поставщик |
| `both` | `003` | Клиент и поставщик |

### 7.3. Catalog/register-данные

Точный набор строк фиксируется в ТЗ. Минимальный состав:

- `unit`: кг, шт.
- `company`: одна тестовая организация.
- `warehouse`: один склад выпуска, при необходимости один склад сырья.
- `counterparty`: два клиента.
- `nomenclature`: 2–3 продукции, 1 полуфабрикат, 3–5 сырьевых позиций.
- `recipe`: минимум одна многоуровневая цепочка `продукция → полуфабрикат → сырьё`.
- `recipe_component`: строки состава для рецептов.
- `price_list`: цены для тестовой продукции.

Для ссылочных полей использовать один статический ключ поиска:

| Ссылка | SearchBy в mapping-строке |
|---|---|
| enum `nomenclature_type` | `name` |
| enum `counterparty_role` | `name` |
| `catalog/unit` | `code` |
| `catalog/warehouse` | `code` |
| `catalog/nomenclature` | `code` |
| `catalog/company` | `title` |
| `catalog/counterparty` | `title` |
| `catalog/recipe` | `title` |

## 8. Правила создания документов

### 8.1. Общие правила

- Все документы создаются только через `data_object_loader`.
- Для обоих loader-шагов операций:
  - `SaveRegime = 1`;
  - `SearchBy = ""`;
  - `CreateRecords = true`;
  - `TableMapping` используется для табличных частей;
  - `number` не маппится.
- Seed-маркер пишется в `comment`, например `SEED-1A: набор 001`.

### 8.2. `customer_order`

Шапка создаётся по колонкам:

| Поле | Источник значения |
|---|---|
| `date` | дата документа |
| `is_deleted` | `false` |
| `is_files` | `false` |
| `create_records` | `true` |
| `company` | поиск `catalog/company` по `title` |
| `customer` | поиск `catalog/counterparty` по `title` |
| `delivery_date` | дата поставки |
| `comment` | seed-маркер тестового набора |

Не маппить `number`.

Табличная часть `products` заполняется по колонкам:

| Поле | Источник значения |
|---|---|
| `product` | поиск `catalog/nomenclature` по `code` |
| `quantity` | тестовое количество |
| `comment` | короткий комментарий строки |

### 8.3. `production_task`

Шапка создаётся по колонкам:

| Поле | Источник значения |
|---|---|
| `date` | дата документа |
| `is_deleted` | `false` |
| `is_files` | `false` |
| `create_records` | `true` |
| `company` | поиск `catalog/company` по `title` |
| `plan_date` | дата выпуска |
| `warehouse` | поиск `catalog/warehouse` по `code` |
| `comment` | seed-маркер тестового набора |

Не маппить `number`.

Табличная часть `plan_products` заполняется по колонкам:

| Поле | Источник значения |
|---|---|
| `product` | поиск `catalog/nomenclature` по `code` |
| `ordered_qty` | тестовое заказанное количество |
| `planned_qty` | тестовое плановое количество |
| `comment` | короткий комментарий строки |

Не маппить `shortage_qty`, потому что в текущей metadata это формула `$r.ordered_qty - $r.planned_qty`.

Табличные части `semi_requirements` и `raw_requirements` не заполняются в sp-002 v1.

## 9. Тестовый набор данных

Точный набор строк фиксируется в ТЗ после сверки с фактическими metadata. Методически достаточно малого статичного набора:

- 1 организация;
- 2 клиента;
- 2 единицы измерения;
- 1–2 склада;
- 2–3 позиции продукции;
- 1 полуфабрикат;
- 3–5 сырьевых позиций;
- 2–3 рецептуры, включая одну многоуровневую;
- 2 заявки клиентов;
- 1 производственное задание на ту же дату выпуска.

Случайная генерация не нужна. Для быстрой проверки лучше фиксированные читаемые строки.

## 10. Приёмка методики

Методика считается достаточной, если PM согласен с ограничениями:

1. В v1 загружаем и справочные тестовые данные, и документы 1a.
2. Нет оркестратора и автоматического вызова `requirement_calc`.
3. Операции создаём только в `SaveRegime = 1`.
4. `number` операций не задаём и не используем как ключ.
5. Документы не идемпотентны: повторный запуск создаёт новые документы.
6. Справочные данные идемпотентны настолько, насколько корректно выбран `SearchBy` и уникальны тестовые ключи.
7. Старые тестовые документы не обновляем и не чистим.

После утверждения этой методики Аналитик пишет короткое ТЗ `sp-002-seed-data-1a.md` со статусом `review`: структура двух workflow, имена шагов, поля маппинга, минимальный тестовый набор и checklist приёмки.

## 11. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-02 | review | Полностью переписано под указание PM: быстрая загрузка справочников и документов 1a; операции только Create, без будущих объектов и усложнений. |
| 2026-06-02 | review | Исправлено по ревью: `number` операций не маппится, `SearchBy` операций пустой, документы признаны неидемпотентными; для ссылок выбран один статический ключ поиска. |
| 2026-06-02 | approved | Повторное ревью PM-chat: K1/M1 закрыты, доказательства §3 проверены (вкл. reference `create_task`), scope согласован PM. Перенос в `approved`. Заметки на этап ТЗ: проверить композитный `SearchBy` со ссылочными полями и уникальность неуникальных `title`-ключей. |
