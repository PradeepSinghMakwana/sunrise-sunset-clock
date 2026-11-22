'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),RUNNER=path.join(ROOT,'scripts','run-android-ui-tests.sh');
const screenshots=['01-app-setup.png','02-launcher-before.png','02-home-screen-widget.png','04-app-setup-ready.png','05-launcher-edit-menu.png','06-widget-picker-open.png','07-widget-row-selected.png','08-widget-after-placement.png'];
const hierarchies=screenshots.map(x=>x.replace('.png','.xml'));
test('UI runner preserves Gradle failure while gathering all diagnostics',()=>{const {result,calls}=runStub(7,'complete');assert.equal(result.status,7);assert.deepEqual(calls,['shell settings put global auto_time_zone 0','shell cmd alarm set-timezone America/Los_Angeles','shell date +%Z%z','shell am broadcast -a android.intent.action.TIMEZONE_CHANGED --es time-zone America/Los_Angeles','shell wm size 1080x2400','shell wm density 420','shell wm size','shell wm density','pull /data/local/tmp/sunrise-sunset-ci/. android-13-screenshots/','shell dumpsys appwidget','logcat -d','exec-out screencap -p']);});
test('UI runner fails before Gradle on non-California timezone',()=>{const {result,calls}=runStub(0,'missing','UTC+0000');assert.equal(result.status,1);assert.match(result.stdout,/expected a California PST\/PDT offset/);assert.deepEqual(calls,['shell settings put global auto_time_zone 0','shell cmd alarm set-timezone America/Los_Angeles','shell date +%Z%z']);});
test('UI runner accepts California daylight offset',()=>{const {result}=runStub(0,'complete','PDT-0700');assert.equal(result.status,0);assert.doesNotMatch(result.stdout,/expected a California PST\/PDT offset/);});
test('UI runner fails if successful Gradle run has missing screenshot and hierarchy evidence',()=>{const {result}=runStub(0,'missing');assert.equal(result.status,1);assert.match(result.stdout,/Missing or empty Android 13 screenshot:/);assert.match(result.stdout,/Missing or empty Android 13 UI hierarchy:/);});
test('UI runner reports missing hierarchy when screenshots exist',()=>{const {result}=runStub(0,'screenshots');assert.equal(result.status,1);assert.doesNotMatch(result.stdout,/Missing or empty Android 13 screenshot:/);assert.match(result.stdout,/Missing or empty Android 13 UI hierarchy:/);});
test('UI runner returns success only with Gradle and full screenshot/hierarchy evidence',()=>{const {result}=runStub(0,'complete');assert.equal(result.status,0);assert.doesNotMatch(result.stdout,/Missing or empty Android 13 screenshot:|Missing or empty Android 13 UI hierarchy:/);});
test('UI runner source checks evidence collection and failure reporting contracts',()=>{const runner=fs.readFileSync(RUNNER,'utf8');for(const token of ['adb pull /data/local/tmp/sunrise-sunset-ci/. android-13-screenshots/','appwidget-dump-after-test-cleanup.txt','required_hierarchies=(','Missing or empty Android 13 UI hierarchy:','timeout --signal=TERM --kill-after=15s 300s gradle'])assert.ok(runner.includes(token),token);});
test('UI runner requires generic tall phone size and density',()=>{const s=fs.readFileSync(RUNNER,'utf8');for(const token of ['wm size 1080x2400','wm density 420','Override size: 1080x2400','Override density: 420','not a Pixel hardware profile or OEM skin'])assert.ok(s.includes(token),token);});
test('UI runner configures timezone, launcher environment, and bounded Gradle task',()=>{const s=fs.readFileSync(RUNNER,'utf8');assert.match(s,/cmd alarm set-timezone America\/Los_Angeles/);assert.match(s,/TIMEZONE_CHANGED/);assert.match(s,/timeout --signal=TERM --kill-after=15s 300s gradle/);assert.match(s,/exit "\$test_status"/);});
function runStub(gradleStatus,evidence='missing',timezone='PST-0800'){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'android-runner-')),bin=path.join(dir,'bin'),callsFile=path.join(dir,'adb-calls.txt');fs.mkdirSync(bin);fs.copyFileSync(RUNNER,path.join(dir,'run-android-ui-tests.sh'));
 fs.writeFileSync(path.join(bin,'gradle'),`#!/usr/bin/env bash
exit "$GRADLE_TEST_EXIT"
`);fs.writeFileSync(path.join(bin,'adb'),`#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$ADB_CALLS"
if [[ "$*" == "shell date +%Z%z" ]]; then echo "$DEVICE_TIMEZONE"; fi
if [[ "$*" == "shell wm size" ]]; then echo "Override size: 1080x2400"; fi
case "$*" in 'shell wm density') echo 'Override density: 420' ;; esac
exit 0
`);for (const f of [path.join(bin,'gradle'),path.join(bin,'adb')])fs.chmodSync(f,0o755);
 if(evidence==='screenshots'||evidence==='complete'){const d=path.join(dir,'android-13-screenshots');fs.mkdirSync(d);screenshots.forEach(n=>fs.writeFileSync(path.join(d,n),'test-screenshot'));if(evidence==='complete')hierarchies.forEach(n=>fs.writeFileSync(path.join(d,n),'test-hierarchy'));}
 const env={...process.env,PATH:bin+path.delimiter+process.env.PATH,GRADLE_TEST_EXIT:String(gradleStatus),ADB_CALLS:callsFile,DEVICE_TIMEZONE:timezone};const result=cp.spawnSync('bash',[path.join(dir,'run-android-ui-tests.sh')],{cwd:dir,env,encoding:'utf8'});const calls=fs.existsSync(callsFile)?fs.readFileSync(callsFile,'utf8').trim().split(/\r?\n/):[];fs.rmSync(dir,{recursive:true,force:true});return {result,calls};
}
