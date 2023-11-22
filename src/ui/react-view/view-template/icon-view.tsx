import {IRenderable} from "../../common/i-renderable";
import React from "react";
import {getIcon} from "obsidian";
import {HtmlStringComponent} from "./html-string-component";

export const CssClass_Link = "cm-underline";
export const obsidianIconTopOffset = 4;
export const obsidianIconOffsetStyle = {position: "relative", top: obsidianIconTopOffset} as React.CSSProperties;
export interface I_Stylable {
    style?: React.CSSProperties;
}

// const taskLinkHtmlString = getIcon("link")?.outerHTML;
/**
 * https://lucide.dev/icons/
 * @param iconName
 * @constructor
 */
export function ObsidianIconView({iconName, style}: { iconName: string } & I_Stylable) {
    const htmlString = getIcon(iconName)?.outerHTML
    return <HtmlStringComponent style={style} htmlString={htmlString}/>;
}

/**
 * Premade Component.
 * @constructor
 */
export function InternalLinkView({content, onIconClicked, onContentClicked, style}: {
    content: IRenderable,
    onIconClicked?: () => void,
    onContentClicked?: () => void,
} & I_Stylable) {
    return <ClickableIconView style={style} content={content} onIconClicked={onIconClicked}
                              onContentClicked={onContentClicked}
                              iconName={"link"}
    />
}

export function ClickableIconView({content, onIconClicked, onContentClicked, iconName, style}: {
    content?: IRenderable,
    onIconClicked?: () => void,
    onContentClicked?: () => void,
    iconName: string
} & I_Stylable) {
    return <span style={style}>

        <a className={CssClass_Link} onClick={onIconClicked}>
           <ObsidianIconView iconName={iconName}/>
        </a>
        <span onClick={onContentClicked}>
        {content}
        </span>
    </span>
}
