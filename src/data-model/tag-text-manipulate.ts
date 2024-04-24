// region tag Manipulate

/**
 * add a tag at the end of the line. the tag will be followed by a space
 * @param text
 * @param tag
 */
export function addTagText(text: string, tag: string) {
    // With the rule that a task cannot cross multiple lines, we can safely assume that the last char is \n if there is a \n.
    const hasTrailingEol = text.indexOf("\n") == text.length - 1
    // We believe dataview gives the correct result. In the latter case there will be no step.tag in the original text if includes is false.
    const textCleanAtRight = text.trimEnd();
    // Obisidian's block reference only allows alphanumeric and -. Block identifiers need to be at the end of the line, without trailing spaces.
    // https://help.obsidian.md/Linking+notes+and+files/Internal+links#Link+to+a+block+in+a+note
    const blockRefMatch = textCleanAtRight.match(/ \^[a-zA-Z0-9-]+/);
    if (blockRefMatch) {
        return `${textCleanAtRight.replace(blockRefMatch[0], "")} ${tag} ${blockRefMatch[0]}` + (hasTrailingEol ? "\n" : "");
    } else
        return `${textCleanAtRight} ${tag} ${hasTrailingEol ? "\n" : ""}`;
}

// TODO wont remove the space before or after the tag
export function removeTagText(text: string, tag: string) {
    // only remove the tag and the space before it
    // match the tag with whole word
    const pattern = new RegExp(`\\s+${tag}\\b`, "u");
    return text.replace(pattern, "");
}

// endregion
