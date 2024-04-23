export const POTENTIAL_TAG_MATCHER = /[^+@\s,;.:!&*?'"`()\[\]{}#$]+/giu;
// With hashtag and spaces before
const POTENTIAL_FULLTAG_MATCHER = /[*\s]+#[^+@\s,;.:!&*?'"`()\[\]{}]+/giu;

export function matchTags(text: string): string[] {
    // TPM-0.2.0-1-9, remove tags in codeblocks.
    // dataview is slowly maintained, we deal with it ourselves.
    const codeBlockMatch = matchCodeInline(text);
    let tags: string[];
    if (!codeBlockMatch) {
        tags = text.match(POTENTIAL_FULLTAG_MATCHER) ?? [];
    } else {
        let removedText = text;
        for (const code of codeBlockMatch) {
            removedText = removedText.replace(code, "");
        }
        tags = matchTags(removedText);
    }
    // remove leading spaces and *
    return tags.map((k: string) => k.replace(/[*\s]+#/g, "#"));
}

export function matchCodeInline(text: string) {

    const match = text.match(/`.*?`/g);
    return match;
}
