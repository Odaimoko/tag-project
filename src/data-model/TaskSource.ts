/**
 * 可提供来源信息（文件、路径、行号）的共用接口。
 * Module / Step / Task / Workflow 等均实现此接口。
 */
export interface I_GetTaskSource {
    getSource(): TaskSource | null;
}

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
