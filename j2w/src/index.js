#!/usr/bin/env node

const execFile = require('child_process').execFile;
const yargs = require('yargs');
const fs = require('fs');
const os = require('os');
const path = require('path');

const scriptDirectory = __dirname;

if (process.argv.length < 3) {
    console.log('Usage: node index.js -o <outputFileName> <inputFileName>');
    process.exit(1);
}
const argv = yargs
    .option('output', {
        alias: 'o',
        describe: 'Output file path',
        demandOption: true,
        type: 'string',
    })
    .demandCommand(1, 'Input file path is required')
    .argv;

const inputFilePath = argv._[0];

const outputFilePath = argv.output;

import('@bytecodealliance/wizer').then((wizer) => {
    let tempDir = os.tmpdir();
    let copiedFilePath = path.join(tempDir, path.basename(inputFilePath));
    fs.copyFileSync(inputFilePath, copiedFilePath);

    const child = execFile(wizer.default, ['--allow-wasi', '--wasm-bulk-memory', 'true', '--inherit-stdio', 'true', '--dir', tempDir,
        '-o', outputFilePath, '--', `${scriptDirectory}/js-runtime.wasm`], (err, stdout, stderr) => {
            if (err) {
                console.error(`Error executing command: ${err.message}`);
                fs.unlinkSync(copiedFilePath);
                process.exit(1);
            }
            console.log(stdout);
            console.error(stderr);
            fs.unlinkSync(copiedFilePath);
        });
    child.stdin.write(copiedFilePath)
    child.stdin.end()

}).catch((err) => {
    console.error(`Error importing @bytecodealliance / wizer: ${err.message}`);
});