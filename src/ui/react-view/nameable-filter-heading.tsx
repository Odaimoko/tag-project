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
                                          showSelectAll,
                                          onTitleClicked,
                                          titleAddon
                                      }: {
    nameableTypeName: string,
    displayNames: string[],
    nameables: INameable[],
    handleSetDisplayNames?: (s: string[]) => void, // if showSelectAll is false, this is not required
    showSelectAll?: boolean,
    onTitleClicked?: () => void,
    titleAddon?: React.ReactNode
} & React.PropsWithChildren<any>) => {
    showSelectAll = showSelectAll ?? true;
    return <FilterHeadHStack>
        <h2
            style={onTitleClicked ? {cursor: "pointer", userSelect: "none"} : undefined}
            onClick={() => onTitleClicked?.()}
        >
            <span style={{display: "inline-flex", alignItems: "center", gap: 6}}>
                {displayNames.length}/{nameables.length} {nameableTypeName}(s)
                {titleAddon}
            </span>
        </h2>
        {showSelectAll &&
            <SelectAndDeselectAllView handleSetDisplayNames={handleSetDisplayNames} nameables={nameables}/>}
        {children}
    </FilterHeadHStack>
}
