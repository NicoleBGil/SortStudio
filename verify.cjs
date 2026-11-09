'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/script.js','utf8');
const core=source.slice(source.indexOf('const $ ='),source.indexOf('// 11. USER INTERACTIONS'));
const checks=source.slice(source.indexOf('function runVerification()'),source.indexOf('function renderVerification()'));
const result=vm.runInNewContext(core+'\n'+checks+'\nrunVerification()', {console});
console.log(JSON.stringify(result,null,2));
if(result.errors.length)process.exitCode=1;
