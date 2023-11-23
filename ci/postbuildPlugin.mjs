import {exec} from "child_process";

export const executePostBuildPlugin = {
    name: 'on-end',
    setup(build) {
        build.onEnd((result) => {
            if (result.errors.length > 0)
                console.error(`build ended with ${result.errors.length} errors`);
            else {
                // execute post build script
                exec("npm run postbuild", (err, stdout, stderr) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    console.log(stdout);
                    console.error(stderr);
                })
            }
        });
    },
};
