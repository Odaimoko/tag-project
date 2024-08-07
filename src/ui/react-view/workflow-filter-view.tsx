// region Legend
import {HStack} from "../pure-react/view-template/h-stack";
import {I_OdaPmWorkflow, Workflow_Type_Enum_Array, WorkflowType} from "../../data-model/workflow-def";
import React, {MouseEvent, useContext} from "react";
import {PluginContext} from "../obsidian/manage-page-view";
import {ExternalControlledCheckbox} from "../pure-react/view-template/checkbox";
import {InternalLinkView} from "./obsidian-icon-view";
import {centerChildren, iconViewAsAWholeStyle} from "../pure-react/style-def";
import {openTaskPrecisely} from "../../utils/io-util";
import {initialToUpper} from "../../utils/format-util";
import {NameableFilterHeading} from "./nameable-filter-heading";
import {INameable} from "../pure-react/props-typing/i-nameable";
import {taskCheckBoxMargin} from "./task-table-view";
import {ExternalToggleView} from "../pure-react/view-template/toggle-view";
import {OptionValueType, SearchableDropdown} from "../pure-react/view-template/searchable-dropdown";
import {getForceNewTabOnClick} from "../../settings/settings";
import {I_Stylable} from "../pure-react/props-typing/i-stylable";
import {getIconByWorkflow, getIconViewByWorkflowType} from "./tag-project-style";
import {toggleValueInArray} from "../pure-react/utils/toggle-value-in-array";

export function WorkflowTypeLegend({type, style}: { type: WorkflowType } & I_Stylable) {
    return <span style={style}>
        <HStack spacing={3}>
        {getIconViewByWorkflowType(type)}
            <label>{initialToUpper(type)}</label>
    </HStack>
    </span>;
}

function WorkflowTypeLegendView() {
    return <HStack spacing={10}>
        {Workflow_Type_Enum_Array.map((type: WorkflowType) => {
            return <WorkflowTypeLegend key={type}
                                       type={type}/>

        })}
    </HStack>;
}

function DropdownWorkflowView(props: {
    item: OptionValueType,
    displayNames: string[],
    workflow: I_OdaPmWorkflow,
    handleSetDisplayNames: (names: string[]) => void
}) {
    const name = props.item.name;
    const {displayNames, handleSetDisplayNames, workflow} = props;
    return <div>
        <ClickableWorkflowView key={name} workflow={workflow} showCheckBox={false}/>
    </div>
}

// endregion
// region Workflow Filter
export const WorkflowFilterView = (props: {
    workflows: I_OdaPmWorkflow[],
    displayNames: string[],
    handleSetDisplayNames: (names: string[]) => void,
    showSubprojectWorkflows: boolean,
    setShowSubprojectWorkflows: (v: boolean) => void,
    showUnclassifiedWorkflows: boolean,
    setShowUnclassifiedWorkflows: (v: boolean) => void,
}) => {
    const {
        showSubprojectWorkflows, setShowSubprojectWorkflows,
        showUnclassifiedWorkflows, setShowUnclassifiedWorkflows,
        workflows, displayNames, handleSetDisplayNames
    } = props;
    const workflowDropdownOptions = workflows.map(k => {
        return {
            name: k.name,
            optionValue: k.name
        }
    });
    return <div>
        <NameableFilterHeading nameableTypeName={"Workflow"} nameables={workflows} displayNames={displayNames}
                               showSelectAll={false}
                               handleSetDisplayNames={handleSetDisplayNames}>
            {/*<WorkflowTypeLegendView/>*/}

            <HStack spacing={5}>
                <SearchableDropdown dropdownId={"workflow"}
                                    data={workflowDropdownOptions}
                                    handleSetOptionValues={handleSetDisplayNames}
                                    placeholder={"Workflows"}
                                    singleSelect={false}
                                    currentOptionValues={workflowDropdownOptions
                                        .filter(k => displayNames.includes(k.name))}
                                    RenderView={(props: { item: OptionValueType }) => {

                                        return <DropdownWorkflowView item={props.item} displayNames={displayNames}
                                                                     workflow={workflows.find(k => k.name === props.item.name)!}
                                                                     handleSetDisplayNames={handleSetDisplayNames}/>
                                    }}/>
                <button onClick={() => handleSetDisplayNames(workflows.map((k: INameable) => {
                    return k.name;
                }))}>All
                </button>
                <button onClick={() => handleSetDisplayNames([])}>Unselect All
                </button>
            </HStack>
        </NameableFilterHeading>


        <HStack style={{...centerChildren, marginBottom: 10,}} spacing={10}>

            <ExternalToggleView externalControl={showSubprojectWorkflows} onChange={() => {
                const nextValue = !showSubprojectWorkflows;
                setShowSubprojectWorkflows(nextValue)
            }} content={<label>{"Subproject Workflows"}</label>}/>

            <ExternalToggleView externalControl={showUnclassifiedWorkflows} onChange={() => {
                const nextValue = !showUnclassifiedWorkflows;
                setShowUnclassifiedWorkflows(nextValue)
            }} content={<label>{"Unclassified Workflows"}</label>}/>

        </HStack>
        <WorkflowCheckboxes nameables={workflows} displayNames={displayNames}/>

    </div>;
}
/**
 * @param nameables
 * @param displayNames
 * @param handleSetDisplayNames
 * @constructor
 */
const WorkflowCheckboxes = ({nameables, displayNames}: {
    nameables: I_OdaPmWorkflow[],
    displayNames: string[],
}) => {
    return <div>
        {nameables.map((workflow: I_OdaPmWorkflow) => {
            if (!displayNames.includes(workflow.name))
                return null
            return (
                <ClickableWorkflowView key={workflow.name} showCheckBox={false}
                                       workflow={workflow}/>
            )
        })}
    </div>;
};

/**
 * A clickable view that can be used to jump to its definition.
 * If showCheckBox is true, it will also show a checkbox that can be used to select the workflow, in which case displayNames and setDisplayNames must be defined.
 */
export const ClickableWorkflowView = ({workflow, displayNames, setDisplayNames, showCheckBox, showWorkflowIcon}: {
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
        if (displayNames === undefined || setDisplayNames === undefined) return;
        toggleValueInArray(wfName, displayNames, setDisplayNames);
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    const content = <>
        <InternalLinkView
            content={<span style={iconViewAsAWholeStyle}>
                {showWorkflowIcon ? getIconByWorkflow(workflow) : null}
                <label style={taskCheckBoxMargin}>{wfName}</label>
            </span>}
            onIconClicked={openThisWorkflow}
            onContentClicked={tickCheckbox}/>
    </>;

    function openThisWorkflow(e: MouseEvent) {
        const forceNewTab = getForceNewTabOnClick(plugin, e);
        return openTaskPrecisely(plugin.app.workspace, workflow.boundTask, forceNewTab);
    }

    return <span style={{display: "inline-block", marginRight: 15}}>
        {showCheckBox ? <ExternalControlledCheckbox
            content={content}
            onChange={tickCheckbox}
            externalControl={displayNames !== undefined && displayNames.includes(wfName)}
        /> : content}
    </span>

}
// endregion
