'use strict';
const fs=require('node:fs'),vm=require('node:vm');
const core=fs.readFileSync(__dirname+'/script.js','utf8');
const ext=fs.readFileSync(__dirname+'/experience.js','utf8');
const source=core.slice(core.indexOf('const $ ='),core.indexOf('// 11. USER INTERACTIONS'))
  +ext.slice(ext.indexOf('function inversionCount('),ext.indexOf('function drawDisorder('))
  +ext.slice(ext.indexOf('function identityTrace('),ext.indexOf('let stableStep='))
  +ext.slice(ext.indexOf('function runExperienceChecks('),ext.indexOf('const extensionChecks='));
const result=vm.runInNewContext(source+'\nrunExperienceChecks()', {console});
console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
