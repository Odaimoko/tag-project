import {I_Nameable} from "../../data-model/I_Nameable";
import React, {Fragment} from "react";
import {FilterHeadHStack} from "./workflow-filter";

export function SelectAndDeselectAllView({handleSetDisplayNames, nameables}: {
    handleSetDisplayNames: (s: string[]) => void,
    nameables: I_Nameable[]
}) {
    return <Fragment>
        <button onClick={() => handleSetDisplayNames(nameables.map((k: I_Nameable) => {
            return k.name;
        }))}>All
        </button>
        <button onClick={() => handleSetDisplayNames([])}>Unselect All
        </button>
    </Fragment>;
}

export const NameableFilterHeading = ({
                                          children, displayNames, handleSetDisplayNames, nameableTypeName, nameables,
                                          showSelectAll
                                      }: {
    nameableTypeName: string,
    displayNames: string[],
    nameables: I_Nameable[],
    handleSetDisplayNames: (s: string[]) => void,
    showSelectAll?: boolean
} & React.PropsWithChildren<any>) => {
    showSelectAll = showSelectAll ?? true;
    return <FilterHeadHStack>
        <h2>{displayNames.length}/{nameables.length} {nameableTypeName}(s)</h2>
        {showSelectAll &&
            <SelectAndDeselectAllView handleSetDisplayNames={handleSetDisplayNames} nameables={nameables}/>}
        {children}
    </FilterHeadHStack>
}
