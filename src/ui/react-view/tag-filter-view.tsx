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
import {IRenderable} from "../pure-react/props-typing/i-renderable";
import {getPluralSuffix} from "../../utils/word-util";

const tagIncludedIcon = "check"
const tagExcludedIcon = "x"
const noTagIcon = "scan"

interface TagFilterOptions {
    pmTags: string[];
    rectifiedExcludedTags: string[];
    rectifiedDisplayTags: string[],
    handleSetDisplayNames: (names: string[]) => void,
    handleSetExcludedNames: (names: string[]) => void
    tagRenderer?: (tag: string) => IRenderable | undefined,
    titleName?: string
}


export function TagFilterView(props: TagFilterOptions) {
    const {
        pmTags,
        rectifiedExcludedTags,
        rectifiedDisplayTags,
        handleSetDisplayNames,
        handleSetExcludedNames,
        tagRenderer
    } = props;
    return <div>
        <TagFilterHeader {...props}/>
        <TagFilterCheckboxes
            pmTags={pmTags}
            rectifiedExcludedTags={rectifiedExcludedTags}
            rectifiedDisplayTags={rectifiedDisplayTags}
            handleSetDisplayNames={handleSetDisplayNames}
            handleSetExcludedNames={handleSetExcludedNames}
            tagRenderer={tagRenderer}

        />

    </div>
}

function TagFilterHeader({
                             rectifiedDisplayTags, pmTags, handleSetDisplayNames, handleSetExcludedNames,
                             titleName
                         }: Omit<TagFilterOptions, "tagRenderer">) {
    const title = titleName ?? "Tag";
    return pmTags.length > 0 ?
        <FilterHeadHStack>
            <h3>{rectifiedDisplayTags.length}/{pmTags.length} {title}({getPluralSuffix(title)})</h3>
            <button onClick={() => {
                handleSetDisplayNames([...pmTags]);
                handleSetExcludedNames([])
            }}>Include All
            </button>
            <button onClick={() => {
                handleSetDisplayNames([]);
                handleSetExcludedNames([...pmTags])
            }}>Exclude All
            </button>
            <button onClick={() => {
                handleSetDisplayNames([]);
                handleSetExcludedNames([])
            }}>Clear
            </button>
        </FilterHeadHStack>
        : null;
}

function TagFilterCheckboxes({
                                 pmTags,
                                 rectifiedExcludedTags,
                                 rectifiedDisplayTags,
                                 handleSetDisplayNames,
                                 handleSetExcludedNames,
                                 tagRenderer
                             }: {
    pmTags: string[],
    rectifiedExcludedTags: string[],
    rectifiedDisplayTags: string[],
    handleSetDisplayNames: (names: string[]) => void,
    handleSetExcludedNames: (names: string[]) => void
    tagRenderer?: (tag: string) => IRenderable | undefined
}) {
    return <div>
        {pmTags.map((tag: string) => {
            return <TagFilterCheckbox key={tag} excludeTags={rectifiedExcludedTags}
                                      tag={tag} displayed={rectifiedDisplayTags}
                                      setDisplayed={handleSetDisplayNames}
                                      setExcludedTags={handleSetExcludedNames}
                                      tagRenderer={tagRenderer}
            />
        })
        }
    </div>;
}

const TagFilterCheckbox = ({tag, displayed, setDisplayed, excludeTags, setExcludedTags, tagRenderer}: {
    tag: string,
    displayed: string[],
    excludeTags: string[],
    setDisplayed: React.Dispatch<React.SetStateAction<string[]>>,
    setExcludedTags: React.Dispatch<React.SetStateAction<string[]>>,
    tagRenderer?: (tag: string) => IRenderable | undefined
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
    const trimmedTag = tag.replace(Tag_Prefix_Tag, "");
    return <span style={{display: "inline-block", margin: 3}}>
        <ClickableObsidianIconView style={iconViewAsAWholeStyle} iconName={displayed.includes(tag) ? tagIncludedIcon : (
            excludeTags.includes(tag) ? tagExcludedIcon : noTagIcon
        )}
                                   content={<label style={{marginLeft: 5}}>
                                       {tagRenderer?.(trimmedTag) ?? trimmedTag}
                                   </label>}
                                   onIconClicked={tickCheckbox}
                                   onContentClicked={tickCheckbox}
        />
    </span>

}
