# Карта документации BaSYS (`basys-docs/ru/`)

> Наш собственный указатель официальной документации платформы BaSYS, клонированной из репозитория [BaSysTeam/BaSys.Docs](https://github.com/BaSysTeam/BaSys.Docs) в папку `basys-docs/`.
> AI-ассистент использует **этот файл как карту**, конкретные страницы читает точечно через `Read`.
> Файл живёт **снаружи** клонированной папки, чтобы `git pull` его не затирал.

**Текущая версия документации:** коммит `743a183` от 2026-05-14
**Локальный путь к источнику:** `basys-docs/ru/`

---

## Корневая страница

| Файл | Кратко |
|---|---|
| [basys-docs/ru/index.md](basys-docs/ru/index.md) | Корневое оглавление документации: BaSYS как LowCode-платформа на слое метаданных, ссылки на все разделы |

---

## 1. Начало работы (`gettingStarted/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/gettingStarted/index.md](basys-docs/ru/gettingStarted/index.md) | Оглавление раздела |
| [basys-docs/ru/gettingStarted/installation.md](basys-docs/ru/gettingStarted/installation.md) | Установка: Docker + PostgreSQL или MS SQL |
| [basys-docs/ru/gettingStarted/login.md](basys-docs/ru/gettingStarted/login.md) | Вход в систему: URL `<Host>/Identity/Account/Login`, логин + пароль + имя БД |

---

## 2. Метаданные (`metadata/`) — ядро системы, читать в первую очередь

| Файл | Кратко |
|---|---|
| [basys-docs/ru/metadata/index.md](basys-docs/ru/metadata/index.md) | Оглавление раздела |
| [basys-docs/ru/metadata/introduction.md](basys-docs/ru/metadata/introduction.md) | Двухуровневая модель метаданных: виды (Kind) и объекты (Object). Флаги `storeData` / `useForms`. DataObject vs ViewObject |
| [basys-docs/ru/metadata/dataObject.md](basys-docs/ru/metadata/dataObject.md) | Полное описание структуры `DataObject`: все поля верхнего уровня (uid, name, title, memo, editMethod, orderByExpression, displayExpression, listFormUid, itemFormUid, header, detailTables) |
| [basys-docs/ru/metadata/metaObjectTable.md](basys-docs/ru/metadata/metaObjectTable.md) | Структура `MetaObjectTable` (шапка и табличные части): uid, name, title, memo, columns |
| [basys-docs/ru/metadata/metaObjectTableColumn.md](basys-docs/ru/metadata/metaObjectTableColumn.md) | Структура `MetaObjectTableColumn`: name, title, formula, itemsSource, isStandard, renderSettings, dataSettings |
| [basys-docs/ru/metadata/recordsCreation.md](basys-docs/ru/metadata/recordsCreation.md) | **Проведение по регистрам.** Флаг `canCreateRecords`, структура `RecordsSettings`, направления Plus/Minus, источники записей (header / табличная часть / RecordsSource) |
| [basys-docs/ru/metadata/menu.md](basys-docs/ru/metadata/menu.md) | Объект вида `Menu`: иерархия пунктов, режим автозаполнения (`autoFill`), интеграция с PrimeVue MegaMenu |

---

## 3. Вычисления / язык формул (`calculations/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/calculations/index.md](basys-docs/ru/calculations/index.md) | Введение: язык JavaScript, библиотека BaSYS.Fx, обзор разделов |
| [basys-docs/ru/calculations/methodsIndex.md](basys-docs/ru/calculations/methodsIndex.md) | **Алфавитный указатель методов** библиотеки BaSYS.Fx — таблица «объект → метод → описание → ссылка» |
| [basys-docs/ru/calculations/dataTable.md](basys-docs/ru/calculations/dataTable.md) | Класс `DataTable`: хранение и обработка табличных данных, fluent-API (filter, sort, groupBy, агрегаты) |
| [basys-docs/ru/calculations/dataTableColumn.md](basys-docs/ru/calculations/dataTableColumn.md) | Структура колонки `DataTable`: name, dataType (string/number/date/boolean), defaultValue |
| [basys-docs/ru/calculations/dataTableJoins.md](basys-docs/ru/calculations/dataTableJoins.md) | Соединения таблиц: innerJoin, leftJoin, rightJoin, fullJoin |
| [basys-docs/ru/calculations/dataTableDistribution.md](basys-docs/ru/calculations/dataTableDistribution.md) | Методы `distributeFifo` / `distributeLifo` — распределение по партиям (классика: списание себестоимости) |
| [basys-docs/ru/calculations/groupingColumn.md](basys-docs/ru/calculations/groupingColumn.md) | Структура `GroupingColumn` для агрегации в `groupBy`: name, alias, aggregate (avg/count/max/min/sum) |
| [basys-docs/ru/calculations/dateFunctions.md](basys-docs/ru/calculations/dateFunctions.md) | Работа с датами: стандартный объект Date + методы BaSYS.Fx (addDays, addMonths, addQuarters и т.д.) |
| [basys-docs/ru/calculations/queryBuilder.md](basys-docs/ru/calculations/queryBuilder.md) | **QueryBuilder** для SQL: функция `from()`, цепочка методов (select/where/parameter/orderBy/groupBy/top), `await query()` возвращает Promise<DataTable> |
| [basys-docs/ru/calculations/otherFunctions.md](basys-docs/ru/calculations/otherFunctions.md) | Прочие функции: `format(value, formatOrOptions)` и др. |
| [basys-docs/ru/calculations/workflowParameter.md](basys-docs/ru/calculations/workflowParameter.md) | Структура `WorkflowParameter` — описание параметров процессов |

---

## 4. Команды (`commands/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/commands/index.md](basys-docs/ru/commands/index.md) | Оглавление раздела |
| [basys-docs/ru/commands/introduction.md](basys-docs/ru/commands/introduction.md) | Введение: программируемые vs стандартные команды. Контекст команды (`$h`, `$t`, функции формы: save, recalculate, refresh, openDialog) |
| [basys-docs/ru/commands/programmableCommands.md](basys-docs/ru/commands/programmableCommands.md) | Программируемые команды: JS-код в подменю «Действия» автоформ; особые случаи — команды подбора и заполнения табличных частей |
| [basys-docs/ru/commands/standardCommands.md](basys-docs/ru/commands/standardCommands.md) | ⚠️ **Файл пустой** (0 байт в коммите 743a183) — стандартные команды пока не задокументированы |

---

## 5. Процессы / Workflows (`workflows/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/workflows/index.md](basys-docs/ru/workflows/index.md) | Оглавление раздела |
| [basys-docs/ru/workflows/introduction.md](basys-docs/ru/workflows/introduction.md) | Введение: процессы как сценарии из шагов, интеграция и автоматизация, фреймворк Workflow-Core, способы запуска (UI/расписание/событие) |
| [basys-docs/ru/workflows/scriptStep.md](basys-docs/ru/workflows/scriptStep.md) | Шаг **Скрипт** (`java_script`): произвольная JS-логика, параметр `Expression` ссылается на `.bjs`-файл |
| [basys-docs/ru/workflows/httpConnectorStep.md](basys-docs/ru/workflows/httpConnectorStep.md) | Шаг **HTTP Connector** (`http_connector`): GET/POST/PUT/PATCH/DELETE, автоматический разбор JSON/XML ответа |
| [basys-docs/ru/workflows/dataObjectLoaderStep.md](basys-docs/ru/workflows/dataObjectLoaderStep.md) | Шаг **Загрузка объекта данных** (`data_object_loader`): создание/обновление DataObject из коллекции, маппинг шапки и табличных частей |
| [basys-docs/ru/workflows/readFileStep.md](basys-docs/ru/workflows/readFileStep.md) | Шаг **Чтение файла** (`read_file`): из файлового хранилища BaSYS по UID, результат — байты или UTF-8 строка |
| [basys-docs/ru/workflows/excelMappingStep.md](basys-docs/ru/workflows/excelMappingStep.md) | Шаг **Мэппинг Excel** (`excel_mapping`): Excel → DataTable по правилам маппинга колонок |
| [basys-docs/ru/workflows/ifStep.md](basys-docs/ru/workflows/ifStep.md) | Шаг **Условие** (`if`): JS-выражение → ветвление на две ветки |
| [basys-docs/ru/workflows/iteratorStep.md](basys-docs/ru/workflows/iteratorStep.md) | Шаг **Итератор** (`iterator`): цикл по коллекции, парный с `iterator_stop` |
| [basys-docs/ru/workflows/smtpSendStep.md](basys-docs/ru/workflows/smtpSendStep.md) | Шаг **Отправить почту** (SMTP): `SmtpClient` из .NET Core, настраиваемое содержимое и параметры подключения |

---

## 6. Отчётность (`reporting/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/reporting/index.md](basys-docs/ru/reporting/index.md) | Оглавление раздела |
| [basys-docs/ru/reporting/introduction.md](basys-docs/ru/reporting/introduction.md) | Введение: два стандартных вида — **Панель данных** (рекомендуется по умолчанию) и **Отчёт Excel** (для регламентированных макетов) |
| [basys-docs/ru/reporting/dataView.md](basys-docs/ru/reporting/dataView.md) | **Панели данных**: визуальный конструктор отчётов (графики, диаграммы, индикаторы, таблицы), QueryBuilder + BaSYS.Fx как источники |
| [basys-docs/ru/reporting/excelReport.md](basys-docs/ru/reporting/excelReport.md) | **Отчёт Excel**: макет `.xlsx` с маркерами, библиотека ClosedXML.Report, используется для регламентированной отчётности |
| [basys-docs/ru/reporting/filters.md](basys-docs/ru/reporting/filters.md) | ⚠️ **Файл-заглушка** — только заголовок «Настраиваемые фильтры», содержание не написано |

---

## 7. Пользовательский интерфейс (`userInterface/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/userInterface/index.md](basys-docs/ru/userInterface/index.md) | Оглавление раздела |
| [basys-docs/ru/userInterface/introduction.md](basys-docs/ru/userInterface/introduction.md) | Способы создания форм: автоматические (Vue.js 3 + PrimeVue 3, рекомендованы по умолчанию) и программируемые компоненты |
| [basys-docs/ru/userInterface/programmableComponents.md](basys-docs/ru/userInterface/programmableComponents.md) | Программируемые компоненты: Vue.js 3 Options API + PrimeVue 3, для случаев сложной логики |
| [basys-docs/ru/userInterface/bsViewTitleComponent.md](basys-docs/ru/userInterface/bsViewTitleComponent.md) | Компонент `BsViewTitle` — заголовок страницы с индикатором ожидания и признаком модифицированности |

---

## Правила использования для AI-ассистента

1. **Первичный источник правды — файлы в `basys-docs/ru/`**. Любые сведения о платформе сверять по этому индексу с оригинальными страницами; не полагаться на пересказы и на собственную память.
2. **При генерации JSON-метаданных или JS-выражений** — открывать соответствующую страницу через `Read`, не полагаться на память.
3. **Помеченные ⚠️ файлы** — пустые или незаполненные. Если требуется их содержимое, оно отсутствует в текущей версии документации (нужно перепроверить после следующего `git pull`).
4. **Обновление документации:** `cd basys-docs && git pull` — при изменении набора страниц пересобрать этот индекс.
