export class GenericProvider<T> {
    providers: T[];

    constructor() {
        this.providers = [] as T[];
    }

    add(item: T): void {
        if (this.providers.includes(item)) {
            this.providers.splice(this.providers.indexOf(item), 1);
        }
        this.providers.push(item)
    }

    remove(): void {
        if (this.providers.length > 0)
            this.providers.pop();
    }

    get(): T | null {
        if (this.providers.length > 0)
            return this.providers[this.providers.length - 1];
        else {
            throw new Error(`No provider for ${typeof this.providers} found`);
        }
    }
}