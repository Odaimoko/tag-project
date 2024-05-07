import {I_OdaPmWorkflow, WorkflowType} from "../../data-model/workflow-def";
import {ObsidianIconView} from "./obsidian-icon-view";
import React from "react";
import {Color_Workflow_Checkbox, Color_WorkflowChain} from "../pure-react/style-def";

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

const obsidianIconTopOffset = 4;
export const obsidianIconOffsetStyle = {position: "relative", top: obsidianIconTopOffset} as React.CSSProperties;
export const obsidianIconOffsetCenteredStyle = {
    position: "relative",
    top: obsidianIconTopOffset / 2
} as React.CSSProperties;
