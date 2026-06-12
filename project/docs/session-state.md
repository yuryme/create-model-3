# Session State

> Operational memory for the current OpenCode run. Keep this file short. It is not a project history archive.

## Current Task

- Topic: cleanup/reorg `project/docs/specs/`.
- Goal: очистить корень specs от завершённых stage artifacts и перенести материалы 1a/1b/1c/seed-data в архивную структуру.

## Status

- 1a и 1b функционально приняты PM; metadata 1b закоммичена в nested repo `metadata/` как `5062183`.
- 1c завершён: scope/design/spec approved 2026-06-11; fast-track реализация выполнена; `metadata-auditor` вернул `verdict: approved`, critical/non-critical пусто; metadata импортирована на стенд и функционально принята PM 2026-06-12; `sp-001-bakery-stage1c.json` переведён в `implemented`; metadata закоммичена в nested repo `metadata/` как `e3ecacf`.
- 2026-06-12 усилены правила памяти: Durable Memory Checkpoint теперь обязателен при approval/status/import/acceptance/open-question событиях; autopilot/engineer/commands обязаны возвращать `Durable memory delta`.
- В корневом repo остаются незакоммиченные/неотслеживаемые изменения: stage1c spec/artifact package, правки design-gate правил в `AGENTS.md`/workflow/agents, изменения `project/tools/build_arch_view.py`.
- Nested repo `metadata/` чистый после commit `e3ecacf` (`feat: implement bakery stage 1c metadata`).

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

## Active Files

- `PROJECT_CONTEXT.md`
- `OPEN_QUESTIONS.md`
- `project/docs/session-state.md`
- `AGENTS.md`, `project/docs/workflow.md`, `project/docs/autopilot-workflow.md`, `project/docs/patterns/metadata-workflow.md`
- `.opencode/agents/autopilot-orchestrator.md`, `.opencode/agents/engineer.md`
- `.opencode/commands/task-to-design.md`, `.opencode/commands/spec-to-metadata-multi.md`, `.opencode/commands/implement-spec.md`, `.opencode/commands/metadata-autopilot.md`, `.opencode/commands/quick-metadata.md`
- `project/docs/specs/sp-001-bakery-stage1c*`
- `project/docs/specs/sp-001-bakery-stage1b.architecture-view.html`, `project/docs/specs/sp-001-bakery-stage1b.metadata-view.json`
- `project/docs/specs/sp-001-bakery-stage1c.architecture-view.html`, `project/docs/specs/sp-001-bakery-stage1c.metadata-view.json`
- `project/docs/specs/README.md`
- `project/docs/specs/archive/sp-001-bakery-stage1/`
- `project/tools/build_arch_view.py`

## Next Steps

- Закоммитить root project package 1c после финального просмотра diff.
- Перезапустить OpenCode для применения изменённых `.opencode/agents/*` и `.opencode/commands/*`, если это ещё не сделано.
- Перевести статусы ТЗ/планов 1a и 1b в `implemented` в архивных файлах specs (отдельный approve PM), если это всё ещё нужно после переноса.

## Blockers / Risks

- Нет блокера по 1c: импорт и функциональная приёмка завершены успешно.
