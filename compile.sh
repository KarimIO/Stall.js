mkdir -p Build/
tsc Sources/*.ts --outDir Build/
cat Build/*.js > Sources/Oak.js
#uglifyjs Sources/Oak.js -c > Scripts/oak.min.js
cp Sources/Oak.js Scripts/oak.min.js
#uglifyjs Sources/OakUI.js -c > Scripts/oakui.min.js
cp Sources/OakUI.js Scripts/oakui.min.js