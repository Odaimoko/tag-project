import {IRenderable} from "../../common/i-renderable";
import React, {useState} from "react";

export function TwiceConfirmButton(props: {
    onConfirm: () => void,
    confirmView: IRenderable,
    twiceConfirmView: IRenderable,
}) {
    const [clicked, setClicked] = useState(false);

    return <button onMouseLeave={unclick} onBlur={unclick} style={{
        background: clicked ? "var(--text-warning)" : "var(--background-primary)",
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
