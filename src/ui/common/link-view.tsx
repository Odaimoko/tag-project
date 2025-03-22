import React, {useContext} from "react";
import {MarkdownConvertContext} from "../../utils/markdown-converter";

export const LinkView = ({text, onClick, style}: {
    text: string,
    onClick?: () => void,
    style?: React.CSSProperties
}) => {
    return <a style={style} className="internal-link" onClick={onClick}>{text}</a>
}
/**
 * Wrapped by spaces
 * @param props
 * @constructor
 */
export const HelpPanelSwitcher = (props: {
    panelName: string, // Page title or panel name
    currentPanelName?: string,
    setPanelName?: (panelName: string) => void,
}) => {
    const {panelName, setPanelName} = props;
    const mmc = useContext(MarkdownConvertContext);
    const chosen = panelName === props.currentPanelName;
    if (!mmc)
        return <button style={Object.assign({}, chosen ?
                {
                    borderWidth: 1,
                    border: "solid"
                } as React.CSSProperties
                : undefined,
            {margin: 5} as React.CSSProperties)
        } onClick={() => setPanelName?.(panelName)}>{panelName}</button>;
    // Type assertion to avoid type error
    return `[[${panelName}]]` as unknown as React.JSX.Element
}
