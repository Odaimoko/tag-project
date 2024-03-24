// dark light compatible
import {I_OdaPmWorkflow, WorkflowType} from "../../data-model/workflow-def";
import {ObsidianIconView} from "./view-template/icon-view";
import React from "react";

export const Color_WorkflowChain = "#6289bb"
export const Color_Workflow_Checkbox = "#5eb95f"
export const iconViewAsAWholeStyle = {display: "inline-flex", justifyItems: "center"};

function getColorByWorkflow(type: I_OdaPmWorkflow) {
    switch (type.type) {
        case "chain":
            return Color_WorkflowChain;
        case "checkbox" :
            return Color_Workflow_Checkbox;
    }
    return "currentColor"
}

function getIconNameByWorkflowType(type: WorkflowType) {
    return type === "chain" ? "footprints" : "check-check"
}

export function getIconViewByWorkflowType(type: WorkflowType) {
    return <ObsidianIconView iconName={getIconNameByWorkflowType(type)}/>;
}

export function getIconByWorkflow(workflow: I_OdaPmWorkflow) {
    return getIconViewByWorkflowType(workflow.type);
}

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
export const dropdownSelectedColor = "rgba(255,99,179,0.74)";
