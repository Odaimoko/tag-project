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
import {NameableFilterHeading} from "./nameable-filter-heading";
import {I_Nameable} from "../../data-model/I_Nameable";

/**
 * Accept children as a HStack with a unified style
 * @param props
 * @constructor
 */
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

    <NameableFilterHeading nameableTypeName={"Workflow"} nameables={workflows} displayNames={displayNames}
                           handleSetDisplayNames={handleSetDisplayNames}>
        <WorkflowTypeLegendView/>
    </NameableFilterHeading>
    <WorkflowCheckboxes nameables={workflows} displayNames={displayNames}
                        handleSetDisplayNames={handleSetDisplayNames}/>
</div>

const WorkflowCheckboxes = ({nameables, displayNames, handleSetDisplayNames}: {
    nameables: I_Nameable[],
    displayNames: string[],
    handleSetDisplayNames: (names: string[]) => void
}) => {
    return <div>
        {nameables.map((workflow: I_OdaPmWorkflow) => {
            return (
                <WorkflowFilterCheckbox key={workflow.name} displayNames={displayNames}
                                        workflow={workflow}
                                        setDisplayNames={handleSetDisplayNames}/>
            )
        })}
    </div>;
};

export const WorkflowFilterCheckbox = ({workflow, displayNames, setDisplayNames, showCheckBox, showWorkflowIcon}: {
    workflow: I_OdaPmWorkflow,
    displayNames?: string[],
    setDisplayNames?: React.Dispatch<React.SetStateAction<string[]>>,
    showCheckBox?: boolean,
    showWorkflowIcon?: boolean
}) => {
    showCheckBox = showCheckBox ?? true; // backward compatibility.
    showWorkflowIcon = showWorkflowIcon ?? true;
    // if showCheckBox, displayNames and setDisplayNames must be defined
    console.assert(!showCheckBox || (displayNames !== undefined && setDisplayNames !== undefined))
    const plugin = useContext(PluginContext);
    const wfName = workflow.name;

    function tickCheckbox() {
        if (!setDisplayNames || !displayNames) return;
        // invert the checkbox
        const v = !displayNames.includes(wfName)
        const newArr = v ? [...displayNames, wfName] : displayNames.filter(k => k != wfName)
        setDisplayNames(newArr)
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    const content = <>
        <InternalLinkView
            content={<span style={iconViewAsAWholeStyle}>
                {showWorkflowIcon ? getIconByWorkflow(workflow) : null}
                <label style={{marginLeft: 3}}>{wfName}</label>
            </span>}
            onIconClicked={() =>
                // Go to workflow def
                openTaskPrecisely(plugin.app.workspace, workflow.boundTask)}
            onContentClicked={tickCheckbox}/>
    </>;
    return <span style={{display: "inline-block", marginRight: 15}}>
        {showCheckBox ? <ExternalControlledCheckbox
            content={content}
            onChange={tickCheckbox}
            externalControl={displayNames !== undefined && displayNames.includes(wfName)}
        /> : content}
    </span>

}
// endregion
