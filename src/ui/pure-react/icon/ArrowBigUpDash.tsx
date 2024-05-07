import React from "react";

export function ArrowBigUpDash() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M9 19h6"/>
        <path d="M9 15v-3H5l7-7 7 7h-4v3H9z"/>
    </svg>
}

export function ArrowBigDownDash() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M15 5H9"/>
        <path d="M15 9v3h4l-7 7-7-7h4V9z"/>
    </svg>
}

// Stroke width is 1.5, lower than 2 to emphasize the difference between big up and up.
export function ArrowBigUp() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18v-6H5l7-7 7 7h-4v6H9z"/>
    </svg>
}

export function ArrowBigDown() {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    >
        <path d="M15 6v6h4l-7 7-7-7h4V6h6z"/>
    </svg>
}
