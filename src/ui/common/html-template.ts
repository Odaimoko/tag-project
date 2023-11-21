export function appendBoldText(doc: Node, text: string) {
    // https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment/append
    const bold = doc.createEl("strong")
    const textEle = doc.createEl("span", {text: text})
    bold.appendChild(textEle)
    doc.appendChild(bold)
}