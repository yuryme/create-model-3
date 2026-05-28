# Project Workflow

Этот документ фиксирует обязательный процесс работы PM, PM-chat, `analyst` и `engineer` в проекте.

## Участники

- **PM** — пользователь; принимает бизнес-решения, границы scope и функциональный результат на стенде BaSYS. PM не обязан читать metadata JSON и не утверждает технические файлы построчно.
- **PM-chat** — координационный чат; проверяет артефакты, формулирует замечания, ведёт контекст и возвращает работу владельцу ошибки.
- **analyst** — OpenCode agent; проектирует методики и ТЗ, не редактирует `project/metadata/`.
- **engineer** — OpenCode agent; пишет планы реализации, редактирует `project/metadata/`, готовит отчёт и инструкцию импорта.

## Рабочая Модель И Артефакты

`project/metadata/` — рабочее зеркало текущего стенда BaSYS, а не папка для promoted-результатов экспериментов. Перед существенной задачей metadata синхронизируются с фактическим стендом; после реализации они импортируются/проверяются на стенде и снова считаются текущим рабочим состоянием.

PM принимает результат через поведение системы на стенде: импорт, открытие форм, создание/изменение объектов, проведение операций, отчёты и другие acceptance-сценарии. Техническую корректность JSON, UID, ссылок, схем, reserved words и запрещённых путей проверяют агент и инструменты.

Процессные артефакты не должны засорять основной контекст проекта. В `project/docs/specs/` остаются только активные или действительно нужные approved-ТЗ/инструкции. Длинные design/review/audit/report файлы экспериментов после завершения либо удаляются, либо архивируются вне активного контекста. Устойчивые выводы переносятся в `project/docs/patterns/`, ADR, workflow или skills.

## Основная схема

```text
PM / пользователь
  |
  v
PM-chat
  |  уточняет ввод, собирает контекст, готовит поручение
  v
analyst
  |  пишет методику <sp-id>-design.md, если задача крупная
  v
PM-chat review методики
  |-- approved -----------------------------|
  |-- rejected / needs changes --> analyst -|
  v
analyst
  |  пишет ТЗ <sp-id>.md, status: review
  v
PM-chat review ТЗ
  |-- approved -----------------------------|
  |-- rejected / needs changes --> analyst -|
  v
ТЗ status: approved
  |
  v
engineer
  |  пишет implementation plan <sp-id>-plan.md, status: review
  v
PM-chat review plan
  |-- approved -----------------------------|
  |-- rejected / needs changes --> engineer |
  v
plan status: approved
  |
  v
engineer
  |  реализует JSON / .bjs / формы / меню / отчёты
  v
engineer report
  |  diff + checklist A/B + import instruction
  v
PM-chat acceptance
  |-- accepted -----------------------------|
  |-- rejected / defects ------> engineer --|
  v
PM / BaSYS стенд
  |  импорт и ручная проверка acceptance-сценариев
  v
Final acceptance
  |  рабочая metadata подтверждена стендом, уроки перенесены в правила, commit + push по решению PM
```

## Возвраты

Если PM-chat находит проблему, он не исправляет артефакт за исполнителя. Он формулирует замечание и возвращает работу владельцу ошибки.

```text
Методика rejected
  -> analyst исправляет методику
  -> PM-chat review методики повторно
```

```text
ТЗ rejected
  -> analyst исправляет ТЗ
  -> PM-chat review ТЗ повторно
```

```text
Plan rejected
  -> engineer исправляет plan
  -> PM-chat review plan повторно
```

```text
Implementation rejected на review diff
  -> engineer исправляет реализацию
  -> engineer report повторно
  -> PM-chat acceptance повторно
```

```text
Implementation rejected на стенде BaSYS
  -> PM-chat формулирует дефекты
  -> engineer исправляет реализацию
  -> повторный import/test
```

## Возврат к владельцу ошибки

- Ошибка бизнес-смысла, scope или методики -> `analyst`.
- Ошибка ТЗ -> `analyst`.
- Ошибка implementation plan -> `engineer`.
- Ошибка metadata, `.bjs`, форм, меню, отчётов или инструкции импорта -> `engineer`.
- Ошибка процесса проекта -> PM-chat формулирует вопрос, PM принимает решение.
- Ошибка generated BaSYS skill -> upstream `BaSYS.CursorRules`; локально generated skill не править.

## Поздняя архитектурная ошибка

Если на этапе engineer plan или реализации выясняется, что проблема не техническая, а в постановке или архитектуре ТЗ, работа возвращается не engineer, а analyst.

```text
engineer plan / implementation
  -> PM-chat обнаруживает архитектурную ошибку в постановке
  -> analyst пересматривает методику / ТЗ
  -> PM-chat review
  -> engineer корректирует plan или пишет plan заново
```

## Границы PM-chat

PM-chat:

- диагностирует проблемы;
- формулирует замечания;
- возвращает работу на правильный этап;
- ведёт `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md`, ADR и workflow-документы по согласованию;
- не подменяет analyst при проектировании;
- не подменяет engineer при реализации metadata.

## Autopilot Режимы

Этот workflow — основной процесс. Помимо него существуют автопилот-режимы, описанные в `project/docs/autopilot-workflow.md`:

- **Quick metadata** — один чат, короткое задание, реализация в `project/metadata/`, self-check. Подходит для простых изменений.
- **Single-agent autopilot** — один primary agent проходит цикл с внутренними ролями и self-review. Подходит для средних задач и известных паттернов.
- **Multi-agent autopilot** — orchestrator плюс изолированные subagents (analyst, reviewer, engineer, auditor). Подходит только для сложных или рискованных задач, где цена независимой экспертизы оправдана.

Запуск автопилот-команды считается explicit PM authorization на конкретный прогон. PM не утверждает промежуточные JSON-файлы пошагово; он принимает или отклоняет функциональный результат на стенде. Если автопилот не справился, работа продолжается в ручном workflow.

Критерии выбора режима зафиксированы в `project/docs/autopilot-workflow.md`.

## Git Discipline

Коммиты должны быть смысловыми и не смешивать разные типы работ.

Рекомендуемые типы коммитов:

- OpenCode infrastructure changes;
- CursorRules sync;
- accepted specs;
- approved implementation plans;
- metadata implementation;
- extracted process/pattern lessons.

Не смешивать в одном коммите:

- изменения OpenCode-инфраструктуры;
- generated BaSYS skills sync;
- бизнес-реализации `project/metadata/`;
- документацию процесса.
