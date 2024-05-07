import React from "react";
import {IRenderable} from "../pure-react/props-typing/i-renderable";

export const InlineCodeView = ({text}: {
    text: IRenderable
}) => {
    return <span style={{
        color: "var(--code-normal)",
        backgroundColor: "var(--code-background)",
        fontSize: "var(--code-size)",
        fontFamily: "var(--font-monospace)",
        verticalAlign: "baseline",
        borderRadius: "var(--code-radius)",
        padding: "0.25em",
    }} spellCheck="false">{text}</span>
}
