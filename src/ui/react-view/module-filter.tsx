import { OdaPmModule } from "../../data-model/OdaPmModule";
import { NameableFilterHeading } from "./nameable-filter-heading";
import { OptionValueType, SearchableDropdown } from "../pure-react/view-template/searchable-dropdown";
import React, { MouseEvent, useContext, useState } from "react";
import { HStack } from "../pure-react/view-template/h-stack";
import { isDevMode } from "../../utils/env-util";
import { I_GetTaskSource } from "../../data-model/TaskSource";
import { TaskSource } from "../../data-model/TaskSource";
import {
    filterButtonStyle,
    filterCardStyle,
    FilterExpandChevron,
    filterSelectedListContainerStyle,
    filterSummaryTextStyle,
    FILTER_EXPAND_THRESHOLD,
    SelectableChipList,
} from "./filter-card-styles";
import { PluginContext } from "../obsidian/manage-page-view";
import { InternalLinkView } from "./obsidian-icon-view";
import { openSectionPrecisely } from "../../utils/io-util";
import { getForceNewTabOnClick } from "../../settings/settings";
import { iconViewAsAWholeStyle } from "../pure-react/style-def";
import { taskCheckBoxMargin } from "./task-table-view";

/** Module chip with optional link icon that jumps to the module's definition (first task line). */
function ClickableModuleView({ module }: { module: OdaPmModule }) {
    const plugin = useContext(PluginContext);
    const hasDefinition = module.tasks.length > 0;
    const firstTask = module.tasks[0];

    function openModuleDefinition(e: MouseEvent) {
        if (!hasDefinition || !firstTask) return;
        const forceNewTab = getForceNewTabOnClick(plugin, e);
        openSectionPrecisely(plugin.app.workspace, firstTask.boundTask, forceNewTab);
    }

    if (hasDefinition) {
        return (
            <InternalLinkView
                content={
                    <span style={iconViewAsAWholeStyle}>
                        <label style={taskCheckBoxMargin}>{module.name}</label>
                    </span>
                }
                onIconClicked={openModuleDefinition}
            />
        );
    }
    return <label>{module.name}</label>;
}

export function ModuleFilter({
    modules,
    displayModuleIds,
    handleSetDisplayModuleIds,
}: {
    modules: OdaPmModule[];
    displayModuleIds: string[];
    handleSetDisplayModuleIds: (ids: string[]) => void;
}) {
    const moduleOptions = modules.map((k) => ({ name: k.name, optionValue: k.id }));
    const selectedCount = modules.filter((m) => displayModuleIds.includes(m.id)).length;
    const useExpandToggle = modules.length > FILTER_EXPAND_THRESHOLD;
    const [modulesListExpanded, setModulesListExpanded] = useState(false);

    return (
        <div style={filterCardStyle}>
            <NameableFilterHeading
                nameableTypeName="Module"
                nameables={modules}
                displayNames={displayModuleIds}
                showSelectAll={false}
                onTitleClicked={useExpandToggle ? () => setModulesListExpanded(!modulesListExpanded) : undefined}
                titleAddon={useExpandToggle ? <FilterExpandChevron expanded={modulesListExpanded} /> : null}
                handleSetDisplayNames={handleSetDisplayModuleIds}
            >
                <HStack spacing={8}>
                    <SearchableDropdown
                        dropdownId="module"
                        data={moduleOptions}
                        handleSetOptionValues={handleSetDisplayModuleIds}
                        placeholder="Modules"
                        singleSelect={false}
                        currentOptionValues={moduleOptions.filter((k) => displayModuleIds.includes(k.optionValue))}
                        RenderView={(props: { item: OptionValueType }) => <label>{props.item.name}</label>}
                    />
                    <button
                        style={filterButtonStyle}
                        onClick={() => handleSetDisplayModuleIds(modules.map((m) => m.id))}
                    >
                        All
                    </button>
                    <button style={filterButtonStyle} onClick={() => handleSetDisplayModuleIds([])}>
                        Unselect All
                    </button>
                </HStack>
            </NameableFilterHeading>

            {selectedCount > 0 ? (
                <SelectableChipList<OdaPmModule>
                    items={modules}
                    selectedKeys={displayModuleIds}
                    onSelectionChange={handleSetDisplayModuleIds}
                    getKey={(m) => m.id}
                    renderChipContent={(m) => <ClickableModuleView module={m} />}
                    getTooltip={
                        isDevMode()
                            ? (m) => TaskSource.formatForTooltip((m as I_GetTaskSource).getSource?.() ?? null)
                            : undefined
                    }
                    typeName="Module"
                    expandThreshold={FILTER_EXPAND_THRESHOLD}
                    expanded={modulesListExpanded}
                />
            ) : (
                <div style={filterSelectedListContainerStyle}>
                    <div style={filterSummaryTextStyle}>No modules chosen. Display all modules.</div>
                </div>
            )}
        </div>
    );
}
