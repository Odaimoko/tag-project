import {OdaPmTask} from "../data-model/workflow-def";

export function initialToUpper(word: string) {
    if (!word) return word;
    return word[0].toUpperCase() + word.slice(1);
}

export function isStringNullOrEmpty(text: string | null | undefined): boolean {
    if (!text) return true;
    return text.length === 0;

}


// region Search

// search
// let pattern = ref("");
//
// function regexFilter(pattern: string, task: OdaPmTask): boolean {
//     let rule = /.*/;
//     try {
//         rule = RegExp(pattern, "i");
//     } catch (e) {
//
//     } finally {
//         return rule.test(option.label);
//     }
// }
export function simpleFilter(pattern: string, task: OdaPmTask): boolean {
    return task.summary.toLowerCase().contains(pattern.toLowerCase());
}

// endregion