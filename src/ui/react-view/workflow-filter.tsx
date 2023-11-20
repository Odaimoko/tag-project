// region Legend
import {HStack} from "./view-template/h-stack";
import {I_OdaPmWorkflow, Workflow_Type_Enum_Array, WorkflowType} from "../../data-model/workflow-def";
import React, {useContext} from "react";
import {PluginContext} from "../manage-page-view";
import {ExternalControlledCheckbox} from "./view-template/checkbox";
import {I_Stylable, InternalLinkView} from "./view-template/icon-view";
import {getIconByWorkflow, getIconViewByWorkflowType, iconViewAsAWholeStyle} from "./style-def";
import {openTaskPrecisely} from "../../utils/io-util";
import {initialToUpper} from "../../utils/format-util";

export function FilterHeadHStack(props: React.PropsWithChildren<any>) {
    return <span style={{display: "flex"}}>
            <HStack style={{
                display: "flex",
                alignItems: "center"
            }} spacing={10}>
                {props.children}
            </HStack>
        </span>
}

export function WorkflowTypeLegend({type, style}: { type: WorkflowType } & I_Stylable) {
    return <span style={style}>
        <HStack spacing={3}>
        {getIconViewByWorkflowType(type)}
            <label>{initialToUpper(type)}</label>
    </HStack>
    </span>;
}

export function WorkflowTypeLegendView() {
    return <HStack spacing={10}>
        {Workflow_Type_Enum_Array.map((type: WorkflowType) => {
            return <WorkflowTypeLegend key={type}
                                       type={type}/>

        })}
    </HStack>;
}

// endregion
// region Workflow Filter
export const WorkflowFilter = ({workflows, displayNames, handleSetDisplayNames}: {
    workflows: I_OdaPmWorkflow[],
    displayNames: string[],
    handleSetDisplayNames: (names: string[]) => void
}) => <div>

    <WorkflowFilterHeading workflows={workflows} displayNames={displayNames}
                           handleSetDisplayNames={handleSetDisplayNames}/>
    <WorkflowCheckboxes workflows={workflows} displayWorkflowNames={displayNames}
                        handleSetDisplayWorkflows={handleSetDisplayNames}/>
</div>
const WorkflowFilterHeading = ({displayNames, workflows, handleSetDisplayNames}: {
    displayNames: string[],
    workflows: I_OdaPmWorkflow[],
    handleSetDisplayNames: (s: string[]) => void
}) => {
    return <FilterHeadHStack>
        <h2>{displayNames.length}/{workflows.length} Workflow(s)</h2>
        <button onClick={() => handleSetDisplayNames(workflows.map(k => k.name))}>Select All
        </button>
        <button onClick={() => handleSetDisplayNames([])}>Unselect All
        </button>
        <WorkflowTypeLegendView/>
    </FilterHeadHStack>
}
const WorkflowCheckboxes = ({workflows, displayWorkflowNames, handleSetDisplayWorkflows}: {
    workflows: I_OdaPmWorkflow[],
    displayWorkflowNames: string[],
    handleSetDisplayWorkflows: (names: string[]) => void
}) => <div>
    {workflows.map((workflow: I_OdaPmWorkflow) => {
        return (
            <WorkflowFilterCheckbox key={workflow.name} displayWorkflows={displayWorkflowNames}
                                    workflow={workflow}
                                    setDisplayWorkflows={handleSetDisplayWorkflows}/>
        )
    })}
</div>;
const WorkflowFilterCheckbox = ({workflow, displayWorkflows, setDisplayWorkflows}: {
    workflow: I_OdaPmWorkflow,
    displayWorkflows: string[],
    setDisplayWorkflows: React.Dispatch<React.SetStateAction<string[]>>
}) => {
    const plugin = useContext(PluginContext);

    const wfName = workflow.name;

    function tickCheckbox() {
        // invert the checkbox
        const v = !displayWorkflows.includes(wfName)
        const newArr = v ? [...displayWorkflows, wfName] : displayWorkflows.filter(k => k != wfName)
        setDisplayWorkflows(newArr)
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", marginRight: 15}}>
        <ExternalControlledCheckbox
            content={<>
                <InternalLinkView
                    content={<span style={iconViewAsAWholeStyle}>
                        {getIconByWorkflow(workflow)}
                        <label style={{marginLeft: 3}}>{wfName}</label>
                    </span>}
                    onIconClicked={() =>
                        // Go to workflow def
                        openTaskPrecisely(plugin.app.workspace, workflow.boundTask)}
                    onContentClicked={tickCheckbox}/>
            </>}
            onChange={tickCheckbox}
            externalControl={displayWorkflows.includes(wfName)}
        />
    </span>

}
// endregion
