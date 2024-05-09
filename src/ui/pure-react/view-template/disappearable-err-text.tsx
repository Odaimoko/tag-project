import React, {useEffect} from "react";

export function DisappearableErrText(props: {
    color: string;
    text: string,
    setText: (value: (((prevState: string) => string) | string)) => void,
    appearTime?: number
}) {
    const appearTime = props.appearTime === undefined ? 5000 : props.appearTime;
    useEffect(() => {
        // after 3 seconds, clear the text
        setTimeout(() => {
            props.setText("")
        }, appearTime)
    }, [props.text]);
    return <label style={{
        color: props.color
    }}>{props.text}</label>
}
