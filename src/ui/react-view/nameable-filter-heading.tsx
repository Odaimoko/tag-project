import {I_Nameable} from "../../data-model/I_Nameable";
import React from "react";
import {FilterHeadHStack} from "./workflow-filter";

export const NameableFilterHeading = (props: {
    nameableTypeName: string,
    displayNames: string[],
    nameables: I_Nameable[],
    handleSetDisplayNames: (s: string[]) => void,
} & React.PropsWithChildren<any>) => {
    return <FilterHeadHStack>
        <h2>{props.displayNames.length}/{props.nameables.length} {props.nameableTypeName}(s)</h2>
        <button onClick={() => props.handleSetDisplayNames(props.nameables.map((k: I_Nameable) => {
            return k.name;
        }))}>Select All
        </button>
        <button onClick={() => props.handleSetDisplayNames([])}>Unselect All
        </button>
        {props.children}
    </FilterHeadHStack>
}
