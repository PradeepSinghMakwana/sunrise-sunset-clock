#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const NETWORK_PERMISSIONS = new Set(['android.permission.INTERNET','android.permission.ACCESS_NETWORK_STATE','android.permission.CHANGE_NETWORK_STATE']);
const NETWORK_MARKERS = /okhttp|retrofit|ktor-client|firebase-(analytics|crashlytics)|sentry|bugsnag|amplitude|mixpanel|volley/i;
const NETWORK_IMPORTS = /import\s+(?:java\.net|javax\.net|okhttp3|retrofit2|io\.ktor\.client|com\.android\.volley|com\.google\.firebase\.crashlytics)/i;
function parseXml(src) {
  const stack=[];let pos=0,root=null;
  const entitiesOk=text=>!/(?:&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;))/.test(text);
  while(pos<src.length){const open=src.indexOf('<',pos);if(open<0){const tail=src.slice(pos);if(!entitiesOk(tail))return {error:'invalid XML entity in text'};if(stack.length===0&&tail.trim())return {error:'text outside root element'};break;}
    const text=src.slice(pos,open);if(!entitiesOk(text))return {error:'invalid XML entity in text'};if(stack.length===0&&text.trim())return {error:'text outside root element'};pos=open;
    if(src.startsWith('<!--',pos)){const e=src.indexOf('-->',pos+4);if(e<0)return {error:'unterminated XML comment'};if(src.slice(pos+4,e).includes('--'))return {error:'invalid double hyphen in XML comment'};pos=e+3;continue;}
    if(src.startsWith('<![CDATA[',pos)){if(stack.length===0)return {error:'CDATA outside root element'};const e=src.indexOf(']]>',pos+9);if(e<0)return {error:'unterminated CDATA'};pos=e+3;continue;}
    if(src.startsWith('<?',pos)){const e=src.indexOf('?>',pos+2);if(e<0)return {error:'unterminated processing instruction'};pos=e+2;continue;}
    if(src.startsWith('<!',pos))return {error:'DTD/declaration markup is not permitted'};
    let end=pos+1,quote=null;for(;end<src.length;end++){const c=src[end];if(quote){if(c===quote)quote=null;}else if(c==="'"||c==='"')quote=c;else if(c==='>')break;}if(end>=src.length)return {error:'unterminated XML tag'};if(quote)return {error:'unterminated quoted XML attribute'};
    const raw=src.slice(pos,end+1);pos=end+1;const closing=/^<\/([A-Za-z_][\w:.-]*)\s*>$/.exec(raw);if(closing){const popped=stack.pop();if(!popped||popped.name!==closing[1])return {error:`mismatched closing tag ${closing[1]}`};continue;}
    const opening=/^<([A-Za-z_][\w:.-]*)/.exec(raw);if(!opening)return {error:'invalid XML tag name'};const node={name:opening[1],attributes:{},children:[]},tail=raw.slice(opening[0].length,-1);let i=0;
    while(i<tail.length){while(/\s/.test(tail[i]||''))i++;if(i>=tail.length)break;if(tail[i]==='/'){i++;while(/\s/.test(tail[i]||''))i++;if(i!==tail.length)return {error:'invalid self-closing XML tag'};break;}const attr=/^([A-Za-z_][\w:.-]*)/.exec(tail.slice(i));if(!attr)return {error:`invalid XML attribute syntax in ${node.name}`};const key=attr[1];if(Object.hasOwn(node.attributes,key))return {error:`duplicate XML attribute ${key}`};i+=attr[0].length;while(/\s/.test(tail[i]||''))i++;if(tail[i]!=='=')return {error:`XML attribute ${key} lacks equals sign`};i++;while(/\s/.test(tail[i]||''))i++;const q=tail[i];if(q!=="'"&&q!=='"')return {error:`XML attribute ${key} must be quoted`};i++;const vstart=i;while(i<tail.length&&tail[i]!==q)i++;if(i>=tail.length)return {error:`unterminated XML attribute ${key}`};const value=tail.slice(vstart,i);if(!entitiesOk(value))return {error:`invalid entity in XML attribute ${key}`};node.attributes[key]=value;i++;}
    if(stack.length)stack[stack.length-1].children.push(node);else if(root)return {error:'XML must contain exactly one root element'};else root=node;if(!raw.endsWith('/>'))stack.push(node);
  }
  if(stack.length)return {error:`unclosed tag ${stack[stack.length-1].name}`};if(!root)return {error:'XML must contain exactly one root element (found 0)'};return {root};
}
function xmlWellFormed(src){return parseXml(src).error||null;}
function walk(dir){let out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())out=out.concat(walk(p));else out.push(p);}return out;}
function validate(root=ROOT){
 const errors=[],manifestPath=path.join(root,'app/src/main/AndroidManifest.xml'),gradlePath=path.join(root,'app/build.gradle.kts'),rulesPath=path.join(root,'app/src/main/res/xml/data_extraction_rules.xml');let manifest;
 try{const parsed=parseXml(fs.readFileSync(manifestPath,'utf8'));if(parsed.error)throw Error(parsed.error);manifest=parsed.root;if(manifest.name!=='manifest')throw Error('root element must be manifest');}catch(e){return [`cannot parse Android manifest: ${e.message}`];}
 for(const perm of manifest.children.filter(n=>n.name==='uses-permission')){const p=perm.attributes['android:name']||'';if(NETWORK_PERMISSIONS.has(p)||p.endsWith('.INTERNET'))errors.push(`network permission is forbidden: ${p}`);}
 const app=manifest.children.find(n=>n.name==='application');if(!app)errors.push('application element missing');else{const a=app.attributes;if(a['android:allowBackup']!=='false')errors.push('Android app backup must be disabled');if(a['android:fullBackupContent']!=='false')errors.push('legacy full backup must be explicitly disabled');if(a['android:dataExtractionRules']!=='@xml/data_extraction_rules')errors.push('Android 12+ data extraction rules must be configured');if(a['android:usesCleartextTraffic']!=='false')errors.push('cleartext traffic must be explicitly disabled');}
 let rulesRoot=null;try{const parsed=parseXml(fs.readFileSync(rulesPath,'utf8'));if(parsed.error)throw Error(parsed.error);rulesRoot=parsed.root;if(rulesRoot.name!=='data-extraction-rules')throw Error('root element must be data-extraction-rules');}catch(e){errors.push(`cannot validate Android data extraction rules: ${e.message}`);}
 if(rulesRoot){for(const [label,tag] of [['cloud backup','cloud-backup'],['device transfer','device-transfer']]){const section=rulesRoot.children.find(n=>n.name===tag);if(!section||!section.children.some(n=>n.name==='exclude'&&n.attributes.domain==='root'&&n.attributes.path==='.'&&Object.hasOwn(n.attributes,'domain')&&Object.hasOwn(n.attributes,'path')))errors.push(`${label} must exclude the entire app data root`);}}
 let gradle='';try{gradle=fs.readFileSync(gradlePath,'utf8');}catch(e){errors.push(`cannot read app dependencies: ${e.message}`);}if(NETWORK_MARKERS.test(gradle))errors.push('networking, analytics, or crash-reporting dependency forbidden');
 try{const src=path.join(root,'app/src/main');for(const file of walk(src).filter(f=>f.endsWith('.kt'))){let contents;try{contents=fs.readFileSync(file,'utf8');}catch(e){errors.push(`cannot read ${path.relative(root,file)}: ${e.message}`);continue;}if(NETWORK_IMPORTS.test(contents))errors.push(`network API import forbidden: ${path.relative(root,file)}`);}}catch(e){errors.push(`cannot inspect Kotlin source tree: ${e.message}`);}return errors;
}
if(require.main===module){const errors=validate();if(errors.length){errors.forEach(e=>console.error('[PrivacyGuard] ERROR:',e));process.exit(1);}console.log('[PrivacyGuard] PASS — no app network capability, upload SDK, or app-data backup.');}
module.exports={validate,xmlWellFormed,parseXml,ROOT};
