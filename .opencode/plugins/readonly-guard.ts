import type { Plugin } from "@opencode-ai/plugin"

// Hard fallback that blocks writes into documentation / reference roots that
// must stay read-only for the project:
//   - basys-docs/         (local clone of official BaSYS docs)
//   - basys-cursor-rules/ (read-only source of generated BaSYS skills)
//   - reference/          (read-only export from another BaSYS installation)
//
// Permission rules in opencode.json / agent frontmatter are the primary line
// of defence. This plugin is a belt-and-braces guard for the `edit`, `write`
// and `apply_patch` tools regardless of pattern coverage.
//
// Scope:
//   - Blocks: edit, write, apply_patch when the target path falls under one of
//     the read-only prefixes.
//   - Does NOT block: read, glob, grep, list, bash. Reads from these dirs are
//     expected and required by skills (e.g. basys-docs lookup).
//   - Does NOT inspect bash commands (e.g. `rm -rf basys-docs`). Use
//     permission.bash on each agent to prevent destructive shell calls.

const READ_ONLY_PREFIXES = [
  "basys-docs/",
  "basys-cursor-rules/",
  "reference/",
]

const WRITE_TOOLS = new Set(["edit", "write"])

function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "")
}

function matchedPrefix(p: string): string | null {
  const n = normalize(p)
  for (const prefix of READ_ONLY_PREFIXES) {
    const bare = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix
    if (n === bare) return prefix
    if (n.startsWith(prefix)) return prefix
    if (n.includes("/" + prefix)) return prefix
  }
  return null
}

function readPath(args: Record<string, unknown>): string {
  const candidates = ["filePath", "path", "file"]
  for (const key of candidates) {
    const value = args[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return ""
}

function collectPatchTargets(patchText: string): string[] {
  const targets: string[] = []
  const re = /^\*\*\* (?:Update|Add|Delete) File:\s*(.+)$/gm
  let match: RegExpExecArray | null
  while ((match = re.exec(patchText)) !== null) {
    targets.push(match[1].trim())
  }
  return targets
}

export const ReadonlyGuard: Plugin = async () => {
  return {
    "tool.execute.before": async (input, output) => {
      const args = (output.args ?? {}) as Record<string, unknown>

      if (WRITE_TOOLS.has(input.tool)) {
        const target = readPath(args)
        if (target) {
          const hit = matchedPrefix(target)
          if (hit) {
            throw new Error(
              `readonly-guard: '${input.tool}' on '${target}' blocked — '${hit}' is read-only.`,
            )
          }
        }
        return
      }

      if (input.tool === "apply_patch") {
        const patch = typeof args.patchText === "string" ? args.patchText : ""
        if (!patch) return
        for (const target of collectPatchTargets(patch)) {
          const hit = matchedPrefix(target)
          if (hit) {
            throw new Error(
              `readonly-guard: apply_patch target '${target}' blocked — '${hit}' is read-only.`,
            )
          }
        }
      }
    },
  }
}
