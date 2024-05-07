// Render an html string as a React component.
// https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml
import parse from "html-react-parser";
import React from "react";

import {I_Stylable} from "../props-typing/i-stylable";

export function HtmlStringComponent({htmlString, useSpan = true, style}: {
    htmlString?: string,
    useSpan?: boolean
} & I_Stylable) {
    if (useSpan)
        return (
            <span style={style}>
                {parse(htmlString ?? "")}
            </span>
        );
    else return <div style={style}>
        {parse(htmlString ?? "")}
    </div>
}
