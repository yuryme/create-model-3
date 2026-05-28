---
name: basys-cursor-rules-sync
description: Синхронизация OpenCode BaSYS skills из локального клона BaSYS.CursorRules. Использовать при обновлении правил создания/редактирования BaSYS metadata, JSON, форм, команд, регистров, отчётов и workflow.
---

# BaSYS CursorRules Sync

Этот skill описывает процедуру синхронизации generated OpenCode skills из репозитория коллег `BaSysTeam/BaSYS.CursorRules`.

## Source Of Truth

- Remote: `https://github.com/BaSysTeam/BaSYS.CursorRules`
- Branch: `main`
- Local clone: `basys-cursor-rules/`

`basys-cursor-rules/` — read-only source clone. Не редактировать файлы внутри вручную.

## Managed OpenCode Skills

Generated from CursorRules and not edited manually:

- `.opencode/skills/basys-metadata/`
- `.opencode/skills/excel-import-to-detail/`
- `.opencode/skills/create-list-form/`
- `.opencode/skills/create-edit-form/`

Project-owned operational skills, not generated from CursorRules:

- `.opencode/skills/basys-docs/`
- `.opencode/skills/basys-cursor-rules-sync/`
- `.opencode/skills/client-interview/`

## Mapping

- `.cursor/rules/general-conventions.mdc` -> `.opencode/skills/basys-metadata/SKILL.md`
- `.cursor/rules/commands.mdc` -> `.opencode/skills/basys-metadata/commands.md`
- `.cursor/rules/constructor-forms.mdc` -> `.opencode/skills/basys-metadata/constructor-forms.md`
- `.cursor/rules/data-view-reports.mdc` -> `.opencode/skills/basys-metadata/data-view-reports.md`
- `.cursor/rules/excel-reports.mdc` -> `.opencode/skills/basys-metadata/excel-reports.md`
- `.cursor/rules/menu.mdc` -> `.opencode/skills/basys-metadata/menu.md`
- `.cursor/rules/print-forms.mdc` -> `.opencode/skills/basys-metadata/print-forms.md`
- `.cursor/rules/programmable-forms.mdc` -> `.opencode/skills/basys-metadata/programmable-forms.md`
- `.cursor/rules/records-creation.mdc` -> `.opencode/skills/basys-metadata/records-creation.md`
- `.cursor/rules/workflows.mdc` -> `.opencode/skills/basys-metadata/workflows.md`
- `.cursor/skills/excel-import-to-detail/SKILL.md` -> `.opencode/skills/excel-import-to-detail/SKILL.md`
- `.cursor/skills/create-list-form/SKILL.md` -> `.opencode/skills/create-list-form/SKILL.md`
- `.cursor/skills/create-edit-form/SKILL.md` -> `.opencode/skills/create-edit-form/SKILL.md`

## Sync Procedure

1. Check source status: `git -C basys-cursor-rules status --short --branch`.
2. Pull source updates: `git -C basys-cursor-rules pull --ff-only origin main`.
3. Regenerate managed OpenCode skills mechanically from the mapping above.
4. Preserve only OpenCode wrapper changes: frontmatter, generated source header, metadata-root path mapping (`CursorRules root` -> `project/metadata/`), and relative link rewrites from `../../rules/*.mdc` to `../basys-metadata/*.md`.
5. Do not change the meaning of CursorRules content.
6. Show PM the diff in generated skills.
7. Commit generated skills to this repository only after PM approval.

## Generated Header

Every generated file must include:

- source repo URL;
- branch;
- source commit;
- source file;
- sync date;
- `DO NOT EDIT MANUALLY` notice.

## Safety

If a generated rule appears wrong, do not patch it locally. Report the issue to PM so it can be fixed upstream in `BaSYS.CursorRules`.
