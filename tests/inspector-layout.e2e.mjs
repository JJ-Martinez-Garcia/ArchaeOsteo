import assert from 'node:assert/strict';

export async function testInspectorLayout(cdp,evaluate,waitForValue){
  const rect=()=>evaluate(cdp,`(()=>{const p=document.querySelector('#inspector');const r=p.getBoundingClientRect();return {width:r.width,overflow:p.scrollWidth-p.clientWidth,viewer:document.querySelector('#viewer').clientWidth,canvas:parseFloat(document.querySelector('#viewer canvas').style.width)};})()`);
  const check=async name=>{
    const value=await rect();
    if(value.overflow>1){
      const offenders=await evaluate(cdp,`(()=>{const panel=document.querySelector('#inspector'),r=panel.getBoundingClientRect();return [...panel.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>r.right+1&&!e.closest('.inventory-table-scroll,.compare-inventory')}).map(e=>({tag:e.tagName,id:e.id,class:e.className,width:e.getBoundingClientRect().width})).slice(0,20);})()`);
      assert.fail(name+': inspector overflow '+JSON.stringify({value,offenders}));
    }
    assert.ok(value.viewer>=319,name+': enough viewer space');
    await waitForValue(cdp,`Math.abs(document.querySelector('#viewer').clientWidth-parseFloat(document.querySelector('#viewer canvas').style.width))`,n=>n<2,'Canvas follows panel resize');
  };
  const tabs=['tab-sheet','tab-inventory','tab-dental','tab-metrics','tab-stats','tab-report'];
  const extras=['record-panel-button','analysis-panel-button','compare-panel-button','learning-panel-button','sources-panel-button','hierarchy-panel-button'];
  for(const viewport of [1440,1024]){
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:viewport,height:1000,deviceScaleFactor:1,mobile:false});
    await evaluate(cdp,`document.querySelector('#inspector-divider').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))`);
    for(const id of [...tabs,...extras]){
      await evaluate(cdp,`document.querySelector('#${id}').click()`);
      await check(`${viewport}/${id}`);
    }
  }
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  const handle=await evaluate(cdp,`(()=>{const r=document.querySelector('#inspector-divider').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+150};})()`);
  const before=(await rect()).width;
  await cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',...handle,button:'left',clickCount:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:handle.x-160,y:handle.y,button:'left',buttons:1});
  await cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:handle.x-160,y:handle.y,button:'left',clickCount:1});
  assert.ok((await rect()).width>=before+150,'Real mouse drag enlarges panel');
  assert.equal(await evaluate(cdp,`Number(localStorage.getItem('osteo3d-inspector-width-v1'))`),Math.round((await rect()).width));
  await check('drag');
  await evaluate(cdp,`document.querySelector('#inspector-divider').dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}))`);
  await check('maximum');
  await evaluate(cdp,`document.querySelector('#inspector-divider').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);
  await waitForValue(cdp,`Math.round(document.querySelector('#inspector').getBoundingClientRect().width)`,n=>n===380,'Double-click layout reflow');
  assert.equal(Math.round((await rect()).width),380,'Double-click resets panel width');
  await evaluate(cdp,`document.querySelector('#tab-sheet').click();document.querySelector('[data-bone="skull"]').click();document.querySelector('#reset').click();document.querySelector('#inspector').scrollTop=0`);
  assert.equal(await evaluate(cdp,`document.querySelectorAll('.tabs button.active').length`),1,'Only the selected inspector tab is active');
  console.log('Inspector: every tab and extended form fits at 300px; mouse, keyboard and canvas resizing OK.');
}
