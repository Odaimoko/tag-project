import {KeyboardEvent} from "react";

/**
 * Check if the key is a character input excluding the escape key
 * @param event
 */
export const isCharacterInput = (event: KeyboardEvent) => {
    return (
        event.key.length === 1 && // Check for single character keys
        event.key !== 'Escape' && // Exclude the escape key
        !event.ctrlKey && !event.altKey && // Exclude control and alt keys
        !event.metaKey // Exclude meta key (e.g., Command key on macOS)
        // Add more conditions as needed for specific cases
    );
};
