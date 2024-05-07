import {IRenderable} from "../props-typing/i-renderable";
import {I_Stylable} from "../props-typing/i-stylable";
import {I_InteractableId} from "../props-typing/i-interactable-id";
import {GeneralMouseEventHandler} from "./event-handling/general-mouse-event-handler";

import {CssClass_Link} from "../style-def";

export interface I_IconClickable {
    content?: IRenderable;
    onIconClicked?: GeneralMouseEventHandler
    onContentClicked?: GeneralMouseEventHandler
    clickable?: boolean;

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
