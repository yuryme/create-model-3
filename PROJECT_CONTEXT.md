# Контекст проекта

> **Назначение.** Снимок текущего состояния workspace для быстрой пересборки картины в новой сессии или после компрессии контекста.
> **Не дублировать:** обсуждения и очередь вопросов -> `OPEN_QUESTIONS.md`; формальные архитектурные решения -> `project/docs/decisions.md`.
> **Поддерживает AI-ассистент** — обновляет в конце смысловой главы работы.

**Последнее обновление:** 2026-06-10 — введён формат ТЗ `spec-json-v0.1` (ADR 2026-06-10): схема `_spec-json.schema.json` (draft 2020-12), шаблон `_spec-template.json`, валидатор `validate_spec.py`; ТЗ 1b сконвертирован в `sp-001-bakery-stage1b.json` (первый носитель, валиден). Markdown-ТЗ `_template.md` deprecated. Обновлены агенты (autopilot-analyst/reviewer/engineer, metadata-auditor, orchestrator + узкое bash-разрешение на валидатор, ручные analyst/engineer) и процессные доки. **Требуется перезапуск OpenCode** для применения изменений `.opencode/agents/*`. Ранее: 1b design-пакет одобрен PM с правками N1/N2/M1/M2. Ещё ранее: план `sp-002-seed-data-1a-plan.md` `approved`; metadata 1a реализованы и импортированы без ошибок (commit `bd7bbe9`); Evidence Rule (ADR-2026-06-02).

---

## Где мы сейчас

`create-model-3` — новый чистый workspace для следующего BaSYS-проекта. Он сохраняет OpenCode-инфраструктуру, agents, commands, skills, workflow-документацию, reusable patterns и справочные материалы, но не содержит metadata и спецификаций завершённых задач `create-model-2`.

OpenCode запускается из корня `create-model-3/`. Все пути в проектных инструкциях относительны этому корню. Исключение: `$schema` внутри BaSYS metadata JSON файлов относителен самому JSON-файлу.

`metadata/` — рабочее зеркало текущего стенда BaSYS. Перед началом предметной разработки его нужно синхронизировать с фактическим стендом нового проекта.

## Что Перенесено

- `opencode.json` — проектная конфигурация OpenCode.
- `AGENTS.md` — постоянная инструкция workspace.
- `.opencode/agents/` — OpenCode agents.
- `.opencode/commands/` — только reusable commands, без project-specific команд завершённых задач.
- `.opencode/skills/` — BaSYS/OpenCode skills.
- `project/docs/workflow.md` — основной PM -> analyst -> engineer workflow.
- `project/docs/autopilot-workflow.md` — режимы quick/single-agent/multi-agent autopilot.
- `project/docs/patterns/metadata-workflow.md` — устойчивые metadata lessons из прошлых прогонов.
- `project/docs/glossary.md`, `project/docs/decisions.md`, шаблоны specs и методика интервью.
- `basys-docs-index.md` — индекс локальной документации BaSYS.

## Что Не Перенесено

- Metadata завершённых задач `create-model-2`.
- Specs, plans и summary завершённых задач.
- Старые `PROJECT_CONTEXT.md` и `OPEN_QUESTIONS.md`.
- Входящие материалы старых задач из `inbox/`.

## Важные Правила

- Перед созданием, редактированием или удалением файлов ассистент даёт краткий план и ждёт явного одобрения PM.
- `metadata/` считается рабочим зеркалом текущего стенда BaSYS, а не архивом экспериментов.
- Перед существенными metadata-задачами синхронизировать `metadata/` со стендом.
- `reference/` не редактировать без явного запроса.
- `basys-docs/` не редактировать, кроме явного обновления документации.
- `basys-cursor-rules/` не редактировать; обновлять только через sync-процесс.
- Generated BaSYS skills не редактировать вручную; синхронизировать только через `basys-cursor-rules-sync`.
- Старые артефакты `create-model-2` не переносить в активный контекст; переносить только обобщённые правила в patterns/ADR/workflow/skills.

## Что Следующее

1. sp-002 — engineer реализует два workflow `seed_refs_1a`/`seed_docs_1a` в `metadata/` по approved-плану (с правками camelCase + счётчик `.bjs`); затем engineer report → PM-chat acceptance.
2. Функциональная приёмка 1a на стенде (чек-лист C); после неё — `implemented` для ТЗ и плана 1a.
3. После приёмки 1a — детализировать части 1b и 1c в `sp-001-bakery-stage1.md`.
4. При необходимости версионировать `metadata/` на GitHub — настроить remote и запушить.

## Реестр Сессий

> **Назначение.** Осмысленные подписи к id сессий OpenCode, чтобы их было легко находить в списке `/sessions`. В TUI нет ручного поля «комментарий к сессии», поэтому реестр ведётся здесь вручную. Заголовок сессии генерируется автоматически по первому сообщению; для читаемости начинать новую сессию короткой темой.

| Дата (UTC) | id сессии | Заголовок | Назначение |
|---|---|---|---|
| 2026-05-28 14:54 | `ses_190eb7873ffecNa9XfL6JdrumF` | Пуш текущего проекта | Git push проекта |
| 2026-05-29 08:40 | `ses_18d1b7febffex3FoFdT8FEqkyM` | Обновление документации перед проектом | Синхронизация basys-docs / CursorRules |
| 2026-05-29 08:58 | `ses_18d0ac9f4ffevvR0HfR5nwmH9c` | Что нового в OpenCode | Обзор изменений OpenCode |
| 2026-05-29 22:15 | `ses_18a314bdeffeJMOwrIAnTjHqbc` | New session (без темы) | Автозаголовок не задан |
| 2026-05-31 17:02 | `ses_18102f088ffeubuPGlk5jjCJ4s` | OpenCode PlanMode режим | Разбор Plan Mode |
| 2026-05-31 18:02 | `ses_180cc4221ffey1OiAceVjLsdUW` | Архитектура ERP пекарни | Ранний разбор предметной области |
| 2026-05-31 18:53 | `ses_1809de41affe5Hkxybl8OcsuTH` | Коробочное решение для хлебозавода | Постановка задачи хлебозавода |
| 2026-05-31 19:27 | `ses_1807e835dffe7u9Z29wJ3Pu6g9` | Ревью спецификации bakery problem statement | Ревью постановки sp-001 |
| 2026-05-31 21:02 | `ses_180275ed2ffe4Ht6LCnKFD2K8R` | sp-001 дизайн первой очереди | Методика этапа 1 |
| 2026-05-31 21:49 | `ses_17ffccfd9ffeH5U1zSkD7TrtOE` | Ревью bakery stage 1 design | Ревью методики этапа 1 |
| 2026-05-31 23:33 | `ses_17f9d2344ffegmITht8EOA11GU` | API 400 ошибка Claude | Разбор ошибки thinking-блоков |
| 2026-06-01 (текущая) | (id уточнить в `/sessions`) | Меню, перенос metadata, sync docs, решение по ТЗ | Меню всех видов; перенос `metadata/` в корень + nested git; sync basys-docs/CursorRules/OpenCode docs; решение «одно ТЗ с частями 1a/1b/1c», design → approved |
