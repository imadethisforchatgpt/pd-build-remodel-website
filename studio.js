/* P&D interactive 3D showroom. Geometry and renderer are self-contained; no remote dependencies.
   Design concepts are deliberately kept separate from actual project photographs. */
(function(){'use strict';
const $=id=>document.getElementById(id);
const canvas=$('kitchen-canvas'); if(!canvas)return;
const ctx=canvas.getContext('2d');
const controls={layout:$('studio-layout'),island:$('studio-island'),door:$('studio-door'),finish:$('studio-finish'),counter:$('studio-counter'),edge:$('studio-edge'),hardware:$('studio-hardware'),backsplash:$('studio-backsplash'),organizer:$('studio-organizer'),led:$('studio-led'),custom:$('studio-custom-note')};
const finishes={sage:'#64796e',graphite:'#424950',navy:'#394f67',ivory:'#e5dcc7',white:'#dce5e4',oak:'#a97d52',walnut:'#604439',clay:'#a68173'};
const labels={layout:{l:'L-shaped',u:'U-shaped',galley:'Galley',single:'Single-wall'},door:{shaker:'Classic Shaker',slim:'Slim Shaker',slab:'Modern slab',raised:'Raised panel',recessed:'Detailed recessed panel',cathedral:'Cathedral / arched',beadboard:'Beadboard',fluted:'Fluted / textured',glass:'Glass insert',custom:'Custom inspired door'},finish:{sage:'Evergreen sage',graphite:'Graphite charcoal',navy:'Deep navy',ivory:'Warm ivory',white:'Clean white',oak:'Natural oak',walnut:'Dark walnut',clay:'Warm clay'},counter:{quartz:'Soft white quartz',calacatta:'Calacatta-look quartz',granite:'Dark granite',quartzite:'Warm quartzite',wood:'Butcher block',concrete:'Concrete-look'},edge:{eased:'Eased',bevel:'Beveled',bullnose:'Bullnose',ogee:'Ogee',mitered:'Thick mitered'},hardware:{brass:'Brushed brass pulls',black:'Matte black pulls',nickel:'Brushed nickel pulls',knob:'Brass knobs',none:'No visible hardware'},backsplash:{subway:'Subway tile',herringbone:'Herringbone',zellige:'Handmade-look tile',slab:'Full-height slab',dark:'Dark tile',none:'Painted wall'},organizer:{drawers:'Deep storage drawers',spice:'Spice pull-out',trash:'Trash pull-out',pantry:'Pantry organizers',corner:'Corner organizer',none:'Standard shelves'}};
let state={layout:'l',island:true,door:'shaker',finish:'sage',counter:'quartz',edge:'eased',hardware:'brass',backsplash:'subway',organizer:'drawers',led:true,custom:''};
let yaw=.55,pitch=.44,zoom=1,frameQueued=false,drawInfo={w:900,h:600};
const V=(x,y,z)=>[x,y,z];
const blend=(hex,f)=>{let h=hex.replace('#','');let a=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16));return '#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v*(1+f)))).toString(16).padStart(2,'0')).join('')};
const surfaceColor={quartz:'#e1dfd5',calacatta:'#e8e3df',granite:'#313638',quartzite:'#cdbbac',wood:'#9d724a',concrete:'#a7a5a0'};
const hardwareColor={brass:'#d9b57b',black:'#1b2329',nickel:'#b7c5c7',knob:'#d8b376',none:'#b7c5c7'};
function viewBasis(){let cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);return {right:[cy,0,-sy],up:[-sp*sy,cp,-sp*cy],front:[cp*sy,sp,cp*cy]};}
function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function depth(p){const a=viewBasis();return dot([p[0],p[1]-1.35,p[2]-.06],a.front)}
function project(p){const b=viewBasis(),r=[p[0],p[1]-1.35,p[2]-.06];const d=dot(r,b.front),factor=9.8/(9.8-d);const scale=Math.min(drawInfo.w/8.55,drawInfo.h/5.7)*zoom;return [drawInfo.w/2+dot(r,b.right)*scale*factor,drawInfo.h*.56-dot(r,b.up)*scale*factor]}
let polys=[];
function polygon(points,color,stroke,alpha=1,priority=0){const d=points.reduce((a,p)=>a+depth(p),0)/points.length;polys.push({points,color,stroke,alpha,sort:d+priority})}
function cuboid(x1,y1,z1,x2,y2,z2,color,options={}){
 const v={a:V(x1,y1,z1),b:V(x2,y1,z1),c:V(x2,y2,z1),d:V(x1,y2,z1),e:V(x1,y1,z2),f:V(x2,y1,z2),g:V(x2,y2,z2),h:V(x1,y2,z2)};
 const stroke=options.stroke||null;
 polygon([v.a,v.b,v.c,v.d],blend(color,-.15),stroke);
 polygon([v.e,v.f,v.g,v.h],blend(color,.05),stroke);
 polygon([v.a,v.e,v.h,v.d],blend(color,-.12),stroke);
 polygon([v.b,v.f,v.g,v.c],blend(color,-.06),stroke);
 polygon([v.d,v.c,v.g,v.h],blend(color,.15),stroke);
 polygon([v.a,v.b,v.f,v.e],blend(color,-.25),stroke);
}
function panel(coords,color,stroke,priority){polygon(coords,color,stroke,1,priority||0)}
function paintTileBack(x1,x2,z){let base=state.backsplash==='dark'?'#3a474f':state.backsplash==='none'?'#c5c1b9':state.backsplash==='slab'?'#ddd5cd':'#c5c6c3';const y1=1.145,y2=1.93;
 panel([V(x1,y1,z),V(x2,y1,z),V(x2,y2,z),V(x1,y2,z)],base,null);
 if(state.backsplash==='none')return;
 if(state.backsplash==='slab'){for(let i=0;i<8;i++){let x=x1+(x2-x1)*(i+1)/9;polygon([V(x,1.16,z+.006),V(x+.18,1.92,z+.006)],'transparent','#c3b9ad',.5,.008)}return;}
 if(state.backsplash==='herringbone'){for(let x=x1;x<x2;x+=.34)for(let y=y1;y<y2;y+=.28){polygon([V(x,y,z+.007),V(x+.25,y+.21,z+.007)],'transparent','#7d878a',.6,.008);polygon([V(x+.25,y+.21,z+.007),V(x+.46,y,z+.007)],'transparent','#7d878a',.6,.008)}return;}
 let rows=state.backsplash==='zellige'?5:4;let rr=(y2-y1)/rows;for(let j=0;j<rows;j++){let y=y1+j*rr;polygon([V(x1,y,z+.008),V(x2,y,z+.008)],'transparent','#8a989c',.55,.01);let offs=j%2*.22;for(let x=x1-offs;x<x2;x+=.46){if(x>=x1&&x<=x2)polygon([V(x,y,z+.009),V(x,y+rr,z+.009)],'transparent','#8a989c',.5,.01)}}
}
function cabinetDoor(x1,y1,z,x2,y2,axis='z',drawer=false){
 const c=finishes[state.finish], bright=blend(c,.13),dark=blend(c,-.19),d=.009;
 const p=(x,y,o=0)=>axis==='z'?V(x,y,z+o):V(z+o,y,x);
 const solid=(xa,ya,xb,yb,col,stroke,prio=0)=>panel([p(xa,ya,d),p(xb,ya,d),p(xb,yb,d),p(xa,yb,d)],col,stroke,prio);
 solid(x1+.023,y1+.028,x2-.023,y2-.027,c,'#151e2344');
 let style=state.door==='custom'?'slab':state.door;
 if(style==='slim'||style==='shaker'||style==='recessed'||style==='raised'||style==='cathedral'||style==='glass'){
 let inset=style==='slim'?.065:style==='cathedral'?.14:.125;const ix1=x1+inset,ix2=x2-inset,iy1=y1+inset,iy2=y2-inset;
 if(style==='glass'){solid(ix1,iy1,ix2,iy2,'#314c60','#d8cfb7');panel([p(ix1+.03,iy1+.03,.012),p(ix2-.03,iy1+.03,.012),p(ix2-.03,iy2-.03,.012),p(ix1+.03,iy2-.03,.012)],'#172d3f','#7ca5b4',.02);polygon([p((ix1+ix2)/2,iy1,.022),p((ix1+ix2)/2,iy2,.022)],'transparent','#c5b699',1,.02)}
 else{solid(ix1,iy1,ix2,iy2,style==='raised'?bright:blend(c,-.07),dark,.018);
 if(style==='raised'){solid(ix1+.052,iy1+.055,ix2-.052,iy2-.055,blend(c,.08),bright,.023);}
 if(style==='recessed'){solid(ix1+.036,iy1+.036,ix2-.036,iy2-.036,blend(c,-.13),dark,.025)}
 if(style==='cathedral'){let points=[];for(let i=0;i<=16;i++){let t=i/16;points.push(p(ix1+(ix2-ix1)*t,iy2-.10 + .11*Math.sin(Math.PI*t),.025))}polygon(points,'transparent',dark,1,.027)}
 }
 }else if(style==='fluted'||style==='beadboard'){
 for(let a=x1+.085;a<x2-.06;a+=style==='fluted'?.065:.105)polygon([p(a,y1+.045,.012),p(a,y2-.045,.012)],'transparent',style==='fluted'?dark:bright,style==='fluted'?.8:.55,.02)
 }
 if(state.finish==='oak'||state.finish==='walnut')for(let i=0;i<4;i++){const xx=x1+.13+(x2-x1-.25)*i/3;polygon([p(xx,y1+.07,.025),p(xx+.02,y2-.07,.025)],'transparent',blend(c,i%2?-.07:.1),.28,.026)}
 if(state.hardware==='none')return;
 const handle=hardwareColor[state.hardware];const cx=x2-.16,cy=drawer?(y1+y2)/2:y1+.39;
 if(state.hardware==='knob'){let q=.04;solid(cx-q,cy-q,cx+q,cy+q,handle,null,.055)}
 else {let length=drawer?.23:.32;solid(cx-.018,cy-length/2,cx+.018,cy+length/2,handle,'#0004',.055);solid(cx-.032,cy-length/2,cx+.032,cy-length/2+.024,blend(handle,.12),null,.056);solid(cx-.032,cy+length/2-.024,cx+.032,cy+length/2,blend(handle,.12),null,.056)}
}
function counterTrim(axis,a,b,front,top){
 // Show the edge selection on the exposed countertop nose.
 const color=surfaceColor[state.counter], style=state.edge;
 if(style==='eased')return;
 const lines=style==='ogee'?[.016,.038,.07]:style==='bullnose'?[.019,.055]:style==='bevel'?[.014,.045]:[.013,.13];
 for(let i=0;i<lines.length;i++){
   const y=top-lines[i],detail=blend(color,i%2?-.14:.16);
   const point=(v)=>axis==='z'?V(v,y,front+.162):V(front+.162,y,v);
   polygon([point(a-.09),point(b+.09)],'transparent',detail,.88,.04);
 }
 // The chosen top has its own subtle, repeatable grain/veining marks.
 if(state.counter==='quartz'||state.counter==='concrete')return;
 const veins=state.counter==='granite'?20:state.counter==='wood'?14:state.counter==='calacatta'?7:9;
 for(let i=0;i<veins;i++){
   const t=(i+.55)/(veins+1),pos=a+(b-a)*t;
   const z=front-.47+(Math.sin(i*5.31)*.22), c=state.counter==='wood'?'#765233':state.counter==='granite'?'#aab4b1':'#9a9491';
   const pts=axis==='z'?[V(pos,top+.005,z),V(pos+.06,top+.005,z+.14)]:[V(z,top+.005,pos),V(z+.14,top+.005,pos+.06)];
   polygon(pts,'transparent',c,state.counter==='granite'?.35:.56,.05)
 }
}
function cabinetRun(axis='z',a=-2.8,b=2.65,front=-1.13,cols=5){
 const c=finishes[state.finish], gap=.035,one=(b-a)/cols;
 function boxes(l,r,y1,y2,kind){
 if(axis==='z'){cuboid(l,y1,front-.55,r,y2,front,c,{stroke:'#112334'});cabinetDoor(l+gap,y1+gap,front+.016,r-gap,y2-gap,'z',kind==='drawer');}
 else{cuboid(front-.55,y1,l,front,y2,r,c,{stroke:'#112334'});cabinetDoor(l+gap,y1+gap,front+.016,r-gap,y2-gap,'x',kind==='drawer');}
 }
 for(let i=0;i<cols;i++){let l=a+i*one+gap,r=a+(i+1)*one-gap; boxes(l,r,.18,1.02,i===1?'drawer':'door'); boxes(l,r,2.08,3.17,'upper');}
 // countertop with a clear overhang and varying mitered edge thickness
 const thick=state.edge==='mitered'?.17:.092;
 if(axis==='z')cuboid(a-.1,1.02,front-.67,b+.1,1.02+thick,front+.15,surfaceColor[state.counter]);
 else cuboid(front-.67,1.02,a-.1,front+.15,1.02+thick,b+.1,surfaceColor[state.counter]);
 counterTrim(axis,a,b,front,1.02+thick);
 // backsplash and lighting
 if(axis==='z'){paintTileBack(a-.1,b+.1,front-.68);if(state.led) cuboid(a,1.955,front-.25,b,1.99,front+.09,'#f1d5a2');}
 else{if(state.led)cuboid(front-.25,1.955,a,front+.09,1.99,b,'#efd5a4');}
}
function scene(){polys=[];
 // ground plane and architectural context
 panel([V(-5,-.012,-4),V(5,-.012,-4),V(5,-.012,4),V(-5,-.012,4)],'#354450',null,-100);
 for(let i=-4;i<=4;i++){polygon([V(i,0,-3.8),V(i,0,3.8)],'transparent','#86939c',.1,-90);polygon([V(-4,0,i),V(4,0,i)],'transparent','#86939c',.1,-90)}
 panel([V(-3.3,0,-2.3),V(3.4,0,-2.3),V(3.4,3.5,-2.3),V(-3.3,3.5,-2.3)],'#c4c5c2',null,-80);
 panel([V(-3.3,0,2.5),V(-3.3,0,-2.3),V(-3.3,3.5,-2.3),V(-3.3,3.5,2.5)],'#b3bac1',null,-80);
 cabinetRun('z',-2.65,2.7,-1.42,5);
 if(state.layout==='l'||state.layout==='u')cabinetRun('x',-1.37,1.35,-2.38,3);
 if(state.layout==='u')cabinetRun('x',-1.37,1.2,2.8,3);
 if(state.layout==='galley'){cabinetRun('z',-2.6,2.6,2.1,5)}
 if(state.island){let c=finishes[state.finish];cuboid(-1.24,.17,1.15,1.24,1.02,2.02,c);
 for(let i=0;i<3;i++){let l=-1.21+i*.8,r=l+.77;cabinetDoor(l,.19,2.046,r,.98,'z',i===1)}
 cuboid(-1.37,1.02,1.00,1.37,1.02+(state.edge==='mitered'?.16:.095),2.22,surfaceColor[state.counter]);
 counterTrim('z',-1.37,1.37,2.06,1.02+(state.edge==='mitered'?.16:.095));
 if(state.organizer!=='none'){let c=finishes[state.finish];cuboid(-.39,.36,2.035,.4,.76,2.25,blend(c,-.09));cabinetDoor(-.35,.4,2.254,.36,.74,'z',true)}
 }
 // tall pantry feature for pantry selection
 if(state.organizer==='pantry'){
 cuboid(1.72,.15,-.81,2.45,3.16,-.18,finishes[state.finish]);cabinetDoor(1.76,.18,-.166,2.41,3.12,'z');
 }
 return polys.sort((a,b)=>a.sort-b.sort);
}
function render(){frameQueued=false;const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
 const dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
 drawInfo={w,h};ctx.clearRect(0,0,w,h);
 const bg=ctx.createLinearGradient(0,0,w,h);bg.addColorStop(0,'#233848');bg.addColorStop(.6,'#1a3041');bg.addColorStop(1,'#0d1e2f');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 // atmospheric highlight
 let halo=ctx.createRadialGradient(w*.5,h*.45,1,w*.5,h*.45,w*.59);halo.addColorStop(0,'#ffffff10');halo.addColorStop(1,'#ffffff00');ctx.fillStyle=halo;ctx.fillRect(0,0,w,h);
 const polysToDraw=scene();for(const q of polysToDraw){const pts=q.points.map(project);ctx.globalAlpha=q.alpha;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);pts.slice(1).forEach(a=>ctx.lineTo(a[0],a[1]));if(pts.length>2)ctx.closePath();if(q.color&&q.color!=='transparent'){ctx.fillStyle=q.color;ctx.fill();}if(q.stroke){ctx.strokeStyle=q.stroke;ctx.lineWidth=Math.max(.6,w/850);ctx.stroke();}}ctx.globalAlpha=1;
 // countertop grain cues, subtle screen-space hatch
 if(state.counter==='wood'){ctx.globalAlpha=.19;ctx.strokeStyle='#48301b';for(let i=0;i<13;i++){let x=w*.2+i*w*.041;ctx.beginPath();ctx.moveTo(x,h*.71);ctx.lineTo(x+w*.08,h*.73);ctx.stroke();}ctx.globalAlpha=1}
 const fade=ctx.createLinearGradient(0,0,0,h);fade.addColorStop(0,'#0c1b2900');fade.addColorStop(1,'#09162654');ctx.fillStyle=fade;ctx.fillRect(0,0,w,h);
}
function schedule(){if(frameQueued)return;frameQueued=true;requestAnimationFrame(render)}
function sync(){for(let k in controls){if(!controls[k])continue;const el=controls[k];state[k]=el.type==='checkbox'?el.checked:el.value;}const custom=$('studio-custom');custom.hidden=state.door!=='custom';$('studio-scene-label').textContent=labels.layout[state.layout]+(state.island?' / island':' / no island');$('studio-light-toggle').textContent=state.led?'✦ Lighting on':'✧ Lighting off';$('studio-light-toggle').setAttribute('aria-pressed',String(state.led));$('studio-design-summary').textContent=[labels.door[state.door],labels.finish[state.finish],labels.counter[state.counter],labels.hardware[state.hardware]].join(' · ');$('quote-design-value').textContent=buildBrief(false);document.querySelectorAll('.studio-swatch').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.finish===state.finish)));schedule();}
function buildBrief(full=true){const parts=[`Kitchen layout: ${labels.layout[state.layout]}`,`Island: ${state.island?'Yes':'No'}`,`Cabinet doors: ${labels.door[state.door]}`,`Cabinet finish: ${labels.finish[state.finish]}`,`Countertop: ${labels.counter[state.counter]}`,`Edge profile: ${labels.edge[state.edge]}`,`Hardware: ${labels.hardware[state.hardware]}`,`Backsplash: ${labels.backsplash[state.backsplash]}`,`Storage: ${labels.organizer[state.organizer]}`,`Under-cabinet LEDs: ${state.led?'Yes':'No'}`];if(state.door==='custom'&&state.custom.trim())parts.push('Custom door idea: '+state.custom.trim());return full?'P&D BUILD&REMODEL — DESIGN CONCEPT\n'+parts.join('\n')+'\n\nConceptual selections; subject to consultation.':parts.join(' · ')}
function notify(s){$('studio-feedback').textContent=s;}
function save(){try{localStorage.setItem('pd-design-v2',JSON.stringify(state));notify('Design saved on this device. You can also copy your design brief.');}catch(e){notify('This browser does not permit local saving. Use Copy design brief instead.');}}
function load(){try{let saved=JSON.parse(localStorage.getItem('pd-design-v2'));if(saved&&saved.layout in labels.layout){for(let key in controls){if(key in saved&&controls[key]){let el=controls[key];if(el.tagName==='SELECT'&&!Array.from(el.options).some(o=>o.value===saved[key]))continue;el.type==='checkbox'?el.checked=!!saved[key]:el.value=String(saved[key]).slice(0,1000);}}}}catch(e){} }
// preview swatches
const sw=$('studio-swatches');Object.entries(finishes).forEach(([key,color])=>{let b=document.createElement('button');b.type='button';b.className='studio-swatch';b.style.backgroundColor=color;b.title=labels.finish[key];b.setAttribute('aria-label','Choose '+labels.finish[key]);b.dataset.finish=key;b.addEventListener('click',()=>{controls.finish.value=key;sync()});sw.append(b)});
load();for(let el of Object.values(controls))if(el)el.addEventListener(el.type==='checkbox'?'change':'input',sync);$('studio-inspiration').addEventListener('change',function(){let f=this.files&&this.files[0];$('studio-upload-note').textContent=f?'Selected: '+f.name+'. Attach this image manually to your message when you email P&D.':'Your photo stays on your device. Attach it when emailing P&D.';});
$('studio-reset-design').addEventListener('click',()=>{for(let [k,v] of Object.entries({layout:'l',island:true,door:'shaker',finish:'sage',counter:'quartz',edge:'eased',hardware:'brass',backsplash:'subway',organizer:'drawers',led:true,custom:''})){controls[k].type==='checkbox'?controls[k].checked=v:controls[k].value=v;}sync();notify('Studio selections reset.')});
$('studio-save-design').addEventListener('click',save);
$('studio-copy-design').addEventListener('click',async()=>{let t=buildBrief();try{await navigator.clipboard.writeText(t);notify('Design brief copied!')}catch(e){const input=document.createElement('textarea');input.value=t;document.body.append(input);input.select();let ok=document.execCommand('copy');input.remove();notify(ok?'Design brief copied!':'Select and copy your brief from the quote request below.')}});
$('studio-request-design').addEventListener('click',()=>{$('quote-design-data').classList.add('highlight');$('quote-builder').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});setTimeout(()=>$('quote-design-data').classList.remove('highlight'),2500)});
$('studio-light-toggle').addEventListener('click',()=>{controls.led.checked=!controls.led.checked;sync()});
$('studio-view-left').addEventListener('click',()=>{yaw-=.27;schedule()});$('studio-view-right').addEventListener('click',()=>{yaw+=.27;schedule()});$('studio-view-reset').addEventListener('click',()=>{yaw=.55;pitch=.44;zoom=1;schedule()});
let dragging=false,lastX=0,lastY=0,dragId=null;const viewport=$('studio-viewport');
canvas.addEventListener('pointerdown',e=>{dragging=true;dragId=e.pointerId;lastX=e.clientX;lastY=e.clientY;viewport.classList.add('dragging');canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!dragging||e.pointerId!==dragId)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw+=dx*.008;pitch=Math.max(.18,Math.min(.8,pitch+dy*.004));schedule();});
function stop(){dragging=false;dragId=null;viewport.classList.remove('dragging')};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);canvas.addEventListener('lostpointercapture',stop);
canvas.addEventListener('wheel',e=>{if(e.ctrlKey)return;e.preventDefault();zoom=Math.max(.7,Math.min(1.48,zoom*(e.deltaY>0?.94:1.06)));schedule()},{passive:false});
if('ResizeObserver' in window)new ResizeObserver(schedule).observe(canvas);else addEventListener('resize',schedule);
// before/after photo sliders; the input is the pointer and accessible keyboard surface
for(const surface of document.querySelectorAll('[data-compare]')){const input=surface.querySelector('input');const update=()=>{surface.style.setProperty('--split',input.value+'%')};input.addEventListener('input',update);update();}
const form=$('pd-quote-form');form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;const fields=new FormData(form);let subject='P&D Build&Remodel — Project Consultation Request';const name=String(fields.get('name')||'').trim(),mail=String(fields.get('email')||'').trim(),phone=String(fields.get('phone')||'').trim(),zip=String(fields.get('zip')||'').trim(),project=String(fields.get('project')||''),details=String(fields.get('details')||'').trim();if(!/^\d{5}$/.test(zip))return;
const photos=$('quote-photo').files;let photoNote=photos.length?Array.from(photos).map(f=>f.name).join(', '):'No attachment selected';
const body=[`Hello P&D Build&Remodel,`,``,`I'd like to request a consultation.`,``,`NAME: ${name}`,`EMAIL: ${mail}`,`PHONE: ${phone||'Not provided'}`,`ZIP CODE: ${zip}`,`PROJECT: ${project}`,``,`PROJECT DETAILS:`,details,``,`MY KITCHEN DESIGN CONCEPT:`,buildBrief(),``,`REFERENCE PHOTOS: ${photoNote}`,`(Please attach selected photos directly in this email before sending.)`,``,`Thank you!`].join('\n');
const url='mailto:P.d.build.remodel@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
$('quote-status').textContent='Your email application should open with these details. Review and send the message yourself; attach photos manually. If it does not open, use the Copy design brief button and email P&D directly.';window.location.href=url;
});
sync();schedule();
window.PD_STUDIO={getState:()=>({...state}),designBrief:()=>buildBrief(),setFinish:key=>{if(key in finishes){controls.finish.value=key;sync();}},render:()=>{render();return canvas.toDataURL('image/png')}};
})();
