import {IRenderable} from "../../common/i-renderable";
import React from "react";
import {getIcon} from "obsidian";
import {HtmlStringComponent} from "./html-string-component";
import {I_InteractableId} from "../props-typing/i-interactable-id";
import {GeneralMouseEventHandler} from "../event-handling/general-mouse-event-handler";

export const CssClass_Link = "cm-underline";
export const obsidianIconTopOffset = 4;
export const obsidianIconOffsetStyle = {position: "relative", top: obsidianIconTopOffset} as React.CSSProperties;
export const obsidianIconOffsetCenteredStyle = {
    position: "relative",
    top: obsidianIconTopOffset / 2
} as React.CSSProperties;

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
    onIconClicked?: GeneralMouseEventHandler,
    onContentClicked?: GeneralMouseEventHandler,
} & I_Stylable) {
    return <ClickableIconView style={style} content={content} onIconClicked={onIconClicked}
                              onContentClicked={onContentClicked}
                              iconName={"link"}
    />
}

interface I_IconClickable {
    content?: IRenderable;
    onIconClicked?: GeneralMouseEventHandler
    onContentClicked?: GeneralMouseEventHandler
    clickable?: boolean;

}

/**
 * Can also be used as non-clickable
 */
export function ClickableIconView({
                                      content,
                                      onIconClicked,
                                      onContentClicked,
                                      iconName,
                                      style,
                                      clickable,
                                      interactableId
                                  }: {
    iconName: string,
} & I_IconClickable & I_Stylable & I_InteractableId) {
    return <ClickableView clickable={clickable} icon={<ObsidianIconView iconName={iconName}/>} content={content}
                          onIconClicked={onIconClicked} onContentClicked={onContentClicked} style={style}
                          interactableId={interactableId}/>
}

export function ClickableView({
                                  icon,
                                  content,
                                  style,
                                  clickable = true,
                                  onIconClicked,
                                  onContentClicked,
                                  interactableId
                              }: {
    icon: IRenderable,
} & I_IconClickable & I_Stylable & I_InteractableId) {
    onIconClicked = clickable ? onIconClicked : undefined;
    onContentClicked = clickable ? onContentClicked : undefined;
    return <span style={style}>

        {clickable ? <a className={CssClass_Link} id={`${interactableId}_normalLink`} onClick={onIconClicked}>
            {icon}
        </a> : icon}
        <span id={`${interactableId}_spanLink`} onClick={onContentClicked}>
        {content}
        </span>
    </span>
}
