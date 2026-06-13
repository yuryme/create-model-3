---
sp-id: sp-003-recipe-doc
title: Хлебозавод — документ рецепта и регистр норм
kind: plan
status: implemented
author: engineer
created: 2026-06-13
updated: 2026-06-13
depends-on:
  - project/docs/specs/sp-003-recipe-doc.json
  - project/docs/specs/sp-003-recipe-doc-design.md
  - project/docs/specs/sp-003-recipe-doc.architecture-view.json
  - project/docs/specs/sp-003-recipe-doc.metadata-view.json
---

# План реализации — Хлебозавод: документ рецепта и регистр норм

> План создан по утверждённому ТЗ `project/docs/specs/sp-003-recipe-doc.json` (`meta.status: approved`, `spec-json-v0.1`). До утверждения этого плана `metadata/` не изменяется.

---

## 1. Контекст и состав работы

Реализуется update блока рецептов: старый пользовательский сценарий `catalog/recipe` + `register/recipe_component` заменяется документом `operation/recipe_doc` с табличной частью компонентов, проведением в `records/recipe_norm`, автоматической миграцией старых рецептур и переводом расчётов на новый источник норм. Архитектура и scope зафиксированы в approved design/spec; этот план не расширяет ТЗ.

Состав по ТЗ:

| Действие | Объекты / файлы |
|---|---|
| CREATE records | `records/recipe_norm` |
| CREATE operation | `operation/recipe_doc` с табличной частью `components`, командой `check_recipe`, `recordsSettings` |
| CREATE forms | constructor list/edit forms для `operation/recipe_doc` |
| CREATE workflow | `workflow/migrate_recipe_docs` для переноса старых рецептур |
| MODIFY workflow | `workflow/requirement_calc` — чтение `records.recipe_norm` вместо старых объектов |
| MODIFY operation command | `operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs` |
| REUSE operation | `operation/production_task` без планируемой правки metadata, если контракт `requirement_calc` сохранён |
| REUSE old recipe objects | `catalog/recipe`, `register/recipe_component` остаются архивом/fallback и источником миграции |
| MODIFY system dataTypes | append-запись для `operation/recipe_doc`; `records` и `workflow` не добавлять |

Подтверждённый baseline в `metadata/`:

- `metadata/catalog/recipe/catalog.recipe.json` и `metadata/register/recipe_component/register.recipe_component.json` присутствуют.
- `metadata/workflow/requirement_calc/` присутствует; `load_recipes.bjs` сейчас читает `catalog.recipe` и `register.recipe_component`.
- `metadata/operation/production_task/operation.production_task.command.calc_requirement.bjs` запускает `requirement_calc` и ожидает прежний result contract.
- `metadata/operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs` сейчас читает старые recipe-объекты.
- В `metadata/` пока нет `records/recipe_norm`, `operation/recipe_doc`, `workflow/migrate_recipe_docs` и constructor form JSON.

---

## 2. Решения по открытым вопросам ТЗ

> Evidence Rule: план использует только подтверждённые возможности BaSYS. Доказательства из approved design/spec: `basys-docs/ru/metadata/dataObject.md` (`detailTables`), `basys-docs/ru/metadata/recordsCreation.md`, `basys-docs/ru/commands/programmableCommands.md`, `basys-docs/ru/calculations/queryBuilder.md`, `basys-docs/ru/calculations/dataTable.md`, `basys-docs/ru/workflows/dataObjectLoaderStep.md`, `basys-docs/ru/userInterface/formConstructor.md`; локальные kind-файлы `metadata/system/kinds/kind.operation.json` и `kind.records.json`.

Открытых вопросов в ТЗ нет (`openQuestions: []`). Инженерские решения без расширения scope:

| Тема | Выбранный вариант | Обоснование | Риск |
|---|---|---|---|
| Уникальность `output_item + date` | Не добавлять DB-unique | ТЗ прямо исключает неподтверждённый composite DB-unique; защита через `check_recipe`, миграцию и guards расчётов. | При сохранении в обход команды возможен дубль; расчёты обязаны остановиться с понятной ошибкой. |
| Автозаполнение единиц | Заполнять командой `check_recipe` и migration workflow | Programmable commands и QueryBuilder подтверждены; мгновенный UI-hook выбора номенклатуры не подтверждён. | До запуска команды пользователь может видеть пустые справочные единицы. |
| Старые objects | Не удалять и не менять структуру | ТЗ требует оставить `catalog/recipe` и `register/recipe_component` как источник миграции/архив. | Старый UX может остаться видимым; безопасное скрытие будет только после проверки меню/autoFill и без удаления объектов. |
| `production_task` | Metadata операции не править, если result contract сохранён | ТЗ требует сохранить consumer contract команды `calc_requirement`; текущая команда остаётся точкой запуска workflow. | Если при реализации выяснится несовместимость контракта, это будет точечная правка команды с явным отражением в report. |

---

## 3. Декомпозиция на этапы

### Этап 1. Подготовить `records/recipe_norm`

- **Что делается:** создать регистр записей норм рецептов со стандартными колонками вида `records` и пользовательскими колонками из ТЗ.
- **Файлы:**
  - `metadata/records/recipe_norm/records.recipe_norm.json`
- **Правила:**
  - стандартные records columns идут первыми: `id`, `period`, `object_kind`, `meta_object`, `object_uid`, `row`;
  - пользовательские поля: `output_item`, `output_qty`, `output_unit`, `component`, `component_unit`, `component_qty`, `component_qty_per_unit`;
  - `records/recipe_norm` не добавлять в `metadata/system/dataTypes.json` (`kind.records.json`: `isReference = false`);
  - все `Memo` заполнить, длина `Memo` до 300 символов.
- **Промежуточная проверка:** поля и индексы соответствуют acceptance A/B; типы UID взяты из `metadata/system/dataTypes.json`; `Name` snake_case ≤30.

### Этап 2. Создать `operation/recipe_doc`

- **Что делается:** создать документ «Рецепт» с шапкой, табличной частью `components`, командой `check_recipe` и проведением в `recipe_norm`.
- **Файлы:**
  - `metadata/operation/recipe_doc/operation.recipe_doc.json`
  - `metadata/operation/recipe_doc/operation.recipe_doc.command.check_recipe.bjs`
  - append-запись в `metadata/system/dataTypes.json` для `operation/recipe_doc`
- **Ключевые поля:**
  - шапка: стандартные operation columns + `output_item`, `output_qty`, `output_unit`, `comment`;
  - табличная часть `components`: служебные `id`, `object_uid`, `row_number`, затем `component`, `component_unit`, `quantity`, `comment`;
  - бизнес-поле `is_active` не создавать.
- **RecordsSettings:**
  - source = `components`, target = `records/recipe_norm`, direction = `Plus`;
  - condition = `$r.quantity > 0 && $h.output_qty > 0`;
  - `component_qty_per_unit = $r.quantity / $h.output_qty`;
  - не маппить engine-managed columns `object_kind`, `meta_object`, `object_uid`, `row`.
- **Команда `check_recipe`:**
  - проверяет `output_item`, `output_qty > 0`, непустую `components`;
  - читает `catalog/nomenclature` для проверки типов: output = `product|semi_product`, component = `raw|semi_product`;
  - заполняет `output_unit` и `component_unit`;
  - запрещает `component == output_item`;
  - проверяет дубль другого рецепта с тем же `output_item` и `date` через уже сохранённые `operation.recipe_doc`/`records.recipe_norm`, исключая текущий объект, если его можно идентифицировать по фактическим полям.
- **Промежуточная проверка:** command filename совпадает с JSON; `recordsSettings` использует правильные `uid` source/target/columns; `operation/recipe_doc` зарегистрирован в `dataTypes.json`, а `recipe_norm` не зарегистрирован.

### Этап 3. Создать constructor forms для `recipe_doc`

- **Что делается:** создать форму списка и форму редактирования, назначить `listFormUid` и `itemFormUid` в `operation.recipe_doc.json`.
- **Файлы:**
  - `metadata/operation/recipe_doc/operation.recipe_doc.form.list_<suffix>.json`
  - `metadata/operation/recipe_doc/operation.recipe_doc.form.edit_<suffix>.json`
  - точечные обновления `listFormUid` / `itemFormUid` в `operation.recipe_doc.json`
- **Правила:**
  - использовать правила skills `create-list-form` и `create-edit-form`;
  - list form показывает дату/номер, выход, количество выхода, единицу и комментарий;
  - edit form показывает шапку и табличную часть `components` в одном сценарии;
  - команда `check_recipe` доступна через split-button «Действия» как header command.
- **Промежуточная проверка:** form JSON валидны по `constructorFormSettings.schema.json`; все `FormElement.id` уникальны; reference columns в detail grid показываются через `<name>_display`.

### Этап 4. Создать `workflow/migrate_recipe_docs`

- **Что делается:** создать ручной workflow миграции старых рецептур в новые документы с `CreateRecords=true`.
- **Файлы:**
  - `metadata/workflow/migrate_recipe_docs/workflow.migrate_recipe_docs.json`
  - `metadata/workflow/migrate_recipe_docs/workflow.migrate_recipe_docs.step.load_old_recipe_data.bjs`
  - при необходимости дополнительные `.bjs` steps рядом с workflow JSON, без внешних npm-зависимостей
- **Логика:**
  - прочитать `catalog.recipe`, `register.recipe_component`, `catalog.nomenclature`, существующие `operation.recipe_doc`;
  - определить дату миграции: не позже earliest `production_task.plan_date` / `production_output.date`; если таких документов нет — дата запуска миграции;
  - валидировать старые данные: `output_qty > 0`, строки есть, `quantity > 0`, допустимые типы номенклатуры;
  - заполнить справочные единицы по `catalog/nomenclature.unit`;
  - пропускать уже перенесённые рецепты по marker `migrated-from-catalog-recipe:<old id>` в `comment`;
  - остановиться с понятной ошибкой при дубле `output_item + migration_date`;
  - loader создаёт `operation/recipe_doc` с `components` и `CreateRecords=true`.
- **Промежуточная проверка:** workflow не добавлен в `dataTypes.json`; `TableMapping` покрывает header и `components`; дата миграции будет явно указана в implementation report/import-notes.

### Этап 5. Обновить `workflow/requirement_calc`

- **Что делается:** перевести расчёт потребности на `records.recipe_norm`, сохранив result contract для `production_task.calc_requirement`.
- **Файлы:**
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.step.load_recipes.bjs`
  - при необходимости `metadata/workflow/requirement_calc/workflow.requirement_calc.step.explode_bom.bjs`
  - `metadata/workflow/requirement_calc/workflow.requirement_calc.json` только если меняются step inputs/outputs
- **Логика:**
  - больше не читать `catalog.recipe` и `register.recipe_component`;
  - дата расчёта для `production_task` = `plan_date`, уже загружается в `load_task.bjs`;
  - для каждого `output_item` выбрать max(`period`) <= дата расчёта из `records.recipe_norm`;
  - затем выбрать все строки одного `object_uid` этой даты;
  - если на выбранную дату больше одного `object_uid` для `output_item`, остановить расчёт;
  - потребность = planned qty * `component_qty_per_unit`;
  - сохранить текущие проверки циклов и понятные ошибки.
- **Промежуточная проверка:** grep по `requirement_calc` не находит `catalog.recipe` / `register.recipe_component`; `operation.production_task.command.calc_requirement.bjs` остаётся совместимым.

### Этап 6. Обновить `production_output.calc_raw_writeoff`

- **Что делается:** заменить старый источник рецептов в команде списания сырья выпуска на `records.recipe_norm`.
- **Файлы:**
  - `metadata/operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs`
- **Логика:**
  - дата расчёта = `$h.date` выпуска;
  - раскрывать `outputs` через актуальный рецепт из `records.recipe_norm`;
  - расход компонента = output quantity * `component_qty_per_unit`;
  - semi_product раскрывать рекурсивно, raw группировать в `raw_writeoff`;
  - сохранить текущий контроль остатков `records.raw_movement`, исключение собственных записей по `meta_object + object_uid`, проверки циклов и недостаточного остатка.
- **Промежуточная проверка:** grep по команде не находит `catalog.recipe` / `register.recipe_component`; acceptance A/B по `calc_raw_writeoff` покрыта.

### Этап 7. Меню, старый UX и import-notes

- **Что делается:** проверить, доступен ли `operation/recipe_doc` через существующее меню/autoFill; старые объекты не удалять.
- **Файлы:**
  - `metadata/menu/*` менять только если проверка покажет, что `recipe_doc` не будет доступен или старый UX безопасно скрывается подтверждённым способом;
  - `project/docs/specs/sp-003-recipe-doc-import-notes.md` создать после реализации;
  - `project/docs/specs/sp-003-recipe-doc-implementation-report.md` создать после реализации.
- **Правила:**
  - не скрывать `catalog/recipe` и `register/recipe_component` неподтверждённым механизмом;
  - если меню с `autoFill` уже покрывает operation, ручной пункт меню не создавать без необходимости;
  - import notes обязателен из-за cross-kind references и migration workflow.
- **Промежуточная проверка:** старые объекты присутствуют; новый документ достижим пользователю; import sequence описан.

### Этап 8. Verification перед передачей PM

- **Что делается:** выполнить self-check A/B из ТЗ, подготовить отчёт и инструкцию импорта.
- **Проверки:**
  - `python project/docs/specs/validate_spec.py project/docs/specs/sp-003-recipe-doc.json`;
  - JSON metadata валидны по схемам из `metadata/system/schemas/` доступными локальными средствами;
  - UID уникальны в новых файлах; kind/type UIDs взяты только из `metadata/system/`;
  - `git diff --check`;
  - grep подтверждает отсутствие чтения `catalog.recipe` / `register.recipe_component` в новых расчётах;
  - checklist A/B из ТЗ явно закрыт в implementation report;
  - checklist C остаётся для PM bench testing на стенде.

---

## 4. Импорт на стенд

Случай нетривиальный: новый `operation/recipe_doc` ссылается на новый `records/recipe_norm`, workflow migration создаёт `operation/recipe_doc`, а существующие расчёты начинают читать новый records. По ADR 2026-05-16 импорт нельзя считать топологическим; нужна явная последовательность.

Предварительная стратегия импорта, уточняется в `sp-003-recipe-doc-import-notes.md` после реализации:

1. Импортировать `records/recipe_norm`.
2. Импортировать `operation/recipe_doc` вместе с командой `check_recipe` и формами list/edit; также импортировать обновлённый `metadata/system/dataTypes.json` с append-записью для `operation/recipe_doc`, если стенд требует локальную регистрацию reference-type в этом же пакете.
3. Импортировать `workflow/migrate_recipe_docs`.
4. Импортировать изменённый `workflow/requirement_calc`.
5. Импортировать изменённую команду `operation.production_output.command.calc_raw_writeoff.bjs` вместе с объектом `operation/production_output`, если сервер импортирует команды только в составе object folder.
6. Запустить `migrate_recipe_docs` на стенде.
7. Выполнить функциональные acceptance-сценарии C: создание рецепта, проверка рецепта, проведение, миграция, `production_task.calc_requirement`, `production_output.calc_raw_writeoff`, ошибки дублей/отсутствия рецепта.

Pre-clean: если на стенде уже есть экспериментальные `recipe_norm`, `recipe_doc` или `migrate_recipe_docs`, перед импортом потребуется удалить/очистить конфликтующие server objects либо согласовать MODIFY по фактическим UID. По текущему baseline локально этих объектов нет.

---

## 5. Оценка и риски

| Метрика | Оценка |
|---|---|
| Общий объём работы | 3 новых metaobject/workflow + 2 constructor forms + 1 append в `system/dataTypes.json` + 4-6 `.bjs` правок/созданий + import-notes/report |
| Самый рискованный этап | Миграция и два расчёта: выбор актуального рецепта по max(period), дубль `output_item + period`, рекурсивное раскрытие semi_product |
| Риск импорта | Средний: cross-kind references records → operation → workflow/commands требуют пакетной последовательности |
| Риск данных | Средний: старые рецепты могут иметь нулевые количества, неподходящие типы или неполные строки |
| Риск UX | Средний: справочные единицы заполняются командой, не мгновенным UI-hook |

Технические риски и mitigation:

1. **Дубли рецептов на одну дату.** Mitigation: `check_recipe`, migration guard и runtime guard в расчётах; DB-unique не добавлять без evidence.
2. **Дата миграции позже исторических документов.** Mitigation: вычислять дату не позже earliest `production_task.plan_date` / `production_output.date`; указать выбранную дату в report/import notes.
3. **Сохранение recipe_doc в обход проверки.** Mitigation: `recordsSettings.condition` защищает деление на ноль; расчёты валидируют данные перед использованием.
4. **Несовместимость `requirement_calc` result contract.** Mitigation: не менять `return_result` contract без необходимости; если меняется внутренний DataTable, сохранить поля `kind`, `item`, `quantity`, `unit`, `unit_display` для consumer-команды.
5. **Неподтверждённое скрытие старых объектов из меню.** Mitigation: не менять menu/visibility без подтверждённого механизма; старые objects не удалять.

---

## 6. Открытые вопросы к PM

Блокирующих вопросов нет.

Неблокирующая техническая заметка: способ скрытия старых `catalog/recipe` и `register/recipe_component` из пользовательской навигации будет выбран только если существующий `menu/autoFill` позволяет сделать это подтверждённым способом. Иначе старые объекты останутся видимыми до отдельного решения, но новые расчёты их читать не будут.

---

## 7. История изменений

| Дата | Статус | Что изменилось |
|---|---|---|
| 2026-06-13 | review | Создано Инженером на основе approved ТЗ `sp-003-recipe-doc.json`; передано PM на ревью. |
| 2026-06-13 | approved | PM approved план и разрешил metadata-реализацию, включая создание/изменение metadata-файлов. |
| 2026-06-13 | implemented | Реализация завершена, импортирована и функционально принята PM; ТЗ переведён в implemented. |
