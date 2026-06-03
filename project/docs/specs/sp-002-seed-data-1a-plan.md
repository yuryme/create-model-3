---
sp-id: 002
title: Быстрая загрузка тестовых данных 1a
kind: plan
status: approved
author: engineer
created: 2026-06-02
updated: 2026-06-02
depends-on:
  - sp-002-seed-data-1a.md
  - sp-002-seed-data-1a-dataset.md
  - sp-002-seed-design.md
---

# План реализации — Быстрая загрузка тестовых данных 1a

> **Назначение документа.** Зафиксировать реализацию approved-ТЗ `sp-002-seed-data-1a.md` и approved dataset `sp-002-seed-data-1a-dataset.md` до правок в `metadata/`. План не расширяет scope ТЗ и не содержит готового JS-кода.

---

## Как читать этот документ

- **Раздел 1** — состав работы.
- **Раздел 2** — решения по открытым вопросам ТЗ и доказательства.
- **Раздел 3** — этапы реализации.
- **Раздел 4** — импорт и запуск на стенде.
- **Раздел 5** — оценка и риски.
- **Раздел 6** — открытые вопросы к PM.
- **Раздел 7** — история статусов.

---

## 1. Контекст и состав работы

Реализуется ТЗ `sp-002-seed-data-1a.md` (`status: approved`) и утверждённый набор данных `sp-002-seed-data-1a-dataset.md` (`status: approved`). Нужно создать два новых workflow в `metadata/workflow/`:

| Действие | Вид | Name | Назначение |
|---|---|---|---|
| CREATE | workflow | `seed_refs_1a` | Загрузка enum/catalog/register строк из dataset. |
| CREATE | workflow | `seed_docs_1a` | Создание `customer_order` и `production_task` из dataset с `CreateRecords = true`. |

Существующие объекты 1a (`enum/`, `catalog/`, `register/`, `operation/`, `records/`, `workflow/requirement_calc`, `data_view/`) не изменяются. `system/dataTypes.json` не изменяется, потому что workflow не reference-kind.

---

## 2. Решения по открытым вопросам ТЗ

> **Доказательность (AGENTS.md → Evidence Rule).** Используются только возможности, подтверждённые `basys-docs/ru/` или `reference/metadata/`.

| № вопроса ТЗ | Выбранный вариант | Обоснование / доказательство | Риск, если есть |
|---|---|---|---|
| 8.1 — точные строки тестового набора | Использовать dataset буквально | `sp-002-seed-data-1a-dataset.md` имеет `status: approved`; строки перечислены в §0–§2. | Нет, если PM подтвердил отсутствие конфликтов ключей на стенде перед запуском. |
| 8.2 — коды enum | Использовать коды из dataset | Dataset §0 утверждает коды `001/002/003` для обоих enum. | Нет. |
| 8.3 — composite `SearchBy` со ссылочными полями | Реализовать как в ТЗ: `recipe,row_number` и `product,valid_from`; проверить на стенде | `basys-docs/ru/workflows/dataObjectLoaderStep.md` описывает `SearchBy` как одно или несколько полей через запятую. | Возможен сбой именно на ссылочных полях. При сбое не придумывать обход, а вернуть вопрос PM/Analyst. |

Дополнительные фиксированные решения:

- `seed_refs_1a` не создаётся через skill `create-fill-workflow`, потому что это multi-target workflow. Title-prefix `01.NNN` не применяется согласно approved-ТЗ.
- Операции создаются только через `SaveRegime = 1`, `SearchBy = ""`, `CreateRecords = true`; `number` не маппится.
- Повторный запуск `seed_docs_1a` создаёт новые документы; это ожидаемое поведение v1.

---

## 3. Декомпозиция на этапы

### Этап 1. Pre-flight UID и schema lookup

- **Что делается:** прочитать текущие metadata и выписать UID, которые нужны для workflow JSON.
- **Файлы:** без записи metadata.
- **Проверка:** подготовлена таблица UID для реализации:
  - kind UID `workflow`, `java_script`, `data_object_loader` из `metadata/system/`;
  - target metaObjectUid для enum/catalog/register/operation;
  - DataTypeUid для всех mapping-строк из `dataSettings.dataTypeUid` целевых колонок текущей `metadata/`, не из `reference/`;
  - TableUid из `uid` соответствующих `detailTables`: `customer_order.products` и `production_task.plan_products`.
  - регистр ключей workflow JSON: только camelCase по образцу `metadata/workflow/requirement_calc/workflow.requirement_calc.json` и `basys-docs/ru/workflows/*.md`; PascalCase из `reference/metadata/` не копировать.

### Этап 2. Создание `workflow/seed_refs_1a`

- **Что делается:** создать workflow из 20 последовательных шагов по ТЗ §4.1.
- **Файлы:**
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.json`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_nom_type.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_cp_role.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_unit.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_company.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_warehouse.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_counterparty.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_nomenclature.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_recipe.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_recipe_comp.bjs`;
  - `metadata/workflow/seed_refs_1a/workflow.seed_refs_1a.step.data_price_list.bjs`.
- **Промежуточная проверка:**
  - JSON schema path: `../../system/schemas/workflowSettings.schema.json`;
  - все `Expression` совпадают с именами `.bjs`;
  - все loader-шаги: `SaveRegime = 1`, `CreateRecords = false`, `TableMapping = []`;
  - строки в `.bjs` дословно соответствуют dataset §0–§1.

### Этап 3. Создание `workflow/seed_docs_1a`

- **Что делается:** создать workflow из 6 последовательных шагов по ТЗ §4.2.
- **Файлы:**
  - `metadata/workflow/seed_docs_1a/workflow.seed_docs_1a.json`;
  - `metadata/workflow/seed_docs_1a/workflow.seed_docs_1a.step.data_order_head.bjs`;
  - `metadata/workflow/seed_docs_1a/workflow.seed_docs_1a.step.data_order_rows.bjs`;
  - `metadata/workflow/seed_docs_1a/workflow.seed_docs_1a.step.data_task_head.bjs`;
  - `metadata/workflow/seed_docs_1a/workflow.seed_docs_1a.step.data_task_rows.bjs`.
- **Промежуточная проверка:**
  - операции: `SaveRegime = 1`, `SearchBy = ""`, `CreateRecords = true`;
  - `number` отсутствует в HeaderMapping;
  - `customer_order.products` и `production_task.plan_products` заполнены через `TableMapping`;
  - `shortage_qty`, `semi_requirements`, `raw_requirements` не маппятся;
  - строки в `.bjs` дословно соответствуют dataset §2.

### Этап 4. Локальная техническая проверка

- **Что делается:** проверить созданные JSON и `.bjs` на согласованность.
- **Файлы:** без новых файлов.
- **Проверка:**
  - нет правок существующих metadata 1a;
  - нет правок `metadata/system/dataTypes.json`;
  - workflow JSON написаны в camelCase: `uid`, `name`, `steps`, `kindUid`, `kindName`, `previousStepUid`, `expression`, `headerMapping`, `tableMapping`, `createRecords`, `saveRegime`, `searchBy`, `sourceFieldName`, `destinationFieldName`, `dataTypeUid`;
  - все UID в новых JSON свежие и не повторяются внутри новых файлов;
  - все `PreviousStepUid` образуют линейную цепочку;
  - все `sourceFieldName` существуют в соответствующих DataTable;
  - все `destinationFieldName` существуют в целевых metadata;
  - все ссылочные mapping-строки имеют статический `SearchBy`, указанный в ТЗ.

### Этап 5. Отчёт Инженера

- **Что делается:** подготовить PM-отчёт после реализации.
- **Файлы:** metadata уже созданы; отдельный отчёт-файл не обязателен, если PM не попросит.
- **Проверка:** отчёт содержит diff, checklist A/B, риски bench-проверки C/D и инструкцию импорта/запуска.

---

## 4. Импорт на стенд

Случай простой: создаются только два workflow, они ссылаются на уже импортированные объекты 1a. Можно импортировать папку `metadata/workflow/` или только новые подпапки:

1. `metadata/workflow/seed_refs_1a/`.
2. `metadata/workflow/seed_docs_1a/`.

После импорта порядок запуска:

1. PM подтверждает, что ключи dataset не конфликтуют с уже существующими строками стенда.
2. Запустить `seed_refs_1a`.
3. Запустить `seed_docs_1a`.
4. Повторный запуск `seed_docs_1a` создаст новые документы; это не дефект.

Если `seed_refs_1a` на стенде падает на composite `SearchBy` (`recipe,row_number` или `product,valid_from`), не запускать обходные удаления/ручные update; вернуть задачу PM/Analyst для уточнения ключей.

---

## 5. Оценка и риски

| Метрика | Оценка |
|---|---|
| Новых workflow | 2 |
| Новых `.bjs`-файлов | 14 |
| Новых JSON-файлов | 2 |
| Изменяемых существующих metadata | 0 |
| Самый рискованный этап | `seed_refs_1a`, loader для `recipe_component` и `price_list` с composite `SearchBy` по ссылочному полю. |
| Технические риски | composite `SearchBy` со ссылками; возможное поведение Create+SearchBy как ошибки для уже существующих строк; возможная потребность loader в `row_number` табличных частей операций. |

Митигации:

- composite `SearchBy` опирается на документацию, но проверяется на стенде;
- при ошибке уже существующей справочной строки результат считается приемлемым только если дубликат не создан и остальные строки обработаны;
- если loader потребует `row_number` в TableMapping операций, Инженер фиксирует это в отчёте и добавляет mapping только после проверки, как допускает ТЗ.

---

## 6. Открытые вопросы к PM

1. PM должен до запуска на стенде подтвердить отсутствие конфликтов ключей dataset с уже существующими строками стенда. Это не блокирует написание metadata, но блокирует безопасный запуск `seed_refs_1a` на неочищенном стенде.

Других вопросов к PM на этапе плана нет.

---

## 7. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-02 | review | Создано Инженером на основе approved-ТЗ и approved dataset; передано PM на ревью. |
| 2026-06-02 | approved | PM-chat approved с обязательными вставками: camelCase для workflow JSON, DataTypeUid/TableUid только из текущей metadata, счётчик `.bjs` исправлен на 14. |
