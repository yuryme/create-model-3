# Project Bootstrap Workflow

Повторяемый процесс создания нового BaSYS/OpenCode workspace из завершенного проекта-шаблона.

## Цель

Создать чистый новый workspace, который наследует только переиспользуемую инфраструктуру:

- OpenCode config, agents, commands and skills;
- workflow, ADR, glossary, templates and durable patterns;
- local read-only corpora when needed;
- empty `project/metadata/` mirror for the future BaSYS stand.

Нельзя переносить активные metadata, specs, reports, inbox materials или контекст старой предметной задачи, если PM явно не просит обратное.

## Когда Использовать

- Завершен текущий BaSYS-проект и нужен следующий чистый workspace.
- Нужно сохранить OpenCode/BaSYS-инфраструктуру без старого бизнес-контекста.
- Нужно подготовить новый Git repository and optional GitHub remote.

## Inputs

- Source workspace path.
- Target workspace path.
- Target project name.
- Optional GitHub remote URL or repository name.
- Decision: copy local read-only corpora physically or leave them for later sync.
- Decision: initialize Git and push now or stop after local preparation.

## Approval Gates

Перед созданием, изменением или удалением файлов assistant must show a concise action plan and wait for explicit PM approval.

Additional mandatory approval points:

- before creating the target directory if it does not exist;
- before copying files into the target workspace;
- before deleting or excluding copied files from Git index;
- before initial commit;
- before configuring remote or pushing to GitHub.

## Allowlist Copy

Copy only reusable infrastructure by default:

- `AGENTS.md`
- `opencode.json`
- `.opencode/agents/`
- `.opencode/commands/`, excluding project-specific commands
- `.opencode/skills/`
- `project/docs/workflow.md`
- `project/docs/autopilot-workflow.md`
- `project/docs/patterns/`
- `project/docs/glossary.md`
- `project/docs/decisions.md`
- `project/docs/specs/_*.md`
- `project/docs/interviews/`
- `basys-docs-index.md`

Create fresh target files:

- `PROJECT_CONTEXT.md`
- `OPEN_QUESTIONS.md`
- `project/metadata/.gitkeep`
- `inbox/.gitkeep`
- `.gitignore` entries for local read-only corpora and local settings

## Default Exclusions

Do not copy by default:

- old `project/metadata/` contents;
- old `project/docs/specs/` task files except templates;
- old `project/docs/project-stage-summary.md` unless PM explicitly wants an archive;
- old `inbox/` contents;
- task-specific `.opencode/commands/`;
- experiment review/audit/report/plan files;
- `.git/` history from the source workspace.

## Local Read-Only Corpora

`reference/`, `basys-docs/`, and `basys-cursor-rules/` may be copied physically for local convenience, but they must stay ignored by Git unless PM explicitly approves a different policy.

Default `.gitignore` entries:

```gitignore
/reference/
/basys-docs/
/basys-cursor-rules/
.claude/settings.local.json
.opencode/settings.local.json
```

If any corpus was accidentally staged, remove it from the index without deleting local files.

## Required Checks Before Commit

Run checks equivalent to:

```powershell
git status --short --ignored
git diff --cached --stat
git diff --cached --check
git diff --cached --name-only
git grep --cached -n -E "token|Password|secret|api[_-]?key|Bearer|PRIVATE KEY"
git grep --cached -n -E "base-model|speech-analytics|recognition_usage|recognition_package|recognition_minutes|Пакет минут|Расход минут"
```

Interpretation:

- Secret-marker matches in generic documentation may be acceptable only after reading the exact line.
- Old project name references are acceptable only when they document provenance, not when they keep stale active instructions.
- No `reference/`, `basys-docs/`, or `basys-cursor-rules/` path should be tracked by default.

## Git And GitHub

Default local Git flow:

1. `git init`
2. make branch `main`
3. stage only intended files
4. commit `Initialize <project-name> workspace`

Default GitHub flow after PM approval:

1. add `origin` to the approved URL
2. `git push -u origin main`
3. verify remote refs

Do not create a GitHub repository blindly if the CLI/tooling is unavailable or visibility is unknown. Ask PM whether to use an existing repository, create a public repository, create a private repository, or stop with local commands.

## Completion Criteria

- Target workspace exists and opens from its own root.
- `PROJECT_CONTEXT.md` and `OPEN_QUESTIONS.md` describe the new project, not the old one.
- `project/metadata/` is empty except `.gitkeep`.
- Old task artifacts are absent from tracked files.
- Local read-only corpora are ignored or absent.
- Initial commit exists.
- Optional remote push is verified when requested.
