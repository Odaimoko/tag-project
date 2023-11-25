import React, {useContext} from "react";
import {HashTagView} from "./hash-tag-view";
import {MarkdownConvertContext} from "../../utils/markdown-converter";

export const TaggedTaskView = ({content, tags}: {
    content: string,
    tags: string[]
}) => {
    const checkBoxExampleStyle = {marginTop: 10, marginBottom: 10,}
    const mcc = useContext(MarkdownConvertContext);
    const taskContent = <>
        <label>{content} </label>
        {
            tags.map(tag => <HashTagView key={tag} tagWithoutHash={tag}/>)
        }
    </>;

    return !mcc ?
        <div style={checkBoxExampleStyle}>
            <input type={"checkbox"}/>
            {taskContent}
        </div> : <ul className="contains-task-list">

            <li className="task-list-item">
                <input type="checkbox" disabled={true}/>
                {/* add a space */}
                <label> </label>
                {taskContent}
            </li>


        </ul>

}
