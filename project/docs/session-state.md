# Session State

> Operational memory for the current OpenCode run. Keep this file short. It is not a project history archive.

## Current Task

- Topic: update блока рецептов.
- Goal: спроектировать замену неудобной модели `catalog/recipe` + `register/recipe_component` на документ `operation/recipe_doc` с табличной частью компонентов, проведением в `records/recipe_norm`, автоматической миграцией старых рецептур и обновлением расчётов потребности/списания сырья.

## Status

- 1a и 1b функционально приняты PM; metadata 1b закоммичена в nested repo `metadata/` как `5062183`.
- 1c завершён: scope/design/spec approved 2026-06-11; fast-track реализация выполнена; `metadata-auditor` вернул `verdict: approved`, critical/non-critical пусто; metadata импортирована на стенд и функционально принята PM 2026-06-12; `sp-001-bakery-stage1c.json` переведён в `implemented`; metadata закоммичена в nested repo `metadata/` как `e3ecacf`.
- 2026-06-12 усилены правила памяти: Durable Memory Checkpoint теперь обязателен при approval/status/import/acceptance/open-question событиях; autopilot/engineer/commands обязаны возвращать `Durable memory delta`.
- Root repo package закоммичен: `9f09ec2 chore: finalize bakery stage 1 project package`.
- Nested repo `metadata/` чистый после commit `e3ecacf` (`feat: implement bakery stage 1c metadata`).
- 2026-06-12 PM подтвердил: стенд синхронизирован перед работой по рецептам; approved plan = создать `sp-003-recipe-doc-design.md`, `sp-003-recipe-doc.json`, валидировать spec-json; metadata-реализация будет отдельным следующим шагом после approval design/spec.
- 2026-06-12 по запросу PM создана визуализация для ревью sp-003: `sp-003-recipe-doc.architecture-view.json`, `sp-003-recipe-doc.metadata-view.json`, `sp-003-recipe-doc.architecture-view.html`; HTML сгенерирован stable viewer через `project/tools/build_arch_view.py --write-html`, design/fact JSON подключены в `sp-003-recipe-doc.json` `meta.sourceInputs`.
- 2026-06-12 PM-review пакета `sp-003-recipe-doc` выявил C1/C2/C3; правками закрыты: дата миграции не позже earliest `production_task.plan_date`/`production_output.date`, recordsSettings guard `$r.quantity > 0 && $h.output_qty > 0`, явная ветка `production_task.calc_requirement -> requirement_calc` в design/spec/visualization. Повторные проверки прошли: spec-json VALID, architecture JSON parse OK, `git diff --check` OK.
- 2026-06-12 PM approved `sp-003-recipe-doc` design/spec/visualization для metadata-реализации; `sp-003-recipe-doc-design.md`, `sp-003-recipe-doc.json`, `sp-003-recipe-doc.architecture-view.json` переведены в `approved`.
- 2026-06-13 создан implementation plan `project/docs/specs/sp-003-recipe-doc-plan.md` со статусом `review`; metadata-правки остаются заблокированы до PM approval плана.
- 2026-06-13 PM approved implementation plan и разрешил все действия, включая создание metadata. Локальная metadata-реализация выполнена.
- 2026-06-13 импорт sp-003 на стенд и functional acceptance прошли успешно (подтверждено PM). Все артефакты sp-003 (design/spec/plan/import-notes/implementation-report) переведены в `implemented`; metadata и root package закоммичены.

## PM Decisions

- 2026-06-11: PM подтвердил — 1b импортирован и принят; 1a принят; sp-002 выполнен.
- 2026-06-11: fast-track = engineer + 1 audit (fix только critical, max 2 итерации); gate: spec approved + `openQuestions` пуст.
- 2026-06-11: дизайн 1c делается интерактивно в PM-чате, реализация — через `/implement-spec`.
- 2026-06-11: визуализация архитектуры получает вторую вкладку «Metadata (факт)», генерируемую из `metadata/`.
- 2026-06-11: PM выбрал стандартный scope 1c и разрешил создать/изменить проектные файлы 1c по плану: session-state, design-пакет/ТЗ spec-json, валидация, fast-track только после approved ТЗ.
- 2026-06-11: PM указал, что markdown-дизайн не отменялся. Решение: для нетривиального дизайна `project/docs/specs/<sp-id>-design.md` обязателен; `*.design.json`/визуализации только companion; spec-json должен ссылаться на markdown design в `meta.sourceInputs`.
- 2026-06-12: PM указал, что прежние правила заполнения `PROJECT_CONTEXT.md`/`OPEN_QUESTIONS.md` не работают, потому что файлы обновляются поздно; approved fix — заменить слабое правило «в конце смысловой главы» на обязательный Durable Memory Checkpoint и `Durable memory delta` в отчётах автопилота.
- 2026-06-12: PM подтвердил, что metadata 1c импортирована на стенд и функциональная приёмка проведена успешно; PM выбрал фиксацию `Memory + implemented`.
- 2026-06-12: PM попросил закоммитить папку `metadata`; commit выполнен в nested repo `metadata/`: `e3ecacf feat: implement bakery stage 1c metadata`.
- 2026-06-12: PM указал, что с визуализацией ещё предстоит работать; visual artifacts не считать финализированными для root commit.
- 2026-06-12: визуализация 1b/1c переведена на стабильный HTML viewer: HTML больше не содержит встроенный `const DATASETS = {...}`, а загружает соседние `*.architecture-view.json` и `*.metadata-view.json`; `project/tools/build_arch_view.py` по умолчанию генерирует только `*.metadata-view.json`, HTML пишет только с `--write-html`.
- 2026-06-12: PM решил перенести cleanup/reorg `project/docs/specs/` в отдельную сессию; не смешивать с текущей доработкой визуализации/root package commit.
- 2026-06-12: PM выбрал ручной выбор входного файла только для design JSON; metadata JSON не выбирается вручную и остаётся фиксированным источником viewer. Реализована кнопка `Выбрать дизайн JSON` через FileReader в stable viewer 1b/1c.
- 2026-06-12: PM подтвердил, что часть задания по модернизации визуализации выполнена; visual artifacts считаются завершёнными для текущего root package.
- 2026-06-12: cleanup/reorg `project/docs/specs/` выполнен; завершённые artifacts 1a/1b/1c и seed-data перенесены в `archive/sp-001-bakery-stage1/`, корень specs оставлен под инфраструктуру и viewer/tooling, архивные spec-json валидируются.
- 2026-06-12: root project package закоммичен в repo commit `9f09ec2`.
- 2026-06-12: PM решил изменить блок рецептов: новый документ `operation/recipe_doc` (интерфейсное название «Рецепт») заменяет ручное ведение `catalog/recipe` + `register/recipe_component` как рабочий UX; документ содержит `output_item`, `output_qty`, справочную единицу выхода и табличную часть компонентов с количеством на `output_qty`; `is_active` в шапке не нужен.
- 2026-06-12: правило актуальности рецептов: для расчёта брать последний проведённый рецепт по `output_item` с `period <= дата расчёта`; старые рецепты остаются в истории и проигрывают по дате; два рецепта на одну выходную номенклатуру с одной датой запрещены.
- 2026-06-12: PM подтвердил ограничения рецептов: `output_item` только `product` или `semi_product`; `component` только `raw` или `semi_product`; количества вводятся только в базовой единице номенклатуры; пересчёта единиц нет; запрет компонента с единицей `шт` снят; единицы показывать справочно; формы списка/редактирования обязательны; старые рецептуры мигрировать автоматически.
- 2026-06-12: PM указал, что расчёт по рецептам используется также в `operation/production_task`; решение зафиксировано в sp-003: `requirement_calc` должен сохранить контракт для команды `production_task.calc_requirement`, а дата расчёта этой ветки = `production_task.plan_date`.
- 2026-06-12: PM approved `sp-003-recipe-doc` и подтвердил запуск metadata-реализации.

## Active Files

- `PROJECT_CONTEXT.md`
- `OPEN_QUESTIONS.md`
- `project/docs/session-state.md`
- `project/docs/specs/sp-003-recipe-doc-design.md`
- `project/docs/specs/sp-003-recipe-doc.json`
- `project/docs/specs/sp-003-recipe-doc.architecture-view.json`
- `project/docs/specs/sp-003-recipe-doc.metadata-view.json`
- `project/docs/specs/sp-003-recipe-doc.architecture-view.html`
- `project/docs/specs/sp-003-recipe-doc-plan.md`
- `project/docs/specs/sp-003-recipe-doc-import-notes.md`
- `project/docs/specs/sp-003-recipe-doc-implementation-report.md`
- `metadata/records/recipe_norm/records.recipe_norm.json`
- `metadata/operation/recipe_doc/operation.recipe_doc.json`
- `metadata/operation/recipe_doc/operation.recipe_doc.command.check_recipe.bjs`
- `metadata/workflow/migrate_recipe_docs/workflow.migrate_recipe_docs.json`
- `metadata/workflow/requirement_calc/workflow.requirement_calc.step.load_recipes.bjs`
- `metadata/workflow/requirement_calc/workflow.requirement_calc.step.explode_bom.bjs`
- `metadata/operation/production_output/operation.production_output.command.calc_raw_writeoff.bjs`

## Next Steps

- sp-003 завершён и закоммичен; выбрать следующую предметную задачу с PM.
- Перевести статусы ТЗ/планов 1a и 1b в `implemented` в архивных файлах specs (отдельный approve PM), если это всё ещё нужно после переноса.

## Blockers / Risks

- UI-автоподстановка единиц по выбранной номенклатуре не закладывается как обязательная capability без дополнительного подтверждения; единицы в новой модели показываются справочно и/или вычисляются в командах/формах там, где подтверждён механизм.
- Стендовых блокеров по sp-003 нет: импорт, миграция и расчёты приняты PM 2026-06-13.
