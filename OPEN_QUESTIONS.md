# Открытые вопросы

## Обсуждается сейчас

- Подготовить `create-model-3` как чистый workspace для нового проекта.

## В очереди

- Синхронизировать `project/metadata/` с новым стендом BaSYS.
- Определить предметную область нового проекта.
- Проверить OpenCode agents и commands после запуска из `create-model-3/`.

## Отложено

_(пока пусто)_

## Решено

- `create-model-2` завершён, зафиксирован отдельным commit и tag `create-model-2-final`.
- `create-model-3` создаётся без metadata/specs завершённых задач `create-model-2`.
- Reusable workflow, patterns, agents, commands и skills сохраняются как основа нового workspace.
- Read-only корпуса `basys-docs/`, `basys-cursor-rules/`, `reference/` перенесены физически.
- `basys-docs/` проверен/синхронизирован до `2e6e431`, `basys-docs-index.md` приведён к текущему коммиту документации.
- `basys-cursor-rules/` проверен/синхронизирован до `e472d12`; generated BaSYS skills уже соответствуют этому коммиту, включая skills для catalog/enum/operation/records/register/fill-workflow.
