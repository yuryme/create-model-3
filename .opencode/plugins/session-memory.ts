import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Plugin } from "@opencode-ai/plugin"

const CONTEXT_FILES = [
  { path: "PROJECT_CONTEXT.md", maxChars: 12000 },
  { path: "OPEN_QUESTIONS.md", maxChars: 10000 },
  { path: "project/docs/session-state.md", maxChars: 12000 },
]

async function readSnippet(root: string, relativePath: string, maxChars: number): Promise<string | null> {
  try {
    const fullPath = path.join(root, relativePath)
    const content = (await readFile(fullPath, "utf8")).trim()
    if (!content) return null

    if (content.length <= maxChars) return content
    return content.slice(0, maxChars) + "\n\n[session-memory: truncated]"
  } catch {
    return null
  }
}

export const SessionMemory: Plugin = async ({ directory, worktree }) => {
  const root = worktree || directory

  return {
    "experimental.session.compacting": async (_input, output) => {
      const sections: string[] = []

      for (const file of CONTEXT_FILES) {
        const content = await readSnippet(root, file.path, file.maxChars)
        if (!content) continue

        sections.push(`## ${file.path}\n\n${content}`)
      }

      if (sections.length === 0) return

      output.context.push(
        [
          "# BaSYS Workspace Memory",
          "These files are the durable and current-run state for resuming after compaction.",
          sections.join("\n\n---\n\n"),
        ].join("\n\n"),
      )
    },
  }
}
