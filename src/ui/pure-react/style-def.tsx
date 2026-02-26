// dark light compatible
import React from "react";

export const Color_WorkflowChain = "#6289bb"
export const Color_Workflow_Checkbox = "#5eb95f"
export const iconViewAsAWholeStyle = { display: "inline-flex", alignItems: "center", justifyItems: "center" };

export const varBackgroundPrimary = "var(--background-primary)";
export const varBackgroundSecondary = "var(--background-secondary)"; // -16 is the padding of the obsidian leaf view container. The content will overflow the container's box.
// sticky header see: https://css-tricks.com/position-sticky-and-table-headers/
// top: use 0 to stick to the top of the page/scroll container; use -16 to align with leaf padding.
export const getStickyHeaderStyle = (zIndex = 1, top: number = -16) => {
    return {
        position: "sticky",
        top,
        zIndex,
        background: varBackgroundSecondary,
    } as React.CSSProperties;
}
export const dropdownSelectedColor = "var(--dropdown-selected)";
export const varDropdownNonSelected = "var(--dropdown-non-selected)"
export const centerChildren = {display: "flex", alignItems: "center"}
export const centerChildrenVertStyle = {display: "flex", justifyContent: "center"}
export const centerChildrenHoriVertStyle = {display: "flex", justifyContent: "center", alignItems: "center"}
export const miniGroupSpacing = 2;
export const sameGroupSpacing = 5;
export const diffGroupSpacing = 10;
export const warningColor = "var(--text-warning)";
export const CssClass_Link = "cm-underline";

/** Hover background wrapper for task/workflow/definition links. Use with LinkRowWithHover. */
export const linkRowHoverWrapperStyle: React.CSSProperties = {
    marginLeft: -4,
    marginRight: -4,
    padding: "4px 6px",
    borderRadius: 6,
    transition: "background-color 0.15s ease",
    display: "inline-block",
};

/**
 * Expand/collapse animation (shared by Workflow Filter, Filters panel, etc.)
 * Use the get*Style helpers so all panels share the same duration and easing.
 */
export const EXPAND_COLLAPSE_DURATION = "0.3s";
export const EXPAND_COLLAPSE_EASING = "ease-in-out";
export const EXPAND_COLLAPSE_TRANSITION = `${EXPAND_COLLAPSE_DURATION} ${EXPAND_COLLAPSE_EASING}`;

/**
 * Style for the expandable content area. When expanded, shows content; when collapsed, maxHeight 0 and opacity 0.
 * @param expanded - true when content should be visible
 * @param maxHeightExpanded - max-height when expanded (default 3000px to fit most panels)
 */
export function getExpandCollapseContentStyle(expanded: boolean, maxHeightExpanded: string = "3000px"): React.CSSProperties {
    return {
        maxHeight: expanded ? maxHeightExpanded : "0",
        opacity: expanded ? 1 : 0,
        transition: `max-height ${EXPAND_COLLAPSE_TRANSITION}, opacity ${EXPAND_COLLAPSE_TRANSITION}`,
        overflow: "hidden",
    };
}

/**
 * Style for a short summary line shown when collapsed (e.g. Workflow Filter summary). Inverse of content: visible when collapsed.
 * @param expanded - true when detail is shown (summary hidden)
 * @param summaryHeight - height of the summary line when visible (default 50px)
 */
export function getExpandCollapseSummaryStyle(expanded: boolean, summaryHeight: string = "50px"): React.CSSProperties {
    return {
        maxHeight: expanded ? "0" : summaryHeight,
        opacity: expanded ? 0 : 1,
        transition: `max-height ${EXPAND_COLLAPSE_TRANSITION}, opacity ${EXPAND_COLLAPSE_TRANSITION}`,
        overflow: "hidden",
    };
}

/**
 * Style for a chevron icon that rotates 90deg when expanded (e.g. chevron-right → down).
 * @param expanded - true to rotate 90deg, false for 0deg
 */
export function getExpandCollapseChevronStyle(expanded: boolean): React.CSSProperties {
    return {
        transition: `transform ${EXPAND_COLLAPSE_TRANSITION}`,
        display: "inline-block",
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
    };
}
