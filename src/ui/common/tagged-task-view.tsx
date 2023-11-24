import React from "react";
import {HashTagView} from "./hash-tag-view";

export const TaggedTaskView = ({content, tags}: {
    content: string,
    tags: string[]
}) => {
    const checkBoxExampleStyle = {marginTop: 10, marginBottom: 10,}

    return <div style={checkBoxExampleStyle}>
        <input type={"checkbox"}/>
        <label>{content} </label>
        {
            tags.map(tag => <HashTagView key={tag} tagWithoutHash={tag}/>)
        }
    </div>
}
