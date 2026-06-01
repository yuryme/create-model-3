# Autopilot Workflow

Этот документ описывает автономные режимы выполнения задач в проекте: quick metadata, single-agent autopilot и multi-agent autopilot. Основной ручной workflow описан в `project/docs/workflow.md`.

## Принципиальная Разница

| Свойство | Quick metadata | Single-agent | Multi-agent |
|---|---|---|---|
| Кто выполняет | Текущий чат / один primary agent | Один primary agent | Orchestrator + subagents |
| Review | Self-check | Self-review внутри того же контекста | Независимый reviewer/auditor в child-сессиях |
| Контекст | Минимальный | Общий | Изолированный per role, handoff через файлы |
| Стоимость | Минимальная | Средняя | Высокая |
| Подходит для | Простые metadata-правки | Средние задачи и известные паттерны | Сложные/рискованные задачи |
| Точки запуска | `.opencode/commands/quick-metadata.md` | `.opencode/commands/metadata-autopilot.md` | `.opencode/commands/task-to-design.md`, `.opencode/commands/spec-to-metadata-multi.md` |

## Критерии Выбора Режима

### Quick Metadata

Использовать по умолчанию, если выполнены ВСЕ условия:

- 1–3 метаобъекта;
- один kind или известные комбинации kind, уже использованные в проекте;
- паттерн реализации уже встречался в текущем проекте;
- нет нового бизнес-процесса;
- нет новых kind конструкций;
- нет сложных `.bjs`, регистров проведения или cross-kind импортных зависимостей.

Результат quick-режима: изменения в `metadata/`, краткая инструкция импорта/проверки и self-check. Design/review/audit/report файлы по умолчанию не создаются.

### Single-agent Autopilot

Использовать как основной автономный режим для средних задач, если:

- несколько объектов или несколько kind, но паттерны уже известны;
- есть операции, records или импортные зависимости, но они укладываются в существующие правила;
- нужна спецификация/план, но независимый reviewer/auditor не окупается;
- PM разрешил автономный прогон и принимает результат на стенде.

Single-agent может создавать краткое ТЗ, краткий план, import notes и implementation report, но не должен создавать отдельные persisted review/audit файлы без явной причины.

### Multi-agent Autopilot

Использовать только если выполнено ЛЮБОЕ условие:

- новая предметная область или бизнес-процесс;
- новые kind конструкций, не использованные в проекте ранее;
- сложные cross-kind references, требующие независимой проверки порядка импорта;
- риск ломки уже работающих метаданных;
- цена ошибки высока, и независимый reviewer/auditor реально снижает риск.

### Ручной Workflow (Без Автопилота)

Обязателен, если выполнено ЛЮБОЕ условие:

- архитектурные решения, влияющие на будущие задачи;
- решения о границах scope (что входит, что не входит);
- методологические разногласия, требующие суждения PM;
- первая реализация новой BaSYS-фичи в этом проекте, если PM не разрешил исследовательский autopilot-run.

## Metadata Как Рабочее Зеркало

`metadata/` всегда означает текущее рабочее состояние целевой BaSYS-инсталляции. Перед экспериментом его нужно синхронизировать со стендом, а после реализации импортировать/проверить на стенде. Отдельный шаг promotion из `experiments/.../metadata` в `metadata/` не нужен, если PM явно не попросил изолированную ветку или worktree.

PM не принимает metadata чтением JSON. PM принимает результат через стенд: импорт прошёл, формы открываются, объекты создаются, операции проводятся, acceptance-сценарии работают. JSON/schema/UID/reference checks — зона агента и инструментов.

## Артефакты Экспериментов

Полные результаты экспериментов не являются постоянным проектным знанием. После run нужно оставить только:

- актуальные изменения `metadata/`;
- активное или approved-ТЗ, если оно нужно для дальнейшей работы;
- import notes для нетривиального порядка импорта;
- устойчивые уроки, перенесённые в `project/docs/patterns/`, ADR, workflow или skills.

Не хранить в активном контексте без необходимости: длинные `*-review.md`, `*-audit.md`, временные `*-plan.md`, implementation reports и альтернативные неиспользуемые варианты. Если нужно сохранить историю, архивировать её вне активного контекста или в отдельной ветке.

## Multi-Agent: Две Фазы

Multi-agent autopilot разделён на две фазы с явной PM approval gate между ними. Использовать этот режим только после проверки критериев выше:

- **Phase 1 — Design**: бизнес-задача -> design + design review -> PM approval.
- **Phase 2 — Implementation**: approved design -> spec + spec review -> plan + plan review -> metadata + audit.

Между фазами PM:

- читает design;
- отвечает на открытые архитектурные вопросы, поднятые analyst;
- переводит status design в `approved` (или возвращает на доработку);
- запускает Phase 2 командой `/spec-to-metadata-multi`.

PM approval gate сделан так, потому что design — место, где живёт неопределённость задачи. Subagent invocation плохо подходит для интерактивного Q&A; вместо этого analyst фиксирует открытые вопросы в design, а PM их разрешает в явной паузе между фазами.

## Multi-Agent: Участники

### Orchestrator

- Файл: `.opencode/agents/autopilot-orchestrator.md`.
- Mode: `primary`.
- Назначение: координирует subagents в текущей фазе.
- Может вызывать только `autopilot-*` subagents и `metadata-auditor`.
- Может делать `git diff`/`git status`/`git log` для финального отчёта PM.
- НЕ редактирует файлы.

### autopilot-analyst

- Файл: `.opencode/agents/autopilot-analyst.md`.
- Mode: `subagent`, `hidden: true`.
- Три режима: design, spec, revision.
- Пишет только в `project/docs/specs/`.
- НЕ редактирует `metadata/`.
- НЕ вызывает другие subagents.

### autopilot-reviewer

- Файл: `.opencode/agents/autopilot-reviewer.md`.
- Mode: `subagent`, `hidden: true`.
- Три типа review: design, spec, plan.
- Read-only review одного артефакта против явных критериев.
- Пишет только review-файл, путь задаёт orchestrator.
- НЕ редактирует исходный артефакт.
- НЕ вызывает другие subagents.

### autopilot-engineer

- Файл: `.opencode/agents/autopilot-engineer.md`.
- Mode: `subagent`, `hidden: true`.
- Назначение: писать implementation plan, потом реализовывать metadata.
- Пишет в `project/docs/specs/` и `metadata/`.
- Запускается дважды: сначала для plan, потом для реализации; плюс fix-режим.
- НЕ запускает bash.
- НЕ вызывает другие subagents.

### metadata-auditor

- Файл: `.opencode/agents/metadata-auditor.md`.
- Mode: `subagent`, `hidden: true`.
- Назначение: read-only технический аудит реализованного metadata.
- Пишет только audit-файл.
- Фокус: JSON validity, UID, references, reserved words, import order, forbidden edits, наличие обязательных стандартных колонок.
- НЕ читает implementation report — оценивает metadata против ТЗ напрямую.
- НЕ вызывает другие subagents.

## Permissions: Информация vs Действия

OpenCode permissions делятся на два независимых класса. Принцип проекта:

- **Информационные** (`read`, `glob`, `grep`, `list`, `skill`, `webfetch`) — максимально открыты для всех subagents. Ограничение информации делает агент глупее без выигрыша в безопасности.
- **Действующие** (`edit`, `bash`, `task`) — строго ограничены ролью.

Это означает: reviewer и auditor видят всё то же самое, что engineer и analyst, и могут загрузить любой skill, но не могут ничего сломать.

`external_directory` для subagents = `deny`. Всё нужное лежит внутри `create-model-3/`. User-level skills грузятся через `skill` tool, не через прямое чтение.

`external_directory` для orchestrator = `ask` на случай редких легитимных запросов.

## Файловый Handoff

Subagents общаются только через файлы. Orchestrator передаёт пути к артефактам, а не пересказывает их содержимое.

Эти файлы являются рабочим handoff-каналом multi-agent run, а не автоматической постоянной документацией проекта. После завершения PM-chat должен предложить cleanup: удалить/архивировать временные review/audit/report файлы или перенести из них только устойчивые правила.

Стандартные имена для задачи `<sp-id>`:

```
inbox/<sp-id>.md или иной                    вход от PM (business-task)
project/docs/specs/<sp-id>-design.md          design от analyst (Phase 1)
project/docs/specs/<sp-id>-design-review.md   review design от reviewer (Phase 1)
project/docs/specs/<sp-id>.md                 ТЗ от analyst (Phase 2)
project/docs/specs/<sp-id>-spec-review.md     review ТЗ от reviewer (Phase 2)
project/docs/specs/<sp-id>-plan.md            implementation plan от engineer
project/docs/specs/<sp-id>-plan-review.md     review plan от reviewer
metadata/...                                  metadata от engineer
project/docs/specs/<sp-id>-implementation-report.md  отчёт от engineer
project/docs/specs/<sp-id>-import-notes.md    инструкция импорта от engineer
project/docs/specs/<sp-id>-audit.md           технический аудит от auditor
```

## Цикл Multi-Agent

### Phase 1 — Design

```
PM формулирует бизнес-задачу (текст или файл)
  |
  v
PM: /task-to-design <task-path-or-text>
  |
  v
orchestrator derives <sp-id>
  |
  v
orchestrator -> autopilot-analyst (design mode)
  | analyst writes <sp-id>-design.md (status: review)
  v
orchestrator -> autopilot-reviewer (type: design)
  | reviewer writes <sp-id>-design-review.md
  v
  if critical defects:
    orchestrator -> autopilot-analyst (revision mode)
    -> analyst revises design in place
    -> back to reviewer
  if no critical defects:
    stop. design status stays: review.
  |
  v
orchestrator Phase 1 report to PM:
  - design path and status
  - open architectural questions for PM
  - reviewer findings summary
  - next step: PM review, mark status approved, run /spec-to-metadata-multi
```

PM gate:

```
PM reads <sp-id>-design.md
PM answers open architectural questions (in-place edit or comment)
PM marks status: approved
```

### Phase 2 — Implementation

```
PM: /spec-to-metadata-multi project/docs/specs/<sp-id>-design.md
  |
  v
orchestrator reads design, verifies status: approved
  |
  v
orchestrator -> autopilot-analyst (spec mode)
  | analyst writes <sp-id>.md (status: review)
  v
orchestrator -> autopilot-reviewer (type: spec)
  | reviewer writes <sp-id>-spec-review.md
  v
  loop on critical defects
  |
  v
spec status: approved
  |
  v
orchestrator -> autopilot-engineer (plan mode)
  | engineer writes <sp-id>-plan.md (status: review)
  v
orchestrator -> autopilot-reviewer (type: plan)
  | reviewer writes <sp-id>-plan-review.md
  v
  loop on critical defects
  |
  v
plan status: approved
  |
  v
orchestrator -> autopilot-engineer (implementation mode)
  | engineer creates/edits metadata/, writes report and import notes
  v
orchestrator collects changed-files list via git diff/status
  |
  v
orchestrator -> metadata-auditor (input: spec + changed-files list)
  | auditor writes <sp-id>-audit.md
  v
  loop on critical defects
  |
  v
orchestrator Phase 2 report to PM:
  - list of created/changed files
  - critical defects fixed during cycle
  - accepted non-critical notes
  - import sequence
  - remaining risks
```

## Critical vs Non-Critical Defects

### Critical

Дефект критичен, если вероятно вызовет ОДНО из следующих:

- ошибку импорта BaSYS;
- broken references, невалидные UID, невалидную схему JSON, невалидный JSON, отсутствие обязательных стандартных колонок;
- невозможность создать operation records по утверждённому ТЗ;
- невозможность выполнить базовые acceptance-сценарии из ТЗ;
- противоречие явно утверждённому design или decisions.md;
- редактирование запрещённых локаций: `reference/`, `basys-docs/`, `basys-cursor-rules/`, generated BaSYS skills, `metadata/system/` без явного разрешения;
- для design — отсутствие in-scope/out-of-scope, отсутствие метаобъектной таблицы, невозможность реализации, ссылка на несуществующий kind.

Critical defects блокируют завершение цикла и возвращают работу владельцу ошибки.

### Non-Critical

Не блокируют завершение, фиксируются как notes в финальном отчёте:

- неидеальное, но валидное и понятное именование;
- для design — draft-имена не в финальном snake_case (это уточняется в spec);
- отсутствие nice-to-have полей;
- пропуски в отчётности и dashboards, не требуемые для acceptance;
- методологические улучшения, которые можно вынести в следующий блок;
- UX/form улучшения, не требуемые для базовой работы;
- отсутствие автосуммирования и других вычислений, не требуемых ТЗ.

## Независимость Между Ролями

Платформенный уровень:

- Каждый subagent invocation — child session с изолированным контекстом.
- Primary не видит промежуточные tool calls subagent, только финальный ответ.
- Один subagent не видит контекст другого subagent.

Прикладной уровень (через permissions):

- reviewer и auditor `edit: deny` за исключением своих review/audit файлов.
- subagents `task: deny` — не могут вызывать другие subagents.
- subagents `bash: deny` — не могут читать git history, окружение, запускать helpers.

Дисциплина (через prompt):

- orchestrator не пересказывает findings; передаёт пути к review-файлам.
- auditor получает путь к ТЗ и список изменённых metadata-файлов, но НЕ путь к implementation report.
- reviewer получает путь к одному артефакту и явные критерии, а не общий контекст задачи.

## Связь С Ручным Workflow

Если PM запускает autopilot-команду, это считается explicit authorization на конкретный run и конкретную фазу. PM не утверждает промежуточные артефакты внутри фазы; он принимает решение на PM gate между фазами и в финале Phase 2.

Если автопилот не справился или PM отклонил результат, дальнейшая работа продолжается в ручном workflow согласно `project/docs/workflow.md`.
