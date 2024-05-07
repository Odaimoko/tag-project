/**
 * Toggle the value in the array. If the value is in the array, remove it. If not, add it.
 * @param value
 * @param valueArray
 * @param setValueArray
 */
export function toggleValueInArray(value: string, valueArray: string[], setValueArray: (value: (((prevState: string[]) => string[]) | string[])) => void) {
    if (!setValueArray || !valueArray) return;
    // invert the checkbox
    const v = !valueArray.includes(value)
    const newArr = v ? [...valueArray, value] : valueArray.filter(k => k != value)
    setValueArray(newArr)
}
