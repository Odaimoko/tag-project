/**
 * Stores task source information: file, path, and line number
 */
export class TaskSource {
    file: string;  // File name
    path: string;  // File path
    line: number;  // Line number

    constructor(file: string, path: string, line: number) {
        this.file = file;
        this.path = path;
        this.line = line;
    }

    /**
     * Create TaskSource from STask
     */
    static fromSTask(task: { path: string, line: number }): TaskSource {
        // Extract file name from path (without extension)
        const fileName = task.path.split('/').pop()?.replace(/\.[^/.]+$/, '') || '';
        return new TaskSource(fileName, task.path, task.line);
    }

    /**
     * Convert to object (for serialization)
     */
    toObject() {
        return {
            file: this.file,
            path: this.path,
            line: this.line,
        };
    }
}
