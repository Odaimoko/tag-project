import React from "react";

export const LinkView = ({text, onClick}: {
    text: string,
    onClick?: () => void
}) => {
    return <a className="internal-link" onClick={onClick}>{text}</a>
}
