import { STask } from "obsidian-dataview";

/**
 * Task properties syntax: the whole pair must be wrapped in backticks, e.g. `{key:value}`. Bare {x:y} is not valid.
 * Space around `:` is ignored. Use cases: `{completion_time: XXX}`, `{due_time: XXX}`, `{task_id: XXX}`.
 * Parsed result is a flat Record<string, string>; later occurrences override earlier.
 */

/** Matches `` `{key:value}` ``: backtick, `{`, key (no `:` or `}`), optional spaces, `:`, optional spaces, value (to `}`), `}`, backtick. */
const PROPERTY_PATTERN = /\`\{([^}:]+)\s*:\s*([^}]*)\}\`/g;

/**
 * Parse all `{key:value}` pairs from a string. Keys and values are trimmed.
 * Later pairs override earlier ones for the same key.
 */
export function parseTaskPropertiesFromText(text: string): Record<string, string> {
    const out: Record<string, string> = {};
    if (!text || typeof text !== "string") return out;
    let m: RegExpExecArray | null;
    PROPERTY_PATTERN.lastIndex = 0;
    while ((m = PROPERTY_PATTERN.exec(text)) !== null) {
        const key = m[1].trim();
        const value = (m[2] ?? "").trim();
        out[key] = value;
    }
    return out;
}

/** Sublist item has .text (STask and SListEntry both do). */
function getTextFromSublistItem(item: { text?: string }): string {
    return item?.text ?? "";
}

/**
 * Parse task properties from the task's own text and from all sublist items' text.
 * Sublist space is used to mark the task with properties (e.g. under #tpm/workflow/product_feature).
 * Later values override earlier for the same key (sublist is merged after task text).
 */
export function parseTaskPropertiesFromSTask(task: STask): Record<string, string> {
    const out: Record<string, string> = {};
    // 1) From task.text
    Object.assign(out, parseTaskPropertiesFromText(task.text));
    // 2) From sublist (children)
    const children = (task as { children?: Array<{ text?: string }> }).children;
    if (Array.isArray(children)) {
        for (const child of children) {
            Object.assign(out, parseTaskPropertiesFromText(getTextFromSublistItem(child)));
        }
    }
    return out;
}
