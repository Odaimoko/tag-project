import React from "react";

export const varBackgroundPrimary = "var(--background-primary)";

// -16 is the padding of the obsidian leaf view container. The content will overflow the container's box.
// sticky header see: https://css-tricks.com/position-sticky-and-table-headers/
export const getStickyHeaderStyle = () => {
    return {
        position: "sticky", top: -16,
        zIndex: 1,
    } as React.CSSProperties;
}
