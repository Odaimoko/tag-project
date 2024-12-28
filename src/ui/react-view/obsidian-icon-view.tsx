import {IRenderable} from "../pure-react/props-typing/i-renderable";
import React from "react";
import {getIcon} from "obsidian";
import {HtmlStringComponent} from "../pure-react/view-template/html-string-component";
import {I_InteractableId} from "../pure-react/props-typing/i-interactable-id";
import {GeneralMouseEventHandler} from "../pure-react/view-template/event-handling/general-mouse-event-handler";
import {I_Stylable} from "../pure-react/props-typing/i-stylable";
import {ClickableView, I_IconClickable} from "../pure-react/view-template/clickable-view";
// Obsidian's icon will offset by 4px upwards, so we drive it down.
const clickableIconTransform = {transform: `translateY(2px)`};

// const taskLinkHtmlString = getIcon("link")?.outerHTML;
/**
 * https://lucide.dev/icons/
 * @param iconName
 * @constructor
 */
export function ObsidianIconView({iconName, style, yOffset}: { iconName: string, yOffset?: boolean } & I_Stylable) {
    const icon: SVGSVGElement | null = getIcon(iconName);
    yOffset = yOffset ?? true; // default to true
    if (icon) {
        icon.setCssStyles(style as CSSStyleDeclaration)
        if (yOffset)
            icon.setCssStyles(clickableIconTransform); // do not override th e
    }
    const htmlString = icon?.outerHTML
    return <HtmlStringComponent style={clickableIconTransform} htmlString={htmlString}/>;
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

