# Карта документации BaSYS (`basys-docs/ru/`)

> Наш собственный указатель официальной документации платформы BaSYS, клонированной из репозитория [BaSysTeam/BaSys.Docs](https://github.com/BaSysTeam/BaSys.Docs) в папку `basys-docs/`.
> AI-ассистент использует **этот файл как карту**, конкретные страницы читает точечно через `Read`.
> Файл живёт **снаружи** клонированной папки, чтобы `git pull` его не затирал.

**Текущая версия документации:** коммит `7efaffe` от 2026-05-20
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
| [basys-docs/ru/reporting/printForms.md](basys-docs/ru/reporting/printForms.md) | **Печатные формы**: Excel-шаблоны, привязанные к конкретному метаобъекту и экземпляру объекта; AutoRetrieveData, источники данных, параметры и маркеры ClosedXML.Report |
| [basys-docs/ru/reporting/filters.md](basys-docs/ru/reporting/filters.md) | ⚠️ **Файл-заглушка** — только заголовок «Настраиваемые фильтры», содержание не написано |

---

## 7. Пользовательский интерфейс (`userInterface/`)

| Файл | Кратко |
|---|---|
| [basys-docs/ru/userInterface/index.md](basys-docs/ru/userInterface/index.md) | Оглавление раздела |
| [basys-docs/ru/userInterface/introduction.md](basys-docs/ru/userInterface/introduction.md) | Способы создания форм: автоматические (Vue.js 3 + PrimeVue 3, рекомендованы по умолчанию) и программируемые компоненты |
| [basys-docs/ru/userInterface/programmableComponents.md](basys-docs/ru/userInterface/programmableComponents.md) | Программируемые компоненты: Vue.js 3 Options API + PrimeVue 3, props рендера, глобальные функции, inject-сервисы и перечень доступных компонентов |
| [basys-docs/ru/userInterface/formConstructor.md](basys-docs/ru/userInterface/formConstructor.md) | **Конструктор форм**: декларативное дерево `ConstructorFormSettings.Root`, PrimeFlex-сетка, компоненты, привязки `vModel`/`v-bind`/`@Event`, стандартные команды и helper-сборщики форм |
| [basys-docs/ru/userInterface/bsViewTitleComponent.md](basys-docs/ru/userInterface/bsViewTitleComponent.md) | Компонент `BsViewTitle` — заголовок страницы с индикатором ожидания и признаком модифицированности |
| [basys-docs/ru/userInterface/bsTextComponent.md](basys-docs/ru/userInterface/bsTextComponent.md) | Компонент `BsText` / `bs-text` — произвольный текстовый блок в формах-конструкторах |
| [basys-docs/ru/userInterface/bsLabelComponent.md](basys-docs/ru/userInterface/bsLabelComponent.md) | Компонент `BsLabel` / `bs-label` — подпись к полю или элементу формы |
| [basys-docs/ru/userInterface/bsFormFieldComponent.md](basys-docs/ru/userInterface/bsFormFieldComponent.md) | Компонент `BsFormField` / `bs-form-field` — контейнер поля ввода с подписью и признаком обязательности |
| [basys-docs/ru/userInterface/bsInputPatternComponent.md](basys-docs/ru/userInterface/bsInputPatternComponent.md) | Компонент `BsInputPattern` / `bs-input-pattern` — поле ввода с маской |
| [basys-docs/ru/userInterface/bsCollapsibleGroupComponent.md](basys-docs/ru/userInterface/bsCollapsibleGroupComponent.md) | Компонент `BsCollapsibleGroup` / `bs-collapsible-group` — сворачиваемая группа элементов формы |
| [basys-docs/ru/userInterface/bsObjectReferenceSelectComponent.md](basys-docs/ru/userInterface/bsObjectReferenceSelectComponent.md) | Компонент `BsObjectReferenceSelect` / `bs-object-reference-select` — выбор объектной ссылки с props, событиями и поведением |
| [basys-docs/ru/userInterface/bsDetailsTableComponent.md](basys-docs/ru/userInterface/bsDetailsTableComponent.md) | Компонент `BsDetailsTable` / `bs-details-table` — редактируемая табличная часть документа или справочника |
| [basys-docs/ru/userInterface/bsTableViewComponent.md](basys-docs/ru/userInterface/bsTableViewComponent.md) | Компонент `BsTableView` / `bs-table-view` — табличное представление списка с колонками, фильтрами и командами |
| [basys-docs/ru/userInterface/pvBadgeComponent.md](basys-docs/ru/userInterface/pvBadgeComponent.md) | Компонент PrimeVue `Badge` / `pv-badge` — бейдж, счётчик или статус |
| [basys-docs/ru/userInterface/pvButtonComponent.md](basys-docs/ru/userInterface/pvButtonComponent.md) | Компонент PrimeVue `Button` / `pv-button` — кнопка формы с props, событиями и настройками конструктора |
| [basys-docs/ru/userInterface/pvButtonGroupComponent.md](basys-docs/ru/userInterface/pvButtonGroupComponent.md) | Компонент PrimeVue `ButtonGroup` / `pv-button-group` — группа кнопок |
| [basys-docs/ru/userInterface/pvSplitButtonComponent.md](basys-docs/ru/userInterface/pvSplitButtonComponent.md) | Компонент PrimeVue `SplitButton` / `pv-split-button` — кнопка с выпадающим меню |
| [basys-docs/ru/userInterface/pvSplitButtonItemComponent.md](basys-docs/ru/userInterface/pvSplitButtonItemComponent.md) | Компонент `SplitButtonItem` / `pv-split-button-item` — пункт меню для `pv-split-button` |
| [basys-docs/ru/userInterface/pvDividerComponent.md](basys-docs/ru/userInterface/pvDividerComponent.md) | Компонент PrimeVue `Divider` / `pv-divider` — горизонтальный или вертикальный разделитель |
| [basys-docs/ru/userInterface/pvToolbarComponent.md](basys-docs/ru/userInterface/pvToolbarComponent.md) | Компонент PrimeVue `Toolbar` / `pv-toolbar` — панель инструментов со слотами `start` и `end` |
| [basys-docs/ru/userInterface/pvTabViewComponent.md](basys-docs/ru/userInterface/pvTabViewComponent.md) | Компонент PrimeVue `TabView` / `pv-tab-view` — набор вкладок |
| [basys-docs/ru/userInterface/pvTabPanelComponent.md](basys-docs/ru/userInterface/pvTabPanelComponent.md) | Компонент PrimeVue `TabPanel` / `pv-tab-panel` — вкладка внутри `pv-tab-view` |
| [basys-docs/ru/userInterface/pvCalendarComponent.md](basys-docs/ru/userInterface/pvCalendarComponent.md) | Компонент PrimeVue `Calendar` / `pv-calendar` — поле ввода даты или времени |
| [basys-docs/ru/userInterface/pvCheckboxComponent.md](basys-docs/ru/userInterface/pvCheckboxComponent.md) | Компонент PrimeVue `Checkbox` / `pv-checkbox` — флажок |
| [basys-docs/ru/userInterface/pvInputSwitchComponent.md](basys-docs/ru/userInterface/pvInputSwitchComponent.md) | Компонент PrimeVue `InputSwitch` / `pv-input-switch` — переключатель |
| [basys-docs/ru/userInterface/pvInputTextComponent.md](basys-docs/ru/userInterface/pvInputTextComponent.md) | Компонент PrimeVue `InputText` / `pv-input-text` — однострочное текстовое поле |
| [basys-docs/ru/userInterface/pvTextareaComponent.md](basys-docs/ru/userInterface/pvTextareaComponent.md) | Компонент PrimeVue `Textarea` / `pv-input-textarea` — многострочное текстовое поле |
| [basys-docs/ru/userInterface/pvInputNumberComponent.md](basys-docs/ru/userInterface/pvInputNumberComponent.md) | Компонент PrimeVue `InputNumber` / `pv-input-number` — поле ввода числа |

---

## Правила использования для AI-ассистента

1. **Первичный источник правды — файлы в `basys-docs/ru/`**. Любые сведения о платформе сверять по этому индексу с оригинальными страницами; не полагаться на пересказы и на собственную память.
2. **При генерации JSON-метаданных или JS-выражений** — открывать соответствующую страницу через `Read`, не полагаться на память.
3. **Помеченные ⚠️ файлы** — пустые или незаполненные. Если требуется их содержимое, оно отсутствует в текущей версии документации (нужно перепроверить после следующего `git pull`).
4. **Обновление документации:** `cd basys-docs && git pull` — при изменении набора страниц пересобрать этот индекс.
