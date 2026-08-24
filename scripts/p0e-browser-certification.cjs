#!/usr/bin/env node
'use strict';
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(ROOT,'scripts/p0e-settings-diagnostic.cjs')],{cwd:ROOT,stdio:'inherit'});
console.log('P0E settings diagnostic complete.');
