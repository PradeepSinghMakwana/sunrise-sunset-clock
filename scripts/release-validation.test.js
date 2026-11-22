'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const avd=require('./avd-profile-validation'),screens=require('./validate-release-screenshots');
const SAMPLE=`Available devices definitions:
id: 0 or "pixel_7_pro"
 Name: Pixel 7 Pro
id: 1 or "Nexus 5X"
 Name: Nexus 5X
`;
test('AVD parser extracts exact quoted profile IDs',()=>assert.deepEqual(avd.parseDeviceProfileIds(SAMPLE),new Set(['pixel_7_pro','Nexus 5X'])));
test('AVD profile accepts exact match only',()=>assert.doesNotThrow(()=>avd.requireProfileExists('Nexus 5X',SAMPLE)));
test('AVD rejects unavailable profile with available list',()=>assert.throws(()=>avd.requireProfileExists('Pixel_2',SAMPLE),/Pixel_2.*unavailable.*Nexus 5X/));
test('AVD matching is case-sensitive and does not allow partial IDs',()=>{assert.throws(()=>avd.requireProfileExists('PIXEL_7_PRO',SAMPLE));assert.throws(()=>avd.requireProfileExists('pixel_7',SAMPLE));});
test('AVD rejects empty or unrecognized list',()=>assert.throws(()=>avd.requireProfileExists('Pixel_2','No definitions'),/none found/));
test('AVD resolves executable from SDK cmdline-tools latest',()=>{const d=temp();try{const file=path.join(d,'cmdline-tools','latest','bin','avdmanager');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'stub');assert.equal(avd.findAvdmanager({PATH:'',ANDROID_HOME:d,ANDROID_SDK_ROOT:''}),file);}finally{clean(d);}});
test('AVD reports actionable failure when executable absent',()=>{const d=temp();try{assert.throws(()=>avd.findAvdmanager({PATH:'',ANDROID_HOME:d,ANDROID_SDK_ROOT:''}),/ANDROID_HOME/);}finally{clean(d);}});
test('release screenshot validator requires nontrivial PNGs and unique content',()=>{const d=path.join(temp(),'screens');try{fs.mkdirSync(d);const png=makePng(800,1000,10050);fs.writeFileSync(path.join(d,'01-app-setup.png'),png);fs.writeFileSync(path.join(d,'02-home-screen-widget.png'),makePng(900,1200,10050,1));assert.equal(screens.validate(d).length,2);}finally{clean(d);}});
test('release screenshot validator rejects missing files',()=>{const d=path.join(temp(),'screens');try{fs.mkdirSync(d);assert.throws(()=>screens.validate(d),/missing/);}finally{clean(d);}});
test('release screenshot validator rejects duplicate images',()=>{const d=path.join(temp(),'screens');try{fs.mkdirSync(d);const b=makePng(800,800,10050);fs.writeFileSync(path.join(d,'01-app-setup.png'),b);fs.writeFileSync(path.join(d,'02-home-screen-widget.png'),b);assert.throws(()=>screens.validate(d),/identical/);}finally{clean(d);}});
test('release screenshot validator rejects bad PNG signature and undersized images',()=>{const d=path.join(temp(),'screens');try{fs.mkdirSync(d);fs.writeFileSync(path.join(d,'01-app-setup.png'),Buffer.alloc(100));fs.writeFileSync(path.join(d,'02-home-screen-widget.png'),Buffer.alloc(100));assert.throws(()=>screens.validate(d),/invalid or incomplete PNG/);}finally{clean(d);}});
test('SemVer gate accepts supported stable and prerelease tags',()=>{const script=readSemver();for(const tag of ['v0.0.0','v2.0.0','v2.1.3','v10.20.30','v2.1.0-alpha.1','v2.1.0-alpha.9','v2.1.0-beta.2','v2.1.0-rc.1','v0.0.1-rc.10'])assert.equal(runSemver(tag,tag.slice(1)).status,0,tag);});
test('SemVer gate rejects malformed tags',()=>{for(const tag of ['', '2.0.0','v2.0','v2','v02.0.0','v2.00.0','v2.0.00','v-1.0.0','v2.0.0-preview.1','v2.0.0-rc','v2.0.0-rc.01','v2.0.0-beta.-1','v2.0.0+build.4','v2.0.0-alpha.1.extra','vv2.0.0'])assert.notEqual(runSemver(tag,'2.0.0').status,0,tag);});
test('SemVer gate rejects tag/version mismatch and missing tag environment',()=>{const mismatch=runSemver('v2.1.0','2.0.0');assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/must match Gradle/);const missing=runSemver(undefined,'2.0.0');assert.notEqual(missing.status,0);assert.match(missing.stderr,/GITHUB_REF_NAME is required/);});
test('SemVer gate is wired into release workflow and local guard',()=>{const workflow=fs.readFileSync(path.join(__dirname,'..','.github','workflows','release.yml'),'utf8');const guard=fs.readFileSync(path.join(__dirname,'commit-guard.sh'),'utf8');assert.match(workflow,/semver-release-validation\.sh/);assert.match(workflow,/Run CommitGuard \(mandatory release validation\)/);assert.doesNotMatch(guard,/:app:testDebugUnitTest|gradle\s+--no-daemon/);});
function readSemver(){return fs.readFileSync(path.join(__dirname,'..','scripts','semver-release-validation.sh'),'utf8');}
function runSemver(tag,version){const d=temp(),scripts=path.join(d,'scripts'),app=path.join(d,'app');fs.mkdirSync(scripts,{recursive:true});fs.mkdirSync(app,{recursive:true});fs.writeFileSync(path.join(scripts,'semver-release-validation.sh'),readSemver());fs.writeFileSync(path.join(app,'build.gradle.kts'),`android { defaultConfig { versionName = "${version}" } }`);const r=cp.spawnSync('bash',[path.join(scripts,'semver-release-validation.sh')],{cwd:d,encoding:'utf8',env:{...process.env,GITHUB_REF_NAME:tag===undefined?'':tag}});clean(d);return r;}
function temp(){return fs.mkdtempSync(path.join(os.tmpdir(),'release-tests-'));}
function clean(d){fs.rmSync(d,{recursive:true,force:true});}
function makePng(width,height,length,salt=0){const b=Buffer.alloc(length,salt);b.write('89504e470d0a1a0a',0,'hex');b.writeUInt32BE(13,8);b.write('IHDR',12);b.writeUInt32BE(width,16);b.writeUInt32BE(height,20);return b;}
test('both CI workflows preflight the exact non-Pixel Nexus 5X profile with Node',()=>{for(const file of ['build-apk.yml','release.yml']){const y=fs.readFileSync(path.join(__dirname,'..','.github','workflows',file),'utf8');assert.match(y,/node scripts\/avd-profile-validation\.js 'Nexus 5X'/);assert.match(y,/profile: Nexus 5X/);assert.doesNotMatch(y,/profile: Pixel/);}});
test('CI invokes UI runner as one process and does not pull screenshots afterward',()=>{const y=fs.readFileSync(path.join(__dirname,'..','.github','workflows','build-apk.yml'),'utf8');assert.match(y,/script: bash scripts\/run-android-ui-tests\.sh/);assert.doesNotMatch(y,/adb pull/);});
test('release workflow uses Node screenshot validator instead of embedded Python',()=>{const y=fs.readFileSync(path.join(__dirname,'..','.github','workflows','release.yml'),'utf8');assert.match(y,/node scripts\/validate-release-screenshots\.js/);assert.doesNotMatch(y,/python3 - <</);});
