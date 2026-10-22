const {test}=require('node:test');
const assert=require('node:assert/strict');
const icons=require('../ui/icons.json');
const {search,selection}=require('../ui/icon-catalog.js');
const {labelFor}=require('../tools/icon-labels-pt.cjs');
const known=new Set(icons.map(i=>i.name));
test('finds Discord and volume by Portuguese and English terms',()=>{
  assert.equal(search(icons,'Discord')[0].name,'brand-discord');
  for(const term of ['volume','som','áudio','alto falante','speaker'])assert.ok(search(icons,term).some(i=>i.name==='volume-high'),term);
  assert.ok(search(icons,'fones').some(i=>i.name==='headphones'));
  assert.ok(search(icons,'mudo').some(i=>i.name==='volume-xmark'));
});
test('makes the full catalog available and separates brands',()=>{
  assert.equal(search(icons,'','all').length,icons.length);
  assert.ok(search(icons,'','apps').every(i=>i.name.startsWith('brand-')));
  assert.ok(search(icons,'','popular').some(i=>i.name==='brand-discord'));
  assert.deepEqual(search(icons,'','recent',['brand-discord','volume-high']).map(i=>i.name),['brand-discord','volume-high']);
});
test('migration discards automatic and image defaults while retaining explicit icon choices',()=>{
  assert.equal(selection({labelMode:'auto',symbol:'music'},undefined,known),null);
  assert.equal(selection({labelMode:'image',symbol:'music'},undefined,known),null);
  assert.equal(selection({labelMode:'text',symbol:'music'},undefined,known),null);
  assert.equal(selection({labelMode:'icon',symbol:'headphones'},undefined,known),'headphones');
  assert.equal(selection({symbol:'brand-discord'},1,known),'brand-discord');
  assert.equal(selection({symbol:null},1,known),null);
  assert.equal(selection({symbol:'missing'},1,known),null);
});
test('all generic icon names have Portuguese translations',()=>{
  for(const icon of icons.filter(i=>i.category!=='apps'))assert.doesNotThrow(()=>labelFor(icon.name));
  assert.equal(labelFor('arrow-right'),'Seta direita');
  assert.equal(labelFor('house'),'Casa');
});
