'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const DAY=86400000,anchor=1800000000000;
const models=[{id:'a',name:'Manutenção',sortOrder:0},{id:'b',name:'Alongamento',sortOrder:1}];
const session=(id,modelId,clientId,daysAgo,duration)=>({id,modelId,clientId,status:'saved',savedAt:anchor-daysAgo*DAY,deletedAt:null,isNoMeasurement:false,modelNameSnapshot:models.find(model=>model.id===modelId).name,timers:[{name:'Etapa',duration}]});
const data={
  models,
  sessions:[session('s1','a','c1',2,100),session('s2','a','c1',4,140),session('s3','b','c2',3,70),session('s4','b',null,5,80),session('old','a','c1',35,160)],
  settings:{clients:[]}
};
const ui={tab:'timers',analyticsRangeDays:30,analyticsModelId:'all'};
const context={
  console,data,ui,
  now:()=>anchor,
  recordDateMs:item=>item.savedAt,
  sessionTotal:item=>item.timers.reduce((sum,timer)=>sum+timer.duration,0),
  recordGrossMs:item=>item.timers.reduce((sum,timer)=>sum+timer.duration,0),
  pauseTotal:()=>0,
  timerDuration:timer=>timer.duration,
  modelById:id=>models.find(model=>model.id===id),
  activeModels:()=>models,
  clientLabelForSession:item=>data.settings.clients.find(client=>client.id===item.clientId)?.name||'Escolher cliente',
  personIconMarkup:()=>'<svg></svg>',
  fmtDuration:value=>`${Math.round(value)} ms`,
  fmtDate:value=>new Date(value).toISOString().slice(0,10),
  esc:value=>String(value),
  shell:value=>value,
  renderStats:()=>'',render:()=>{},
  setTimeout:()=>0,
  document:{querySelectorAll:()=>[],getElementById:()=>null,scrollingElement:{scrollTop:0},documentElement:{scrollTop:0}},
  requestAnimationFrame:callback=>callback()
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../analytics-ui.js',`file://${__filename}`),'utf8'),context,{filename:'analytics-ui.js'});

const render=clients=>{data.settings.clients=clients;return context.renderStats();};
const currentDate=anchor-2*DAY,previousDate=anchor-35*DAY;

let html=render([{id:'c1',name:'Ana',createdAt:currentDate},{id:'c2',name:'Bia',createdAt:currentDate}]);
assert.match(html,/Número de atendimentos/);
assert.match(html,/Total no período/);
assert.match(html,/Base das estatísticas/);
assert.match(html,/Sem base anterior para porcentagem/);
assert.match(html,/Cliente que você mais leva tempo/);
assert.match(html,/Cliente que você leva menos tempo/);
assert.match(html,/data-open-client="c1"/);
assert.match(html,/Estatísticas totais desde o dia em que você começou a usar o app/);
assert.doesNotMatch(html,/NaN|Infinity/);

html=render([{id:'c1',name:'Ana',createdAt:currentDate},{id:'c2',name:'Bia',createdAt:currentDate},{id:'old',name:'Clara',createdAt:previousDate}]);
assert.match(html,/\+100,0%/);
html=render([{id:'c1',name:'Ana',createdAt:currentDate},{id:'old1',name:'Clara',createdAt:previousDate},{id:'old2',name:'Dora',createdAt:previousDate}]);
assert.match(html,/-50,0%/);
html=render([{id:'c1',name:'Ana',createdAt:currentDate},{id:'old1',name:'Clara',createdAt:previousDate}]);
assert.match(html,/0,0%/);

ui.analyticsModelId='a';
html=render([{id:'c1',name:'Ana',createdAt:currentDate}]);
assert.match(html,/Número de atendimentos/,'card permanece disponível com modelo específico');
assert.doesNotMatch(html,/Alongamento<\/span><strong>/,'filtro de modelo deve limitar a distribuição');

console.log('Estatísticas UZE: OK');
