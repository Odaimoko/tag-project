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
    // We do not offset here, the icon will center without yOffset
    return <ObsidianIconView iconName={getIconNameByWorkflowType(type)} yOffset={false}/>;
}

export function getIconByWorkflow(workflow: I_OdaPmWorkflow) {
    return getIconViewByWorkflowType(workflow.type);
}
