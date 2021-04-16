#!/usr/bin/env node
console.log('zzx-gulp-workflow')

process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('../lib/index.js')) // 也可以写成 require.resolve('..') ，因为package.json 的 main 指向了 lib/index.js

// console.log(process.argv);

require('gulp/bin/gulp')
