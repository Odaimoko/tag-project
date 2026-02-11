import {OdaPmModule} from "../../data-model/OdaPmModule";
import {NameableFilterHeading} from "./nameable-filter-heading";
import {OptionValueType, SearchableDropdown} from "../pure-react/view-template/searchable-dropdown";
import React from "react";
import {HStack} from "../pure-react/view-template/h-stack";
import {isDevMode} from "../../utils/env-util";
import {I_GetTaskSource} from "../../data-model/TaskSource";
import {TaskSource} from "../../data-model/TaskSource";


export function ModuleFilter({modules, displayModuleIds, handleSetDisplayModuleIds}: {
    modules: OdaPmModule[], // already includes all and unclassified
    displayModuleIds: string[],
    handleSetDisplayModuleIds: (names: string[]) => void,
}) {
    const allModules = modules;
    const moduleOptions = allModules.map(k => {
        return {name: k.name, optionValue: k.id}
    })
    return <div>
        <NameableFilterHeading nameableTypeName={"Module"}
                               nameables={allModules} displayNames={displayModuleIds}
                               showSelectAll={false}>
            <HStack spacing={5}>
                <SearchableDropdown
                    dropdownId={"module"}
                    data={moduleOptions}
                    handleSetOptionValues={handleSetDisplayModuleIds}
                    placeholder={"Modules"}
                    singleSelect={false}
                    currentOptionValues={moduleOptions
                        .filter(k => displayModuleIds.includes(k.optionValue))}
                    RenderView={(props: { item: OptionValueType }) => {

                        return <label>{props.item.name}</label>
                    }}/>
                <button onClick={() => handleSetDisplayModuleIds(allModules.map((k: OdaPmModule) => {
                    return k.id;
                }))}>All
                </button>
                <button onClick={() => handleSetDisplayModuleIds([])}>Unselect All
                </button>
            </HStack>


        </NameableFilterHeading>
        <HStack spacing={5}>
            {allModules.map((module: OdaPmModule) => {
                if (!displayModuleIds.includes(module.id))
                    return null
                const sourceTitle = isDevMode() ? TaskSource.formatForTooltip((module as I_GetTaskSource).getSource?.() ?? null) : undefined;
                return (
                    <div style={{padding: 5, borderWidth: 1, borderStyle: "solid", borderColor: "#bcddff"}} title={sourceTitle}>
                        <label>{module.name}</label>
                    </div>

                )
            })}
            {displayModuleIds.length == 0 &&
                <label>
                    No modules chosen. Display all modules.
                </label>
            }
        </HStack>
    </div>
        ;
}
