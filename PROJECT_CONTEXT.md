# Контекст проекта

> **Назначение.** Снимок текущего состояния workspace для быстрой пересборки картины в новой сессии или после компрессии контекста.
> **Не дублировать:** обсуждения и очередь вопросов -> `OPEN_QUESTIONS.md`; формальные архитектурные решения -> `project/docs/decisions.md`.
> **Поддерживает AI-ассистент** — обновляет в конце смысловой главы работы.

**Последнее обновление:** 2026-05-29 — синхронизированы локальная документация BaSYS (`basys-docs/` -> `7efaffe`) и CursorRules/generated BaSYS skills (`basys-cursor-rules/` -> `87c6197`); индекс `basys-docs-index.md` обновлён.

---

## Где мы сейчас

`create-model-3` — новый чистый workspace для следующего BaSYS-проекта. Он сохраняет OpenCode-инфраструктуру, agents, commands, skills, workflow-документацию, reusable patterns и справочные материалы, но не содержит metadata и спецификаций завершённых задач `create-model-2`.

OpenCode запускается из корня `create-model-3/`. Все пути в проектных инструкциях относительны этому корню. Исключение: `$schema` внутри BaSYS metadata JSON файлов относителен самому JSON-файлу.

`project/metadata/` — пустое рабочее зеркало будущего стенда BaSYS. Перед началом предметной разработки его нужно синхронизировать с фактическим стендом нового проекта.

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
- `project/metadata/` считается рабочим зеркалом текущего стенда BaSYS, а не архивом экспериментов.
- Перед существенными metadata-задачами синхронизировать `project/metadata/` со стендом.
- `reference/` не редактировать без явного запроса.
- `basys-docs/` не редактировать, кроме явного обновления документации.
- `basys-cursor-rules/` не редактировать; обновлять только через sync-процесс.
- Generated BaSYS skills не редактировать вручную; синхронизировать только через `basys-cursor-rules-sync`.
- Старые артефакты `create-model-2` не переносить в активный контекст; переносить только обобщённые правила в patterns/ADR/workflow/skills.

## Что Следующее

1. Синхронизировать `project/metadata/` с новым BaSYS-стендом.
2. Определить новую предметную область и входные материалы проекта.
3. Проверить команды OpenCode после запуска из `create-model-3/`.
