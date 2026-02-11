// region Legend
import { HStack } from "../pure-react/view-template/h-stack";
import { I_OdaPmWorkflow, Workflow_Type_Enum_Array, WorkflowType } from "../../data-model/workflow-def";
import React, { MouseEvent, useContext, useState } from "react";
import { PluginContext } from "../obsidian/manage-page-view";
import { ExternalControlledCheckbox } from "../pure-react/view-template/checkbox";
import { InternalLinkView } from "./obsidian-icon-view";
import { centerChildren, iconViewAsAWholeStyle } from "../pure-react/style-def";
import { openTaskPrecisely } from "../../utils/io-util";
import { initialToUpper } from "../../utils/format-util";
import { NameableFilterHeading } from "./nameable-filter-heading";
import { INameable } from "../pure-react/props-typing/i-nameable";
import { taskCheckBoxMargin } from "./task-table-view";
import { ExternalToggleView } from "../pure-react/view-template/toggle-view";
import { OptionValueType, SearchableDropdown } from "../pure-react/view-template/searchable-dropdown";
import { getForceNewTabOnClick } from "../../settings/settings";
import { I_Stylable } from "../pure-react/props-typing/i-stylable";
import { getIconByWorkflow, getIconViewByWorkflowType } from "./tag-project-style";
import { toggleValueInArray } from "../pure-react/utils/toggle-value-in-array";
import { ObsidianIconView } from "./obsidian-icon-view";
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

const workflowFilterCardStyle: React.CSSProperties = {
    padding: "12px 14px",
    marginBottom: 12,
    backgroundColor: "var(--background-secondary)",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "8px",
};
const workflowFilterButtonStyle: React.CSSProperties = {
    padding: "4px 10px",
    fontSize: "0.9em",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "6px",
    backgroundColor: "var(--background-modifier-border)",
    color: "var(--text-normal)",
    cursor: "pointer",
};
const workflowFilterTogglesRowStyle: React.CSSProperties = {
    ...centerChildren,
    marginTop: 10,
    marginBottom: 10,
    padding: "8px 10px",
    backgroundColor: "var(--background-modifier-hover)",
    borderRadius: "6px",
    gap: 16,
};
const workflowSelectedListContainerStyle: React.CSSProperties = {
    marginTop: 8,
    paddingTop: 8,
    borderTop: "1px solid var(--background-modifier-border)",
    overflow: "hidden",
};
const workflowSelectedListStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "6px 12px",
};
const workflowSummaryTextStyle: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: "0.95em",
};
const workflowContentWrapperStyle = (expanded: boolean): React.CSSProperties => ({
    maxHeight: expanded ? "1000px" : "0",
    opacity: expanded ? 1 : 0,
    transition: "max-height 0.3s ease-in-out, opacity 0.3s ease-in-out",
    overflow: "hidden",
});
const workflowSummaryWrapperStyle = (expanded: boolean): React.CSSProperties => ({
    maxHeight: expanded ? "0" : "50px",
    opacity: expanded ? 0 : 1,
    transition: "max-height 0.3s ease-in-out, opacity 0.3s ease-in-out",
    overflow: "hidden",
});
const chevronIconStyle: React.CSSProperties = {
    transition: "transform 0.3s ease-in-out",
    display: "inline-block",
};
const chevronIconExpandedStyle: React.CSSProperties = {
    ...chevronIconStyle,
    transform: "rotate(90deg)",
};
const WORKFLOW_EXPAND_THRESHOLD = 5;

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
    const useExpandToggle = workflows.length > WORKFLOW_EXPAND_THRESHOLD;
    const [workflowsListExpanded, setWorkflowsListExpanded] = useState(false);

    return <div style={workflowFilterCardStyle}>
        <NameableFilterHeading nameableTypeName={"Workflow"} nameables={workflows} displayNames={displayNames}
            showSelectAll={false}
            onTitleClicked={useExpandToggle ? () => setWorkflowsListExpanded(!workflowsListExpanded) : undefined}
            titleAddon={useExpandToggle ? (
                <span style={workflowsListExpanded ? chevronIconExpandedStyle : chevronIconStyle}>
                    <ObsidianIconView
                        yOffset={false}
                        iconName={"chevron-right"} />
                </span>
            ) : null}
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
                    style={workflowFilterButtonStyle}
                    onClick={() => handleSetDisplayNames(workflows.map((k: INameable) => k.name))}
                >
                    All
                </button>
                <button
                    style={workflowFilterButtonStyle}
                    onClick={() => handleSetDisplayNames([])}
                >
                    Unselect All
                </button>
            </HStack>
        </NameableFilterHeading>

        <HStack style={workflowFilterTogglesRowStyle} spacing={10}>
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
            <div style={workflowSelectedListContainerStyle}>
                {useExpandToggle && (
                    <div style={workflowSummaryWrapperStyle(workflowsListExpanded)}>
                        <div style={workflowSummaryTextStyle}>
                            {selectedCount} Workflow{selectedCount !== 1 ? "s" : ""}
                        </div>
                    </div>
                )}
                <div style={useExpandToggle 
                    ? workflowContentWrapperStyle(workflowsListExpanded)
                    : workflowContentWrapperStyle(true)}>
                    <div style={workflowSelectedListStyle}>
                        <WorkflowCheckboxes nameables={workflows} displayNames={displayNames} />
                    </div>
                </div>
            </div>
        )}
    </div>;
}
/**
 * @param nameables
 * @param displayNames
 * @param handleSetDisplayNames
 * @constructor
 */
const workflowChipWrapStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px 2px 4px",
    backgroundColor: "var(--background-modifier-hover)",
    border: "1px solid var(--background-modifier-border)",
    borderRadius: "6px",
};

const WorkflowCheckboxes = ({ nameables, displayNames }: {
    nameables: I_OdaPmWorkflow[],
    displayNames: string[],
}) => {
    const items = nameables.filter((w) => displayNames.includes(w.name));
    if (items.length === 0) return null;
    return <>
        {items.map((workflow: I_OdaPmWorkflow) => {
            const src = isDevMode() ? TaskSource.formatForTooltip((workflow as unknown as I_GetTaskSource).getSource?.() ?? null) : undefined;
            return (
                <span key={workflow.name} style={workflowChipWrapStyle} title={src}>
                    <ClickableWorkflowView showCheckBox={false} workflow={workflow} />
                </span>
            );
        })}
    </>;
};

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
    // block will start a new line, inline will not, so we use inline-block
    const content = <>
        <InternalLinkView
            content={<span style={iconViewAsAWholeStyle}>
                {showWorkflowIcon ? getIconByWorkflow(workflow) : null}
                <label style={taskCheckBoxMargin}>{wfName}</label>
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
