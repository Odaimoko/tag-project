/**
 * Reading view / Preview: markdown post-processor for task property syntax.
 *
 * Replaces rendered inline code `` `{key:value}` `` (HTML: <code>{key:value}</code>)
 * with a beautified span. In Reading view, clicks do not enter edit mode and do not
 * trigger "unbeautify"; in other contexts the same span type could be made interactive.
 *
 * This module is used by the root plugin (the one Obsidian loads) so that the
 * post-processor is actually invoked when Obsidian renders markdown.
 */

import type { Plugin } from "obsidian";
import {
    attachShortDelayTooltip,
    TASK_PROPERTY_CLASS,
    TASK_PROPERTY_TOOLTIP,
} from "./task-property-render";

// -----------------------------------------------------------------------------
// Pattern and parsing
// -----------------------------------------------------------------------------

/**
 * Matches task property content inside already-rendered <code> elements.
 * In HTML the backticks are stripped, so we only see the inner text: {key:value}.
 * Captures: (1) key, (2) value.
 */
const PROPERTY_CONTENT_PATTERN = /^\{([^}:]+)\s*:\s*([^}]*)\}$/;

/** CSS class names for the key, separator, and value parts of the beautified span. */
const SPAN_KEY_CLASS = "tpm-task-property-key";
const SPAN_SEP_CLASS = "tpm-task-property-sep";
const SPAN_VALUE_CLASS = "tpm-task-property-value";

/**
 * Checks if the given trimmed text looks like a task property and returns parsed key/value.
 * Returns null if the text does not match (avoids running the regex when unnecessary).
 */
function parseTaskPropertyFromCodeText(text: string): { key: string; value: string } | null {
    const trimmed = text.trim();
    // Quick reject: must contain "{" and ":" to match {key:value}
    if (!trimmed.includes("{") || !trimmed.includes(":")) return null;
    const m = trimmed.match(PROPERTY_CONTENT_PATTERN);
    if (!m) return null;
    return {
        key: m[1].trim(),
        value: (m[2] ?? "").trim(),
    };
}

// -----------------------------------------------------------------------------
// Span builder for Reading / Preview
// -----------------------------------------------------------------------------

/** Options when creating a task-property span in the reading view. */
export interface TaskPropertySpanOptions {
    /**
     * When true, the span is non-interactive: click does not "unbeautify" and
     * does not propagate (so the view does not switch to edit mode).
     * Cursor is set to default instead of pointer.
     */
    readingView?: boolean;
}

/**
 * Builds a single beautified span for one task property (key + ":" + value).
 * Used by the markdown post-processor for Reading/Preview.
 *
 * @param key - Property key (e.g. "status").
 * @param value - Property value (e.g. "done").
 * @param onUnbeautifyThis - Called when the user clicks the span to revert to raw <code> (only when not readingView).
 * @param options - Optional; use { readingView: true } for non-interactive display in Reading view.
 * @returns The span element to replace the original <code> with.
 */
function createTaskPropertySpan(
    key: string,
    value: string,
    onUnbeautifyThis: (spanEl: HTMLElement) => void,
    options?: TaskPropertySpanOptions,
): HTMLElement {
    const readingView = options?.readingView === true;

    const span = document.createElement("span");
    span.className = TASK_PROPERTY_CLASS;
    span.setAttribute("data-key", key);
    span.setAttribute("data-value", value);
    span.style.cursor = readingView ? "default" : "pointer";
    attachShortDelayTooltip(span, TASK_PROPERTY_TOOLTIP);

    const keyEl = document.createElement("span");
    keyEl.className = SPAN_KEY_CLASS;
    keyEl.textContent = key;

    const sep = document.createElement("span");
    sep.className = SPAN_SEP_CLASS;
    sep.textContent = ": ";

    const valEl = document.createElement("span");
    valEl.className = SPAN_VALUE_CLASS;
    valEl.textContent = value;

    span.appendChild(keyEl);
    span.appendChild(sep);
    span.appendChild(valEl);

    span.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!readingView) {
            onUnbeautifyThis(span);
        }
    });

    return span;
}

/**
 * Replaces a beautified span with the original inline code node (for "unbeautify" in Preview).
 * Used as the click callback when readingView is false; not used in Reading view.
 */
function replaceSpanWithCode(spanEl: HTMLElement): void {
    const key = spanEl.getAttribute("data-key") ?? "";
    const value = spanEl.getAttribute("data-value") ?? "";
    const code = document.createElement("code");
    code.textContent = `{${key}:${value}}`;
    spanEl.parentNode?.replaceChild(code, spanEl);
}

// -----------------------------------------------------------------------------
// Public API: register post-processor on the root plugin
// -----------------------------------------------------------------------------

/**
 * Registers the Reading/Preview markdown post-processor on the given plugin.
 * Must be called with the root plugin (the one Obsidian loads), otherwise
 * Obsidian will not run this processor when rendering markdown in Reading view.
 *
 * The processor finds every <code> whose text matches {key:value}, replaces it
 * with a beautified span, and in this context uses readingView: true so that
 * clicks do not enter edit mode or unbeautify.
 *
 * @param plugin - The root Obsidian plugin instance (e.g. the main Tag Project plugin).
 */
export function registerTaskPropertyReadingViewPostProcessor(plugin: Plugin): void {
    plugin.registerMarkdownPostProcessor((el: HTMLElement) => {
        el.querySelectorAll("code").forEach((codeEl: HTMLElement) => {
            const text = codeEl.textContent ?? "";
            const parsed = parseTaskPropertyFromCodeText(text);
            if (!parsed) return;

            const span = createTaskPropertySpan(
                parsed.key,
                parsed.value,
                replaceSpanWithCode,
                { readingView: true },
            );
            codeEl.parentNode?.replaceChild(span, codeEl);
        });
    });
}
