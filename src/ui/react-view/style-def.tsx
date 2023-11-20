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
