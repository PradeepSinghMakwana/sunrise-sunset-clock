#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const PROFILE_ID=/^\s*id:\s*\d+\s+or\s+"([^"]+)"\s*$/gm;
function parseDeviceProfileIds(output){return new Set([...output.matchAll(PROFILE_ID)].map(m=>m[1]));}
function findAvdmanager(env=process.env){const paths=(env.PATH||'').split(path.delimiter);for(const p of paths){const candidate=path.join(p,'avdmanager');if(fs.existsSync(candidate))return candidate;}
 const roots=new Set([env.ANDROID_HOME,env.ANDROID_SDK_ROOT,path.join(require('node:os').homedir(),'Android','Sdk')].filter(Boolean));const candidates=[];for(const root of roots){const base=path.join(root,'cmdline-tools');candidates.push(path.join(base,'latest','bin','avdmanager'),path.join(base,'bin','avdmanager'));try{for(const v of fs.readdirSync(base).sort().reverse())candidates.push(path.join(base,v,'bin','avdmanager'));}catch{}}
 for(const p of candidates)if(fs.existsSync(p)&&fs.statSync(p).isFile())return p;throw new Error('avdmanager not found on PATH or in ANDROID_HOME/ANDROID_SDK_ROOT cmdline-tools');}
function requireProfileExists(profile,output){const ids=parseDeviceProfileIds(output);if(!ids.has(profile)){throw new Error(`AVD profile ${JSON.stringify(profile)} unavailable. Exact IDs reported by avdmanager: ${[...ids].sort().join(', ')||'(none found)'}`);}}
function main(){const profile=process.argv[2];if(!profile){console.error('Usage: avd-profile-validation.js EXACT_PROFILE_ID');return 1;}try{const executable=findAvdmanager(),r=cp.spawnSync(executable,['list','device'],{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw new Error(`avdmanager exited ${r.status}: ${r.stderr}`);requireProfileExists(profile,(r.stdout||'')+(r.stderr||''));console.log(`AVD profile preflight passed: ${profile}`);return 0;}catch(e){console.error('AVD profile preflight failed:',e.message);return 1;}}
if(require.main===module)process.exit(main());
module.exports={parseDeviceProfileIds,findAvdmanager,requireProfileExists,main};
