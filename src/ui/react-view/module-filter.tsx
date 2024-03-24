import {OdaPmModule} from "../../data-model/OdaPmModule";
import {NameableFilterHeading} from "./nameable-filter-heading";
import {OptionValueType, SearchableDropdown} from "./view-template/searchable-dropdown";
import React from "react";
import {HStack} from "./view-template/h-stack";


export function ModuleFilter({modules, displayModuleIds, handleSetDisplayModuleIds}: {
    modules: Record<string, OdaPmModule>, // already includes all and unclassified
    displayModuleIds: string[],
    handleSetDisplayModuleIds: (names: string[]) => void,
}) {
    const moduleOptions = Object.values(modules).map(k => {
        return {name: k.name, optionValue: k.id}
    })
    return <NameableFilterHeading nameableTypeName={"Module"}
                                  nameables={Object.values(modules)} displayNames={displayModuleIds}
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

                    return props.item.name
                }}/>
            <button onClick={() => handleSetDisplayModuleIds(Object.values(modules).map((k: OdaPmModule) => {
                return k.id;
            }))}>All
            </button>
            <button onClick={() => handleSetDisplayModuleIds([])}>Unselect All
            </button>
        </HStack>
    </NameableFilterHeading>;
}
