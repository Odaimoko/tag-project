import {IRenderable} from "../props-typing/i-renderable";
import React, {useState} from "react";

import {varBackgroundPrimary, warningColor} from "../style-def";

export function TwiceConfirmButton(props: {
    onConfirm: () => void,
    confirmView: IRenderable,
    twiceConfirmView: IRenderable,
}) {
    const [clicked, setClicked] = useState(false);

    return <button onMouseLeave={unclick} onBlur={unclick} style={{
        background: clicked ? warningColor : varBackgroundPrimary,
    }} onClick={() => {
        if (clicked) {
            props.onConfirm();
            setClicked(false);
        } else {
            setClicked(true);
        }
    }}>{clicked ? props.twiceConfirmView : props.confirmView}</button>

    function unclick() {
        setClicked(false);
    }
}
