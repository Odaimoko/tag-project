import {readFileSync, writeFileSync} from "fs";
import {exec} from "child_process";

// This is the version defined in package.json
const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump version to target version
let manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const {minAppVersion} = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t"));

// update versions.json with target version and minAppVersion from manifest.json
let versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t"));

exec("git add manifest.json package.json versions.json")
exec(`git commit -m "Bump version to ${targetVersion}"`)
exec("git push")
exec(`git tag -a v${targetVersion} -m "Bump version tag to ${targetVersion}"`)
exec("git push --tags")
