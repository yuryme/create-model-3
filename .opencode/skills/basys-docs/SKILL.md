---
name: basys-docs
description: Управление локальным клоном официальной документации BaSYS: проверить статус basys-docs, обновить git pull, пересобрать basys-docs-index.md. Использовать при просьбах обновить или проверить документацию BaSYS.
---

# BaSYS Docs

Этот skill описывает обслуживание локального клона официальной документации BaSYS.

## Source Of Truth

- Local clone: `basys-docs/`
- Index: `basys-docs-index.md`

`basys-docs/` — read-only clone официальной документации. Не редактировать его вручную в рамках проектных задач.

## Типовые действия

- Проверить статус: `git -C basys-docs status --short --branch`.
- Обновить документацию: `git -C basys-docs pull --ff-only`.
- После обновления пересобрать `basys-docs-index.md`, если изменилась структура `basys-docs/ru/`.

## Правила

- Не коммитить `basys-docs/` в этот репозиторий; он указан в `.gitignore`.
- Не править файлы внутри `basys-docs/` вручную.
- При ответах по BaSYS-платформе использовать `basys-docs/ru/` как официальный источник, а generated skills из `BaSYS.CursorRules` как правила создания metadata.
