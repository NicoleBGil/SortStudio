'use strict';
// Canvas is a projected view of the SAME immutable snapshots as the arena.
const theater=document.createElement('dialog');
theater.id='sortingTheater';
theater.innerHTML=`<div class="theater-top"><div><span class="theater-kicker">SORTSTUDIO / LIVE ALGORITHM THEATER</span><h2>Same data.<em> Different journeys.</em></h2></div><button id="theaterClose" aria-label="Close sorting theater">✕ Close</button></div><div class="theater-intro"><span class="live-dot"></span><span id="theaterStatus" aria-live="polite">Identical input. Three competing mechanisms.</span><button id="theaterFull">⛶ Full screen</button></div><canvas id="theaterCanvas" aria-label="Projected sorting lanes. Bar height is value; horizontal position is array index. Live numerical counters follow below."></canvas><div id="theaterCounters"></div><div class="theater-bottom"><div class="theater-controls"><button id="theaterPlay">▶ Begin the race</button><button id="theaterStep">Step +1</button><button id="theaterReset">↺ Reset</button><label>Input <select id="theaterPattern"><option value="reverse">Reverse</option><option value="random">Random</option><option value="sorted">Sorted</option></select></label><label>Tempo <select id="theaterSpeed"><option value="180">Explain</option><option value="65" selected>Present</option><option value="20">Accelerate</option></select></label></div><label class="theater-scrub">Event <input id="theaterSeek" type="range" min="0" max="100" value="0"><output id="theaterEvent">0</output></label><p>Height = value · horizontal position = array index · amber = active · each lane advances one recorded event per tick. This is an operation-trace race, not CPU timing. Insertion holds a key outside the array during shifts.</p></div>`;
document.body.append(theater);
const launch=document.createElement('button');launch.id='launchTheater';launch.className='theater-launch';launch.innerHTML='<span>◈</span><div>Launch Sorting Theater<small>FULL-SCREEN IMMERSIVE DEMONSTRATION ↗</small></div>';
document.querySelector('.hero-actions').prepend(launch);
let theaterTimer=null,theaterPreviousFocus=null;
const theaterColors=['#b9a2ff','#ffb06b','#62ead0'];
function pauseTheater(){clearInterval(theaterTimer);theaterTimer=null;$('theaterPlay').textContent=battleTick>=maxTick()?'↻ Replay the race':'▶ Continue the race'}
function setupTheater(){pauseTheater();stop();$('direction').value='asc';$('scenario').value=$('theaterPattern').value;setArray(make(12,$('theaterPattern').value),'Shared input loaded by Sorting Theater.');$('theaterPlay').textContent='▶ Begin the race';paintTheater()}
function paintTheater(){
 if(!theater.open)return;
 const canvas=$('theaterCanvas'),rect=canvas.getBoundingClientRect(),ratio=Math.min(window.devicePixelRatio||1,2);
 canvas.width=Math.round(rect.width*ratio);canvas.height=Math.round(rect.height*ratio);
 const ctx=canvas.getContext('2d');ctx.scale(ratio,ratio);
 const w=rect.width,h=rect.height,n=values.length;
 ctx.fillStyle='#07151d';ctx.fillRect(0,0,w,h);
 const glow=ctx.createRadialGradient(w*.65,h*.4,1,w*.65,h*.4,w*.7);glow.addColorStop(0,'#173b4555');glow.addColorStop(1,'#07151d00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 const narrow=w<650;
 const left=narrow?20:160,right=35,laneH=h/3,chartW=w-left-right,slot=chartW/n,barW=slot*.61,depth=Math.min(16,slot*.28),rise=Math.min(90,laneH*.49);
 for(let lane=0;lane<3;lane++){
  const name=names[lane],trace=traces[name],s=trace[Math.min(battleTick,trace.length-1)],done=s.phase==='done',base=(lane+.86)*laneH;
  // Perspective grid: each bar has a consistent value scale across all lanes.
  ctx.strokeStyle='#80c8cb18';ctx.lineWidth=1;
  for(let j=0;j<=n;j++){let x=left+j*slot;ctx.beginPath();ctx.moveTo(x,base);ctx.lineTo(x+depth*2,base-depth*1.4);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(left,base);ctx.lineTo(w-right,base);ctx.stroke();
  ctx.fillStyle=theaterColors[lane];ctx.font=`600 ${narrow?12:15}px system-ui`;ctx.fillText(name.toUpperCase(),narrow?20:20,narrow?base-laneH*.70:base-50);
  ctx.fillStyle='#9db8c7';ctx.font='11px ui-monospace,monospace';
  ctx.fillText(`${s.c} comparisons`,narrow?w-142:20,narrow?base-laneH*.70:base-30);
  if(!narrow)ctx.fillText(`${s.m} ${name==='insertion'?'writes':'swaps'}`,20,base-12);
  s.a.forEach((v,i)=>{
   const x=left+i*slot,y=base,bh=v/100*rise;
   const active=s.active.includes(i),color=active?'#ffe29a':done?'#c9fa7c':theaterColors[lane];
   ctx.shadowColor=color;ctx.shadowBlur=active?22:done?10:3;
   const gradient=ctx.createLinearGradient(x,y-bh,x,y);gradient.addColorStop(0,color);gradient.addColorStop(1,done?'#648e41':'#213e51');ctx.fillStyle=gradient;ctx.fillRect(x,y-bh,barW,bh);ctx.shadowBlur=0;
   ctx.fillStyle=color;ctx.globalAlpha=.7;ctx.beginPath();ctx.moveTo(x,y-bh);ctx.lineTo(x+depth,y-bh-depth*.7);ctx.lineTo(x+barW+depth,y-bh-depth*.7);ctx.lineTo(x+barW,y-bh);ctx.closePath();ctx.fill();
   ctx.globalAlpha=.28;ctx.beginPath();ctx.moveTo(x+barW,y-bh);ctx.lineTo(x+barW+depth,y-bh-depth*.7);ctx.lineTo(x+barW+depth,y-depth*.7);ctx.lineTo(x+barW,y);ctx.closePath();ctx.fill();ctx.globalAlpha=1;
   if(slot>24){ctx.fillStyle=active?'#fff5d5':'#c2d9e4';ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText(v,x+barW/2,y-bh-depth*.7-7);ctx.textAlign='start'}
  });
  if(done){ctx.fillStyle='#d4ff88';ctx.font='600 10px ui-monospace,monospace';ctx.textAlign='right';ctx.fillText('ORDER ACHIEVED ✓',w-right,base+17);ctx.textAlign='start'}
 }
 $('theaterSeek').max=maxTick();$('theaterSeek').value=battleTick;$('theaterEvent').textContent=`${battleTick} / ${maxTick()}`;
 $('theaterCounters').replaceChildren(...names.map((name,i)=>{const s=traces[name][Math.min(battleTick,traces[name].length-1)],el=document.createElement('div');el.style.setProperty('--lane-color',theaterColors[i]);const title=document.createElement('strong');title.textContent=name;const msg=document.createElement('span');msg.textContent=`${s.c} comparisons · ${s.m} ${name==='insertion'?'writes':'swaps'} — ${s.msg}`;el.append(title,msg);return el}));
 const finished=battleTick>=maxTick();
 if(finished){const low=Math.min(...names.map(n=>traces[n].length-1));const winners=names.filter(n=>traces[n].length-1===low);$('theaterStatus').textContent=`${winners.join(' + ').toUpperCase()} · shortest recorded trace: ${low} events. Same sorted result, different work.`;pauseTheater()}else $('theaterStatus').textContent=battleTick===0?'Identical input. Three competing mechanisms.':`Event ${battleTick} · watch active positions and the held insertion key.`;
}
launch.addEventListener('click',()=>{theaterPreviousFocus=document.activeElement;if(!$('tourBar').hidden)$('tourExit').click();theater.showModal();document.body.classList.add('theater-open');setupTheater();$('theaterPlay').focus()});
$('theaterClose').addEventListener('click',()=>theater.close());
theater.addEventListener('close',()=>{pauseTheater();document.body.classList.remove('theater-open');if(document.fullscreenElement===theater)document.exitFullscreen().catch(()=>{});theaterPreviousFocus?.focus()});
$('theaterFull').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});else theater.requestFullscreen?.().catch(()=>{$('theaterStatus').textContent='The theater already fills this browser panel. Maximize your browser for projection.'})});
$('theaterPlay').addEventListener('click',()=>{if(theaterTimer){pauseTheater();return}if(battleTick>=maxTick())battleTick=0;$('theaterPlay').textContent='Ⅱ Pause the race';theaterTimer=setInterval(()=>{battleTick=Math.min(maxTick(),battleTick+1);drawBattle();paintTheater()},Number($('theaterSpeed').value))});
$('theaterStep').addEventListener('click',()=>{pauseTheater();battleTick=Math.min(maxTick(),battleTick+1);drawBattle();paintTheater()});
$('theaterReset').addEventListener('click',()=>{pauseTheater();battleTick=0;drawBattle();paintTheater();$('theaterPlay').textContent='▶ Begin the race'});
$('theaterPattern').addEventListener('change',setupTheater);
$('theaterSpeed').addEventListener('change',()=>{if(theaterTimer){pauseTheater();$('theaterPlay').click()}});
$('theaterSeek').addEventListener('input',()=>{pauseTheater();battleTick=Number($('theaterSeek').value);drawBattle();paintTheater()});
window.addEventListener('resize',paintTheater);document.addEventListener('fullscreenchange',paintTheater);
