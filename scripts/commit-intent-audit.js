#!/usr/bin/env node
'use strict';
// Node-only fail-closed occurrence-by-occurrence CommitGuard audit.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const ROOT = path.resolve(process.env.COMMITGUARD_ROOT || path.join(__dirname, '..'));
const MANIFEST = process.env.COMMITGUARD_MANIFEST || path.join(ROOT, '.commitguard', 'intent-audit.json');
const AUDIT_PATH = '.commitguard/intent-audit.json';
const TOKEN_RE = /[A-Za-z0-9_]+(?:[.-][A-Za-z0-9_]+)*/g;
class AuditError extends Error {}
function git(...args) {
  const r = cp.spawnSync('git', args, {cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024});
  if (r.status !== 0) throw new AuditError(`git ${args.join(' ')} failed: ${(r.stderr || '').trim()}`);
  return r.stdout;
}
function tokenList(s) { return s.match(TOKEN_RE) || []; }
function addCount(map, direction, token, count=1) { const key=`${direction}\0${token}`; map.set(key,(map.get(key)||0)+count); }
function parseWordDiff(output) {
  const counts = new Map(); let inHunk = false;
  for (const line of output.split(/\r?\n/)) {
    if (line.startsWith('@@')) { inHunk=true; continue; }
    if (!inHunk || !line || !['+','-'].includes(line[0])) continue;
    const direction=line[0]==='+'?'added':'removed';
    for(const token of tokenList(line.slice(1))) addCount(counts,direction,token);
  }
  return counts;
}
function diffArgs() { return ['--no-ext-diff','--no-renames','--word-diff=porcelain','--word-diff-regex=[A-Za-z0-9_]+([.-][A-Za-z0-9_]+)*','--unified=0','--no-color']; }
function filesStaged() { return git('diff','--cached','--name-only','--no-renames').split(/\r?\n/).filter(Boolean).sort(); }
function filesCommit(sha) { const p=git('rev-list','--parents','-n','1',sha).trim().split(/\s+/); const out=p.length<2?git('diff-tree','--root','--no-commit-id','--name-only','--no-renames','-r',sha):git('diff','--name-only','--no-renames',p[1],sha); return [...new Set(out.split(/\r?\n/).filter(Boolean))].sort(); }
function stagedWords() { return parseWordDiff(git('diff','--cached',...diffArgs(),'--','.',`:(exclude)${AUDIT_PATH}`)); }
function commitWords(sha) { const p=git('rev-list','--parents','-n','1',sha).trim().split(/\s+/); if(p.length<2) throw new AuditError(`root commit ${sha} has no auditable parent`); return parseWordDiff(git('diff',p[1],sha,...diffArgs(),'--','.',`:(exclude)${AUDIT_PATH}`)); }
function loadManifest() { try { const d=JSON.parse(fs.readFileSync(MANIFEST,'utf8')); if(!d||typeof d!=='object'||Array.isArray(d))throw new AuditError('manifest root must be an object'); return d; } catch(e) { if(e instanceof AuditError)throw e; throw new AuditError(`invalid audit manifest: ${e.message}`); } }
const nonempty=v=>typeof v==='string'&&v.trim().length>0;
function reviewWords(actual, entries, errors, prefix='word_reviews', reqIds=null) {
  const declared=new Map(); if(!Array.isArray(entries)){errors.push(`${prefix} must list every changed word occurrence`);entries=[];}
  entries.forEach((item,i)=>{ if(!item||typeof item!=='object'||Array.isArray(item)){errors.push(`${prefix}[${i}] must be an object`);return;}
    const {direction,token,count,requirement_id,rationale}=item;
    if(!['added','removed'].includes(direction)||!nonempty(token)){errors.push(`${prefix}[${i}] needs direction added/removed and a token`);return;}
    if(!Number.isInteger(count)||count<1){errors.push(`${prefix}[${i}] count must be a positive integer`);return;}
    if(reqIds&&!reqIds.has(requirement_id))errors.push(`${prefix}[${i}] references an undeclared requirement`);
    if(!nonempty(rationale))errors.push(`${prefix}[${i}] has no intention/meaning rationale`);
    addCount(declared,direction,token,count);
  });
  for(const key of new Set([...actual.keys(),...declared.keys()])) { const a=actual.get(key)||0,d=declared.get(key)||0; if(a!==d){const [dir,tok]=key.split('\0');errors.push(`${dir} word ${JSON.stringify(tok)}: diff has ${a} occurrence(s), manifest reviews ${d}`);} }
}
function auditStaged() {
 const stagedFiles=filesStaged();
 if(stagedFiles.length===1&&stagedFiles[0]===AUDIT_PATH){
   const head=git('rev-parse','HEAD').trim();
   const errors=auditCommit(head);
   if(!errors.length)console.log('[CommitGuard] Manifest follow-up audit PASS for preceding code commit.');
   return errors;
 }
 const manifest=loadManifest(), errors=[]; const intent=manifest.intent, reviewer=manifest.reviewed_by, requirements=manifest.requirements;
 if(!nonempty(intent))errors.push('intent must state the user task in plain language'); if(!nonempty(reviewer))errors.push('reviewed_by must identify the reviewer');
 if(!Array.isArray(requirements)||!requirements.length)errors.push('requirements must be a non-empty list');
 const reqIds=new Set(); for(const r of (Array.isArray(requirements)?requirements:[])){if(!r||!nonempty(r.id)||!nonempty(r.text))errors.push('each requirement needs non-empty id and text');else reqIds.add(r.id);}
 const files=filesStaged(); if(!files.length)errors.push('no staged changes; refusing to validate an empty commit'); const expected=new Set(files.filter(f=>f!==AUDIT_PATH)); const reviews=manifest.file_reviews;
 if(!reviews||typeof reviews!=='object'||Array.isArray(reviews)){errors.push('file_reviews must map every changed file to a review');}
 else {for(const f of expected){const r=reviews[f];if(!r||typeof r!=='object')errors.push(`changed file has no review: ${f}`);else {if(!nonempty(r.necessity))errors.push(`${f}: necessity/rationale missing`);if(!Array.isArray(r.requirement_ids)||!r.requirement_ids.length)errors.push(`${f}: requirement_ids must not be empty`);else if(r.requirement_ids.some(id=>!reqIds.has(id)))errors.push(`${f}: references undeclared requirement`);}} for(const f of Object.keys(reviews))if(!expected.has(f))errors.push(`file review stale or unrelated: ${f}`);}
 reviewWords(stagedWords(),manifest.word_reviews,errors,'word_reviews',reqIds);
 if(!nonempty(manifest.commit_subject))errors.push('commit_subject must state the proposed commit purpose');
 if(errors.length)return errors; console.log(`[CommitGuard] Word audit PASS: ${[...stagedWords().values()].reduce((a,b)=>a+b,0)} token occurrence(s), ${expected.size} file(s), ${reqIds.size} requirement(s).`); console.log('[CommitGuard] Audit attestation is recorded; semantic intent still requires human judgment.');return [];
}
function auditHead() { const sha=git('rev-parse','HEAD').trim(), files=filesCommit(sha); if(files.length===1&&files[0]===AUDIT_PATH){const parent=git('rev-parse','HEAD^').trim();return auditCommit(parent);} return auditCommit(sha); }
function auditCommit(sha) { const manifest=loadManifest(), errors=[]; const files=new Set(filesCommit(sha).filter(f=>f!==AUDIT_PATH)), subject=git('log','-1','--format=%s',sha).trim(); if(!nonempty(manifest.intent)||!nonempty(manifest.reviewed_by)||!nonempty(manifest.commit_subject))errors.push('intent/reviewer/commit_subject must be non-empty');if(manifest.commit_subject!==subject)errors.push(`commit_subject does not match audited subject ${JSON.stringify(subject)}`);
 const reqs=manifest.requirements,ids=new Set();if(!Array.isArray(reqs)||!reqs.length)errors.push('requirements must be non-empty');for(const r of Array.isArray(reqs)?reqs:[])if(r&&nonempty(r.id)&&nonempty(r.text))ids.add(r.id);else errors.push('each requirement needs id and text');const reviews=manifest.file_reviews;if(!reviews||typeof reviews!=='object')errors.push('file_reviews must be an object');else {for(const f of files){const r=reviews[f];if(!r||!nonempty(r.necessity))errors.push(`changed file lacks necessity review: ${f}`);else if(!Array.isArray(r.requirement_ids)||!r.requirement_ids.length||r.requirement_ids.some(x=>!ids.has(x)))errors.push(`${f}: invalid requirement references`);}for(const f of Object.keys(reviews))if(!files.has(f))errors.push(`stale file review: ${f}`);}
 reviewWords(commitWords(sha),manifest.word_reviews,errors);return errors; }
function auditRange(base,head) { git('cat-file','-e',`${base}^{commit}`);git('cat-file','-e',`${head}^{commit}`);const m=loadManifest(),records=m.commit_audits;if(!records||typeof records!=='object')throw new AuditError('commit_audits must map commits to audit records');const auditStart=m.audit_start_sha;if(auditStart){git('cat-file','-e',`${auditStart}^{commit}`);const isAncestor=(a,b)=>cp.spawnSync('git',['merge-base','--is-ancestor',a,b],{cwd:ROOT,encoding:'utf8'}).status===0;if(isAncestor(auditStart,head)&&!isAncestor(auditStart,base))base=auditStart;}let commits=git('rev-list','--reverse',`${base}..${head}`).split(/\r?\n/).filter(Boolean),errors=[],audited=0;
 for(const sha of commits){const files=filesCommit(sha);if(!files.length)continue;if(files.length===1&&files[0]===AUDIT_PATH){let p=git('rev-parse',`${sha}^`).trim();while(p&&filesCommit(p).join()===AUDIT_PATH)p=git('rev-parse',`${p}^`).trim();if(!p||!records[p])errors.push(`manifest-only commit ${sha} lacks preceding code commit audit`);continue;}
 const rec=records[sha];if(!rec){errors.push(`commit ${sha} has no per-commit audit record`);continue;}audited++;errors.push(...validateRecord(sha,rec));}
 if(!audited)errors.push('range contains no audited code commits');if(!errors.length)console.log(`[CommitGuard] Range audit PASS: ${audited} code commit(s), ${commits.length} total commit(s).`);return errors; }
function validateRecord(sha,record){const errors=[];for(const field of ['intent','reviewed_by','commit_subject'])if(!nonempty(record[field]))errors.push(`commit ${sha}: ${field} must be non-empty`);const subject=git('log','-1','--format=%s',sha).trim();if(record.commit_subject!==subject)errors.push(`commit ${sha}: reviewed subject mismatch`);const reqs=record.requirements,ids=new Set();if(!Array.isArray(reqs)||!reqs.length)errors.push(`commit ${sha}: requirements must be non-empty`);for(const r of Array.isArray(reqs)?reqs:[])if(r&&nonempty(r.id)&&nonempty(r.text))ids.add(r.id);else errors.push(`commit ${sha}: invalid requirement`);const files=new Set(filesCommit(sha).filter(f=>f!==AUDIT_PATH)),reviews=record.file_reviews;if(!reviews||typeof reviews!=='object')errors.push(`commit ${sha}: file_reviews missing`);else{for(const f of files){const r=reviews[f];if(!r||!nonempty(r.necessity))errors.push(`commit ${sha}: file necessity missing: ${f}`);else if(!Array.isArray(r.requirement_ids)||!r.requirement_ids.length||r.requirement_ids.some(x=>!ids.has(x)))errors.push(`commit ${sha}: invalid file requirement mapping: ${f}`);}for(const f of Object.keys(reviews))if(!files.has(f))errors.push(`commit ${sha}: stale file review ${f}`);}
 reviewWords(commitWords(sha),record.word_reviews,errors,`commit ${sha} word_reviews`,ids);return errors; }
function main(){const args=process.argv.slice(2);try{let errors;if(args[0]==='--range'&&args.length===3)errors=auditRange(args[1],args[2]);else if(args.length===1&&args[0]==='--head')errors=auditHead();else if(args.length===1&&args[0]==='--staged')errors=auditStaged();else throw new AuditError('usage: commit-intent-audit.js [--staged|--head|--range BASE HEAD]');if(errors.length){for(const e of errors)console.error('[CommitGuard] ERROR:',e);console.error('[CommitGuard] BLOCKED: intention/word audit incomplete.');return 1;}return 0;}catch(e){console.error('[CommitGuard] ERROR:',e.message);return 1;}}
if(require.main===module)process.exit(main());
module.exports={tokenList,parseWordDiff,reviewWords,auditStaged,auditCommit,auditRange,filesCommit,commitWords,AuditError,ROOT,MANIFEST};
