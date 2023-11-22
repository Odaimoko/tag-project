import {IRenderable} from "../../common/i-renderable";
import React, {useState} from "react";
import {warningColor} from "../fix-orphan-tasks";

export function TwiceConfirmButton(props: {
    onConfirm: () => void,
    confirmView: IRenderable,
    twiceConfirmView: IRenderable,
}) {
    const [clicked, setClicked] = useState(false);

    return <button onMouseLeave={unclick} onBlur={unclick} style={{
        background: clicked ? warningColor : "var(--background-primary)",
    }} onClick={() => {
        if (clicked) {
            props.onConfirm();
        } else {
            setClicked(true);
        }
    }}>{clicked ? props.twiceConfirmView : props.confirmView}</button>

    function unclick() {
        setClicked(false);
    }
}
