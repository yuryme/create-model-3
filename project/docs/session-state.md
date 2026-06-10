# Session State

> Operational memory for the current OpenCode run. Keep this file short. It is not a project history archive.

## Current Task

- Topic: OpenCode memory stabilization.
- Goal: prevent important run state from being lost during session compaction.

## Status

- `session-state.md` introduced as the current-run memory file.
- `.opencode/plugins/session-memory.ts` injects this file and core context files into OpenCode compaction context.
- Durable rules are documented in `AGENTS.md` and `project/docs/patterns/metadata-workflow.md`.
- Verification done: `grep` finds the new memory references; `git status` shows only expected new/modified files plus pre-existing unrelated workspace changes.

## PM Decisions

- Stay on OpenCode; do not migrate the project to Claude Code.
- Treat Claude Code review/action plan as a source of pain points and ideas, not as a migration plan.
- Memory/compaction instability is important enough to address first.
- Optimize session startup token use: read fast-start files first, and load workflow/metadata pattern files lazily only when the task needs them.

## Active Files

- `project/docs/session-state.md`
- `.opencode/plugins/session-memory.ts`
- `AGENTS.md`
- `project/docs/patterns/metadata-workflow.md`

## Next Steps

- Restart OpenCode after this change so the new plugin is loaded.
- During long runs, update this file after important PM decisions and before risky compaction points.
- At the end of a meaningful work chapter, move durable facts into `PROJECT_CONTEXT.md`, `OPEN_QUESTIONS.md`, ADRs or patterns, then reset this file for the next run.

## Blockers / Risks

- `experimental.session.compacting` is an OpenCode experimental plugin hook; if OpenCode changes the hook contract, this plugin may need adjustment.
