---
sp-id: 002
title: Тестовый набор данных 1a (вход для seed-workflow)
kind: dataset
status: approved
author: pm-chat
created: 2026-06-02
updated: 2026-06-02
depends-on:
  - sp-002-seed-data-1a.md
  - sp-001-bakery-stage1.md
---

# Тестовый набор данных 1a

> **Назначение.** Конкретные значения строк, которые ТЗ `sp-002-seed-data-1a.md` (§5.2) требует от PM до реализации seed-workflow. Утверждены PM. Engineer использует эти значения при заполнении `.bjs`-скриптов `data_*`-шагов `seed_refs_1a` и `seed_docs_1a`. Структуру метаобъектов engineer не меняет.

---

## 0. Утверждённые коды перечислений (§8 ТЗ)

`enum/nomenclature_type`

| name | code | title |
|---|---|---|
| product | 001 | Продукция |
| semi_product | 002 | Полуфабрикат |
| raw | 003 | Сырьё |

`enum/counterparty_role`

| name | code | title |
|---|---|---|
| customer | 001 | Клиент |
| supplier | 002 | Поставщик |
| both | 003 | Клиент и поставщик |

---

## 1. Справочные данные (`seed_refs_1a`)

### 1.1. `catalog/unit`

| code | title | full_title |
|---|---|---|
| kg | кг | Килограмм |
| pcs | шт | Штука |
| l | л | Литр |

### 1.2. `catalog/company`

| title | inn | legal_name |
|---|---|---|
| Хлебозавод | 7700000001 | ООО «Хлебозавод» |

### 1.3. `catalog/warehouse`

| code | title | is_raw | is_finished_goods |
|---|---|---|---|
| WH-FG | Склад готовой продукции | false | true |
| WH-RAW | Склад сырья | true | false |

### 1.4. `catalog/counterparty`

| title | role | inn |
|---|---|---|
| Кафе Утро | customer | 7711111111 |
| Магазин Колосок | customer | 7722222222 |

### 1.5. `catalog/nomenclature`

| code | title | type | unit |
|---|---|---|---|
| P-001 | Батон нарезной | product | pcs |
| P-002 | Хлеб ржаной | product | pcs |
| S-001 | Тесто пшеничное | semi_product | kg |
| R-001 | Мука пшеничная | raw | kg |
| R-002 | Вода | raw | l |
| R-003 | Дрожжи | raw | kg |
| R-004 | Соль | raw | kg |

### 1.6. `catalog/recipe`

Многоуровневая цепочка: `P-001 → S-001 → сырьё`. `P-002` — одноуровневая.

| title | output_item | output_qty |
|---|---|---|
| Батон нарезной | P-001 | 10 |
| Тесто пшеничное | S-001 | 10 |
| Хлеб ржаной | P-002 | 10 |

### 1.7. `register/recipe_component`

| recipe | row_number | component | quantity |
|---|---|---|---|
| Батон нарезной | 1 | S-001 | 5 |
| Тесто пшеничное | 1 | R-001 | 6 |
| Тесто пшеничное | 2 | R-002 | 3.5 |
| Тесто пшеничное | 3 | R-003 | 0.2 |
| Тесто пшеничное | 4 | R-004 | 0.15 |
| Хлеб ржаной | 1 | R-001 | 4 |
| Хлеб ржаной | 2 | R-002 | 3 |
| Хлеб ржаной | 3 | R-004 | 0.1 |

### 1.8. `register/price_list`

| product | valid_from | price |
|---|---|---|
| P-001 | 2026-06-01 | 35.00 |
| P-002 | 2026-06-01 | 42.00 |

---

## 2. Документы (`seed_docs_1a`)

Связь строк табличных частей с шапками — через служебный ключ (`order_key` / `task_key`). Это поле используется только в скриптах для фильтрации строк по шапке и в metadata не маппится. `comment` несёт seed-маркер `SEED-1A`. `number` операций не маппится (присваивает BaSYS).

### 2.1. `operation/customer_order` — шапки

| order_key | date | company | customer | delivery_date | comment |
|---|---|---|---|---|---|
| ORD-1 | 2026-06-02 | Хлебозавод | Кафе Утро | 2026-06-05 | SEED-1A |
| ORD-2 | 2026-06-02 | Хлебозавод | Магазин Колосок | 2026-06-05 | SEED-1A |

### 2.2. `operation/customer_order.products` — строки

| order_key | product | quantity |
|---|---|---|
| ORD-1 | P-001 | 100 |
| ORD-1 | P-002 | 50 |
| ORD-2 | P-001 | 80 |

### 2.3. `operation/production_task` — шапки

| task_key | date | company | plan_date | warehouse | comment |
|---|---|---|---|---|---|
| TASK-1 | 2026-06-02 | Хлебозавод | 2026-06-05 | WH-FG | SEED-1A |

### 2.4. `operation/production_task.plan_products` — строки

`ordered_qty` — свод спроса заявок на `plan_date` (2026-06-05): по P-001 = 100 + 80 = 180; по P-002 = 50.

| task_key | product | ordered_qty | planned_qty |
|---|---|---|---|
| TASK-1 | P-001 | 180 | 180 |
| TASK-1 | P-002 | 50 | 50 |

---

## 3. Соответствие правилам ТЗ

- §5.4: в `customer_order.products` и `production_task.plan_products` только тип `product` (P-001/P-002); `recipe.output_item` — product/semi_product; компоненты рецептур — semi_product/raw; есть многоуровневая цепочка `P-001 → S-001 → R-00x`.
- §5.3 (уникальность ключей внутри набора): `unit.code`, `warehouse.code`, `nomenclature.code` уникальны; `company.title`, `counterparty.title`, `recipe.title` уникальны; `recipe + row_number` уникальны внутри каждой рецептуры; `product + valid_from` уникальны в прайс-листе.
- Отсутствие конфликта ключей с уже существующими строками стенда PM подтверждает на чистом/тестовом стенде перед запуском (вне этого файла).

## 4. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-02 | approved | Создан тестовый набор данных 1a, утверждён PM как вход §5.2 для seed-workflow. |
