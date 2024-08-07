// region Tag Filter
import React from "react";
import {
    FilterMethod_Excluded,
    FilterMethod_Included,
    FilterMethod_NotFiltering,
    getNextFilterMethod
} from "../../settings/settings";
import {ClickableObsidianIconView} from "./obsidian-icon-view";
import {iconViewAsAWholeStyle} from "../pure-react/style-def";
import {Tag_Prefix_Tag} from "../../data-model/workflow-def";

import {FilterHeadHStack} from "../pure-react/view-template/filter-head-h-stack";

const tagIncludedIcon = "check"
const tagExcludedIcon = "x"
const noTagIcon = "scan"

export function TagFilterView({
                              pmTags,
                              rectifiedExcludedTags,
                              rectifiedDisplayTags,
                              handleSetDisplayNames,
                              handleSetExcludedNames
                          }: {
    pmTags: string[],
    rectifiedExcludedTags: string[],
    rectifiedDisplayTags: string[],
    handleSetDisplayNames: (names: string[]) => void,
    handleSetExcludedNames: (names: string[]) => void
}) {
    return <div>
        <TagFilterHeader rectifiedDisplayTags={rectifiedDisplayTags} pmTags={pmTags}
                         handleSetDisplayTags={handleSetDisplayNames} handleSetExcludedTags={handleSetExcludedNames}/>

        <TagFilterCheckboxes
            pmTags={pmTags}
            rectifiedExcludedTags={rectifiedExcludedTags}
            rectifiedDisplayTags={rectifiedDisplayTags}
            handleSetDisplayTags={handleSetDisplayNames}
            handleSetExcludedTags={handleSetExcludedNames}
        />

    </div>
}

function TagFilterHeader({rectifiedDisplayTags, pmTags, handleSetDisplayTags, handleSetExcludedTags}: {
    rectifiedDisplayTags: string[],
    pmTags: string[],
    handleSetDisplayTags: (names: string[]) => void,
    handleSetExcludedTags: (names: string[]) => void
}) {
    return pmTags.length > 0 ?
        <FilterHeadHStack>
            <h3>{rectifiedDisplayTags.length}/{pmTags.length} Tags(s)</h3>
            <button onClick={() => {
                handleSetDisplayTags([...pmTags]);
                handleSetExcludedTags([])
            }}>Include All
            </button>
            <button onClick={() => {
                handleSetDisplayTags([]);
                handleSetExcludedTags([...pmTags])
            }}>Exclude All
            </button>
            <button onClick={() => {
                handleSetDisplayTags([]);
                handleSetExcludedTags([])
            }}>Clear
            </button>
        </FilterHeadHStack>
        : null;
}

function TagFilterCheckboxes({
                                 pmTags,
                                 rectifiedExcludedTags,
                                 rectifiedDisplayTags,
                                 handleSetDisplayTags,
                                 handleSetExcludedTags
                             }: {
    pmTags: string[],
    rectifiedExcludedTags: string[],
    rectifiedDisplayTags: string[],
    handleSetDisplayTags: (names: string[]) => void,
    handleSetExcludedTags: (names: string[]) => void
}) {
    return <div>
        {pmTags.map((tag: string) => {
            return <TagFilterCheckbox key={tag} excludeTags={rectifiedExcludedTags}
                                      tag={tag} displayed={rectifiedDisplayTags}
                                      setDisplayed={handleSetDisplayTags}
                                      setExcludedTags={handleSetExcludedTags}
            />
        })
        }
    </div>;
}

const TagFilterCheckbox = ({tag, displayed, setDisplayed, excludeTags, setExcludedTags}: {
    tag: string,
    displayed: string[],
    excludeTags: string[],
    setDisplayed: React.Dispatch<React.SetStateAction<string[]>>,
    setExcludedTags: React.Dispatch<React.SetStateAction<string[]>>
}) => {

    // Remove display from excluded and vice versa
    function tickCheckbox() {
        // invert the checkbox
        const excluded = excludeTags.includes(tag)
        const included = displayed.includes(tag);
        const curMethod = included ? FilterMethod_Included : (
            excluded ? FilterMethod_Excluded : FilterMethod_NotFiltering
        );
        const nextMethod = getNextFilterMethod(curMethod);
        const newArr = nextMethod == FilterMethod_Included ? [...displayed, tag] : displayed.filter(k => k != tag)
        setDisplayed(newArr)
        setExcludedTags((
            nextMethod == FilterMethod_Excluded ? [...excludeTags, tag] : excludeTags.filter(k => k != tag))
        )
    }

    // inline-block: make this check box a whole element. It won't be split into multiple sub-elements when layout.
    // block will start a new line, inline will not, so we use inline-block
    return <span style={{display: "inline-block", margin: 3}}>
        <ClickableObsidianIconView style={iconViewAsAWholeStyle} iconName={displayed.includes(tag) ? tagIncludedIcon : (
            excludeTags.includes(tag) ? tagExcludedIcon : noTagIcon
        )}
                                   content={<label style={{marginLeft: 5}}>{tag.replace(Tag_Prefix_Tag, "")}</label>}
                                   onIconClicked={tickCheckbox}
                                   onContentClicked={tickCheckbox}
        />
    </span>

}
