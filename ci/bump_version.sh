
# if pwd is not the root of the repo, cd to it
if [ ! -f "package.json" ]; then
  cd ..
fi
# if pwd is still not the root of the repo, exit
if [ ! -f "package.json" ]; then
  echo "Error: should be run from the root of the repo"
  exit 1
fi
node ci/version-bump.mjs
# exit if current-version.txt doesn't exist 
if [ ! -f "current-version.txt" ]; then
    echo "Error: current-version.txt not found"
    exit 1
fi
targetVersion=$(<"current-version.txt") # read the current version from the file
echo "Bumping version to $targetVersion"

git add manifest.json package.json versions.json
git commit -m "Bump version to $targetVersion"
#git push
git tag -a "$targetVersion" -m "Bump version tag to $targetVersion"
#git push --tags

rm current-version.txt
