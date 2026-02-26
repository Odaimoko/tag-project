import {I_OdaPmWorkflow, WorkflowType} from "../../data-model/workflow-def";
import {ObsidianIconView} from "./obsidian-icon-view";
import React from "react";
import {Color_Workflow_Checkbox, Color_WorkflowChain} from "../pure-react/style-def";

export function getColorByWorkflow(workflow: I_OdaPmWorkflow) {
    switch (workflow.type) {
        case "chain":
            return Color_WorkflowChain;
        case "checkbox":
            return Color_Workflow_Checkbox;
    }
    return "currentColor";
}

function getIconNameByWorkflowType(type: WorkflowType) {
    return type === "chain" ? "footprints" : "check-check"
}

export function getIconViewByWorkflowType(type: WorkflowType) {
    // We do not offset here, the icon will center without yOffset
    return <ObsidianIconView iconName={getIconNameByWorkflowType(type)} yOffset={false}/>;
}

export function getIconByWorkflow(workflow: I_OdaPmWorkflow) {
    return getIconViewByWorkflowType(workflow.type);
}

/** Shared workflow chip style: compact pill, adapts to text length. Use with getColorByWorkflow(workflow). */
export function getWorkflowChipStyle(accentColor: string): React.CSSProperties {
    const isHex = /^#[0-9A-Fa-f]{6}$/.test(accentColor);
    const backgroundColor = isHex ? `${accentColor}18` : "var(--background-modifier-border)";
    const borderColor = isHex ? `${accentColor}40` : "var(--background-modifier-border)";
    return {
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: "0.6rem",
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 4,
        color: accentColor,
        backgroundColor,
        border: `1px solid ${borderColor}`,
        boxSizing: "border-box",
        maxWidth: 160,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    };
}
