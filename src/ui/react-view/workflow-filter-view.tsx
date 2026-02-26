// region Legend
import { HStack } from "../pure-react/view-template/h-stack";
import { I_OdaPmWorkflow, Workflow_Type_Enum_Array, WorkflowType } from "../../data-model/workflow-def";
import React, { MouseEvent, useContext, useState } from "react";
import { PluginContext } from "../obsidian/manage-page-view";
import { ExternalControlledCheckbox } from "../pure-react/view-template/checkbox";
import { InternalLinkView } from "./obsidian-icon-view";
import {
    filterButtonStyle,
    filterCardStyle,
    FilterExpandChevron,
    filterTogglesRowStyle,
    FILTER_EXPAND_THRESHOLD,
    SelectableChipList,
} from "./filter-card-styles";
import { openTaskPrecisely } from "../../utils/io-util";
import { initialToUpper } from "../../utils/format-util";
import { NameableFilterHeading } from "./nameable-filter-heading";
import { INameable } from "../pure-react/props-typing/i-nameable";
import { ExternalToggleView } from "../pure-react/view-template/toggle-view";
import { OptionValueType, SearchableDropdown } from "../pure-react/view-template/searchable-dropdown";
import { getForceNewTabOnClick } from "../../settings/settings";
import { I_Stylable } from "../pure-react/props-typing/i-stylable";
import { getColorByWorkflow, getIconByWorkflow, getIconViewByWorkflowType, getWorkflowChipStyle } from "./tag-project-style";
import { toggleValueInArray } from "../pure-react/utils/toggle-value-in-array";
import { isDevMode } from "../../utils/env-util";
import { I_GetTaskSource } from "../../data-model/TaskSource";
import { TaskSource } from "../../data-model/TaskSource";

export function WorkflowTypeLegend({ type, style }: { type: WorkflowType } & I_Stylable) {
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
                type={type} />

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
    const { displayNames, handleSetDisplayNames, workflow } = props;
    return <div>
        <ClickableWorkflowView key={name} workflow={workflow} showCheckBox={false} />
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
    const selectedCount = workflows.filter((w) => displayNames.includes(w.name)).length;
    const useExpandToggle = workflows.length > FILTER_EXPAND_THRESHOLD;
    const [workflowsListExpanded, setWorkflowsListExpanded] = useState(false);

    return <div style={filterCardStyle}>
        <NameableFilterHeading nameableTypeName={"Workflow"} nameables={workflows} displayNames={displayNames}
            showSelectAll={false}
            onTitleClicked={useExpandToggle ? () => setWorkflowsListExpanded(!workflowsListExpanded) : undefined}
            titleAddon={useExpandToggle ? <FilterExpandChevron expanded={workflowsListExpanded} /> : null}
            handleSetDisplayNames={handleSetDisplayNames}>
            <HStack spacing={8}>
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
                            handleSetDisplayNames={handleSetDisplayNames} />
                    }} />
                <button
                    style={filterButtonStyle}
                    onClick={() => handleSetDisplayNames(workflows.map((k: INameable) => k.name))}
                >
                    All
                </button>
                <button
                    style={filterButtonStyle}
                    onClick={() => handleSetDisplayNames([])}
                >
                    Unselect All
                </button>
            </HStack>
        </NameableFilterHeading>

        <HStack style={filterTogglesRowStyle} spacing={10}>
            <ExternalToggleView externalControl={showSubprojectWorkflows} onChange={() => {
                const nextValue = !showSubprojectWorkflows;
                setShowSubprojectWorkflows(nextValue)
            }} content={<label>{"Subproject Workflows"}</label>} />

            <ExternalToggleView externalControl={showUnclassifiedWorkflows} onChange={() => {
                const nextValue = !showUnclassifiedWorkflows;
                setShowUnclassifiedWorkflows(nextValue)
            }} content={<label>{"Unclassified Workflows"}</label>} />
        </HStack>

        {selectedCount > 0 && (
            <SelectableChipList
                items={workflows}
                selectedKeys={displayNames}
                onSelectionChange={handleSetDisplayNames}
                getKey={(w) => w.name}
                renderChipContent={(workflow) => <ClickableWorkflowView showCheckBox={false} workflow={workflow} />}
                getTooltip={isDevMode() ? (w) => TaskSource.formatForTooltip((w as unknown as I_GetTaskSource).getSource?.() ?? null) : undefined}
                typeName="Workflow"
                expandThreshold={FILTER_EXPAND_THRESHOLD}
                expanded={workflowsListExpanded}
            />
        )}
    </div>;
}
/**
 * A clickable view that can be used to jump to its definition.
 * If showCheckBox is true, it will also show a checkbox that can be used to select the workflow, in which case displayNames and setDisplayNames must be defined.
 */
export const ClickableWorkflowView = ({ workflow, displayNames, setDisplayNames, showCheckBox, showWorkflowIcon }: {
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
    const chipStyle = { ...getWorkflowChipStyle(getColorByWorkflow(workflow)), marginLeft: 6 };
    const content = <>
        <InternalLinkView
            content={<span style={chipStyle} title={wfName}>
                {showWorkflowIcon ? getIconByWorkflow(workflow) : null}
                <span>{wfName}</span>
            </span>}
            onIconClicked={openThisWorkflow}
            onContentClicked={tickCheckbox} />
    </>;

    function openThisWorkflow(e: MouseEvent) {
        const forceNewTab = getForceNewTabOnClick(plugin, e);
        return openTaskPrecisely(plugin.app.workspace, workflow.boundTask, forceNewTab);
    }

    const sourceTitle = isDevMode() ? TaskSource.formatForTooltip((workflow as unknown as I_GetTaskSource).getSource?.() ?? null) : undefined;
    return <span style={{ display: "inline-block", marginRight: 15 }} title={sourceTitle}>
        {showCheckBox ? <ExternalControlledCheckbox
            content={content}
            onChange={tickCheckbox}
            externalControl={displayNames !== undefined && displayNames.includes(wfName)}
        /> : content}
    </span>

}
// endregion
