export const POTENTIAL_TAG_MATCHER = /[^+@\s,;.:!&*?'"`()\[\]{}]+/giu;
// With hashtag and spaces before
const POTENTIAL_FULLTAG_MATCHER = /\s+#[^+@\s,;.:!&*?'"`()\[\]{}]+/giu;

export function matchTags(text: string) {
    const tags = text.match(POTENTIAL_FULLTAG_MATCHER)
    return tags;
}

export function matchCodeInline(text: string) {

    const match = text.match(/`.*?`/g);
    return match;
}
