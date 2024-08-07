// dark light compatible
import React from "react";

export const Color_WorkflowChain = "#6289bb"
export const Color_Workflow_Checkbox = "#5eb95f"
export const iconViewAsAWholeStyle = {display: "inline-flex", justifyItems: "center"};

export const varBackgroundPrimary = "var(--background-primary)";
export const varBackgroundSecondary = "var(--background-secondary)"; // -16 is the padding of the obsidian leaf view container. The content will overflow the container's box.
// sticky header see: https://css-tricks.com/position-sticky-and-table-headers/
export const getStickyHeaderStyle = (zIndex = 1) => {
    return {
        position: "sticky", top: -16,
        zIndex: zIndex,
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
