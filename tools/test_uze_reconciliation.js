'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

let loadHandler=null,uidCounter=0,settingsWrites=0;
const seedClient={id:'client-demo-maria',areaId:'principal',name:'Maria Silva',createdAt:1700000000000,updatedAt:1700000000000,deletedAt:null,aliases:[]};
const data={
  models:[{id:'model-1',areaId:'principal'}],
  sessions:[
    {id:'s-ana-1',areaId:'principal',title:'Atendimento antigo',clientId:null,clientNameSnapshot:'Ana'},
    {id:'s-ana-2',areaId:'principal',title:'Outro atendimento',clientNameSnapshot:'Ana'},
    {id:'s-operacional',areaId:'principal',title:'Manutenção',clientNameSnapshot:''},
    {id:'s-demo',areaId:'principal',title:'Maria Silva',clientId:'client-demo-maria',clientNameSnapshot:'Maria Silva'}
  ],
  current:null,
  settings:{clients:[],activeAreaId:'principal',clientEmptyLabel:'Sem cliente'}
};

const context={
  console,
  window:{APP_RELEASE:'test',addEventListener(type,handler){if(type==='load')loadHandler=handler;}},
  document:{querySelector(){return null;},querySelectorAll(){return [];},getElementById(){return null;}},
  setTimeout(handler){handler();return 1;},
  fetch:async()=>({ok:true,json:async()=>({settings:{clients:[seedClient]}})}),
  data,db:{},ui:{},UI_CONFIG:{},
  clone:value=>value==null?value:JSON.parse(JSON.stringify(value)),
  uid:()=>`test-${++uidCounter}`,
  now:()=>1800000000000,
  put:async()=>{},
  persistSettings:async()=>{settingsWrites++;},
  persistCurrent:async()=>{},
  svgIcon:()=>'',renderNotesEditor:()=>'',clientLabelForSession:()=>'',renderClientProfile:()=>'',
  renderAppearanceSettings:()=>'',renderSettings:()=>'',renderSessionMenu:()=>'',renderTimerMarkerEditor:()=>'',renderEditModel:()=>'',renderOrganize:()=>'',
  render:()=>{},renderAdvancedSettings:()=>'',renderTimerSoundSettings:()=>'',shell:value=>value,
  clientById:id=>data.settings.clients.find(client=>client.id===id&&!client.deletedAt)||null,
  visualStyleModeV088:()=> 'classic',activeTimerIconMarkup:()=>'',personIconMarkup:()=>'',backupShareIcon:()=>'',backupImportIcon:()=>'',
  markerTarget:()=>null,V080_LUCIDE_MARKERS:{},lucideMarkerSvg:()=>'',visualMarkerMarkup:()=>'',organizeStateMarkup:()=>'',trashIconMarkup:()=>'',
  createClient:async()=>{throw new Error('não usado')},iosTextPrompt:async()=>null,confirm:()=>false,
  recordDateMs:()=>0,sessionTotal:()=>0,modelById:()=>null,fmtDuration:()=>'',fmtDate:()=>'',esc:value=>String(value),
  applyTheme:()=>{},persistSettingsOriginal:()=>{},
  HTMLElement:function(){},Image:function(){}
};
context.globalThis=context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL('../uze-beta.js',`file://${__filename}`),'utf8'),context,{filename:'uze-beta.js'});

(async()=>{
  assert.equal(typeof loadHandler,'function');
  await loadHandler();
  await new Promise(resolve=>setImmediate(resolve));

  const ana=data.settings.clients.find(client=>client.name==='Ana');
  assert.ok(ana,'cliente inferida pelo snapshot deve ser criada');
  assert.equal(ana.createdAt,null,'migração não inventa data real de cadastro');
  assert.equal(data.sessions[0].clientId,ana.id);
  assert.equal(data.sessions[1].clientId,ana.id,'nome normalizado deve reutilizar a mesma entidade');
  assert.equal(data.sessions[2].clientId,null,'título operacional não vira cliente');
  assert.equal(data.sessions[3].clientId,'client-demo-maria');
  assert.ok(data.settings.clients.some(client=>client.id==='client-demo-maria'),'entidade demo referenciada deve ser restaurada do seed');
  assert.equal(data.settings.clientEmptyLabel,'Escolher cliente');

  context.ui.settingsView='main';
  let markup=context.renderSettings();
  assert.doesNotMatch(markup,/Clássico|Texto quando não houver cliente|themeSelect/);
  assert.equal((markup.match(/data-uze-theme=/g)||[]).length,3,'há um único controle com três opções de tema');
  assert.match(markup,/Otimizado/);
  context.ui.settingsView='appearance';
  markup=context.renderSettings();
  assert.doesNotMatch(markup,/data-uze-theme|data-visual-style-mode|themeSelect|Texto quando não houver cliente/);
  assert.match(markup,/Ícone do cronômetro ativo/);

  const count=data.settings.clients.length;
  await loadHandler();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(data.settings.clients.length,count,'reconciliação deve ser idempotente');
  assert.ok(settingsWrites>=1);
  console.log('Reconciliação UZE: OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
