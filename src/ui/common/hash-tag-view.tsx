import React, {useContext} from "react";
import {MarkdownConvertContext} from "../../utils/markdown-converter";

export const HashTagView = ({tagWithoutHash}: {
    tagWithoutHash: string
}) => {
    const mcc = useContext(MarkdownConvertContext);
    tagWithoutHash = tagWithoutHash.startsWith("#") ? tagWithoutHash.substring(1) : tagWithoutHash
    return !mcc ? <>
            <span
                className="cm-formatting cm-formatting-hashtag cm-hashtag cm-hashtag-begin cm-list-1 cm-meta">#</span>
        <span
            className="cm-hashtag cm-hashtag-end cm-list-1 cm-meta ">{tagWithoutHash}</span>
    </> : <span>    <a className="tag-link internal">#{tagWithoutHash}</a></span>
}
