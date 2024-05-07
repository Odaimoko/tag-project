import {IRenderable} from "../pure-react/props-typing/i-renderable";
import React from "react";
import {getIcon} from "obsidian";
import {HtmlStringComponent} from "../pure-react/view-template/html-string-component";
import {I_InteractableId} from "../pure-react/props-typing/i-interactable-id";
import {GeneralMouseEventHandler} from "../pure-react/view-template/event-handling/general-mouse-event-handler";
import {I_Stylable} from "../pure-react/props-typing/i-stylable";
import {ClickableView, I_IconClickable} from "../pure-react/view-template/clickable-view";

export const CssClass_Link = "cm-underline";

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
    return <ClickableObsidianIconView style={style} content={content} onIconClicked={onIconClicked}
                                      onContentClicked={onContentClicked}
                                      iconName={"link"}
    />
}

/**
 * Can also be used as non-clickable
 */
export function ClickableObsidianIconView({
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

