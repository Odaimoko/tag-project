import React, {useContext} from "react";
import {MarkdownConvertContext} from "../../utils/markdown-converter";
import {IRenderable} from "../pure-react/props-typing/i-renderable";

export const HashTagView = ({tagWithoutHash}: {
    tagWithoutHash: IRenderable
}) => {
    const mcc = useContext(MarkdownConvertContext);
    if (typeof tagWithoutHash === "string")
        tagWithoutHash = tagWithoutHash.startsWith("#") ? tagWithoutHash.substring(1) : tagWithoutHash
    return !mcc ?
        <>
            <span
                className="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1 cm-meta">#</span>
            <span
                className="cm-hashtag cm-hashtag-end cm-list-1 cm-meta ">{tagWithoutHash}</span>
        </>
        // To prevent quartz from recognizing this as a tag, we wrap ths hashtag in a label
        : <span> <a className="tag-link internal"><label>{"#"}</label>{tagWithoutHash}</a></span>
}
