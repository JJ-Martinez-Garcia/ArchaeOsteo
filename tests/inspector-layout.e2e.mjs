import assert from 'node:assert/strict';

export async function testInspectorLayout(cdp,evaluate,waitForValue,sleep){
  const rect=()=>evaluate(cdp,`(()=>{const p=document.querySelector('#inspector');const r=p.getBoundingClientRect();return {width:r.width,overflow:p.scrollWidth-p.clientWidth,viewer:document.querySelector('#viewer').clientWidth,canvas:parseFloat(document.querySelector('#viewer canvas').style.width)};})()`);
  const check=async (name, minimumViewer=319)=>{
    const value=await rect();
    if(value.overflow>1){
      const offenders=await evaluate(cdp,`(()=>{const panel=document.querySelector('#inspector'),r=panel.getBoundingClientRect();return [...panel.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect();return b.width&&b.right>r.right+1&&!e.closest('.inventory-table-scroll,.compare-inventory')}).map(e=>({tag:e.tagName,id:e.id,class:e.className,width:e.getBoundingClientRect().width})).slice(0,20);})()`);
      assert.fail(name+': inspector overflow '+JSON.stringify({value,offenders}));
    }
    assert.ok(value.viewer>=minimumViewer,name+': enough viewer space '+JSON.stringify(value));
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
  const contrastAudit=await evaluate(cdp,`(()=>{const parse=value=>{const match=value.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);return match?[+match[1],+match[2],+match[3]]:null;};const luminance=rgb=>rgb.map(channel=>{const value=channel/255;return value<=.03928?value/12.92:Math.pow((value+.055)/1.055,2.4);}).reduce((sum,value,index)=>sum+[.2126,.7152,.0722][index]*value,0);const ratio=(a,b)=>{const first=luminance(a),second=luminance(b);return (Math.max(first,second)+.05)/(Math.min(first,second)+.05);};const selectors=['.muted','.tabs button','.bone-row small','.viewer-status','.small-copy','.legend','.inspector dt'];return selectors.flatMap(selector=>[...document.querySelectorAll(selector)].filter(element=>{const rect=element.getBoundingClientRect(),style=getComputedStyle(element);return rect.width&&rect.height&&style.display!=='none'&&!element.hidden;}).map(element=>({selector,color:getComputedStyle(element).color,ratio:ratio(parse(getComputedStyle(element).color)||[0,0,0],[255,255,255])})));})()`);
  assert.ok(contrastAudit.length>0&&contrastAudit.every(item=>item.ratio>=4.5),'Secondary text must meet WCAG AA contrast: '+JSON.stringify(contrastAudit));
  await evaluate(cdp, `document.querySelector('#inspector-divider').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))`);
  await waitForValue(cdp,`Math.round(document.querySelector('#inspector').getBoundingClientRect().width)`,n=>n===380,'Reset panel before zoom checks');
  for (const zoom of [1.25, 1.5, 2]) {
    const width = Math.round(1440 / zoom);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<=900});
    for (const id of [...tabs, ...extras]) {
      await evaluate(cdp, `document.querySelector('#${id}').click()`);
      await check(`zoom-${Math.round(zoom * 100)}%/${id}`, zoom === 2 ? 100 : 319);
    }
  }
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await waitForValue(cdp,`document.querySelector('#inspector-divider')?.getBoundingClientRect().width||0`,n=>n>0,'Desktop layout after zoom checks');
  await sleep(150);
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
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await waitForValue(cdp,`document.querySelector('.viewer-lighting-controls').getBoundingClientRect().bottom-document.querySelector('.topbar').getBoundingClientRect().bottom`,n=>n<=1,'Mobile lighting dock stays in the header');
  const mobileLayout=await evaluate(cdp,`(()=>{const lighting=document.querySelector('.viewer-lighting-controls').getBoundingClientRect(),topbar=document.querySelector('.topbar').getBoundingClientRect(),viewer=document.querySelector('.viewer-wrap').getBoundingClientRect(),fields=document.querySelector('#lighting-control-fields');return {lightingBottom:lighting.bottom,topbarBottom:topbar.bottom,viewerTop:viewer.top,fieldsHidden:fields.hidden,viewerWidth:viewer.width};})()`);
  assert.ok(mobileLayout.lightingBottom<=mobileLayout.topbarBottom+1,'Mobile lighting controls do not overlay the 3D viewer');
  assert.ok(mobileLayout.topbarBottom<=mobileLayout.viewerTop+1,'Mobile viewer starts below the responsive header');
  assert.equal(mobileLayout.fieldsHidden,true,'Ambient, azimuth and elevation controls are collapsed on mobile');
  assert.ok(mobileLayout.viewerWidth>=1,'Mobile viewer keeps a measurable layout width: '+JSON.stringify(mobileLayout));
  assert.ok(await evaluate(cdp,`document.querySelector('.viewer-wrap').getBoundingClientRect().height>=120`),'Mobile viewer must keep enough height for the 3D model');
  const touchTargets=await evaluate(cdp,`(()=>[...document.querySelectorAll('.top-actions button,.top-actions select,.viewer-toolbar button,.viewer-lighting-controls>button')].filter(element=>{const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&!element.hidden&&rect.width&&rect.height}).map(element=>({id:element.id,width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height})))()`);
  assert.ok(touchTargets.every(target=>target.width>=44&&target.height>=44),'Visible mobile controls must meet 44px touch target: '+JSON.stringify(touchTargets));
  for (const id of ['skull','mandible']) {
    await evaluate(cdp,`document.querySelector('[data-bone="${id}"]').click()`);
    await waitForValue(cdp,`document.querySelector('#details').textContent`,value=>String(value).includes('GLB loaded'),`Load published GLB for ${id}`);
    await waitForValue(cdp,`({...document.querySelector('#viewer').dataset})`,value=>Number(value[`${id}MeshCount`])>0&&value[`${id}Visible`]==='true',`Visible geometry for ${id}`);
  }
  assert.equal(await evaluate(cdp, `document.querySelector('#retry-models')?.hidden`), true, 'Successful GLB loading must not show retry action');
  console.log('Inspector: every tab and extended form fits at 300px; mouse, keyboard and canvas resizing OK.');
}
