import {INameable} from "../pure-react/props-typing/i-nameable";
import React, {Fragment} from "react";

import {FilterHeadHStack} from "../pure-react/view-template/filter-head-h-stack";

export function SelectAndDeselectAllView({handleSetDisplayNames, nameables}: {
    handleSetDisplayNames: (s: string[]) => void,
    nameables: INameable[]
}) {
    return <Fragment>
        <button onClick={() => handleSetDisplayNames(nameables.map((k: INameable) => {
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
    nameables: INameable[],
    handleSetDisplayNames?: (s: string[]) => void, // if showSelectAll is false, this is not required
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
