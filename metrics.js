const { SolidityMetricsContainer } = require('solidity-code-metrics');
const fs = require('fs');
const path = require('path');

function enumerateFiles(dir) {
    const fileList = [];
    const queue = [dir];

    while (queue.length > 0) {
        const currentDir = queue.shift();
        const files = fs.readdirSync(currentDir);

        files.forEach((file) => {
            const filePath = path.join(currentDir, file);
            const fileStat = fs.lstatSync(filePath);

            if (fileStat.isDirectory()) {
                queue.push(filePath);
            } else {
                fileList.push(filePath);
            }
        });
    }

    return fileList;
}

function saveStringToFile(filePath, str) {
    fs.writeFileSync(filePath, str);
}

let options = {
    basePath: "",
    inputFileGlobExclusions: undefined,
    inputFileGlob: undefined,
    inputFileGlobLimit: undefined,
    debug: false,
    repoInfo: {
        branch: undefined,
        commit: undefined,
        remote: undefined
    }
}

let metrics = new SolidityMetricsContainer("metricsContainerName", options);
let allFiles = enumerateFiles("contracts/");

for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    console.log(`Analyzing '${file}'...`);
    metrics.analyze(file);
}

// output
console.log(metrics.totals());
metrics.generateReportMarkdown().then((text) => {
    saveStringToFile("report.md", text);
});