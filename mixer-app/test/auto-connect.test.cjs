const {test} = require('node:test');
const assert = require('node:assert/strict');
const {AutoConnect} = require('../lib/auto-connect.cjs');
test('connects to a single mixer when it appears, without a button', async()=>{
  let devices=[],connected=false,opened=[];
  const auto=new AutoConnect({list:async()=>devices,busy:()=>connected,connect:p=>{opened.push(p);connected=true;}});
  await auto.scan();assert.deepEqual(opened,[]);
  devices=[{path:'mixer'}];await auto.scan();assert.deepEqual(opened,['mixer']);
  await auto.scan();assert.equal(opened.length,1);
  auto.confirmed();connected=false;await auto.scan();assert.equal(opened.length,2);
});
test('manual disconnect remains disconnected, and multiple mixers need selection',async()=>{
  let opened=0,devices=[{path:'one'},{path:'two'}];
  const auto=new AutoConnect({list:async()=>devices,busy:()=>false,connect:()=>opened++});
  await auto.scan();assert.equal(opened,0);
  devices.pop();auto.enabled=false;await auto.scan();assert.equal(opened,0);
  auto.enabled=true;await auto.scan();assert.equal(opened,1);
});
test('does not race manual disconnect with enumeration, and backs off after errors',async()=>{
  let release,opened=0,time=0,errors=0;
  const auto=new AutoConnect({list:()=>new Promise(r=>release=r),busy:()=>false,connect:()=>opened++,now:()=>time,error:()=>errors++});
  const scan=auto.scan();auto.enabled=false;release([{path:'one'}]);await scan;assert.equal(opened,0);
  auto.enabled=true;auto.list=async()=>{throw Error('USB busy');};
  await auto.scan();assert.equal(errors,1);await auto.scan();assert.equal(errors,1);
  time=10001;await auto.scan();assert.equal(errors,2);
});
