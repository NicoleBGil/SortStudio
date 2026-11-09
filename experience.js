'use strict';

// Additional views use the original model and its current starting array.
function inversionCount(a, direction='asc') {
  let count=0;
  for(let i=0;i<a.length;i++)for(let j=i+1;j<a.length;j++)if(bad(a[i],a[j],direction))count++;
  return count;
}
function drawDisorder(){
  const n=values.length, cells=[];
  for(let i=0;i<n;i++)for(let j=0;j<n;j++)cells.push({i,j,valid:j>i,wrong:j>i&&bad(values[i],values[j],dir())});
  const w=780,p=48,size=Math.min(38,(w-2*p)/n),height=p+n*size+48;
  const svg=d3.select('#inversionChart').selectAll('svg').data([null]).join('svg').attr('viewBox',`0 0 ${w} ${height}`).attr('role','img').attr('aria-label',`Initial inversion matrix. ${inversionCount(values,dir())} inversions. Each lit cell is an out-of-order pair.`);
  svg.selectAll('*').remove();
  svg.append('text').attr('x',p).attr('y',20).attr('font-size',12).text('Column: later position j · rows: earlier position i');
  svg.selectAll('rect').data(cells).join('rect').attr('x',d=>p+d.j*size).attr('y',d=>p+d.i*size).attr('width',size-3).attr('height',size-3).attr('rx',3).attr('fill',d=>d.wrong?'#d27934':d.valid?'#d9e6e3':'#eff3f1').append('title').text(d=>d.valid?`Positions ${d.i+1}, ${d.j+1}: ${values[d.i]}, ${values[d.j]} — ${d.wrong?'inversion':'in order'}`:'Not counted: only i < j');
  for(let i=0;i<n;i++){
    svg.append('text').attr('x',p+(i+.5)*size).attr('y',p-10).attr('text-anchor','middle').attr('font-size',11).text(i+1);
    svg.append('text').attr('x',p-12).attr('y',p+(i+.6)*size).attr('text-anchor','end').attr('font-size',11).text(i+1);
  }
  const count=inversionCount(values,dir()), max=n*(n-1)/2;
  const bubbleSwaps=traces.bubble.at(-1).m, insertionWrites=traces.insertion.at(-1).m;
  const cards=[['INITIAL INVERSIONS',count],['POSSIBLE PAIRS',max],['BUBBLE SWAPS',bubbleSwaps],['INSERTION WRITES',insertionWrites]];
  $('inversionStats').replaceChildren(...cards.map(([label,value])=>{const card=document.createElement('article');const small=document.createElement('span');small.textContent=label;const strong=document.createElement('strong');strong.textContent=value;card.append(small,strong);return card}));
  $('inversionInsight').textContent=`${max?Math.round(count/max*100):0}% of possible position pairs are inverted. Measured: ${bubbleSwaps} Bubble swaps = ${count} inversions. Insertion writes = ${count} shifts + ${Math.max(0,n-1)} key writes = ${insertionWrites}. Direction: ${dir()==='asc'?'ascending':'descending'}.`;
}

// Tagged records keep equal-key identities visible. Same strict comparisons as core.
function identityTrace(name){
  const a=[{key:20,id:'A'},{key:20,id:'B'},{key:10,id:'C'}], t=[];
  const save=msg=>t.push({a:a.map(v=>({...v})),msg});
  save('Start: 20A precedes 20B. Will their relative order survive?');
  if(name==='bubble'){
    for(let i=0;i<a.length-1;i++){
      let changed=false;
      for(let j=0;j<a.length-1-i;j++){
        save(`Compare ${a[j].key}${a[j].id} and ${a[j+1].key}${a[j+1].id}.`);
        if(a[j].key>a[j+1].key){[a[j],a[j+1]]=[a[j+1],a[j]];changed=true;save('Swap adjacent out-of-order records.');}
      }
      if(!changed)break;
    }
  } else if(name==='selection'){
    for(let i=0;i<a.length-1;i++){
      let best=i;
      for(let j=i+1;j<a.length;j++){
        save(`Compare candidate ${a[best].key}${a[best].id} with ${a[j].key}${a[j].id}.`);
        if(a[best].key>a[j].key)best=j;
      }
      if(best!==i){[a[i],a[best]]=[a[best],a[i]];save('Distant swap: 10C replaces 20A, carrying 20A past 20B.');}
    }
  } else {
    for(let i=1;i<a.length;i++){
      const key=a[i];let j=i-1;
      save(`Hold key ${key.key}${key.id}; only strictly larger records shift.`);
      while(j>=0&&a[j].key>key.key){a[j+1]=a[j];j--;}
      a[j+1]=key;
      save(`Insert ${key.key}${key.id} after any equal keys. Intermediate shifts are summarized in this identity view.`);
    }
  }
  const stable=a.findIndex(v=>v.id==='A')<a.findIndex(v=>v.id==='B');
  save(stable?'Finished: A still precedes B. Equal-key order was preserved.':'Finished: B precedes A. Correct keys, but equal-key order was reversed.');
  return t;
}
let stableStep=0;
function drawStable(){
  const t=identityTrace($('stableAlgo').value);stableStep=Math.min(stableStep,t.length-1);
  const frame=t[stableStep];
  $('stableChart').replaceChildren(...frame.a.map((v,i)=>{
    const card=document.createElement('div');card.className='record record-'+v.id;
    const pos=document.createElement('small');pos.textContent=`POSITION ${i+1}`;
    const key=document.createElement('strong');key.textContent=v.key;
    const id=document.createElement('span');id.textContent=`Record ${v.id}`;
    card.append(pos,key,id);return card;
  }));
  $('stableMessage').textContent=`Operation ${stableStep}/${t.length-1}: ${frame.msg}`;
  $('stablePrev').disabled=stableStep===0;$('stableNext').disabled=stableStep===t.length-1;
}
$('stableAlgo').addEventListener('change',()=>{stableStep=0;drawStable()});
$('stablePrev').addEventListener('click',()=>{stableStep--;drawStable()});
$('stableNext').addEventListener('click',()=>{stableStep++;drawStable()});
$('stableReset').addEventListener('click',()=>{stableStep=0;drawStable()});

const tourStops=[
  {id:'home',title:'The question',time:'0:00–1:00',prompt:'Ask: does already sorted mean no work? Explain comparisons, writes, and events.'},
  {id:'arena',title:'Same input, three mechanisms',time:'1:00–2:30',prompt:'Start the prepared reverse-order race. Pause and step. Compare local swapping, global selection, and insertion.',setup:()=>{ $('direction').value='asc';$('scenario').value='reverse';setArray([90,80,70,60,50,40,30,20,10],'Prepared reverse-order demonstration.'); }},
  {id:'heatmap',title:'The hidden geography of comparison',time:'2:30–3:30',prompt:'Switch Bubble → Selection → Insertion. Explain positions, the diagonal, and the external insertion key.'},
  {id:'whatif',title:'Ask the class before measuring',time:'3:30–5:00',prompt:'Poll: which uses fewest comparisons on sorted n=20? Select Tie, run, then switch to array writes.',setup:()=>{ $('labScenario').value='sorted';$('labSize').value='20';$('labSizeOut').textContent='20';$('labMetric').value='comparisons';$('labChart').replaceChildren();$('labTable').replaceChildren();$('labInsight').textContent='';$('labResult').textContent='Class prediction: which algorithm needs the fewest comparisons?';document.querySelectorAll('[name=hypothesis]').forEach(e=>e.checked=false); }},
  {id:'playground',title:'Intervene on the data',time:'5:00–6:00',prompt:'Swap two bars or enter a custom array. Explain what changes together and what stays controlled.'},
  {id:'explorer',title:'From source code to visible behavior',time:'6:00–7:00',prompt:'Use insertion on [30,20,10]. Step through key comparisons, shifts, and writes. Show script.js or the exported trace.',setup:()=>{setArray([30,20,10],'Prepared trace example.');$('codeAlgo').value='insertion';codeStep=0;drawCode();}},
  {id:'challenge',title:'Check the audience’s intuition',time:'7:00–7:45',prompt:'Ask the class to predict a swap, reveal the answer, and connect it to the ordering condition.'},
  {id:'growth',title:'Scale the mechanism',time:'7:45–9:00',prompt:'Compare sorted and reverse curves. At n=40: sorted Bubble/Insertion = 39; Selection = 780. Explain one sample vs an average.'},
  {id:'history',title:'Read the accumulation of work',time:'9:00–9:30',prompt:'Explain plateaus and why an event-axis slope is not a CPU timing measurement.'},
  {id:'disorder',title:'Explain the cost with inversions',time:'9:30–10:30',prompt:'Read the triangle. Show that each adjacent Bubble swap removes one inversion. Relate Insertion shifts to the same count.'},
  {id:'stability',title:'Correct order can hide a tradeoff',time:'10:30–11:30',prompt:'Step Selection to completion on [20A,20B,10C]. Compare Bubble. Equal keys can change relative order.'},
  {id:'method',title:'Make the evidence reproducible',time:'11:30–12:30',prompt:'Open the model details and show verification, schema, equations, and JSON export. State assumptions and limits.'},
  {id:'conclusion',title:'Answer the research question',time:'12:30–13:00',prompt:'Recap: input structure and chosen metric change the answer. Ask what matters in a real application. Reserve 13:00–15:00 for discussion.'}
];
let tourIndex=0,tourTimer=null,tourStarted=0;
function showStop(runSetup=true){
  const stop=tourStops[tourIndex];if(runSetup&&stop.setup)stop.setup();
  $('tourProgress').textContent=`${String(tourIndex+1).padStart(2,'0')} / ${tourStops.length} · ${stop.time}`;
  $('tourTitle').textContent=stop.title;$('tourPrompt').textContent=stop.prompt;
  $('tourBack').disabled=tourIndex===0;$('tourNext').disabled=tourIndex===tourStops.length-1;
  document.querySelectorAll('.tour-current').forEach(e=>e.classList.remove('tour-current'));
  $(stop.id).classList.add('tour-current');$(stop.id).scrollIntoView({behavior:'smooth',block:'start'});
}
$('enterTour').addEventListener('click',()=>{
  stop();tourIndex=0;$('tourBar').hidden=false;document.body.classList.add('presenting');
  clearInterval(tourTimer);tourStarted=Date.now();$('tourClock').textContent='00:00';
  tourTimer=setInterval(()=>{const s=Math.floor((Date.now()-tourStarted)/1000);$('tourClock').textContent=`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;},1000);showStop();
});
$('tourBack').addEventListener('click',()=>{if(tourIndex>0){stop();tourIndex--;showStop(false)}});
$('tourNext').addEventListener('click',()=>{if(tourIndex<tourStops.length-1){stop();tourIndex++;showStop()}});
$('tourExit').addEventListener('click',()=>{clearInterval(tourTimer);$('tourBar').hidden=true;document.body.classList.remove('presenting');document.querySelectorAll('.tour-current').forEach(e=>e.classList.remove('tour-current'))});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('tourBar').hidden)$('tourExit').click()});
// Observe rebuilt arena summaries so all existing array edit paths update disorder.
new MutationObserver(drawDisorder).observe($('arenaSummary'),{childList:true});
const activeNav=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){document.querySelectorAll('.sidebar nav a').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+entry.target.id));}},{rootMargin:'-10% 0px -65% 0px'});
document.querySelectorAll('header[id],section[id]').forEach(e=>activeNav.observe(e));
drawDisorder();drawStable();

$('historyTimeline').addEventListener('input',()=>{stop();battleTick=Math.min(maxTick(),Math.max(0,Number($('historyTimeline').value)));drawBattle()});
$('historyReset').addEventListener('click',()=>{stop();battleTick=0;drawBattle()});
window.addEventListener('resize',()=>{stop();drawBattle();drawPlay();drawCode()});

function runExperienceChecks(){
  let checks=0;const errors=[];
  const check=(ok,msg)=>{checks++;if(!ok)errors.push(msg)};
  const cases=Array.from({length:19},(_,n)=>seeded(n)).concat([[20,20,10],[10,10,10]]);
  for(const a of cases)for(const direction of ['asc','desc']){
    const inv=inversionCount(a,direction);
    check(bubble(a,direction).at(-1).m===inv,'Bubble swaps / inversions');
    check(insertion(a,direction).at(-1).m===inv+Math.max(0,a.length-1),'Insertion writes / inversions');
  }
  for(const name of names){
    const tagged=identityTrace(name).at(-1).a;
    check(JSON.stringify(tagged.map(v=>v.key))===JSON.stringify(algorithms[name]([20,20,10]).at(-1).a),'Tagged example / core output');
    check(tagged.map(v=>v.id).join('')===(name==='selection'?'CBA':'CAB'),'Equal-key relative order');
  }
  return {checks,errors};
}
const extensionChecks=runExperienceChecks();
$('verification').textContent+=` Additional disorder/identity checks: ${extensionChecks.checks} assertions, ${extensionChecks.errors.length} failures.`;
if(extensionChecks.errors.length)throw new Error(extensionChecks.errors.join('; '));
