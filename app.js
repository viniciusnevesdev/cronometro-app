/* Cronômetro — boot resiliente para iPhone/PWA
   Esta camada não acessa nem altera IndexedDB. Ela só evita tela branca e
   oferece saída para Diagnóstico/Modo Seguro se o motor principal falhar. */
(() => {
  'use strict';
  const startedAt=performance.now();
  const app=document.getElementById('app');
  if(!app)return;
  const beta=location.pathname.includes('/beta/');
  const release=String(window.APP_RELEASE||document.documentElement.dataset.release||'');
  const errors=[];
  let finished=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const diagnosticHref=beta?'../diagnostico/':'./diagnostico/';
  const safeHref='./safe.html';

  app.innerHTML=`<main id="cronometroBoot" style="min-height:100dvh;display:grid;place-items:center;padding:24px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;background:#F2F2F6;color:#111114">
    <section style="width:min(100%,360px);background:rgba(255,255,255,.86);border:1px solid rgba(255,255,255,.9);border-radius:24px;padding:20px;box-shadow:0 14px 36px rgba(0,0,0,.07);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:15px"><strong style="font-size:18px">Cronômetro${beta?' Beta':''}</strong><span style="font-size:10px;font-weight:800;letter-spacing:.05em;color:${beta?'#c56a00':'#007aff'}">${beta?'BETA':'OFICIAL'}${release?` · ${esc(release)}`:''}</span></div>
      <div id="cronometroBootStage" style="font-size:14px;font-weight:650;margin-bottom:5px">Tela inicial</div>
      <div id="cronometroBootDetail" style="font-size:12px;line-height:1.4;color:#6e6e73">Preparando a interface…</div>
      <div style="height:5px;background:#e1e1e6;border-radius:999px;overflow:hidden;margin-top:15px"><div id="cronometroBootBar" style="height:100%;width:12%;background:#007aff;border-radius:inherit;transition:width .25s ease"></div></div>
    </section>
  </main>`;

  const stage=document.getElementById('cronometroBootStage');
  const detail=document.getElementById('cronometroBootDetail');
  const bar=document.getElementById('cronometroBootBar');
  const steps=[
    [350,'Ambiente web','Verificando recursos do navegador…',30],
    [950,'Dados locais','Abrindo o armazenamento local…',52],
    [2200,'Motor do app','Carregando cronômetros e registros…',72],
    [4200,'Correções finais','Aplicando a interface…',88]
  ];

  function appLooksFunctional(){
    const root=document.getElementById('app');
    if(!root||document.getElementById('cronometroBoot'))return false;
    const tabbar=document.querySelector('.tabbar');
    const useful=document.querySelector('.timer-content,.settings-content,.history-content,.stats-content,.content');
    const hasCore=typeof window.render==='function'||typeof window.openDB==='function'||typeof window.put==='function';
    return Boolean(tabbar&&useful&&hasCore);
  }

  function finish(){
    if(finished)return;finished=true;
    clearInterval(pollTimer);clearTimeout(fallbackTimer);
    window.__CRONOMETRO_BOOT_OK__=true;
    window.__CRONOMETRO_BOOT_MS__=Math.round(performance.now()-startedAt);
  }

  function showFallback(){
    if(finished||!document.getElementById('cronometroBoot'))return;
    const elapsed=Math.round(performance.now()-startedAt);
    const errText=errors.length?`<pre style="white-space:pre-wrap;word-break:break-word;font-size:11px;line-height:1.4;background:#f1f1f5;padding:10px;border-radius:12px;margin:12px 0 0">${esc(errors.slice(-3).join('\n'))}</pre>`:'';
    app.innerHTML=`<main style="min-height:100dvh;display:grid;place-items:center;padding:24px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;background:#F2F2F6;color:#111114"><section style="width:min(100%,380px);background:#fff;border-radius:24px;padding:20px;box-shadow:0 14px 36px rgba(0,0,0,.07)"><strong style="font-size:19px">O Cronômetro demorou para abrir</strong><p style="font-size:13px;line-height:1.45;color:#6e6e73;margin:8px 0 0">A interface não respondeu em ${Math.ceil(elapsed/1000)} s. Seus dados locais não foram apagados.</p>${errText}<div style="display:grid;gap:9px;margin-top:16px"><a href="${diagnosticHref}" style="text-decoration:none;text-align:center;background:#111114;color:#fff;padding:12px 14px;border-radius:13px;font-size:14px;font-weight:650">Abrir Diagnóstico</a><a href="${safeHref}" style="text-decoration:none;text-align:center;background:#ececf1;color:#111114;padding:12px 14px;border-radius:13px;font-size:14px;font-weight:650">Abrir Modo Seguro</a><a href="./" style="text-decoration:none;text-align:center;color:#007aff;padding:8px;font-size:13px;font-weight:650">Tentar novamente</a></div></section></main>`;
    finished=true;clearInterval(pollTimer);
  }

  window.addEventListener('error',event=>{
    errors.push(`Erro: ${event.message||event.error||'JavaScript'}`);
    window.__CRONOMETRO_BOOT_ERRORS__=errors.slice();
  });
  window.addEventListener('unhandledrejection',event=>{
    const reason=event.reason?.message||event.reason||'Promise rejeitada';
    errors.push(`Promise: ${reason}`);
    window.__CRONOMETRO_BOOT_ERRORS__=errors.slice();
  });

  const phaseTimer=setInterval(()=>{
    if(finished){clearInterval(phaseTimer);return;}
    const elapsed=performance.now()-startedAt;
    const next=[...steps].reverse().find(x=>elapsed>=x[0]);
    if(next&&stage&&detail&&bar){stage.textContent=next[1];detail.textContent=next[2];bar.style.width=`${next[3]}%`;}
  },180);

  const pollTimer=setInterval(()=>{if(appLooksFunctional()){clearInterval(phaseTimer);finish();}},180);
  const fallbackTimer=setTimeout(showFallback,9000);
  window.addEventListener('load',()=>setTimeout(()=>{if(appLooksFunctional())finish();},80),{once:true});
})();
;


(function(){
  function showBootError(message){
    var app=document.getElementById('app');
    if(!app)return;
    app.innerHTML='<main style="padding:24px;font-family:-apple-system,BlinkMacSystemFont,system-ui;color:#111">'+
      '<h1 style="font-size:22px">Não foi possível abrir o aplicativo</h1>'+
      '<p style="font-size:14px;line-height:1.45">O site foi publicado, mas ocorreu um erro ao iniciar.</p>'+
      '<pre style="white-space:pre-wrap;font-size:12px;background:#f2f2f6;padding:12px;border-radius:14px">'+
      String(message||'Erro desconhecido').replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})+
      '</pre></main>';
  }
  window.addEventListener('error',function(e){
    var message=String(e.message||(e.error&&e.error.message)||e.error||'Erro de JavaScript');
    if(window.__CRONOMETRO_BOOT_OK__||message.trim().toLowerCase()==='script error.'){
      try{console.warn('[Cronômetro] Erro não fatal:',message,e.error||'');}catch(_){}
      return;
    }
    showBootError(message);
  });
  window.addEventListener('unhandledrejection',function(e){
    var message=String(e.reason&&(e.reason.message||e.reason)||'Erro ao iniciar');
    if(window.__CRONOMETRO_BOOT_OK__){
      try{console.warn('[Cronômetro] Promise rejeitada após inicialização:',message,e.reason||'');}catch(_){}
      return;
    }
    showBootError(message);
  });
  window.__showCronometroBootError=showBootError;
})();

'use strict';
globalThis.APP_META = Object.freeze({
  version: '0.8.0',
  dataSchemaVersion: 4,
  factoryDataVersion: 1
});

'use strict';

globalThis.UI_CONFIG = Object.freeze({
  colors: {
    light: {
      bg: '#F2F2F6', card: '#FFFFFF', text: '#000000', secondary: '#85858A',
      line: '#E7E7E8', placeholder: '#C5C5C7', glass: 'rgba(255,255,255,.62)',
      floatBorder: 'rgba(255,255,255,.92)', usedText: '#9A9A9F'
    },
    dark: {
      bg: '#000000', card: '#1C1C1E', text: '#FFFFFF', secondary: '#98989D',
      line: '#38383A', placeholder: '#636366', glass: 'rgba(44,44,46,.72)',
      floatBorder: 'rgba(255,255,255,.12)', usedText: '#747478'
    },
    deleteFixed: '#E22400'
  },

  sizes: {
    contentSide:18, contentTop:14, topbarHeight:54, headerButton:40, headerIcon:22,
    titleSize:17.5, topTabTitleSize:20,

    settingsRadius:30, settingsRowHeight:56, settingsSide:18, settingsPadX:18,

    historyRadius:20, historyPadY:14, historyPadX:16, historyTitleSize:16,
    historyFilterHeight:44, historyFilterRadius:14,

    panelRadius:24, modalRadius:52, sheetCardRadius:30,
    borderWidth:1, iconStroke:1.8
  },

  header: {
    circleBorderWidth:0.75,
    circleBorderLight:'#FFFFFF',
    circleBorderDark:'#474747',
    iconStroke:2.3
  },

  timerModes: {
    small: {
      name:'Pequeno', layout:'lateral',
      minHeight:64, radius:30, padY:11, padX:14, gap:10, listGap:9,
      iconBox:42, iconRadius:13, iconSize:28, iconStroke:1.8,
      nameSize:13, nameWeight:620, nameAlignH:'left', nameAlignV:'center',
      timeSize:24, timeWeight:780, timeAlignH:'right', timeAlignV:'center',
      borderWidth:0, borderLight:'#FFFFFF', borderDark:'#38383A',
      shadow:{enabled:true,x:0,y:8,blur:24,spread:0,opacity:0.02},
      addHeight:52, addTextSize:14.5, addTextWeight:620, addIconStroke:2.5
    },
    medium: {
      name:'Médio', layout:'lateral',
      minHeight:76, radius:34, padY:12, padX:14, gap:10, listGap:10,
      iconBox:42, iconRadius:13, iconSize:28, iconStroke:1.8,
      nameSize:15.5, nameWeight:640, nameAlignH:'left', nameAlignV:'center',
      timeSize:34, timeWeight:760, timeAlignH:'right', timeAlignV:'center',
      borderWidth:0, borderLight:'#FFFFFF', borderDark:'#38383A',
      shadow:{enabled:true,x:0,y:8,blur:24,spread:0,opacity:0.025},
      addHeight:52, addTextSize:14.5, addTextWeight:620, addIconStroke:2.5
    },
    large: {
      name:'Grande', layout:'central',
      minHeight:60, radius:40, padY:11, padX:14, gap:0, listGap:11,
      iconBox:42, iconRadius:13, iconSize:28, iconStroke:1.8,
      nameSize:18, nameWeight:620, nameAlignH:'center', nameAlignV:'top',
      timeSize:80, timeWeight:700, timeAlignH:'center', timeAlignV:'top',
      borderWidth:0, borderLight:'#FFFFFF', borderDark:'#38383A',
      shadow:{enabled:false,x:0,y:8,blur:24,spread:0,opacity:0.06},
      addHeight:52, addTextSize:14.5, addTextWeight:620, addIconStroke:2.5
    }
  },

  actionGroup: {
    side:18, bottom:82, height:60, gap:10, totalFraction:1, saveFraction:1
  },

  totalCard: {
    radius:20, borderWidth:1, blur:16,
    shadow:{x:0,y:12,blur:25,spread:0,opacity:0.155},
    labelSize:12, labelWeight:500, timeSize:30, timeWeight:700,
    iconBox:48, iconSize:36, iconStroke:2.35,
    light:{bg:'#FFFFFF',text:'#000000',secondary:'#85858A',border:'#FFFFFF',iconBg:'#EAF3FF'},
    dark:{bg:'#1C1C1E',text:'#FFFFFF',secondary:'#98989D',border:'#38383A',iconBg:'#172A40'}
  },

  saveCard: {
    radius:20, borderWidth:1, blur:0,
    shadow:{x:0,y:12,blur:25,spread:0,opacity:0.155},
    textSize:20, textWeight:700, iconSize:25, iconStroke:4, gap:7
  },

  tabbar: {
    light:{background:'#F2F2F2',border:'#FFFFFF',icon:'#333333',selectedBackground:'#EBEBEB'},
    dark:{background:'#1C1C1E',border:'#474747',icon:'#C2C2C2',selectedBackground:'#3A3A3C'},
    opacity:0.53, left:14, right:14, bottom:18, height:50, padding:1.5, gap:6,
    radius:999, borderWidth:0.75, blur:7,
    shadow:{x:0,y:12,blur:34,spread:0,opacity:0.19},
    shadow2:{x:0,y:2,blur:10,spread:0,opacity:0.185},
    iconSize:35, iconStroke:1.5, showLabels:false
  },

  animationSpeeds: {
    slow:{id:'slow',name:'Lenta',durationMs:2400},
    normal:{id:'normal',name:'Normal',durationMs:1400},
    fast:{id:'fast',name:'Rápida',durationMs:800}
  },

  activeIconSizes: {
    standard:{id:'standard',name:'Padrão',size:28},
    medium:{id:'medium',name:'Médio',size:36},
    large:{id:'large',name:'Grande',size:44},
    maximum:{id:'maximum',name:'Máximo',size:52}
  },

  themePresets: [
    {id:'original',name:'Padrão',accent:'#007AFF',action:'#34C759',darkAccent:'#0A84FF',darkAction:'#30D158',saveBorderLight:'#56CF74'},
    {id:'blue',name:'Azul',accent:'#007AFF',action:'#007AFF',darkAccent:'#0A84FF',darkAction:'#0A84FF'},
    {id:'green',name:'Verde',accent:'#34C759',action:'#34C759',darkAccent:'#30D158',darkAction:'#30D158'},
    {id:'purple',name:'Roxo',accent:'#AF52DE',action:'#AF52DE',darkAccent:'#BF5AF2',darkAction:'#BF5AF2'},
    {id:'pink',name:'Rosa',accent:'#EE6F9E',action:'#EE6F9E',darkAccent:'#EE6F9E',darkAction:'#EE6F9E'},
    {id:'orange',name:'Laranja',accent:'#FF9500',action:'#FF9500',darkAccent:'#FF9F0A',darkAction:'#FF9F0A'},
    {id:'indigo',name:'Índigo',accent:'#5856D6',action:'#5856D6',darkAccent:'#5E5CE6',darkAction:'#5E5CE6'}
  ]
});


'use strict';

const $app = document.getElementById('app');
const $toast = document.getElementById('toast');

let db;
let ui = {
  tab:'timers',
  timerView:'timers',
  modal:null,
  popover:null,
  modelsEditing:false,
  historyQuery:'',
  historyModel:'all',
  historyArea:'all',
  statsArea:'all',
  historyDate:''
};

let data = {
  models:[],
  sessions:[],
  current:null,
  settings:{
    theme:'system',
    colorTheme:'original',
    timerSize:'small',
    simultaneous:'single',
    accentColor:'#007AFF',
    showVersionBadge:false,
    animateActiveTimerIcon:true,
    activeTimerAnimationSpeed:'normal',
    activeTimerIconSource:'default',
    activeTimerIconData:'',
    activeTimerIconName:'DVD',
    activeTimerIconSize:'standard',
    blinkTotalColon:true,
    timerSoundEnabled:false,
    timerSoundData:'',
    timerSoundName:'',
    timerSoundVolume:0.35,
    areas:[{id:'general',name:'Geral'}],
    statsCards:['summary','total','timers','average','best','worst','percent','trend']
  },
  undo:null
};

let tickHandle=null;
let toastHandle=null;
let timerLoopAudio=null;
let timerLoopAudioSource='';

function anyTimerRunning(){return !!data.current?.timers?.some(isTimerActive);}
function ensureTimerLoopAudio(){
  const src=data.settings.timerSoundData||'';
  if(!src)return null;
  if(!timerLoopAudio||timerLoopAudioSource!==src){
    if(timerLoopAudio){try{timerLoopAudio.pause();}catch(_){}}
    timerLoopAudio=new Audio(src);
    timerLoopAudio.loop=true;
    timerLoopAudio.preload='auto';
    timerLoopAudioSource=src;
  }
  timerLoopAudio.volume=Math.max(0,Math.min(1,Number(data.settings.timerSoundVolume ?? .35)));
  return timerLoopAudio;
}
function syncTimerLoopAudio(fromUserGesture=false){
  const shouldPlay=!!(data.settings.timerSoundEnabled&&data.settings.timerSoundData&&anyTimerRunning());
  const audio=ensureTimerLoopAudio();
  if(!audio)return;
  if(!shouldPlay){audio.pause();return;}
  if(audio.paused){
    const result=audio.play();
    if(result&&typeof result.catch==='function')result.catch(()=>{if(fromUserGesture)toast('Toque novamente no cronômetro para liberar o áudio');});
  }
}
function stopTimerLoopAudio(){if(timerLoopAudio)timerLoopAudio.pause();}


const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
const now = () => Date.now();
const clone = obj => JSON.parse(JSON.stringify(obj));
const esc = v => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const pad = n => String(n).padStart(2,'0');
const fmtDateTime = ms => { const d=new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtDate = ms => { const d=new Date(ms); return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`; };
const dayKey = ms => { const d=new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const fmtDuration = ms => { ms=Math.max(0,Math.round(ms/1000)*1000); const s=Math.floor(ms/1000), h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60; return h?`${h}:${pad(m)}:${pad(sec)}`:`${pad(m)}:${pad(sec)}`; };
const fmtShort = ms => { const s=Math.round(ms/1000); if(s<60)return `${s}s`; const m=Math.round(s/60); if(m<60)return `${m} min`; return `${(m/60).toFixed(1).replace('.',',')} h`; };

function defaultModel(){
  const t=now();
  return {id:uid(),name:'Meu modelo',createdAt:t,updatedAt:t,deletedAt:null,sortOrder:0,timers:[]};
}

function recordedFromTemplate(t){
  return {id:uid(),templateId:t.id,name:t.name,order:t.order,isAdhoc:false,isRemoved:false,intervals:[],correctedDurationMs:null};
}

function newSession(model){
  const t=now();
  return {
    id:uid(),modelId:model.id,modelNameSnapshot:model.name,title:'',manualTitle:false,note:'',
    openedAt:t,firstTimerStartedAt:null,savedAt:null,originalRecordedAt:null,restoredAt:null,
    deletedAt:null,status:'active',isNoMeasurement:false,globalPaused:false,pauseIntervals:[],
    pausedActiveTimerIds:[],customized:false,
    timers:model.timers.filter(x=>!x.removedAt).sort((a,b)=>a.order-b.order).map(recordedFromTemplate)
  };
}

function modelById(id){ return data.models.find(m=>m.id===id); }
function activeModels(){ return data.models.filter(m=>!m.deletedAt).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0)||a.createdAt-b.createdAt); }
function nextModelOrder(){ return Math.max(-1,...data.models.map(m=>Number.isFinite(m.sortOrder)?m.sortOrder:-1))+1; }

function timerDuration(rt,at=now()){
  if(rt.correctedDurationMs!=null)return rt.correctedDurationMs;
  return rt.intervals.reduce((sum,i)=>sum+Math.max(0,(i.endedAt??at)-i.startedAt),0);
}
function sessionTotal(s,at=now()){ return s.timers.reduce((a,t)=>a+timerDuration(t,at),0); }
function pauseTotal(s,at=now()){ return s.pauseIntervals.reduce((a,p)=>a+Math.max(0,(p.endedAt??at)-p.startedAt),0); }
function sessionElapsedGross(s,at=now()){ const start=s.firstTimerStartedAt??s.openedAt; const end=s.savedAt??at; return Math.max(0,end-start); }
function sessionElapsedNet(s,at=now()){ return Math.max(0,sessionElapsedGross(s,at)-pauseTotal(s,at)); }
function openInterval(rt){ return [...rt.intervals].reverse().find(i=>i.endedAt==null); }
function isTimerActive(rt){ return !!openInterval(rt); }
function openPause(s){ return [...(s.pauseIntervals||[])].reverse().find(p=>p.endedAt==null); }
function isTimerPaused(s,rt){ return !isTimerActive(rt)&&timerDuration(rt)>0; }
function isTimerDone(){ return false; }

function startPause(s,t){
  if(!s.firstTimerStartedAt||s.timers.some(isTimerActive)||openPause(s))return;
  s.pauseIntervals||=[];
  s.pauseIntervals.push({id:uid(),startedAt:t,endedAt:null,origin:'no-active-timer'});
}
function endPause(s,t){ const p=openPause(s); if(p)p.endedAt=t; }

function haptic(kind='light'){
  try{if(navigator.vibrate)navigator.vibrate(kind==='save'?[20,25,20]:kind==='switch'?[12,18,12]:kind==='undo'?[8,12,8]:10);}catch(_){}
}
function toast(msg){
  clearTimeout(toastHandle);
  $toast.textContent=msg;
  $toast.classList.add('show');
  toastHandle=setTimeout(()=>$toast.classList.remove('show'),1800);
}
function setUndo(snapshot,label='Troca desfeita'){
  data.undo={snapshot,expiresAt:now()+5000,label};
  render();
  setTimeout(()=>{if(data.undo&&data.undo.expiresAt<=now()){data.undo=null;render();}},5100);
}
async function undo(){
  if(!data.undo)return;
  data.current=data.undo.snapshot;
  data.undo=null;
  await persistCurrent();
  haptic('undo');
  toast('Desfeito');
  render();
}

  

'use strict';

const DB_NAME='cronometro_public_demo_v1';
const DB_VERSION=1;
const FACTORY_SEED_STATE_KEY='factorySeedVersion';

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const d=req.result;
      if(!d.objectStoreNames.contains('models'))d.createObjectStore('models',{keyPath:'id'});
      if(!d.objectStoreNames.contains('sessions'))d.createObjectStore('sessions',{keyPath:'id'});
      if(!d.objectStoreNames.contains('state'))d.createObjectStore('state',{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}

function tx(store,mode='readonly'){return db.transaction(store,mode).objectStore(store);}
function getAll(store){return new Promise((res,rej)=>{const r=tx(store).getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);});}
function getState(key){return new Promise((res,rej)=>{const r=tx('state').get(key);r.onsuccess=()=>res(r.result?.value);r.onerror=()=>rej(r.error);});}
function put(store,value){return new Promise((res,rej)=>{const r=tx(store,'readwrite').put(value);r.onsuccess=()=>res(value);r.onerror=()=>rej(r.error);});}
function del(store,key){return new Promise((res,rej)=>{const r=tx(store,'readwrite').delete(key);r.onsuccess=()=>res();r.onerror=()=>rej(r.error);});}
function putState(key,value){return put('state',{key,value});}

async function persistCurrent(){await putState('current',data.current);}
async function persistSettings(){await putState('settings',data.settings);}

async function loadFactoryData(){
  const response=await fetch('./initial-data.json',{cache:'no-store'});
  if(!response.ok)throw new Error('Não foi possível carregar os dados iniciais.');
  const payload=await response.json();
  if(!payload||!Array.isArray(payload.models))throw new Error('Arquivo de dados iniciais inválido.');
  return payload;
}

function demoRecordedTimer(template,sessionId,index,startedAt,durationMin){
  const duration=Math.max(0,Number(durationMin)||0)*60000;
  const endedAt=startedAt+duration;
  return {
    id:`${sessionId}-timer-${index+1}`,
    templateId:template.id,
    name:template.name,
    order:template.order,
    isAdhoc:false,
    isRemoved:false,
    intervals:duration>0?[{id:`${sessionId}-interval-${index+1}`,startedAt,endedAt,origin:'demo'}]:[],
    ignoredIntervals:[],
    correctedDurationMs:null,
    measurementStatus:duration>0?'measured':'notNeeded',
    marker:clone(template.marker||null),
    __demoEndedAt:endedAt
  };
}

function materializeDemoSession(spec,models,clients,baseNow){
  const model=models.find(m=>m.id===spec.modelId)||models[0];
  const client=clients.find(c=>c.id===spec.clientId)||null;
  if(!model)return null;
  const d=new Date(baseNow);
  d.setHours(Number.isFinite(spec.hour)?spec.hour:10,Number.isFinite(spec.minute)?spec.minute:0,0,0);
  d.setDate(d.getDate()-Math.max(0,Number(spec.daysAgo)||0));
  const openedAt=d.getTime();
  let cursor=openedAt+2*60000;
  const durations=Array.isArray(spec.durationsMin)?spec.durationsMin:[];
  const timers=model.timers.filter(t=>!t.removedAt).sort((a,b)=>a.order-b.order).map((template,index)=>{
    const recorded=demoRecordedTimer(template,spec.id,index,cursor,durations[index]??0);
    cursor=recorded.__demoEndedAt+20000;
    delete recorded.__demoEndedAt;
    return recorded;
  });
  const first=timers.find(t=>t.intervals.length)?.intervals[0]?.startedAt||openedAt;
  const savedAt=Math.max(first,cursor-20000);
  return {
    id:spec.id,
    modelId:model.id,
    modelNameSnapshot:model.name,
    areaId:model.areaId||'general',
    title:client?.name||'Cliente de demonstração',
    manualTitle:false,
    note:String(spec.appointmentNote||''),
    appointmentNote:String(spec.appointmentNote||''),
    clientNote:String(spec.clientNote||''),
    clientId:client?.id||null,
    clientNameSnapshot:client?.name||'',
    openedAt,
    firstTimerStartedAt:first,
    savedAt,
    originalRecordedAt:first,
    restoredAt:null,
    deletedAt:null,
    status:'saved',
    isNoMeasurement:false,
    globalPaused:false,
    pauseIntervals:[],
    pausedActiveTimerIds:[],
    customized:false,
    timers,
    clientMode:true
  };
}

async function seedFactoryDataIfNeeded(){
  const marker=await getState(FACTORY_SEED_STATE_KEY);
  if(marker!=null)return;

  const [existingModels,existingSessions,existingState]=await Promise.all([
    getAll('models'),
    getAll('sessions'),
    getAll('state')
  ]);

  const hasPreviousInstallation=
    existingModels.length>0 ||
    existingSessions.length>0 ||
    existingState.some(item=>item.key!==FACTORY_SEED_STATE_KEY);

  if(hasPreviousInstallation){
    await putState(FACTORY_SEED_STATE_KEY,APP_META.factoryDataVersion);
    return;
  }

  const payload=await loadFactoryData();
  const modelsPayload=payload.models.map((model,index)=>({...clone(model),sortOrder:Number.isFinite(model.sortOrder)?model.sortOrder:index}));
  const settingsPayload=payload.settings&&typeof payload.settings==='object'?clone(payload.settings):null;
  const clients=Array.isArray(settingsPayload?.clients)?settingsPayload.clients:[];
  const demoSpecs=Array.isArray(payload.demo?.sessions)?payload.demo.sessions:[];
  const demoSessions=payload.demo?.enabled?demoSpecs.map(spec=>materializeDemoSession(spec,modelsPayload,clients,Date.now())).filter(Boolean):[];
  if(settingsPayload&&Number.isFinite(Number(payload.demo?.lastBackupDaysAgo))){
    settingsPayload.lastBackupExportAt=Date.now()-Math.max(0,Number(payload.demo.lastBackupDaysAgo))*86400000;
  }

  await new Promise((resolve,reject)=>{
    const tr=db.transaction(['models','sessions','state'],'readwrite');
    const models=tr.objectStore('models');
    const sessions=tr.objectStore('sessions');
    const state=tr.objectStore('state');

    modelsPayload.forEach(model=>models.put(model));
    demoSessions.forEach(session=>sessions.put(session));
    if(settingsPayload)state.put({key:'settings',value:settingsPayload});
    state.put({key:FACTORY_SEED_STATE_KEY,value:Number(payload.factoryDataVersion)||APP_META.factoryDataVersion});

    tr.oncomplete=resolve;
    tr.onerror=()=>reject(tr.error);
    tr.onabort=()=>reject(tr.error||new Error('Inicialização de dados cancelada.'));
  });
}

async function purgeExpired(){
  const cutoff=now()-30*24*60*60*1000;
  for(const s of [...data.sessions]){
    if(s.deletedAt&&s.deletedAt<cutoff){
      await del('sessions',s.id);
      data.sessions=data.sessions.filter(x=>x.id!==s.id);
    }
  }
  for(const m of [...data.models]){
    if(m.deletedAt&&m.deletedAt<cutoff){
      await del('models',m.id);
      data.models=data.models.filter(x=>x.id!==m.id);
    }
  }
}
;


'use strict';

function hasPendingSession(s){return !!(s&&(s.firstTimerStartedAt||sessionTotal(s)>0||s.note?.trim()||s.customized||s.manualTitle));}

async function ensureCurrent(modelId=null){
  if(data.current?.status==='active') return data.current;
  const model=modelById(modelId)||activeModels()[0];
  if(!model) return null;
  data.current=newSession(model); await persistCurrent(); return data.current;
}

async function openModelAfterPendingChoice(id,action){
  const m=modelById(id);
  if(!m)return;

  if(action==='save'){
    const ok=await saveSession();
    if(!ok)return;
  }else if(action==='discard'){
    stopTimerLoopAudio();
    data.current=null;
    await putState('current',null);
  }else{
    ui.modal=null;
    ui.popover=null;
    ui.timerView='timers';
    render();
    return;
  }

  stopTimerLoopAudio();
  data.current=newSession(m);
  await persistCurrent();
  ui.timerView='timers';
  ui.popover=null;
  if(!m.timers.some(t=>!t.removedAt)) ui.modal={type:'editModel',id:m.id};
  else ui.modal=null;
  render();
}

async function chooseModel(id){
  const m=modelById(id);
  if(!m)return;

  if(data.current && data.current.status==='active' && data.current.modelId!==id && hasPendingSession(data.current)){
    ui.modal={type:'pendingModelSwitch',targetModelId:id};
    ui.popover=null;
    render();
    return;
  }

  stopTimerLoopAudio();
  data.current=newSession(m);
  await persistCurrent();
  ui.timerView='timers';
  ui.popover=null;
  if(!m.timers.some(t=>!t.removedAt)) ui.modal={type:'editModel',id:m.id};
  else ui.modal=null;
  render();
}

async function tapTimer(timerId){
  const s=data.current; if(!s)return;
  const rt=s.timers.find(t=>t.id===timerId); if(!rt)return;
  const t=now();
  if(!s.firstTimerStartedAt) s.firstTimerStartedAt=t;
  const active=s.timers.find(x=>isTimerActive(x));
  if(active?.id===rt.id){
    openInterval(rt).endedAt=t;
    startPause(s,t);
    syncTimerLoopAudio(true);
    await persistCurrent(); haptic('light'); render(); return;
  }
  const snap=clone(s);
  if(active){ openInterval(active).endedAt=t; }
  else { endPause(s,t); }
  rt.intervals.push({id:uid(),startedAt:t,endedAt:null,origin:active?'switch':'resume'});
  syncTimerLoopAudio(true);
  await persistCurrent();
  if(active){ setUndo(snap); haptic('switch'); } else { haptic('light'); render(); }
}

async function addAdhoc(){
  const s=data.current;if(!s)return;
  const name=(prompt('Nome do cronômetro avulso:','')||'').trim(); if(!name)return;
  if(s.timers.some(t=>t.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Já existe um cronômetro com esse nome neste registro.');return;}
  s.timers.push({id:uid(),templateId:null,name,order:s.timers.length,isAdhoc:true,isRemoved:false,intervals:[],correctedDurationMs:null});
  s.customized=true; await persistCurrent(); render();
}
async function renameCurrentTimer(id){ const s=data.current,rt=s?.timers.find(t=>t.id===id);if(!rt)return; const n=(prompt('Novo nome:',rt.name)||'').trim();if(!n)return;rt.name=n;s.customized=true;await persistCurrent();render(); }
async function removeCurrentTimer(id){
  const s=data.current,rt=s?.timers.find(t=>t.id===id);if(!rt)return;
  if(timerDuration(rt)>0 && !confirm('Este cronômetro já possui tempo acumulado. Remover deste registro?'))return;
  const snap=clone(s),t=now();if(isTimerActive(rt)){openInterval(rt).endedAt=t;} s.timers=s.timers.filter(t=>t.id!==id).map((t,i)=>({...t,order:i})); startPause(s,t); s.customized=true; syncTimerLoopAudio(true); await persistCurrent(); setUndo(snap,'Remoção desfeita');
}
async function moveCurrentTimer(id,dir){ const s=data.current;if(!s)return;const arr=s.timers.sort((a,b)=>a.order-b.order),i=arr.findIndex(t=>t.id===id),j=i+dir;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((t,k)=>t.order=k);s.customized=true;await persistCurrent();render(); }

async function saveSession(){
  const s=data.current;if(!s)return false;const t=now();
  if(s.globalPaused){ s.globalPaused=false;s.pausedActiveTimerIds=[]; }
  s.timers.forEach(rt=>{const oi=openInterval(rt);if(oi)oi.endedAt=t;});
  endPause(s,t);
  const measured=sessionTotal(s,t)>0;
  if(!measured){
    let note=s.note.trim(); if(!note) note=(prompt('Para salvar um registro sem medição, escreva uma nota explicando:','')||'').trim();
    if(!note){ alert('A nota é obrigatória para salvar sem medição.'); return false; }
    s.note=note; s.isNoMeasurement=true;
  }
  if(!s.manualTitle) s.title=`(sem título) ${fmtDateTime(s.firstTimerStartedAt ?? s.openedAt)}`;
  s.savedAt=t; s.originalRecordedAt=s.firstTimerStartedAt ?? s.openedAt; s.status='saved';

  const adhoc=s.timers.filter(x=>x.isAdhoc);
  const model=modelById(s.modelId);
  if(adhoc.length && model){
    for(const rt of adhoc){
      if(confirm(`Incorporar “${rt.name}” ao modelo “${model.name}” para os próximos registros?`)){
        const templ={id:uid(),name:rt.name,order:model.timers.filter(x=>!x.removedAt).length,createdAt:t,removedAt:null};
        model.timers.push(templ); model.updatedAt=t; rt.templateId=templ.id; rt.isAdhoc=false; await put('models',model);
      }
    }
  }
  await put('sessions',clone(s)); data.sessions.unshift(clone(s));
  const sameModel=modelById(s.modelId); data.current=sameModel?newSession(sameModel):null; await putState('current',data.current);
  stopTimerLoopAudio(); haptic('save'); toast('Registro salvo'); render(); return true;
}

async function discardCurrent(){ if(!data.current)return; if(confirm('Descartar o registro atual?')){ stopTimerLoopAudio(); const m=modelById(data.current.modelId); data.current=m?newSession(m):null; await persistCurrent(); render(); } }

  

'use strict';

async function createModel(){
  const name=(prompt('Nome do novo modelo:','')||'').trim();if(!name)return;
  if(activeModels().some(m=>m.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Já existe um modelo com esse nome.');return;}
  const t=now(),m={id:uid(),name,createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:[]};data.models.push(m);await put('models',m);ui.modal={type:'editModel',id:m.id};render();
}
async function renameModel(m){ const n=(prompt('Nome do modelo:',m.name)||'').trim(); if(!n)return; if(activeModels().some(x=>x.id!==m.id&&x.name.toLocaleLowerCase()===n.toLocaleLowerCase())){alert('Já existe um modelo com esse nome.');return;} m.name=n;m.updatedAt=now();await put('models',m);if(data.current?.modelId===m.id){data.current.modelNameSnapshot=n;await persistCurrent();}render(); }
async function addTemplate(m){
  const name=(prompt('Nome do cronômetro:','')||'').trim();if(!name)return;
  if(m.timers.some(t=>!t.removedAt&&t.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Neste modelo, os cronômetros precisam ter nomes diferentes.');return;}
  m.timers.push({id:uid(),name,order:m.timers.filter(t=>!t.removedAt).length,createdAt:now(),removedAt:null});m.updatedAt=now();await put('models',m);render();
}
async function editTemplate(m,tid){
  const t=m.timers.find(x=>x.id===tid);if(!t)return;
  const n=(prompt('Nome do cronômetro:',t.name)||'').trim();if(!n)return;
  if(m.timers.some(x=>x.id!==tid&&!x.removedAt&&x.name.toLocaleLowerCase()===n.toLocaleLowerCase())){alert('Neste modelo, os cronômetros precisam ter nomes diferentes.');return;}
  t.name=n;m.updatedAt=now();await put('models',m);
  for(const s of data.sessions){
    let changed=false;
    for(const rt of s.timers){if(rt.templateId===tid){rt.name=t.name;changed=true;}}
    if(changed) await put('sessions',s);
  }
  render();
}
async function removeTemplate(m,tid){
  const t=m.timers.find(x=>x.id===tid);if(!t||!confirm(`Remover “${t.name}” do modelo? O histórico será preservado.`))return;
  t.removedAt=now();m.updatedAt=now();await put('models',m);
  for(const s of data.sessions){let changed=false;for(const rt of s.timers){if(rt.templateId===tid){rt.isRemoved=true;changed=true;}}if(changed)await put('sessions',s);}
  render();
}
async function moveTemplate(m,tid,dir){ const arr=m.timers.filter(t=>!t.removedAt).sort((a,b)=>a.order-b.order);const i=arr.findIndex(t=>t.id===tid),j=i+dir;if(j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];arr.forEach((t,k)=>t.order=k);m.updatedAt=now();await put('models',m);render(); }
async function duplicateModel(m){ let n=2,name=`${m.name} (${n})`;const names=new Set(activeModels().map(x=>x.name));while(names.has(name)){n++;name=`${m.name} (${n})`;}const t=now();const c={id:uid(),name,createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:m.timers.filter(x=>!x.removedAt).sort((a,b)=>a.order-b.order).map((x,i)=>({id:uid(),name:x.name,order:i,createdAt:t,removedAt:null}))};data.models.push(c);await put('models',c);toast('Modelo duplicado');render(); }
async function moveModel(id,dir){const arr=activeModels();const i=arr.findIndex(m=>m.id===id),j=i+dir;if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];for(let k=0;k<arr.length;k++){arr[k].sortOrder=k;arr[k].updatedAt=now();await put('models',arr[k]);}render();}
async function deleteModel(m){ if(data.current?.modelId===m.id && hasPendingSession(data.current)){alert('Salve ou descarte o registro em andamento antes de excluir este modelo.');return;}if(!confirm(`Mover “${m.name}” para Apagados recentemente?`))return;m.deletedAt=now();m.updatedAt=now();await put('models',m);if(data.current?.modelId===m.id){const next=activeModels()[0];data.current=next?newSession(next):null;await persistCurrent();}ui.modal=null;ui.popover=null;render(); }
async function restoreModel(m){m.deletedAt=null;if(!Number.isFinite(m.sortOrder))m.sortOrder=nextModelOrder();m.updatedAt=now();await put('models',m);toast('Modelo restaurado');render();}
async function hardDeleteModel(m){if(!confirm('Excluir este modelo definitivamente? Esta ação é irreversível.'))return;await del('models',m.id);data.models=data.models.filter(x=>x.id!==m.id);render();}

async function rebuildModelFromSession(s){
  if(modelById(s.modelId)){alert('Esta ação só fica disponível depois que o modelo de origem é excluído definitivamente.');return;}
  const base=(prompt('Nome do novo modelo:',s.modelNameSnapshot||'Novo modelo')||'').trim();if(!base)return;
  let name=base,n=2;const names=new Set(activeModels().map(m=>m.name));while(names.has(name)){name=`${base} (${n++})`;}
  const chosen=[];
  for(const rt of s.timers.sort((a,b)=>a.order-b.order)){
    if(confirm(`Incluir “${rt.name}” no novo modelo?`)) chosen.push(rt);
  }
  const t=now(),m={id:uid(),name,createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:chosen.map((rt,i)=>({id:uid(),name:rt.name,order:i,createdAt:t,removedAt:null}))};
  data.models.push(m);await put('models',m);toast('Novo modelo criado');ui.modal={type:'editModel',id:m.id};render();
}

  

'use strict';

async function deleteSession(s){ if(!confirm('Mover este registro para Apagados recentemente?'))return;s.deletedAt=now();await put('sessions',s);render(); }
async function restoreSession(s){s.deletedAt=null;s.restoredAt=now();if(!s.manualTitle)s.title=`(sem título) ${fmtDateTime(s.restoredAt)}`;await put('sessions',s);toast('Registro restaurado');render();}
async function hardDeleteSession(s){if(!confirm('Apagar definitivamente? Esta ação não pode ser desfeita.'))return;await del('sessions',s.id);data.sessions=data.sessions.filter(x=>x.id!==s.id);ui.modal=null;render();}
async function correctTimer(s,rt){ const current=timerDuration(rt);const input=prompt(`Novo tempo efetivo de “${rt.name}” em minutos:`,(current/60000).toFixed(1).replace('.',','));if(input==null)return;const mins=Number(input.replace(',','.'));if(!Number.isFinite(mins)||mins<0){alert('Digite um número válido.');return;}if(!confirm('Aplicar esta correção de tempo?'))return;rt.correctedDurationMs=Math.round(mins*60000);await put('sessions',s);toast('Tempo corrigido');render(); }
async function saveSessionNote(id,value){const s=data.sessions.find(x=>x.id===id);if(!s)return;s.note=value;await put('sessions',s);const el=document.querySelector('#noteStatus');if(el)el.textContent=`Alterado • salvo às ${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`;}
async function editSessionTitle(s){const n=(prompt('Título:',s.title)||'').trim();if(!n)return;s.title=n;s.manualTitle=true;await put('sessions',s);render();}
;


'use strict';

function cssNum(v,fallback=0){const n=Number(v);return Number.isFinite(n)?n:fallback;}
function clamp01(v){return Math.max(0,Math.min(1,Number(v)||0));}
function colorWithAlpha(color,opacity){
  const a=clamp01(opacity);
  const m=String(color||'').match(/^#([0-9a-f]{6})$/i);
  if(!m)return `color-mix(in srgb,${color} ${a*100}%,transparent)`;
  const n=parseInt(m[1],16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}
function currentPreset(){
  const presets=UI_CONFIG.themePresets||[];
  return presets.find(p=>p.id===data.settings.colorTheme)||presets[0]||{accent:'#007AFF',action:'#34C759',darkAccent:'#0A84FF',darkAction:'#30D158'};
}
function currentTimerMode(){
  return UI_CONFIG.timerModes?.[data.settings.timerSize]||UI_CONFIG.timerModes?.small||{};
}
function shadowCss(sh={}){
  return `${cssNum(sh.x)}px ${cssNum(sh.y)}px ${cssNum(sh.blur)}px ${cssNum(sh.spread)}px rgba(0,0,0,${clamp01(sh.opacity)})`;
}
function cssVerticalAlign(v){return v==='top'?'start':v==='bottom'?'end':'center';}
function activeTimerAnimationDuration(){
  const speed=UI_CONFIG.animationSpeeds?.[data.settings.activeTimerAnimationSpeed]||UI_CONFIG.animationSpeeds?.normal;
  return cssNum(speed?.durationMs,1400);
}
function activeTimerIconSize(){
  const size=UI_CONFIG.activeIconSizes?.[data.settings.activeTimerIconSize]||UI_CONFIG.activeIconSizes?.standard;
  return cssNum(size?.size,28);
}
function applyTheme(){
  const root=document.documentElement;
  if(data.settings.theme==='system')root.removeAttribute('data-theme');
  else root.setAttribute('data-theme',data.settings.theme);

  const c=UI_CONFIG.colors||{},z=UI_CONFIG.sizes||{},h=UI_CONFIG.header||{},m=currentTimerMode();
  const ag=UI_CONFIG.actionGroup||{},total=UI_CONFIG.totalCard||{},save=UI_CONFIG.saveCard||{},tab=UI_CONFIG.tabbar||{};
  const custom=data.settings.colorTheme==='custom';
  const preset=currentPreset();
  const accentLight=custom?(data.settings.accentColor||'#007AFF'):(preset.accent||'#007AFF');
  const actionLight=custom?accentLight:(preset.action||accentLight);
  const accentDark=custom?accentLight:(preset.darkAccent||preset.accent||'#0A84FF');
  const actionDark=custom?accentDark:(preset.darkAction||preset.action||accentDark);

  const vars={
    '--accent-light':accentLight,'--action-light':actionLight,
    '--accent-dark':accentDark,'--action-dark':actionDark,
    '--switch-on':actionLight,
    '--save-border-light':custom?actionLight:(preset.saveBorderLight||actionLight),'--save-border-dark':actionDark,
    '--delete-fixed':c.deleteFixed||'#E22400',

    '--light-bg':c.light?.bg,'--light-card':c.light?.card,'--light-text':c.light?.text,
    '--light-secondary':c.light?.secondary,'--light-line':c.light?.line,
    '--light-placeholder':c.light?.placeholder,'--light-glass':c.light?.glass,
    '--light-float-border':c.light?.floatBorder,'--light-used':c.light?.usedText,

    '--dark-bg':c.dark?.bg,'--dark-card':c.dark?.card,'--dark-text':c.dark?.text,
    '--dark-secondary':c.dark?.secondary,'--dark-line':c.dark?.line,
    '--dark-placeholder':c.dark?.placeholder,'--dark-glass':c.dark?.glass,
    '--dark-float-border':c.dark?.floatBorder,'--dark-used':c.dark?.usedText,

    '--content-side':`${cssNum(z.contentSide,18)}px`,'--content-top':`${cssNum(z.contentTop,14)}px`,
    '--topbar-height':`${cssNum(z.topbarHeight,54)}px`,'--header-button':`${cssNum(z.headerButton,40)}px`,
    '--header-icon':`${cssNum(z.headerIcon,22)}px`,'--title-size':`${cssNum(z.titleSize,17.5)}px`,
    '--header-circle-border':`${cssNum(h.circleBorderWidth,.75)}px`,
    '--light-header-circle-border':h.circleBorderLight||'#FFFFFF','--dark-header-circle-border':h.circleBorderDark||'#474747',
    '--header-icon-stroke':cssNum(h.iconStroke,2.3),

    '--timer-min-height':`${cssNum(m.minHeight,64)}px`,'--timer-radius':`${cssNum(m.radius,30)}px`,
    '--timer-pad-y':`${cssNum(m.padY,11)}px`,'--timer-pad-x':`${cssNum(m.padX,14)}px`,
    '--timer-gap':`${cssNum(m.gap,10)}px`,'--timer-list-gap':`${cssNum(m.listGap,9)}px`,
    '--timer-icon-size':`${cssNum(m.iconBox,38)}px`,'--timer-icon-radius':`${cssNum(m.iconRadius,13)}px`,
    '--timer-icon-inner':`${cssNum(m.iconSize,21)}px`,'--timer-icon-stroke':cssNum(m.iconStroke,1.8),
    '--timer-name-size':`${cssNum(m.nameSize,15)}px`,'--timer-name-weight':cssNum(m.nameWeight,620),
    '--timer-time-size':`${cssNum(m.timeSize,24)}px`,'--timer-time-weight':cssNum(m.timeWeight,780),
    '--timer-name-align':m.nameAlignH||'left','--timer-time-align':m.timeAlignH||'right',
    '--timer-name-v-align':cssVerticalAlign(m.nameAlignV),'--timer-time-v-align':cssVerticalAlign(m.timeAlignV),
    '--timer-border-width':`${cssNum(m.borderWidth)}px`,'--light-timer-border':m.borderLight||'#FFFFFF','--dark-timer-border':m.borderDark||'#38383A',
    '--timer-card-shadow':m.shadow?.enabled?shadowCss(m.shadow):'none',
    '--add-height':`${cssNum(m.addHeight,52)}px`,'--add-text-size':`${cssNum(m.addTextSize,14.5)}px`,
    '--add-text-weight':cssNum(m.addTextWeight,620),'--add-icon-stroke':cssNum(m.addIconStroke,2.5),

    '--action-group-side':`${cssNum(ag.side,18)}px`,'--action-group-bottom':`${cssNum(ag.bottom,82)}px`,
    '--floating-height':`${cssNum(ag.height,60)}px`,'--floating-gap':`${cssNum(ag.gap,10)}px`,
    '--action-total-fr':cssNum(ag.totalFraction,1),'--action-save-fr':cssNum(ag.saveFraction,1),

    '--total-radius':`${cssNum(total.radius,20)}px`,'--total-border-width':`${cssNum(total.borderWidth,1)}px`,
    '--total-blur':`${cssNum(total.blur,16)}px`,'--total-shadow':shadowCss(total.shadow),
    '--total-label-size':`${cssNum(total.labelSize,12)}px`,'--total-label-weight':cssNum(total.labelWeight,500),
    '--total-time-size':`${cssNum(total.timeSize,30)}px`,'--total-time-weight':cssNum(total.timeWeight,700),
    '--total-icon-box':`${cssNum(total.iconBox,32)}px`,'--total-icon-size':`${cssNum(total.iconSize,28)}px`,'--total-icon-stroke':cssNum(total.iconStroke,2.35),
    '--light-total-bg':total.light?.bg,'--light-total-text':total.light?.text,'--light-total-secondary':total.light?.secondary,
    '--light-total-border':total.light?.border,'--light-total-icon-bg':total.light?.iconBg,
    '--dark-total-bg':total.dark?.bg,'--dark-total-text':total.dark?.text,'--dark-total-secondary':total.dark?.secondary,
    '--dark-total-border':total.dark?.border,'--dark-total-icon-bg':total.dark?.iconBg,

    '--save-radius':`${cssNum(save.radius,20)}px`,'--save-border-width':`${cssNum(save.borderWidth,1)}px`,
    '--save-blur':`${cssNum(save.blur)}px`,'--save-shadow':shadowCss(save.shadow),
    '--save-text-size':`${cssNum(save.textSize,20)}px`,'--save-text-weight':cssNum(save.textWeight,700),
    '--save-icon-size':`${cssNum(save.iconSize,25)}px`,'--save-icon-stroke':cssNum(save.iconStroke,4),'--save-gap':`${cssNum(save.gap,7)}px`,

    '--light-tabbar-bg':colorWithAlpha(tab.light?.background||'#F2F2F2',tab.opacity),'--light-tabbar-border':tab.light?.border,'--light-tabbar-icon':tab.light?.icon,
    '--light-tabbar-selected-bg':tab.light?.selectedBackground,
    '--dark-tabbar-bg':colorWithAlpha(tab.dark?.background||'#1C1C1E',tab.opacity),'--dark-tabbar-border':tab.dark?.border,'--dark-tabbar-icon':tab.dark?.icon,
    '--dark-tabbar-selected-bg':tab.dark?.selectedBackground,
    '--tabbar-opacity':clamp01(tab.opacity),'--tabbar-left':`${cssNum(tab.left,14)}px`,'--tabbar-right':`${cssNum(tab.right,14)}px`,
    '--tabbar-bottom':`${cssNum(tab.bottom,18)}px`,'--tabbar-height':`${cssNum(tab.height,50)}px`,
    '--tabbar-padding':`${cssNum(tab.padding,1.5)}px`,'--tabbar-gap':`${cssNum(tab.gap,6)}px`,'--tabbar-radius':`${cssNum(tab.radius,999)}px`,
    '--tabbar-border-width':`${cssNum(tab.borderWidth,.75)}px`,'--tabbar-blur':`${cssNum(tab.blur,7)}px`,
    '--tabbar-shadow':`${shadowCss(tab.shadow)}, ${shadowCss(tab.shadow2)}`,
    '--tab-icon':`${cssNum(tab.iconSize,35)}px`,'--tab-icon-stroke':cssNum(tab.iconStroke,1.5),

    '--settings-radius':`${cssNum(z.settingsRadius,30)}px`,'--settings-row-height':`${cssNum(z.settingsRowHeight,56)}px`,
    '--settings-side':`${cssNum(z.settingsSide,18)}px`,'--settings-pad-x':`${cssNum(z.settingsPadX,18)}px`,
    '--history-radius':`${cssNum(z.historyRadius,20)}px`,'--history-pad-y':`${cssNum(z.historyPadY,14)}px`,
    '--history-pad-x':`${cssNum(z.historyPadX,16)}px`,'--history-title-size':`${cssNum(z.historyTitleSize,16)}px`,
    '--panel-radius':`${cssNum(z.panelRadius,24)}px`,'--modal-radius':`${cssNum(z.modalRadius,52)}px`,
    '--sheet-card-radius':`${cssNum(z.sheetCardRadius,30)}px`,'--border-width':`${cssNum(z.borderWidth,1)}px`,
    '--icon-stroke':cssNum(z.iconStroke,1.8),

    '--active-disc-duration':`${activeTimerAnimationDuration()}ms`,
    '--active-timer-icon-size':`${activeTimerIconSize()}px`
  };

  for(const [key,value] of Object.entries(vars))if(value!=null)root.style.setProperty(key,value);
}

  

'use strict';


function currentTitle(){ const s=data.current; if(!s)return 'Cronômetro'; return s.manualTitle&&s.title?s.title:`(sem título) ${fmtDateTime(s.firstTimerStartedAt??s.openedAt)}`; }

function timerStateClass(s,rt){ if(isTimerActive(rt))return 'active'; if(isTimerPaused(s,rt))return 'paused'; return ''; }

function svgIcon(name){
  const icons={
    timers:'<circle cx="12" cy="13" r="7.5"/><path d="M12 13V8.7M9 2.5h6M16.7 5.2l1.4-1.4"/>',
    history:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 2"/>',
    stats:'<path d="M3 3v18h18"/><path d="M7 16v-3"/><path d="M11 16V8"/><path d="M15 16v-5"/><path d="m19 8-4-4-4 4-4-4"/>',
    sliders:'<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
    settings:'<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    back:'<path d="M14.8 5.5 8.3 12l6.5 6.5"/>',
    more:'<circle cx="5" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.35" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.35" fill="currentColor" stroke="none"/>',
    clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2V12l3.2 2"/>',
    plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
    check:'<path d="M20 6 9 17l-5-5"/>',
    close:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    chevrons:'<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
    play:'<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
    pause:'<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>',
    disc3:'<circle cx="12" cy="12" r="10"/><path d="M6 12c0-1.7.7-3.2 1.8-4.2"/><circle cx="12" cy="12" r="2"/><path d="M18 12c0 1.7-.7 3.2-1.8 4.2"/>',
    pencil:'<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  };
  const stroke={plus:'var(--plus-stroke,2.5)',check:'var(--check-stroke,3)',close:'var(--close-stroke,2)',chevrons:'var(--chevrons-stroke,1.75)'};
  const sw=stroke[name]??'var(--icon-stroke,2)';
  return `<svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true" style="stroke-width:${sw}">${icons[name]||''}</svg>`;
}



function activeTimerIconMarkup(){
  if(data.settings.activeTimerIconSource!=='default'&&data.settings.activeTimerIconData){
    return `<img class="custom-active-icon" src="${esc(data.settings.activeTimerIconData)}" alt="">`;
  }
  return svgIcon('disc3');
}

function timerStateIcon(s,rt){
  const active=isTimerActive(rt),paused=isTimerPaused(s,rt);
  const spin=active&&data.settings.animateActiveTimerIcon?' spin':'';
  const markup=active?activeTimerIconMarkup():svgIcon(paused?'pause':'play');
  return `<span class="icon timer-state-icon${spin}" aria-hidden="true">${markup}</span>`;
}

function fmtDurationWithBlinkingColons(ms,blink=false){
  return fmtDuration(ms).split(':').map(part=>`<span class="time-digits">${esc(part)}</span>`).join(`<span class="total-colon${blink?' blink':''}">:</span>`);
}

function refreshTimerReadouts(){
  const s=data.current;
  if(ui.tab!=='timers'||!s)return;
  document.querySelectorAll('[data-timer]').forEach(card=>{
    const rt=s.timers.find(t=>t.id===card.dataset.timer);
    const el=card.querySelector('.time');
    if(rt&&el)el.textContent=fmtDuration(timerDuration(rt));
  });
  const totalEl=document.querySelector('.total-time');
  if(totalEl){
    const running=s.timers.some(isTimerActive);
    totalEl.innerHTML=fmtDurationWithBlinkingColons(sessionTotal(s),running&&data.settings.blinkTotalColon);
  }
}


function shell(content,tab=ui.tab){
  const tabs=[['timers','timers','Cronômetros'],['history','history','Histórico'],['stats','stats','Estatísticas'],['settings','settings','Ajustes']];
  return `<div class="app-shell">${content}</div><nav class="tabbar ${UI_CONFIG.tabbar?.showLabels===false?'hide-labels':''}" aria-label="Navegação principal">
    ${tabs.map(([id,ic,l])=>`<button data-tab="${id}" class="${tab===id?'active':''}" aria-label="${l}">${svgIcon(ic)}<span class="tab-label">${l}</span></button>`).join('')}
  </nav>${data.undo&&data.undo.expiresAt>now()?`<div class="undo"><span>Alteração realizada</span><button id="undoBtn">Desfazer</button></div>`:''}`;
}


function renderTimers(){
  const s=data.current, models=activeModels();
  if(!models.length){ return shell(`<header class="topbar simple"><h1>Cronômetro</h1></header><main class="content"><div class="empty">Nenhum modelo criado.<br><br><button class="ios-button" id="createFirst">Criar modelo</button></div></main>`); }
  if(!s) return '';
  const model=modelById(s.modelId);
  const timerMode=currentTimerMode();
  const central=timerMode.layout==='central';
  const cards=s.timers.sort((a,b)=>a.order-b.order).map(rt=>`<button class="timer-card ${central?'central':''} ${timerStateClass(s,rt)}" data-timer="${rt.id}" aria-label="${esc(rt.name)}, ${fmtDuration(timerDuration(rt))}">
      ${timerStateIcon(s,rt)}
      <span class="name">${esc(rt.name)}${rt.isAdhoc?'<span class="badge">Etapa avulsa</span>':''}</span>
      <span class="time">${fmtDuration(timerDuration(rt))}</span>
    </button>`).join('');
  const running=s.timers.some(isTimerActive);
  const blink=running&&data.settings.blinkTotalColon;
  const titlePopover=ui.popover?.type==='title'?`<div class="popover-backdrop" id="closePopover"></div><div class="title-popover floating-window"><button id="titleRename">Renomear</button><button id="titleEditModel">Editar modelo</button><button id="titleDiscard" class="danger">Descartar</button></div>`:'';
  const modelsDrawer=ui.timerView==='models'?renderModelsDrawer():'';
  return shell(`<header class="topbar timer-topbar"><div class="header-row"><button class="circle-button" id="modelsBack" aria-label="Modelos">${svgIcon('back')}</button><button class="current-title ${s.manualTitle?'':'untitled'}" id="currentTitleButton">${esc(currentTitle())}</button><button class="circle-button" id="sessionMenu" aria-label="Detalhes">${svgIcon('more')}</button>${titlePopover}</div><div class="current-model-name">${esc(model?.name||s.modelNameSnapshot)}</div>${s.customized?'<div class="status-line">Personalizado neste registro</div>':''}</header>
  <main class="content timer-content"><div class="timer-list">${cards}<button class="add-card" id="addAdhoc">${svgIcon('plus')}<span>Adicionar cronômetro</span></button></div></main>
  <div class="floating-actions timer-actions"><section class="total-card floating-card ${running?'running':''}"><span class="total-icon">${svgIcon('clock')}</span><span class="total-copy"><small>Tempo total</small><strong class="total-time">${fmtDurationWithBlinkingColons(sessionTotal(s),blink)}</strong></span></section><button class="save-btn" id="saveBtn">${svgIcon('check')}<span>Salvar</span></button></div>${modelsDrawer}`);
}


function renderHistory(){
  const sessions=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt).sort((a,b)=>(b.restoredAt||b.savedAt)-(a.restoredAt||a.savedAt));
  const filtered=sessions.filter(s=>{
    const q=ui.historyQuery.trim().toLocaleLowerCase(); if(q&&!s.title.toLocaleLowerCase().includes(q))return false;
    if(ui.historyModel!=='all'&&s.modelId!==ui.historyModel)return false;
    if(ui.historyDate&&dayKey(s.restoredAt||s.savedAt)!==ui.historyDate)return false; return true;
  });
  const groups={};filtered.forEach(s=>{const k=dayKey(s.restoredAt||s.savedAt);(groups[k]??=[]).push(s);});
  const list=Object.entries(groups).map(([k,arr])=>`<div class="history-day">${fmtDate(new Date(k+'T12:00:00').getTime())}</div>${arr.map(s=>`<button class="history-card" data-session="${s.id}"><div class="top"><strong>${esc(s.title)}</strong>${s.isNoMeasurement?'':`<span class="history-total">${svgIcon('timers')}<span>${fmtDuration(sessionTotal(s,s.savedAt))}</span></span>`}</div>${s.isNoMeasurement?'<span class="badge">Sem medição</span>':''}${s.restoredAt?'<span class="badge">Restaurado</span>':''}</button>`).join('')}`).join('');
  return shell(`<header class="topbar simple section-tab-header history-header"><span></span><h1>Registros</h1><button class="header-pill" id="historyTrash">Apagados</button></header><main class="content history-content"><div class="filters"><input id="historySearch" placeholder="Buscar título" value="${esc(ui.historyQuery)}"><select id="historyModel"><option value="all">Todos os modelos</option>${activeModels().map(m=>`<option value="${m.id}" ${ui.historyModel===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select><div class="date-filter"><input id="historyDate" type="date" value="${esc(ui.historyDate)}">${ui.historyDate?`<button id="historyDateClear" aria-label="Limpar data">${svgIcon('close')}</button>`:''}</div></div>${list||'<div class="empty">Nenhum registro encontrado.</div>'}</main>`);
}


function validMeasuredSessions(){ return data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt&&!s.isNoMeasurement && !!modelById(s.modelId)); }
;

function renderStats(){
  const ss=validMeasuredSessions(); const count=ss.length,total=ss.reduce((a,s)=>a+sessionTotal(s,s.savedAt),0),avg=count?total/count:0;
  const byTimer=new Map();
  ss.forEach(s=>s.timers.forEach(t=>{const d=timerDuration(t,s.savedAt);if(d<=0)return;const key=t.templateId||`adhoc:${t.name}`;const x=byTimer.get(key)||{name:t.name,vals:[],total:0};x.vals.push(d);x.total+=d;byTimer.set(key,x);}));
  const timers=[...byTimer.values()].sort((a,b)=>b.total-a.total); const maxTotal=Math.max(1,...timers.map(x=>x.total));
  let trend='Sem dados suficientes'; if(ss.length>=2){const ordered=[...ss].sort((a,b)=>a.originalRecordedAt-b.originalRecordedAt);const half=Math.max(1,Math.floor(ordered.length/2));const a=ordered.slice(0,half).reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/half;const bArr=ordered.slice(-half);const b=bArr.reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/bArr.length;const pct=a?((b-a)/a*100):0;trend=pct<0?`${Math.abs(pct).toFixed(1).replace('.',',')}% mais rápido`:`${pct.toFixed(1).replace('.',',')}% mais lento`;}
  const timerRows=(kind)=>timers.map(x=>{let value;if(kind==='avg')value=x.total/x.vals.length;if(kind==='best')value=Math.min(...x.vals);if(kind==='worst')value=Math.max(...x.vals);return `<div class="row"><span>${esc(x.name)}</span><strong>${fmtDuration(value)}</strong></div>`}).join('')||'<div class="muted">Sem dados.</div>';
  const percentRows=timers.map(x=>`<div><div class="row"><span>${esc(x.name)}</span><strong>${total?(x.total/total*100).toFixed(1).replace('.',','):0}%</strong></div><div class="bar"><span style="width:${Math.min(100,x.total/maxTotal*100)}%"></span></div></div>`).join('')||'<div class="muted">Sem dados.</div>';
  return shell(`<header class="topbar section-tab-header"><h1>Estatísticas</h1></header><main class="content"><h2 class="section-title">Visão geral</h2>${count?`<div class="stats-grid">
    <section class="panel"><h3>Resumo</h3><div class="row"><span>Registros medidos</span><strong>${count}</strong></div><div class="row"><span>Tempo acumulado</span><strong>${fmtDuration(total)}</strong></div><div class="row"><span>Média por registro</span><strong>${fmtDuration(avg)}</strong></div></section>
    <section class="panel"><h3>Tempo total por registro</h3>${ss.sort((a,b)=>b.originalRecordedAt-a.originalRecordedAt).slice(0,12).map(s=>`<div class="row"><span>${esc(s.title)}</span><strong>${fmtDuration(sessionTotal(s,s.savedAt))}</strong></div>`).join('')}</section>
    <section class="panel"><h3>Tempo de cada cronômetro</h3>${timers.map(x=>`<div><div class="row"><span>${esc(x.name)}</span><strong>${fmtDuration(x.total)}</strong></div><div class="bar"><span style="width:${x.total/maxTotal*100}%"></span></div></div>`).join('')}</section>
    <section class="panel"><h3>Média por cronômetro</h3>${timerRows('avg')}</section>
    <section class="panel"><h3>Melhor tempo</h3>${timerRows('best')}</section>
    <section class="panel"><h3>Pior tempo</h3>${timerRows('worst')}</section>
    <section class="panel"><h3>Percentual no tempo total</h3>${percentRows}</section>
    <section class="panel"><h3>Evolução / tendência</h3><div class="stat-big">${esc(trend)}</div><p class="muted small">Comparação da média da primeira metade dos registros com a metade mais recente.</p></section>
  </div>`:`<div class="empty">As estatísticas aparecerão depois que você salvar registros com medição.</div>`}</main>`);
}



function renderSettings(){
  const presets=UI_CONFIG.themePresets||[];
  const speeds=Object.values(UI_CONFIG.animationSpeeds||{});
  const iconSizes=Object.values(UI_CONFIG.activeIconSizes||{});
  const customSelected=data.settings.colorTheme==='custom';
  const hasSound=!!data.settings.timerSoundData;
  const speedRow=data.settings.animateActiveTimerIcon?`<div class="settings-row animation-speed-row"><div class="animation-speed-options" role="group" aria-label="Velocidade da animação">${speeds.map(sp=>`<button data-animation-speed="${esc(sp.id)}" class="${data.settings.activeTimerAnimationSpeed===sp.id?'selected':''}" aria-pressed="${data.settings.activeTimerAnimationSpeed===sp.id?'true':'false'}">${esc(sp.name)}</button>`).join('')}</div></div>`:'';
  const currentIconName=data.settings.activeTimerIconSource==='default'?'DVD':(data.settings.activeTimerIconName||'Personalizado');
  const areas=getAreas();

  return shell(`<header class="topbar simple section-tab-header"><h1>Ajustes</h1></header><main class="settings-content">
    <section class="settings-section"><div class="settings-card sound-settings-card">
      <button class="settings-row button-row" id="toggleTimerSound" aria-pressed="${data.settings.timerSoundEnabled?'true':'false'}"><span>Som do cronômetro</span><span class="ios-switch ${data.settings.timerSoundEnabled?'on':''}" aria-hidden="true"></span></button>
      <label class="settings-row button-row accent-button-row" for="timerSoundFile"><span>${hasSound?'Trocar áudio':'Adicionar áudio'}</span><span class="secondary-value">${hasSound?esc(data.settings.timerSoundName||'Áudio adicionado'):'Nenhum áudio'}</span><input id="timerSoundFile" class="sr-only" type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"></label>
      ${hasSound?`<label class="settings-row volume-row"><span>Volume</span><span class="range-wrap"><input id="timerSoundVolume" type="range" min="0" max="100" step="1" value="${Math.round((data.settings.timerSoundVolume??.35)*100)}"><span>${Math.round((data.settings.timerSoundVolume??.35)*100)}%</span></span></label><button class="settings-row button-row danger" id="removeTimerSound"><span>Remover áudio</span></button>`:''}
    </div></section>

    <section class="settings-section"><h3 class="section-label">Tema</h3><div class="settings-card color-card"><div class="theme-presets horizontal-themes">${presets.map(p=>`<button class="theme-preset ${data.settings.colorTheme===p.id?'selected':''}" data-color-theme="${esc(p.id)}"><span class="theme-dot" style="--theme-accent:${esc(p.accent)};--theme-action:${esc(p.action)}"></span><span>${esc(p.name)}</span></button>`).join('')}<button class="theme-preset ${customSelected?'selected':''}" data-color-theme="custom"><span class="theme-dot custom-dot" style="--theme-accent:${esc(data.settings.accentColor||'#007AFF')};--theme-action:${esc(data.settings.accentColor||'#007AFF')}"></span><span>Personalizada</span></button></div>${customSelected?`<div class="custom-theme-row"><input id="accentCustom" type="color" value="${esc(data.settings.accentColor||'#007AFF')}"><span>${esc((data.settings.accentColor||'#007AFF').toUpperCase())}</span></div>`:''}</div></section>

    <section class="settings-section"><div class="settings-card"><label class="settings-row" for="themeSelect"><span>Aparência</span><span class="select-wrap"><select id="themeSelect"><option value="system" ${data.settings.theme==='system'?'selected':''}>Sistema</option><option value="light" ${data.settings.theme==='light'?'selected':''}>Claro</option><option value="dark" ${data.settings.theme==='dark'?'selected':''}>Escuro</option></select><span class="chevrons">${svgIcon('chevrons')}</span></span></label></div></section>

    <section class="settings-section"><h3 class="section-label">Áreas</h3><div class="settings-card areas-settings-card">
      ${areas.map(a=>`<div class="settings-row area-settings-row"><span>${esc(a.name)}</span><span class="area-row-actions"><button data-rename-area="${esc(a.id)}">Renomear</button>${a.id!=='general'?`<button class="danger" data-delete-area="${esc(a.id)}">Apagar</button>`:''}</span></div>`).join('')}
      <button class="settings-row button-row accent-button-row" id="addArea"><span>Adicionar área</span></button>
    </div><p class="section-footer">Use áreas para separar modelos, Histórico e Estatísticas, por exemplo: Unhas, Casa e Outros.</p></section>

    <section class="settings-section"><h3 class="section-label">Ícone do cronômetro ativo</h3><div class="settings-card active-icon-source-card">
      <div class="settings-row"><span>Ícone atual</span><span class="secondary-value">${esc(currentIconName)}</span></div>
      <label class="settings-row button-row accent-button-row" for="activeIconFile"><span>Escolher SVG ou PNG</span><input id="activeIconFile" class="sr-only" type="file" accept="image/svg+xml,image/png,.svg,.png"></label>
      <button class="settings-row button-row accent-button-row" id="pasteSvgCode"><span>Colar código SVG</span></button>
      <button class="settings-row button-row accent-button-row" id="pasteSvgUrl"><span>Colar link SVG</span></button>
      ${data.settings.activeTimerIconSource!=='default'?`<button class="settings-row button-row" id="restoreDefaultActiveIcon"><span>Restaurar DVD</span></button>`:''}
    </div></section>

    <section class="settings-section"><div class="settings-card icon-size-settings-card"><div class="settings-row compact-title-row"><strong>Tamanho do ícone</strong></div><div class="settings-row animation-speed-row"><div class="animation-speed-options four-options" role="group" aria-label="Tamanho do ícone">${iconSizes.map(sz=>`<button data-active-icon-size="${esc(sz.id)}" class="${data.settings.activeTimerIconSize===sz.id?'selected':''}" aria-pressed="${data.settings.activeTimerIconSize===sz.id?'true':'false'}">${esc(sz.name)}</button>`).join('')}</div></div></div></section>

    <section class="settings-section"><div class="settings-card animation-settings-card"><button class="settings-row button-row" id="toggleActiveTimerAnimation" aria-pressed="${data.settings.animateActiveTimerIcon?'true':'false'}"><span>Animar ícone do cronômetro ativo</span><span class="ios-switch ${data.settings.animateActiveTimerIcon?'on':''}" aria-hidden="true"></span></button>${speedRow}</div></section>

    <section class="settings-section"><div class="settings-card"><button class="settings-row button-row" id="toggleTotalColonBlink" aria-pressed="${data.settings.blinkTotalColon?'true':'false'}"><span>Piscar os dois pontos do tempo total</span><span class="ios-switch ${data.settings.blinkTotalColon?'on':''}" aria-hidden="true"></span></button><button class="settings-row button-row" id="toggleVersionBadge" aria-pressed="${data.settings.showVersionBadge?'true':'false'}"><span>Mostrar versão no topo</span><span class="ios-switch ${data.settings.showVersionBadge?'on':''}" aria-hidden="true"></span></button></div></section>

    <section class="settings-section"><h3 class="section-label">Backup</h3><div class="settings-card"><button class="settings-row button-row accent-button-row" id="exportJson"><span>Fazer backup</span></button></div><p class="section-footer">Salve o arquivo JSON em uma pasta que você não se esqueça</p></section>
    <section class="settings-section"><div class="settings-card"><label class="settings-row button-row" for="importJsonFile"><span>Restaurar Backup</span><input id="importJsonFile" class="sr-only" type="file" accept="application/json,.json"></label></div><p class="section-footer">Restaura um backup substituindo os dados atuais pelos dados do arquivo JSON escolhido.</p></section>
    <section class="settings-section"><h3 class="section-label">Dados e exportação</h3><div class="settings-card"><button class="settings-row button-row" id="exportCsv"><span>Exportar CSV para planilhas</span></button><button class="settings-row button-row" id="exportPdf"><span>Exportar relatório PDF</span></button></div></section>
    <section class="settings-section"><h3 class="section-label">Armazenamento</h3><div class="settings-card"><div class="settings-row"><span>Dados salvos em</span><span class="secondary-value">Neste aparelho</span></div><div class="settings-row"><span>iCloud</span><span class="secondary-value">Apenas se salvo manualmente</span></div></div><p class="section-footer">Os registros são salvos em cache no seu navegador, caso o cache seja limpo, os dados serão perdidos.</p></section>
    <section class="settings-section"><div class="settings-card"><div class="settings-row"><span>Versão</span><span class="secondary-value">${esc(APP_META.version)}</span></div></div></section>
  </main>`);
}


function renderModelsDrawer(){
  const all=activeModels();
  return `<div class="models-drawer-overlay" id="modelsDrawerBackdrop">
    <aside class="models-drawer" role="dialog" aria-modal="true" aria-label="Modelos">
      <header class="topbar simple models-header models-drawer-header">
        <button class="text-button models-edit-button" id="toggleModelsEdit">${ui.modelsEditing?'Concluir':'Editar'}</button>
        <h1>Modelos</h1>
        <button class="circle-button models-close-button" id="closeModelsDrawer" aria-label="Fechar modelos">${svgIcon('close')}</button>
      </header>
      <main class="content models-page">
        <button class="create-model-card" id="createModel">${svgIcon('plus')}<span>Criar novo modelo</span></button>
        <div class="models-list">${all.map((m,i)=>`<div class="model-list-item"><button class="model-main" data-choose-model="${m.id}"><strong>${esc(m.name)}</strong><span>${m.timers.filter(t=>!t.removedAt).length} cronômetro(s)</span></button>${ui.modelsEditing?`<div class="model-reorder"><button data-move-model="${m.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button data-move-model="${m.id}" data-dir="1" ${i===all.length-1?'disabled':''}>↓</button></div>`:`<button class="circle-button small-circle" data-model-options="${m.id}" aria-label="Opções de ${esc(m.name)}">${svgIcon('more')}</button>`}${ui.popover?.type==='modelOptions'&&ui.popover.id===m.id?`<div class="popover-backdrop" id="closePopover"></div><div class="model-popover floating-window"><button data-model-rename="${m.id}">Renomear</button><button data-model-edit="${m.id}">Editar</button><button data-model-dup="${m.id}">Duplicar</button><button data-model-delete="${m.id}" class="danger">Apagar</button></div>`:''}</div>`).join('')}</div>
      </main>
    </aside>
  </div>`;
}

function renderEditModel(m){ const ts=m.timers.filter(t=>!t.removedAt).sort((a,b)=>a.order-b.order);return `<div class="modal-wrap"><section class="sheet"><div class="sheet-head"><h2>${esc(m.name)}</h2><button class="chip" id="closeToModels">Concluir</button></div><div class="toolbar"><button id="renameModel">Renomear modelo</button><button id="addTemplate">＋ Cronômetro</button></div>${ts.length?ts.map((t,i)=>`<div class="panel"><div class="row"><span><strong>${esc(t.name)}</strong></span><span class="toolbar"><button data-move-template="${t.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button data-move-template="${t.id}" data-dir="1" ${i===ts.length-1?'disabled':''}>↓</button></span></div><div class="toolbar"><button data-edit-template="${t.id}">Editar</button><button data-remove-template="${t.id}" class="danger">Remover</button></div></div>`).join(''):'<div class="empty">Este modelo está vazio. Você pode mantê-lo assim ou adicionar cronômetros.</div>'}</section></div>`; }

function renderPendingModelSwitch(targetModelId){
  const m=modelById(targetModelId);
  if(!m)return '';
  return `<div class="modal-wrap pending-switch-wrap">
    <section class="sheet pending-switch-sheet" role="dialog" aria-modal="true" aria-labelledby="pendingSwitchTitle">
      <div class="pending-switch-copy">
        <h2 id="pendingSwitchTitle">Registro atual não foi salvo</h2>
        <p>Antes de abrir “${esc(m.name)}”, escolha o que fazer com o registro atual.</p>
      </div>
      <div class="pending-switch-actions">
        <button class="pending-switch-button primary" id="pendingSwitchSave">Salvar registro e abrir este modelo</button>
        <button class="pending-switch-button danger" id="pendingSwitchDiscard">Descartar registro e abrir este modelo</button>
        <button class="pending-switch-button secondary" id="pendingSwitchCancel">Cancelar e voltar aos cronômetros</button>
      </div>
    </section>
  </div>`;
}


function renderSessionMenu(){ const s=data.current;return `<div class="modal-wrap"><section class="sheet details-sheet" role="dialog" aria-modal="true"><div class="sheet-head liquid-head"><button class="circle-button glass detail-close-button" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><h2>Detalhes</h2><span class="sheet-spacer"></span></div><div class="sheet-body"><section class="sheet-card timer-size-detail-card"><div class="detail-card-title">Tamanho</div><div class="detail-card-divider"></div><div class="detail-size-options animation-speed-options" role="group" aria-label="Tamanho dos cronômetros"><button data-timer-size="small" class="${data.settings.timerSize==='small'?'selected':''}">Pequeno</button><button data-timer-size="large" class="${data.settings.timerSize==='large'?'selected':''}">Grande</button></div></section><section class="sheet-card"><textarea id="currentNote" class="notes-box" rows="5" placeholder="Notas">${esc(s.note)}</textarea></section><section class="sheet-card"><button class="sheet-row action-row" id="menuCustomize">Organizar cronômetros</button><button class="detail-action" id="saveAsNewModel">Salvar como novo modelo</button><button class="detail-action" id="updateCurrentModel">Atualizar modelo atual</button></section></div></section></div>`; }


function renderOrganize(){const s=data.current;return `<div class="modal-wrap"><section class="sheet"><div class="sheet-head"><h2>Organizar registro</h2><button class="chip" id="closeModal">Concluir</button></div>${s.timers.sort((a,b)=>a.order-b.order).map((t,i)=>`<div class="panel"><div class="row"><strong>${esc(t.name)}</strong><span class="toolbar"><button data-move-current="${t.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button data-move-current="${t.id}" data-dir="1" ${i===s.timers.length-1?'disabled':''}>↓</button></span></div><div class="toolbar"><button data-rename-current="${t.id}">Renomear</button><button data-remove-current="${t.id}" class="danger">Remover</button></div></div>`).join('')}</section></div>`;}
;

function renderSessionDetail(s){
  const model=modelById(s.modelId);
  const timers=s.isNoMeasurement?[]:s.timers.filter(t=>timerDuration(t,s.savedAt)>0).sort((a,b)=>a.order-b.order);
  return `<div class="modal-wrap record-detail-wrap"><section class="sheet record-detail-sheet"><div class="sheet-head record-detail-head"><button class="circle-button glass record-detail-close" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><button class="record-title-button" data-edit-session-title="${s.id}"><span>${esc(s.title)}</span>${svgIcon('pencil')}</button><button class="record-detail-check" id="closeRecordDetail" aria-label="Concluir">${svgIcon('check')}</button></div><div class="record-detail-body">
    <div class="record-actions">${!model?`<button data-rebuild-model="${s.id}">Criar modelo deste registro</button>`:''}<button data-delete-session="${s.id}" class="danger">Excluir</button></div>
    <section class="panel record-summary"><div class="row"><span>Modelo de origem</span><strong>${esc(model ? (model.deletedAt ? 'Modelo excluído' : model.name) : 'Modelo excluído')}</strong></div>${s.isNoMeasurement?'<div class="row"><span class="badge">Sem medição</span></div>':`<div class="row"><span>Tempo total</span><strong class="detail-time-with-icon">${svgIcon('timers')}<span>${fmtDuration(sessionTotal(s,s.savedAt))}</span></strong></div><div class="row"><span>Tempo decorrido</span><strong>${fmtDuration(sessionElapsedNet(s,s.savedAt))}</strong></div><div class="row"><span>Pausas</span><strong>${fmtDuration(pauseTotal(s,s.savedAt))}</strong></div>`}<div class="row"><span>Registrado originalmente em</span><span>${fmtDateTime(s.originalRecordedAt)}</span></div>${s.restoredAt?`<div class="row"><span>Restaurado em</span><span>${fmtDateTime(s.restoredAt)}</span></div>`:''}</section>
    <div class="record-timers-list">${timers.map(t=>`<details class="record-timer-card"><summary><span class="record-timer-title">${esc(t.name)}${t.isAdhoc?'<span class="badge">Etapa avulsa</span>':''}${t.isRemoved?'<span class="badge">Removido</span>':''}</span><span class="record-timer-time">${svgIcon('timers')}<strong>${fmtDuration(timerDuration(t,s.savedAt))}</strong></span></summary><div class="record-timer-extra"><div class="muted small record-interval-label">Horários e intervalos</div>${t.intervals.map(i=>`<div class="row small"><span>${fmtDateTime(i.startedAt)}</span><span>${i.endedAt?fmtDateTime(i.endedAt):'aberto'}</span></div>`).join('')}<button class="action" data-correct-time="${s.id}" data-timer-id="${t.id}">Corrigir tempo</button></div></details>`).join('')}</div>
    <section class="panel"><label for="detailNote"><strong>Nota</strong></label><textarea id="detailNote" rows="4" data-note-session="${s.id}" placeholder="Notas">${esc(s.note)}</textarea><div id="noteStatus" class="muted small"></div></section>
  </div></section></div>`;
}

function renderTrash(){ const deletedSessions=data.sessions.filter(s=>s.deletedAt),deletedModels=data.models.filter(m=>m.deletedAt);return `<div class="modal-wrap"><section class="sheet"><div class="sheet-head"><h2>Apagados recentemente</h2><button class="chip" id="closeModal">Fechar</button></div><h3>Registros</h3>${deletedSessions.map(s=>`<div class="panel"><strong>${esc(s.title)}</strong><div class="toolbar"><button data-restore-session="${s.id}">Restaurar</button><button data-hard-session="${s.id}" class="danger">Apagar definitivamente</button></div></div>`).join('')||'<p class="muted">Nenhum registro.</p>'}<h3>Modelos</h3>${deletedModels.map(m=>`<div class="panel"><strong>${esc(m.name)}</strong><div class="toolbar"><button data-restore-model="${m.id}">Restaurar</button><button data-hard-model="${m.id}" class="danger">Apagar definitivamente</button></div></div>`).join('')||'<p class="muted">Nenhum modelo.</p>'}</section></div>`; }




function render(){
  applyTheme();

  if(ui.tab==='timers')$app.innerHTML=renderTimers();
  if(ui.tab==='history')$app.innerHTML=renderHistory();
  if(ui.tab==='stats')$app.innerHTML=renderStats();
  if(ui.tab==='settings')$app.innerHTML=renderSettings();

  if(ui.modal){
    if(ui.modal.type==='editModel'){const m=modelById(ui.modal.id);if(m)$app.insertAdjacentHTML('beforeend',renderEditModel(m));}
    if(ui.modal.type==='sessionMenu')$app.insertAdjacentHTML('beforeend',renderSessionMenu());
    if(ui.modal.type==='pendingModelSwitch')$app.insertAdjacentHTML('beforeend',renderPendingModelSwitch(ui.modal.targetModelId));
    if(ui.modal.type==='organize')$app.insertAdjacentHTML('beforeend',renderOrganize());
    if(ui.modal.type==='timerMarker')$app.insertAdjacentHTML('beforeend',renderTimerMarkerEditor());
    if(ui.modal.type==='session'){const s=data.sessions.find(x=>x.id===ui.modal.id);if(s)$app.insertAdjacentHTML('beforeend',renderSessionDetail(s));}
    if(ui.modal.type==='trash')$app.insertAdjacentHTML('beforeend',renderTrash());
  }

  document.getElementById('app-version-badge')?.remove();
  if(data.settings.showVersionBadge){
    document.body.insertAdjacentHTML('beforeend',`<div id="app-version-badge" class="app-version-badge">v${esc(APP_META.version)}</div>`);
  }

  bind();
  bindV080Events();
}

  

'use strict';

async function shareFile(name,type,content){
  const blob=content instanceof Blob?content:new Blob([content],{type}); const file=new File([blob],name,{type});
  try{ if(navigator.canShare?.({files:[file]})){ await navigator.share({files:[file],title:name}); return; } }catch(e){ if(e.name==='AbortError')return; }
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);toast('Arquivo gerado');
}
function csvCell(v){const s=String(v??'');return `"${s.replaceAll('"','""')}"`;}
async function exportCSV(){
  const rows=[['sessionId','originalRecordedAt','savedAt','restoredAt','title','modelId','model','recordedTimerId','templateId','cronometro','tipo','duracaoMs','tempoTotalMs','tempoDecorridoMs','pausasMs','nota']];
  data.sessions.filter(s=>s.status==='saved').forEach(s=>s.timers.forEach(t=>rows.push([s.id,new Date(s.originalRecordedAt).toISOString(),new Date(s.savedAt).toISOString(),s.restoredAt?new Date(s.restoredAt).toISOString():'',s.title,s.modelId,s.modelNameSnapshot,t.id,t.templateId||'',t.name,t.isAdhoc?'avulso':t.isRemoved?'removido':'modelo',timerDuration(t,s.savedAt),sessionTotal(s,s.savedAt),sessionElapsedNet(s,s.savedAt),pauseTotal(s,s.savedAt),s.note])));
  await shareFile(`cronometro-${dayKey(now())}.csv`,'text/csv;charset=utf-8','\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\n'));
}
async function exportJSON(){ const payload={schemaVersion:APP_META.dataSchemaVersion,exportedAt:new Date().toISOString(),models:data.models,sessions:data.sessions,settings:data.settings,currentSession:data.current}; await shareFile(`cronometro-dados-${dayKey(now())}.json`,'application/json',JSON.stringify(payload,null,2)); }
function validateBackup(payload){
  return payload && typeof payload==='object' && Array.isArray(payload.models) && Array.isArray(payload.sessions) && payload.settings && typeof payload.settings==='object';
}
function normalizeImportedCurrent(current,exportedAt){
  if(!current || current.status!=='active')return null;
  const c=clone(current);const stop=Date.parse(exportedAt)||now();
  (c.timers||[]).forEach(t=>(t.intervals||[]).forEach(i=>{if(i.endedAt==null)i.endedAt=Math.max(i.startedAt,stop);}));
  (c.pauseIntervals||[]).forEach(p=>{if(p.endedAt==null)p.endedAt=Math.max(p.startedAt,stop);});
  c.globalPaused=false;c.pausedActiveTimerIds=[];return c;
}
async function replaceFromBackup(payload){
  const current=normalizeImportedCurrent(payload.currentSession,payload.exportedAt);
  const settings={...data.settings,...payload.settings,simultaneous:'single'};
  await new Promise((resolve,reject)=>{
    const tr=db.transaction(['models','sessions','state'],'readwrite');
    const ms=tr.objectStore('models'),ss=tr.objectStore('sessions'),st=tr.objectStore('state');
    ms.clear();ss.clear();st.clear();
    payload.models.forEach((m,i)=>ms.put({...m,sortOrder:Number.isFinite(m.sortOrder)?m.sortOrder:i}));
    payload.sessions.forEach(x=>ss.put(x));
    st.put({key:'settings',value:settings});st.put({key:'current',value:current});st.put({key:FACTORY_SEED_STATE_KEY,value:APP_META.factoryDataVersion});
    tr.oncomplete=resolve;tr.onerror=()=>reject(tr.error);tr.onabort=()=>reject(tr.error||new Error('Importação cancelada'));
  });
  data.models=await getAll('models');data.sessions=await getAll('sessions');data.settings={...data.settings,...(await getState('settings')||{}),simultaneous:'single'};data.current=await getState('current');
  if(!data.current){const m=activeModels()[0];if(m){data.current=newSession(m);await persistCurrent();}}
}
async function importJSON(file){
  try{
    const payload=JSON.parse(await file.text());
    if(!validateBackup(payload)){alert('Este arquivo não parece ser um backup válido do Cronômetro.');return;}
    if(!confirm('Restaurar este backup? Todos os dados atuais do aplicativo serão substituídos pelos dados do arquivo.'))return;
    await replaceFromBackup(payload);data.undo=null;ui.modal=null;ui.popover=null;ui.timerView='timers';toast('Backup restaurado');render();
  }catch(err){console.error(err);alert('Não foi possível importar este arquivo JSON.');}
}
function ascii(s){return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'?').replace(/[()\\]/g,m=>'\\'+m);}
function makePdf(lines){
  const per=44,pages=[];for(let i=0;i<lines.length;i+=per)pages.push(lines.slice(i,i+per));if(!pages.length)pages=[['Relatorio Cronometro']];
  const objs=[];const fontObj=3;const pageObjStart=4;const contentStart=pageObjStart+pages.length;objs[1]='<< /Type /Catalog /Pages 2 0 R >>';
  objs[2]=`<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_,i)=>`${pageObjStart+i} 0 R`).join(' ')}] >>`;objs[3]='<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  pages.forEach((pg,i)=>{const contentNum=contentStart+i;objs[pageObjStart+i]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontObj} 0 R >> >> /Contents ${contentNum} 0 R >>`;let y=800;const body=['BT','/F1 10 Tf',...pg.flatMap(line=>{const cmd=`1 0 0 1 45 ${y} Tm (${ascii(line).slice(0,100)}) Tj`;y-=17;return [cmd];}),'ET'].join('\n');objs[contentNum]=`<< /Length ${body.length} >>\nstream\n${body}\nendstream`;});
  let pdf='%PDF-1.4\n',offs=[0];for(let i=1;i<objs.length;i++){offs[i]=pdf.length;pdf+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}const xref=pdf.length;pdf+=`xref\n0 ${objs.length}\n0000000000 65535 f \n`;for(let i=1;i<objs.length;i++)pdf+=`${String(offs[i]).padStart(10,'0')} 00000 n \n`;pdf+=`trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return new Blob([pdf],{type:'application/pdf'});
}
async function exportPDF(){
  const ss=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt);const measured=ss.filter(s=>!s.isNoMeasurement);const total=measured.reduce((a,s)=>a+sessionTotal(s,s.savedAt),0);const lines=['RELATORIO CRONOMETRO',`Gerado em: ${fmtDateTime(now())}`,`Registros medidos: ${measured.length}`,`Tempo total acumulado: ${fmtDuration(total)}`,'','REGISTROS'];ss.sort((a,b)=>b.originalRecordedAt-a.originalRecordedAt).forEach(s=>{lines.push(`${fmtDate(s.originalRecordedAt)} | ${s.title} | ${s.isNoMeasurement?'Sem medicao':fmtDuration(sessionTotal(s,s.savedAt))}`);if(!s.isNoMeasurement)s.timers.filter(t=>timerDuration(t,s.savedAt)>0).forEach(t=>lines.push(`  - ${t.name}: ${fmtDuration(timerDuration(t,s.savedAt))}`));});await shareFile(`cronometro-relatorio-${dayKey(now())}.pdf`,'application/pdf',makePdf(lines));
}
;


 'use strict';

function readFileAsDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result||''));r.onerror=()=>reject(r.error||new Error('Falha ao ler arquivo'));r.readAsDataURL(file);});}
function svgTextToDataUrl(svg){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;}
async function setActiveIconFromFile(file){
  if(!file)return;
  const type=(file.type||'').toLowerCase(),name=(file.name||'').toLowerCase();
  if(!(type==='image/svg+xml'||type==='image/png'||name.endsWith('.svg')||name.endsWith('.png'))){alert('Escolha um arquivo SVG ou PNG.');return;}
  data.settings.activeTimerIconData=await readFileAsDataURL(file);
  data.settings.activeTimerIconSource=(type==='image/png'||name.endsWith('.png'))?'png':'svg';
  data.settings.activeTimerIconName=file.name||'Personalizado';
  await persistSettings();render();
}
async function setActiveIconFromSvgCode(){
  const code=(prompt('Cole o código SVG completo:','')||'').trim();if(!code)return;
  if(!/^<svg[\s>]/i.test(code)){alert('O código precisa começar com uma tag <svg>.');return;}
  data.settings.activeTimerIconData=svgTextToDataUrl(code);
  data.settings.activeTimerIconSource='svg';data.settings.activeTimerIconName='SVG colado';
  await persistSettings();render();
}
async function setActiveIconFromUrl(){
  const raw=(prompt('Cole o link direto para um SVG:','')||'').trim();if(!raw)return;
  let url;try{url=new URL(raw,location.href);if(!/^https?:$/.test(url.protocol))throw new Error();}catch(_){alert('Digite um link http ou https válido.');return;}
  try{
    const response=await fetch(url.href,{mode:'cors',cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const svg=await response.text();
    if(!/<svg[\s>]/i.test(svg))throw new Error('O link não retornou um SVG');
    data.settings.activeTimerIconData=svgTextToDataUrl(svg);data.settings.activeTimerIconSource='svg';data.settings.activeTimerIconName='SVG por link';
    toast('SVG importado e salvo no aparelho');
  }catch(_){
    data.settings.activeTimerIconData=url.href;data.settings.activeTimerIconSource='remoteSvg';data.settings.activeTimerIconName='SVG por link';
    toast('Link salvo; este ícone pode precisar de internet');
  }
  await persistSettings();render();
}
async function handleTimerSoundFile(file){
  if(!file)return;
  const ok=/\.(mp3|m4a|wav)$/i.test(file.name||'')||['audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/x-wav'].includes((file.type||'').toLowerCase());
  if(!ok){alert('Escolha um áudio MP3, M4A ou WAV.');return;}
  data.settings.timerSoundData=await readFileAsDataURL(file);data.settings.timerSoundName=file.name||'Áudio';
  timerLoopAudio=null;timerLoopAudioSource='';
  await persistSettings();syncTimerLoopAudio(true);render();
}


async function saveCurrentLayoutAsNewModel(){
  const s=data.current;
  if(!s)return;
  const base=(prompt('Nome do novo modelo:','')||'').trim();
  if(!base)return;

  if(activeModels().some(m=>m.name.toLocaleLowerCase()===base.toLocaleLowerCase())){
    alert('Já existe um modelo com esse nome.');
    return;
  }

  const t=now();
  const model={
    id:uid(),
    name:base,
    createdAt:t,
    updatedAt:t,
    deletedAt:null,
    sortOrder:nextModelOrder(),
    timers:s.timers
      .filter(rt=>!rt.removedAt)
      .sort((a,b)=>(a.order??0)-(b.order??0))
      .map((rt,i)=>({
        id:uid(),
        name:rt.name||`Cronômetro ${i+1}`,
        order:i,
        createdAt:t,
        removedAt:null
      }))
  };

  data.models.push(model);
  await put('models',model);
  toast('Novo modelo salvo');
  render();
}

async function updateCurrentModelFromLayout(){
  const s=data.current;
  if(!s)return;

  const model=data.models.find(m=>m.id===s.modelId);
  if(!model){
    toast('Modelo original não encontrado');
    return;
  }

  const ok=confirm(`Substituir a organização do modelo "${model.name}" pela configuração atual? Os tempos deste registro não serão alterados.`);
  if(!ok)return;

  const t=now();
  const existingById=new Map((model.timers||[]).map(x=>[x.id,x]));

  model.timers=s.timers
    .filter(rt=>!rt.removedAt)
    .sort((a,b)=>(a.order??0)-(b.order??0))
    .map((rt,i)=>{
      const templateId=rt.templateId;
      const old=templateId?existingById.get(templateId):null;
      return {
        id:old?.id||uid(),
        name:rt.name||`Cronômetro ${i+1}`,
        order:i,
        createdAt:old?.createdAt||t,
        removedAt:null
      };
    });

  model.updatedAt=t;
  await put('models',model);
  toast('Modelo atual atualizado');
  render();
}

function bind(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{ui.tab=b.dataset.tab;ui.modal=null;ui.popover=null;if(ui.tab==='timers')ui.timerView='timers';render();});
  const byId=id=>document.getElementById(id);
  if(byId('createFirst'))byId('createFirst').onclick=createModel;
  if(byId('modelsBack'))byId('modelsBack').onclick=()=>{ui.timerView='models';ui.modal=null;ui.popover=null;render();};
  if(byId('closeModelsDrawer'))byId('closeModelsDrawer').onclick=()=>{ui.timerView='timers';ui.modal=null;ui.popover=null;render();};
  if(byId('modelsDrawerBackdrop'))byId('modelsDrawerBackdrop').onclick=e=>{if(e.target===byId('modelsDrawerBackdrop')){ui.timerView='timers';ui.modal=null;ui.popover=null;render();}};
  if(byId('currentTitleButton'))byId('currentTitleButton').onclick=()=>{ui.popover={type:'title'};render();};

  if(byId('saveAsNewModel'))byId('saveAsNewModel').onclick=saveCurrentLayoutAsNewModel;
  if(byId('updateCurrentModel'))byId('updateCurrentModel').onclick=updateCurrentModelFromLayout;
  if(byId('sessionMenu'))byId('sessionMenu').onclick=()=>{ui.modal={type:'sessionMenu'};ui.popover=null;render();};
  document.querySelectorAll('[data-timer]').forEach(b=>b.onclick=()=>tapTimer(b.dataset.timer));
  if(byId('addAdhoc'))byId('addAdhoc').onclick=addAdhoc;
  if(byId('saveBtn'))byId('saveBtn').onclick=saveSession;
  if(byId('undoBtn'))byId('undoBtn').onclick=undo;
  if(byId('pendingSwitchSave'))byId('pendingSwitchSave').onclick=()=>openModelAfterPendingChoice(ui.modal?.targetModelId,'save');
  if(byId('pendingSwitchDiscard'))byId('pendingSwitchDiscard').onclick=()=>openModelAfterPendingChoice(ui.modal?.targetModelId,'discard');
  if(byId('pendingSwitchCancel'))byId('pendingSwitchCancel').onclick=()=>openModelAfterPendingChoice(ui.modal?.targetModelId,'cancel');
  if(byId('closeModal'))byId('closeModal').onclick=()=>{ui.modal=null;render();};
  if(byId('closeRecordDetail'))byId('closeRecordDetail').onclick=()=>{ui.modal=null;render();};
  if(byId('closePopover'))byId('closePopover').onclick=()=>{ui.popover=null;render();};
  document.querySelectorAll('.modal-wrap').forEach(w=>w.onclick=e=>{
    if(e.target!==w)return;
    if(ui.modal?.type==='pendingModelSwitch')return;
    ui.modal=null;
    render();
  });
  if(byId('closeToModels'))byId('closeToModels').onclick=()=>{ui.modal=null;render();};
  if(byId('createModel'))byId('createModel').onclick=createModel;
  if(byId('toggleModelsEdit'))byId('toggleModelsEdit').onclick=()=>{ui.modelsEditing=!ui.modelsEditing;ui.popover=null;render();};
  document.querySelectorAll('[data-model-options]').forEach(b=>b.onclick=e=>{e.stopPropagation();ui.popover={type:'modelOptions',id:b.dataset.modelOptions};render();});
  document.querySelectorAll('[data-model-rename]').forEach(b=>b.onclick=()=>{ui.popover=null;renameModel(modelById(b.dataset.modelRename));});
  document.querySelectorAll('[data-model-edit]').forEach(b=>b.onclick=()=>{ui.popover=null;ui.modal={type:'editModel',id:b.dataset.modelEdit};render();});
  document.querySelectorAll('[data-model-dup]').forEach(b=>b.onclick=()=>{ui.popover=null;duplicateModel(modelById(b.dataset.modelDup));});
  document.querySelectorAll('[data-model-delete]').forEach(b=>b.onclick=()=>{ui.popover=null;deleteModel(modelById(b.dataset.modelDelete));});
  document.querySelectorAll('[data-move-model]').forEach(b=>b.onclick=()=>moveModel(b.dataset.moveModel,Number(b.dataset.dir)));
  document.querySelectorAll('[data-choose-model]').forEach(b=>b.onclick=()=>chooseModel(b.dataset.chooseModel));
  document.querySelectorAll('[data-edit-model]').forEach(b=>b.onclick=()=>{ui.modal={type:'editModel',id:b.dataset.editModel};render();});
  document.querySelectorAll('[data-dup-model]').forEach(b=>b.onclick=()=>duplicateModel(modelById(b.dataset.dupModel)));
  document.querySelectorAll('[data-delete-model]').forEach(b=>b.onclick=()=>deleteModel(modelById(b.dataset.deleteModel)));
  if(ui.modal?.type==='editModel'){
    const m=modelById(ui.modal.id);
    if(byId('renameModel'))byId('renameModel').onclick=()=>renameModel(m); if(byId('addTemplate'))byId('addTemplate').onclick=()=>addTemplate(m);
    document.querySelectorAll('[data-edit-template]').forEach(b=>b.onclick=()=>editTemplate(m,b.dataset.editTemplate));
    document.querySelectorAll('[data-remove-template]').forEach(b=>b.onclick=()=>removeTemplate(m,b.dataset.removeTemplate));
    document.querySelectorAll('[data-move-template]').forEach(b=>b.onclick=()=>moveTemplate(m,b.dataset.moveTemplate,Number(b.dataset.dir)));
  }
  if(byId('titleRename'))byId('titleRename').onclick=async()=>{const current=data.current;const initial=current.manualTitle?current.title:'';const n=(prompt('Título:',initial)||'').trim();if(n){current.title=n;current.manualTitle=true;await persistCurrent();}ui.popover=null;render();};
  if(byId('titleEditModel'))byId('titleEditModel').onclick=()=>{const m=modelById(data.current?.modelId);ui.popover=null;if(m)ui.modal={type:'editModel',id:m.id};render();};
  if(byId('titleDiscard'))byId('titleDiscard').onclick=async()=>{ui.popover=null;await discardCurrent();};
  const currentNote=byId('currentNote');if(currentNote){let tm;currentNote.oninput=e=>{data.current.note=e.target.value;clearTimeout(tm);tm=setTimeout(()=>persistCurrent(),180);};currentNote.onblur=()=>persistCurrent();}
  if(byId('menuCustomize'))byId('menuCustomize').onclick=()=>{ui.modal={type:'organize'};render();};
  document.querySelectorAll('[data-move-current]').forEach(b=>b.onclick=()=>moveCurrentTimer(b.dataset.moveCurrent,Number(b.dataset.dir)));
  document.querySelectorAll('[data-rename-current]').forEach(b=>b.onclick=()=>renameCurrentTimer(b.dataset.renameCurrent));
  document.querySelectorAll('[data-remove-current]').forEach(b=>b.onclick=()=>removeCurrentTimer(b.dataset.removeCurrent));
  if(byId('historySearch'))byId('historySearch').oninput=e=>{ui.historyQuery=e.target.value;render();};
  if(byId('historyModel'))byId('historyModel').onchange=e=>{ui.historyModel=e.target.value;render();};
  if(byId('historyDate'))byId('historyDate').onchange=e=>{ui.historyDate=e.target.value;render();};
  if(byId('historyDateClear'))byId('historyDateClear').onclick=()=>{ui.historyDate='';render();};
  if(byId('historyTrash'))byId('historyTrash').onclick=()=>{ui.modal={type:'trash'};render();};
  document.querySelectorAll('[data-session]').forEach(b=>b.onclick=()=>{ui.modal={type:'session',id:b.dataset.session};render();});
  document.querySelectorAll('[data-delete-session]').forEach(b=>b.onclick=()=>deleteSession(data.sessions.find(s=>s.id===b.dataset.deleteSession)));
  document.querySelectorAll('[data-edit-session-title]').forEach(b=>b.onclick=()=>editSessionTitle(data.sessions.find(s=>s.id===b.dataset.editSessionTitle)));
  document.querySelectorAll('[data-rebuild-model]').forEach(b=>b.onclick=()=>rebuildModelFromSession(data.sessions.find(s=>s.id===b.dataset.rebuildModel)));
  document.querySelectorAll('[data-correct-time]').forEach(b=>b.onclick=()=>{const s=data.sessions.find(s=>s.id===b.dataset.correctTime);const t=s?.timers.find(t=>t.id===b.dataset.timerId);if(s&&t)correctTimer(s,t);});
  const note=byId('detailNote'); if(note){let tm;note.oninput=e=>{clearTimeout(tm);tm=setTimeout(()=>saveSessionNote(e.target.dataset.noteSession,e.target.value),350);};}
  document.querySelectorAll('[data-restore-session]').forEach(b=>b.onclick=()=>restoreSession(data.sessions.find(s=>s.id===b.dataset.restoreSession)));
  document.querySelectorAll('[data-hard-session]').forEach(b=>b.onclick=()=>hardDeleteSession(data.sessions.find(s=>s.id===b.dataset.hardSession)));
  document.querySelectorAll('[data-restore-model]').forEach(b=>b.onclick=()=>restoreModel(modelById(b.dataset.restoreModel)));
  document.querySelectorAll('[data-hard-model]').forEach(b=>b.onclick=()=>hardDeleteModel(modelById(b.dataset.hardModel)));
  if(byId('themeSelect'))byId('themeSelect').onchange=async e=>{data.settings.theme=e.target.value;await persistSettings();render();};
  if(byId('toggleTimerSound'))byId('toggleTimerSound').onclick=async()=>{
    if(!data.settings.timerSoundData){byId('timerSoundFile')?.click();return;}
    data.settings.timerSoundEnabled=!data.settings.timerSoundEnabled;await persistSettings();syncTimerLoopAudio(true);render();
  };
  if(byId('timerSoundFile'))byId('timerSoundFile').onchange=async e=>{const f=e.target.files?.[0];if(f)await handleTimerSoundFile(f);e.target.value='';};
  if(byId('timerSoundVolume'))byId('timerSoundVolume').oninput=e=>{data.settings.timerSoundVolume=Number(e.target.value)/100;const label=e.target.parentElement?.querySelector('span');if(label)label.textContent=`${e.target.value}%`;if(timerLoopAudio)timerLoopAudio.volume=data.settings.timerSoundVolume;};
  if(byId('timerSoundVolume'))byId('timerSoundVolume').onchange=async()=>{await persistSettings();};
  if(byId('removeTimerSound'))byId('removeTimerSound').onclick=async()=>{stopTimerLoopAudio();data.settings.timerSoundEnabled=false;data.settings.timerSoundData='';data.settings.timerSoundName='';timerLoopAudio=null;timerLoopAudioSource='';await persistSettings();render();};
  if(byId('activeIconFile'))byId('activeIconFile').onchange=async e=>{const f=e.target.files?.[0];if(f)await setActiveIconFromFile(f);e.target.value='';};
  if(byId('pasteSvgCode'))byId('pasteSvgCode').onclick=setActiveIconFromSvgCode;
  if(byId('pasteSvgUrl'))byId('pasteSvgUrl').onclick=setActiveIconFromUrl;
  if(byId('restoreDefaultActiveIcon'))byId('restoreDefaultActiveIcon').onclick=async()=>{data.settings.activeTimerIconSource='default';data.settings.activeTimerIconData='';data.settings.activeTimerIconName='DVD';await persistSettings();render();};
  document.querySelectorAll('[data-active-icon-size]').forEach(b=>b.onclick=async()=>{data.settings.activeTimerIconSize=b.dataset.activeIconSize;await persistSettings();render();});
  document.querySelectorAll('[data-timer-size]').forEach(b=>b.onclick=async()=>{data.settings.timerSize=b.dataset.timerSize;await persistSettings();render();});
  if(byId('exportCsv'))byId('exportCsv').onclick=exportCSV;
  if(byId('exportJson'))byId('exportJson').onclick=exportJSON;
  if(byId('exportPdf'))byId('exportPdf').onclick=exportPDF;
  document.querySelectorAll('[data-color-theme]').forEach(b=>b.onclick=async()=>{data.settings.colorTheme=b.dataset.colorTheme;if(data.settings.colorTheme==='custom'&&!data.settings.accentColor)data.settings.accentColor='#007AFF';await persistSettings();render();});
  if(byId('accentCustom'))byId('accentCustom').onchange=async e=>{data.settings.accentColor=e.target.value;data.settings.colorTheme='custom';await persistSettings();render();};
  if(byId('importJsonFile'))byId('importJsonFile').onchange=async e=>{const f=e.target.files?.[0];if(f)await importJSON(f);e.target.value='';};
  if(byId('toggleVersionBadge'))byId('toggleVersionBadge').onclick=async()=>{
    data.settings.showVersionBadge=!data.settings.showVersionBadge;
    await persistSettings();
    render();
  };
  if(byId('toggleActiveTimerAnimation'))byId('toggleActiveTimerAnimation').onclick=async()=>{
    data.settings.animateActiveTimerIcon=!data.settings.animateActiveTimerIcon;
    await persistSettings();
    render();
  };
  document.querySelectorAll('[data-animation-speed]').forEach(b=>b.onclick=async()=>{
    data.settings.activeTimerAnimationSpeed=b.dataset.animationSpeed;
    await persistSettings();
    render();
  });
  if(byId('toggleTotalColonBlink'))byId('toggleTotalColonBlink').onclick=async()=>{
    data.settings.blinkTotalColon=!data.settings.blinkTotalColon;
    await persistSettings();
    render();
  };
}

  

'use strict';


/* ---------- ÁREAS ---------- */
function getAreas(){
  const raw=Array.isArray(data.settings.areas)?data.settings.areas:[];
  const out=raw.filter(a=>a&&typeof a.id==='string'&&typeof a.name==='string'&&a.name.trim());
  if(!out.some(a=>a.id==='general'))out.unshift({id:'general',name:'Geral'});
  return out;
}
function areaById(id){return getAreas().find(a=>a.id===id)||getAreas()[0]||{id:'general',name:'Geral'};}
function modelAreaId(m){return m?.areaId||'general';}
function sessionAreaId(s){return s?.areaId||modelById(s?.modelId)?.areaId||'general';}

async function migrateV080Data(){
  let settingsChanged=false,currentChanged=false;
  if(!Array.isArray(data.settings.areas)||!data.settings.areas.length){
    data.settings.areas=[{id:'general',name:'Geral'}];
    settingsChanged=true;
  }else if(!data.settings.areas.some(a=>a?.id==='general')){
    data.settings.areas.unshift({id:'general',name:'Geral'});
    settingsChanged=true;
  }
  ui.historyArea=ui.historyArea||'all';
  ui.statsArea=ui.statsArea||'all';

  for(const m of data.models){
    let changed=false;
    if(!m.areaId){m.areaId='general';changed=true;}
    for(const t of (m.timers||[])){
      if(!Object.prototype.hasOwnProperty.call(t,'marker')){t.marker=null;changed=true;}
    }
    if(changed)await put('models',m);
  }

  // Registros antigos continuam sem areaId para poderem acompanhar a área
  // do modelo de origem. Registros novos passam a salvar um snapshot da área.
  for(const s of data.sessions){
    let changed=false;
    for(const t of (s.timers||[])){
      if(!Object.prototype.hasOwnProperty.call(t,'marker')){
        const mt=modelById(s.modelId)?.timers?.find(x=>x.id===t.templateId);
        t.marker=clone(mt?.marker||null);changed=true;
      }
    }
    if(changed)await put('sessions',s);
  }

  if(data.current){
    if(!data.current.areaId){data.current.areaId=modelAreaId(modelById(data.current.modelId));currentChanged=true;}
    for(const t of (data.current.timers||[])){
      if(!Object.prototype.hasOwnProperty.call(t,'marker')){
        const mt=modelById(data.current.modelId)?.timers?.find(x=>x.id===t.templateId);
        t.marker=clone(mt?.marker||null);currentChanged=true;
      }
    }
  }

  if(settingsChanged)await persistSettings();
  if(currentChanged)await persistCurrent();
}


/* ---------- SESSÕES COM ÁREA E MARCADOR ---------- */
function recordedFromTemplate(t){
  return {
    id:uid(),templateId:t.id,name:t.name,order:t.order,isAdhoc:false,isRemoved:false,
    intervals:[],correctedDurationMs:null,marker:clone(t.marker||null)
  };
}
function newSession(model){
  const t=now();
  return {
    id:uid(),modelId:model.id,modelNameSnapshot:model.name,areaId:modelAreaId(model),
    title:'',manualTitle:false,note:'',
    openedAt:t,firstTimerStartedAt:null,savedAt:null,originalRecordedAt:null,restoredAt:null,
    deletedAt:null,status:'active',isNoMeasurement:false,globalPaused:false,pauseIntervals:[],
    pausedActiveTimerIds:[],customized:false,
    timers:model.timers.filter(x=>!x.removedAt).sort((a,b)=>a.order-b.order).map(recordedFromTemplate)
  };
}
;

/* ---------- JANELA DE TEXTO ---------- */
function iosTextPrompt({
  title='Digite um texto',
  message='',
  value='',
  placeholder='',
  confirmText='Salvar',
  inputMode='text',
  multiline=false
}={}){
  return new Promise(resolve=>{
    document.querySelector('.ios-text-prompt-backdrop')?.remove();
    const backdrop=document.createElement('div');
    backdrop.className='ios-text-prompt-backdrop';
    backdrop.innerHTML=`<section class="ios-text-prompt" role="dialog" aria-modal="true">
      <div class="ios-text-prompt-copy"><h2>${esc(title)}</h2>${message?`<p>${esc(message)}</p>`:''}</div>
      <div class="ios-text-prompt-field">${multiline
        ?`<textarea id="iosPromptInput" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`
        :`<input id="iosPromptInput" type="text" inputmode="${esc(inputMode)}" autocomplete="off" autocapitalize="sentences" placeholder="${esc(placeholder)}" value="${esc(value)}">`
      }</div>
      <div class="ios-text-prompt-actions"><button id="iosPromptCancel">Cancelar</button><button id="iosPromptConfirm">${esc(confirmText)}</button></div>
    </section>`;
    document.body.appendChild(backdrop);
    const input=backdrop.querySelector('#iosPromptInput');
    const finish=result=>{backdrop.remove();resolve(result);};
    backdrop.querySelector('#iosPromptCancel').onclick=()=>finish(null);
    backdrop.querySelector('#iosPromptConfirm').onclick=()=>finish(input.value);
    backdrop.onclick=e=>{if(e.target===backdrop)finish(null);};
    input.addEventListener('keydown',e=>{
      if(!multiline&&e.key==='Enter'){e.preventDefault();finish(input.value);}
    });
    try{
      input.focus({preventScroll:true});
      if(!multiline&&typeof input.setSelectionRange==='function'){
        const len=input.value.length;input.setSelectionRange(len,len);
      }
      setTimeout(()=>input.focus({preventScroll:true}),50);
    }catch(_){}
  });
}

/* ---------- CONFIRMAÇÃO DE SALVAMENTO ---------- */
function showSavedConfirmation(){
  document.querySelector('.save-confirmation')?.remove();
  const el=document.createElement('div');
  el.className='save-confirmation';
  el.innerHTML=`<div class="save-confirmation-card"><span class="save-confirmation-icon">${svgIcon('check')}</span><span>Registro salvo</span></div>`;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1400);
}

/* ---------- MARCADORES VISUAIS ---------- */
const V080_LUCIDE_MARKERS={
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
  home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  star:'<path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.3L5.8 21 7 14.1l-5-4.8 6.9-1z"/>',
  sparkle:'<path d="m12 3-1.2 3.5L7 8l3.8 1.5L12 13l1.2-3.5L17 8l-3.8-1.5z"/><path d="m19 14-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8z"/><path d="m5 14-.7 1.8L2.5 16.5l1.8.7L5 19l.7-1.8 1.8-.7-1.8-.7z"/>',
  camera:'<path d="M14.5 4 16 6h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l1.5-2z"/><circle cx="12" cy="13" r="4"/>',
  scissors:'<circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.7 8.3 11.3 5.2"/><path d="m8.7 15.7 11.3-5.2"/>',
  brush:'<path d="m14 5 5 5"/><path d="M13 6 4.5 14.5A3.5 3.5 0 0 0 4 19c1.2 1.2 3.2 1.1 4.5-.2L17 10.3"/><path d="M3 21c2 0 3-1 3-3"/>',
  droplet:'<path d="M12 2.5S5 10 5 15a7 7 0 0 0 14 0c0-5-7-12.5-7-12.5z"/>',
  leaf:'<path d="M20 4c-8 0-14 4-14 10 0 4 3 6 6 6 6 0 8-8 8-16z"/><path d="M4 21c2-5 6-9 12-12"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'
};
function lucideMarkerSvg(name){
  const p=V080_LUCIDE_MARKERS[name];
  if(!p)return '';
  return `<svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>`;
}
function visualMarkerMarkup(marker,cls='timer-visual-marker'){
  if(!marker)return `<span class="${cls} empty"></span>`;
  if(marker.type==='emoji')return `<span class="${cls}">${esc(marker.value||'')}</span>`;
  if(marker.type==='lucide'){
    const svg=lucideMarkerSvg(marker.value);
    return `<span class="${cls}${svg?'':' empty'}">${svg}</span>`;
  }
  if((marker.type==='svg'||marker.type==='iconoir')&&marker.data){
    return `<span class="${cls}"><img src="${esc(marker.data)}" alt=""></span>`;
  }
  return `<span class="${cls} empty"></span>`;
}
function timerNameFit(name){
  const n=Array.from(String(name||'')).length;
  return n>30?'fit-xlong':n>19?'fit-long':'';
}
function sanitizeSvg(svg){
  let s=String(svg||'').trim();
  s=s.replace(/<script[\s\S]*?<\/script>/gi,'');
  s=s.replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi,'');
  s=s.replace(/\son\w+\s*=\s*(["']).*?\1/gi,'');
  s=s.replace(/\son\w+\s*=\s*[^\s>]+/gi,'');
  return s;
}
function markerTarget(){
  const m=ui.modal;
  if(!m||m.type!=='timerMarker')return null;
  if(m.scope==='current'){
    const timer=data.current?.timers?.find(t=>t.id===m.timerId);
    return timer?{scope:'current',timer}:null;
  }
  const model=modelById(m.modelId);
  const timer=model?.timers?.find(t=>t.id===m.timerId);
  return timer?{scope:'model',model,timer}:null;
}
async function saveMarkerToTarget(marker){
  const target=markerTarget();if(!target)return;
  target.timer.marker=clone(marker||null);
  if(target.scope==='model'){
    target.model.updatedAt=now();
    await put('models',target.model);
    if(data.current?.modelId===target.model.id){
      const rt=data.current.timers.find(t=>t.templateId===target.timer.id);
      if(rt){rt.marker=clone(marker||null);await persistCurrent();}
    }
  }else{
    data.current.customized=true;
    await persistCurrent();
  }
  ui.modal=target.scope==='model'?{type:'editModel',id:target.model.id}:{type:'organize'};
  render();
}
async function importIconoirMarker(name){
  const clean=String(name||'').trim().toLowerCase().replace(/^iconoir-/,'');
  if(!clean)return;
  try{
    const url=`https://cdn.jsdelivr.net/npm/iconoir@7.12.1/icons/${encodeURIComponent(clean)}.svg`;
    const response=await fetch(url,{mode:'cors',cache:'force-cache'});
    if(!response.ok)throw new Error(String(response.status));
    const svg=sanitizeSvg(await response.text());
    if(!/^<svg[\s>]/i.test(svg))throw new Error('invalid-svg');
    await saveMarkerToTarget({type:'iconoir',value:clean,data:svgTextToDataUrl(svg)});
  }catch(err){
    console.error(err);
    alert('Não foi possível importar esse ícone do Iconoir. Confira o nome e tente novamente com internet ativa.');
  }
}
function renderTimerMarkerEditor(){
  const target=markerTarget();if(!target)return '';
  const marker=target.timer.marker||null;
  const tab=ui.modal.markerTab||'emoji';
  const preview=visualMarkerMarkup(marker,'marker-preview');
  const lucideNames=Object.keys(V080_LUCIDE_MARKERS);
  let pane='';
  if(tab==='emoji'){
    pane=`<div class="marker-pane"><input id="markerEmojiInput" maxlength="12" placeholder="Digite ou cole um emoji" value="${marker?.type==='emoji'?esc(marker.value):''}"></div>
      <div class="marker-editor-actions"><button class="primary" id="applyEmojiMarker">Usar emoji</button></div>`;
  }else if(tab==='lucide'){
    pane=`<div class="marker-pane"><div class="marker-grid">${lucideNames.map(n=>`<button data-lucide-marker="${esc(n)}" aria-label="${esc(n)}">${lucideMarkerSvg(n)}</button>`).join('')}</div></div>`;
  }else if(tab==='iconoir'){
    pane=`<div class="marker-pane"><input id="iconoirNameInput" placeholder="Nome do ícone, ex.: home-simple" value="${marker?.type==='iconoir'?esc(marker.value):''}"></div>
      <div class="marker-editor-actions"><button class="primary" id="importIconoirMarker">Importar ícone do Iconoir</button></div>`;
  }else{
    pane=`<div class="marker-pane"><textarea id="markerSvgInput" placeholder="Cole o código SVG completo"></textarea></div>
      <div class="marker-editor-actions"><button class="primary" id="applySvgMarker">Usar SVG</button></div>`;
  }
  return `<div class="modal-wrap"><section class="sheet marker-editor-sheet"><div class="sheet-head"><h2>Marcador visual</h2><button class="chip" id="closeModal">Fechar</button></div>
    ${preview}
    <div class="marker-tabs">${[['emoji','Emoji'],['lucide','Lucide'],['iconoir','Iconoir'],['svg','SVG']].map(([id,label])=>`<button data-marker-tab="${id}" class="${tab===id?'selected':''}">${label}</button>`).join('')}</div>
    ${pane}
    <div class="marker-editor-actions"><button class="danger" id="clearTimerMarker">Remover marcador</button></div>
  </section></div>`;
}

/* ---------- RENDER: CRONÔMETROS ---------- */
function renderTimers(){
  const s=data.current, models=activeModels();
  if(!models.length){ return shell(`<header class="topbar simple"><h1>Cronômetro</h1></header><main class="content"><div class="empty">Nenhum modelo criado.<br><br><button class="ios-button" id="createFirst">Criar modelo</button></div></main>`); }
  if(!s)return '';
  const model=modelById(s.modelId);
  const timerMode=currentTimerMode();
  const central=timerMode.layout==='central';
  const cards=s.timers.sort((a,b)=>a.order-b.order).map(rt=>`<button class="timer-card ${central?'central':''} ${timerStateClass(s,rt)}" data-timer="${rt.id}" aria-label="${esc(rt.name)}, ${fmtDuration(timerDuration(rt))}">
      ${timerStateIcon(s,rt)}
      <span class="timer-name-wrap">${visualMarkerMarkup(rt.marker)}<span class="name ${timerNameFit(rt.name)}">${esc(rt.name)}${rt.isAdhoc?'<span class="badge">Etapa avulsa</span>':''}</span></span>
      <span class="time">${fmtDuration(timerDuration(rt))}</span>
    </button>`).join('');
  const running=s.timers.some(isTimerActive);
  const blink=running&&data.settings.blinkTotalColon;
  const totalText=fmtDuration(sessionTotal(s));
  const widthClass=totalText.length>=9?'total-xlong':totalText.length>=7?'total-hours':'';
  const titlePopover=ui.popover?.type==='title'?`<div class="popover-backdrop" id="closePopover"></div><div class="title-popover floating-window"><button id="titleRename">Renomear</button><button id="titleEditModel">Editar modelo</button><button id="titleDiscard" class="danger">Descartar</button></div>`:'';
  const modelsDrawer=ui.timerView==='models'?renderModelsDrawer():'';
  return shell(`<header class="topbar timer-topbar"><div class="header-row"><button class="circle-button" id="modelsBack" aria-label="Modelos">${svgIcon('back')}</button><button class="current-title ${s.manualTitle?'':'untitled'}" id="currentTitleButton">${esc(currentTitle())}</button><button class="circle-button" id="sessionMenu" aria-label="Detalhes">${svgIcon('more')}</button>${titlePopover}</div><div class="current-model-name">${esc(model?.name||s.modelNameSnapshot)}</div>${s.customized?'<div class="status-line">Personalizado neste registro</div>':''}</header>
  <main class="content timer-content"><div class="timer-list">${cards}<button class="add-card" id="addAdhoc">${svgIcon('plus')}<span>Adicionar cronômetro</span></button></div></main>
  <div class="floating-actions timer-actions ${widthClass}"><section class="total-card floating-card ${running?'running':''}"><span class="total-icon">${svgIcon('clock')}</span><span class="total-copy"><small>Tempo total</small><strong class="total-time">${fmtDurationWithBlinkingColons(sessionTotal(s),blink)}</strong></span></section><button class="save-btn" id="saveBtn">${svgIcon('check')}<span>Salvar</span></button></div>${modelsDrawer}`);
}

/* ---------- RENDER: HISTÓRICO ---------- */
function renderHistory(){
  const areas=getAreas();
  const sessions=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt).sort((a,b)=>(b.restoredAt||b.savedAt)-(a.restoredAt||a.savedAt));
  const filtered=sessions.filter(s=>{
    const q=ui.historyQuery.trim().toLocaleLowerCase();
    if(q&&!String(s.title||'').toLocaleLowerCase().includes(q))return false;
    if(ui.historyArea!=='all'&&sessionAreaId(s)!==ui.historyArea)return false;
    if(ui.historyModel!=='all'&&s.modelId!==ui.historyModel)return false;
    if(ui.historyDate&&dayKey(s.restoredAt||s.savedAt)!==ui.historyDate)return false;
    return true;
  });
  const groups={};filtered.forEach(s=>{const k=dayKey(s.restoredAt||s.savedAt);(groups[k]??=[]).push(s);});
  const list=Object.entries(groups).map(([k,arr])=>`<div class="history-day">${fmtDate(new Date(k+'T12:00:00').getTime())}</div>${arr.map(s=>{
    const area=areaById(sessionAreaId(s));
    return `<button class="history-card" data-session="${s.id}"><div class="top"><strong>${esc(s.title)}</strong>${s.isNoMeasurement?'':`<span class="history-total">${svgIcon('timers')}<span>${fmtDuration(sessionTotal(s,s.savedAt))}</span></span>`}</div><div class="history-meta">${esc(area.name)} • ${esc(s.modelNameSnapshot||modelById(s.modelId)?.name||'Modelo')}</div>${s.isNoMeasurement?'<span class="badge">Sem medição</span>':''}${s.restoredAt?'<span class="badge">Restaurado</span>':''}</button>`;
  }).join('')}`).join('');
  const modelOptions=activeModels().filter(m=>ui.historyArea==='all'||modelAreaId(m)===ui.historyArea);
  return shell(`<header class="topbar simple section-tab-header history-header"><span></span><h1>Registros</h1><button class="header-pill" id="historyTrash">Apagados</button></header><main class="content history-content"><div class="filters history-filters">
    <input id="historySearch" placeholder="Buscar título" value="${esc(ui.historyQuery)}">
    <select id="historyArea"><option value="all">Todas as áreas</option>${areas.map(a=>`<option value="${esc(a.id)}" ${ui.historyArea===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>
    <select id="historyModel"><option value="all">Todos os modelos</option>${modelOptions.map(m=>`<option value="${m.id}" ${ui.historyModel===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>
    <div class="date-filter"><input id="historyDate" type="date" value="${esc(ui.historyDate)}">${ui.historyDate?`<button id="historyDateClear" aria-label="Limpar data">${svgIcon('close')}</button>`:''}</div>
  </div>${list||'<div class="empty">Nenhum registro encontrado.</div>'}</main>`);
}

/* ---------- RENDER: ESTATÍSTICAS ---------- */
function renderStats(){
  const areas=getAreas();
  const ss=validMeasuredSessions().filter(s=>ui.statsArea==='all'||sessionAreaId(s)===ui.statsArea);
  const count=ss.length,total=ss.reduce((a,s)=>a+sessionTotal(s,s.savedAt),0),avg=count?total/count:0;
  const byTimer=new Map();
  ss.forEach(s=>s.timers.forEach(t=>{
    const d=timerDuration(t,s.savedAt);if(d<=0)return;
    const key=t.templateId||`adhoc:${t.name}`;
    const x=byTimer.get(key)||{name:t.name,vals:[],total:0};
    x.vals.push(d);x.total+=d;byTimer.set(key,x);
  }));
  const timers=[...byTimer.values()].sort((a,b)=>b.total-a.total);
  const maxTotal=Math.max(1,...timers.map(x=>x.total));
  let trend='Sem dados suficientes';
  if(ss.length>=2){
    const ordered=[...ss].sort((a,b)=>a.originalRecordedAt-b.originalRecordedAt);
    const half=Math.max(1,Math.floor(ordered.length/2));
    const a=ordered.slice(0,half).reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/half;
    const bArr=ordered.slice(-half);
    const b=bArr.reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/bArr.length;
    const pct=a?((b-a)/a*100):0;
    trend=pct<0?`${Math.abs(pct).toFixed(1).replace('.',',')}% mais rápido`:`${pct.toFixed(1).replace('.',',')}% mais lento`;
  }
  const timerRows=kind=>timers.map(x=>{
    let value;
    if(kind==='avg')value=x.total/x.vals.length;
    if(kind==='best')value=Math.min(...x.vals);
    if(kind==='worst')value=Math.max(...x.vals);
    return `<div class="row"><span>${esc(x.name)}</span><strong>${fmtDuration(value)}</strong></div>`;
  }).join('')||'<div class="muted">Sem dados.</div>';
  const percentRows=timers.map(x=>`<div><div class="row"><span>${esc(x.name)}</span><strong>${total?(x.total/total*100).toFixed(1).replace('.',','):0}%</strong></div><div class="bar"><span style="width:${Math.min(100,x.total/maxTotal*100)}%"></span></div></div>`).join('')||'<div class="muted">Sem dados.</div>';
  return shell(`<header class="topbar section-tab-header"><h1>Estatísticas</h1></header>
  <div class="stats-area-filter"><select id="statsArea"><option value="all">Todas as áreas</option>${areas.map(a=>`<option value="${esc(a.id)}" ${ui.statsArea===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
  <main class="content"><h2 class="section-title">Visão geral</h2>${count?`<div class="stats-grid">
    <section class="panel"><h3>Resumo</h3><div class="row"><span>Registros medidos</span><strong>${count}</strong></div><div class="row"><span>Tempo acumulado</span><strong>${fmtDuration(total)}</strong></div><div class="row"><span>Média por registro</span><strong>${fmtDuration(avg)}</strong></div></section>
    <section class="panel"><h3>Tempo total por registro</h3>${[...ss].sort((a,b)=>b.originalRecordedAt-a.originalRecordedAt).slice(0,12).map(s=>`<div class="row"><span>${esc(s.title)}</span><strong>${fmtDuration(sessionTotal(s,s.savedAt))}</strong></div>`).join('')}</section>
    <section class="panel"><h3>Tempo de cada cronômetro</h3>${timers.map(x=>`<div><div class="row"><span>${esc(x.name)}</span><strong>${fmtDuration(x.total)}</strong></div><div class="bar"><span style="width:${x.total/maxTotal*100}%"></span></div></div>`).join('')}</section>
    <section class="panel"><h3>Média por cronômetro</h3>${timerRows('avg')}</section>
    <section class="panel"><h3>Melhor tempo</h3>${timerRows('best')}</section>
    <section class="panel"><h3>Pior tempo</h3>${timerRows('worst')}</section>
    <section class="panel"><h3>Percentual no tempo total</h3>${percentRows}</section>
    <section class="panel"><h3>Evolução / tendência</h3><div class="stat-big">${esc(trend)}</div><p class="muted small">Comparação da média da primeira metade dos registros com a metade mais recente.</p></section>
  </div>`:`<div class="empty">As estatísticas aparecerão depois que você salvar registros com medição nesta área.</div>`}</main>`);
}
;

/* ---------- RENDER: MODELOS AGRUPADOS POR ÁREA ---------- */
function renderModelsDrawer(){
  const all=activeModels(),areas=getAreas();
  const groups=areas.map(a=>({area:a,models:all.filter(m=>modelAreaId(m)===a.id)})).filter(g=>g.models.length);
  const list=groups.map(g=>`<div class="models-area-group"><div class="models-area-title">${esc(g.area.name)}</div><div class="models-list">${g.models.map(m=>{
    const i=all.findIndex(x=>x.id===m.id);
    return `<div class="model-list-item"><button class="model-main" data-choose-model="${m.id}"><strong>${esc(m.name)}</strong><span>${m.timers.filter(t=>!t.removedAt).length} cronômetro(s)</span></button>${ui.modelsEditing?`<div class="model-reorder"><button data-move-model="${m.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button data-move-model="${m.id}" data-dir="1" ${i===all.length-1?'disabled':''}>↓</button></div>`:`<button class="circle-button small-circle" data-model-options="${m.id}" aria-label="Opções de ${esc(m.name)}">${svgIcon('more')}</button>`}${ui.popover?.type==='modelOptions'&&ui.popover.id===m.id?`<div class="popover-backdrop" id="closePopover"></div><div class="model-popover floating-window"><button data-model-rename="${m.id}">Renomear</button><button data-model-edit="${m.id}">Editar</button><button data-model-dup="${m.id}">Duplicar</button><button data-model-delete="${m.id}" class="danger">Apagar</button></div>`:''}</div>`;
  }).join('')}</div></div>`).join('');
  return `<div class="models-drawer-overlay" id="modelsDrawerBackdrop"><aside class="models-drawer" role="dialog" aria-modal="true" aria-label="Modelos">
    <header class="topbar simple models-header models-drawer-header"><button class="text-button models-edit-button" id="toggleModelsEdit">${ui.modelsEditing?'Concluir':'Editar'}</button><h1>Modelos</h1><button class="circle-button models-close-button" id="closeModelsDrawer" aria-label="Fechar modelos">${svgIcon('close')}</button></header>
    <main class="content models-page"><button class="create-model-card" id="createModel">${svgIcon('plus')}<span>Criar novo modelo</span></button>${list||'<div class="empty">Nenhum modelo.</div>'}</main>
  </aside></div>`;
}

function renderEditModel(m){
  const ts=m.timers.filter(t=>!t.removedAt).sort((a,b)=>a.order-b.order),areas=getAreas();
  return `<div class="modal-wrap"><section class="sheet"><div class="sheet-head"><h2>${esc(m.name)}</h2><button class="chip" id="closeToModels">Concluir</button></div>
    <div class="model-area-row"><span>Área</span><select id="modelAreaSelect">${areas.map(a=>`<option value="${esc(a.id)}" ${modelAreaId(m)===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div>
    <div class="toolbar"><button id="renameModel">Renomear modelo</button><button id="addTemplate">＋ Cronômetro</button></div>
    ${ts.length?ts.map((t,i)=>`<div class="panel"><div class="row"><span class="model-timer-heading">${visualMarkerMarkup(t.marker)}<strong>${esc(t.name)}</strong></span><span class="toolbar"><button data-move-template="${t.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button data-move-template="${t.id}" data-dir="1" ${i===ts.length-1?'disabled':''}>↓</button></span></div><div class="toolbar"><button data-edit-template="${t.id}">Editar nome</button><button data-model-marker="${t.id}">Marcador</button><button data-remove-template="${t.id}" class="danger">Remover</button></div></div>`).join(''):'<div class="empty">Este modelo está vazio. Você pode mantê-lo assim ou adicionar cronômetros.</div>'}
  </section></div>`;
}

/* ---------- DETALHES DA TELA INICIAL ---------- */
function renderSessionMenu(){
  const s=data.current;
  return `<div class="modal-wrap"><section class="sheet details-sheet" role="dialog" aria-modal="true">
    <div class="sheet-head liquid-head"><button class="circle-button glass detail-close-button" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><h2>Detalhes</h2><span class="sheet-spacer"></span></div>
    <div class="sheet-body">
      <section class="sheet-card notes-detail-card"><textarea id="currentNote" class="notes-box" rows="5" placeholder="Notas">${esc(s.note)}</textarea></section>
      <h3 class="detail-section-label">Tamanho dos cronômetros</h3>
      <section class="sheet-card timer-size-detail-card"><div class="detail-size-options animation-speed-options" role="group" aria-label="Tamanho dos cronômetros">
        <button data-timer-size="small" class="${data.settings.timerSize==='small'?'selected':''}">Pequeno</button>
        <button data-timer-size="medium" class="${data.settings.timerSize==='medium'?'selected':''}">Médio</button>
        <button data-timer-size="large" class="${data.settings.timerSize==='large'?'selected':''}">Grande</button>
      </div></section>
      <section class="sheet-card detail-action-card"><button class="detail-action" id="menuCustomize">Reordenar cronômetros</button></section>
      <section class="sheet-card detail-action-card"><button class="detail-action" id="saveAsNewModel">Salvar como novo modelo</button></section>
    </div>
  </section></div>`;
}
function renderOrganize(){
  const s=data.current;
  return `<div class="modal-wrap"><section class="sheet"><div class="sheet-head"><h2>Reordenar cronômetros</h2><button class="chip" id="closeModal">Concluir</button></div>${s.timers.sort((a,b)=>a.order-b.order).map((t,i)=>`<div class="panel"><div class="row"><span class="model-timer-heading">${visualMarkerMarkup(t.marker)}<strong>${esc(t.name)}</strong></span><span class="toolbar"><button data-move-current="${t.id}" data-dir="-1" ${i===0?'disabled':''}>↑</button><button data-move-current="${t.id}" data-dir="1" ${i===s.timers.length-1?'disabled':''}>↓</button></span></div><div class="toolbar"><button data-rename-current="${t.id}">Renomear</button><button data-current-marker="${t.id}">Marcador</button><button data-remove-current="${t.id}" class="danger">Remover</button></div></div>`).join('')}</section></div>`;
}

/* ---------- DETALHE DE REGISTRO SALVO ---------- */
function renderSessionDetail(s){
  const model=modelById(s.modelId);
  const timers=s.isNoMeasurement?[]:s.timers.filter(t=>timerDuration(t,s.savedAt)>0).sort((a,b)=>a.order-b.order);
  return `<div class="modal-wrap record-detail-wrap"><section class="sheet record-detail-sheet"><div class="sheet-head record-detail-head"><button class="circle-button glass record-detail-close" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><button class="record-title-button" data-edit-session-title="${s.id}"><span>${esc(s.title)}</span>${svgIcon('pencil')}</button><button class="record-detail-check" id="closeRecordDetail" aria-label="Concluir">${svgIcon('check')}</button></div><div class="record-detail-body">
    <div class="record-actions">${!model?`<button data-rebuild-model="${s.id}">Criar modelo deste registro</button>`:''}<button data-delete-session="${s.id}" class="danger">Excluir</button></div>
    <section class="panel record-summary"><div class="row"><span>Área</span><strong>${esc(areaById(sessionAreaId(s)).name)}</strong></div><div class="row"><span>Modelo de origem</span><strong>${esc(model ? (model.deletedAt ? 'Modelo excluído' : model.name) : 'Modelo excluído')}</strong></div>${s.isNoMeasurement?'<div class="row"><span class="badge">Sem medição</span></div>':`<div class="row"><span>Tempo total</span><strong class="detail-time-with-icon">${svgIcon('timers')}<span>${fmtDuration(sessionTotal(s,s.savedAt))}</span></strong></div><div class="row"><span>Tempo decorrido</span><strong>${fmtDuration(sessionElapsedNet(s,s.savedAt))}</strong></div><div class="row"><span>Pausas</span><strong>${fmtDuration(pauseTotal(s,s.savedAt))}</strong></div>`}<div class="row"><span>Registrado originalmente em</span><span>${fmtDateTime(s.originalRecordedAt)}</span></div>${s.restoredAt?`<div class="row"><span>Restaurado em</span><span>${fmtDateTime(s.restoredAt)}</span></div>`:''}</section>
    <div class="record-timers-list">${timers.map(t=>`<details class="record-timer-card"><summary><span class="record-timer-title">${visualMarkerMarkup(t.marker,'record-inline-marker')}${esc(t.name)}${t.isAdhoc?'<span class="badge">Etapa avulsa</span>':''}${t.isRemoved?'<span class="badge">Removido</span>':''}</span><span class="record-timer-time">${svgIcon('timers')}<strong>${fmtDuration(timerDuration(t,s.savedAt))}</strong></span></summary><div class="record-timer-extra"><div class="muted small record-interval-label">Horários e intervalos</div>${t.intervals.map(i=>`<div class="row small"><span>${fmtDateTime(i.startedAt)}</span><span>${i.endedAt?fmtDateTime(i.endedAt):'aberto'}</span></div>`).join('')}<button class="action" data-correct-time="${s.id}" data-timer-id="${t.id}">Corrigir tempo</button></div></details>`).join('')}</div>
    <section class="panel"><label for="detailNote"><strong>Nota</strong></label><textarea id="detailNote" rows="4" data-note-session="${s.id}" placeholder="Notas">${esc(s.note)}</textarea><div id="noteStatus" class="muted small"></div></section>
  </div></section></div>`;
}

/* ---------- FUNÇÕES DE TEXTO SEM prompt() NATIVO ---------- */
async function addAdhoc(){
  const s=data.current;if(!s)return;
  const raw=await iosTextPrompt({title:'Novo cronômetro',message:'Dê um nome ao cronômetro avulso.',placeholder:'Nome do cronômetro'});
  const name=String(raw??'').trim();if(!name)return;
  if(s.timers.some(t=>t.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Já existe um cronômetro com esse nome neste registro.');return;}
  s.timers.push({id:uid(),templateId:null,name,order:s.timers.length,isAdhoc:true,isRemoved:false,intervals:[],correctedDurationMs:null,marker:null});
  s.customized=true;await persistCurrent();render();
}
async function renameCurrentTimer(id){
  const s=data.current,rt=s?.timers.find(t=>t.id===id);if(!rt)return;
  const raw=await iosTextPrompt({title:'Renomear cronômetro',value:rt.name,placeholder:'Nome'});
  const n=String(raw??'').trim();if(!n)return;
  rt.name=n;s.customized=true;await persistCurrent();render();
}
async function createModel(){
  const raw=await iosTextPrompt({title:'Novo modelo',message:'Escolha um nome para o novo modelo.',placeholder:'Nome do modelo'});
  const name=String(raw??'').trim();if(!name)return;
  if(activeModels().some(m=>m.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Já existe um modelo com esse nome.');return;}
  const t=now(),m={id:uid(),name,areaId:'general',createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:[]};
  data.models.push(m);await put('models',m);ui.modal={type:'editModel',id:m.id};render();
}
async function renameModel(m){
  const raw=await iosTextPrompt({title:'Renomear modelo',value:m.name,placeholder:'Nome do modelo'});
  const n=String(raw??'').trim();if(!n)return;
  if(activeModels().some(x=>x.id!==m.id&&x.name.toLocaleLowerCase()===n.toLocaleLowerCase())){alert('Já existe um modelo com esse nome.');return;}
  m.name=n;m.updatedAt=now();await put('models',m);
  if(data.current?.modelId===m.id){data.current.modelNameSnapshot=n;await persistCurrent();}
  render();
}
async function addTemplate(m){
  const raw=await iosTextPrompt({title:'Novo cronômetro',message:`Adicionar ao modelo “${m.name}”.`,placeholder:'Nome do cronômetro'});
  const name=String(raw??'').trim();if(!name)return;
  if(m.timers.some(t=>!t.removedAt&&t.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Neste modelo, os cronômetros precisam ter nomes diferentes.');return;}
  m.timers.push({id:uid(),name,order:m.timers.filter(t=>!t.removedAt).length,createdAt:now(),removedAt:null,marker:null});
  m.updatedAt=now();await put('models',m);render();
}
async function editTemplate(m,tid){
  const t=m.timers.find(x=>x.id===tid);if(!t)return;
  const raw=await iosTextPrompt({title:'Renomear cronômetro',value:t.name,placeholder:'Nome'});
  const n=String(raw??'').trim();if(!n)return;
  if(m.timers.some(x=>x.id!==tid&&!x.removedAt&&x.name.toLocaleLowerCase()===n.toLocaleLowerCase())){alert('Neste modelo, os cronômetros precisam ter nomes diferentes.');return;}
  t.name=n;m.updatedAt=now();await put('models',m);
  if(data.current?.modelId===m.id){
    const rt=data.current.timers.find(x=>x.templateId===tid);
    if(rt){rt.name=n;await persistCurrent();}
  }
  render();
}
async function duplicateModel(m){
  let n=2,name=`${m.name} (${n})`;const names=new Set(activeModels().map(x=>x.name));
  while(names.has(name)){n++;name=`${m.name} (${n})`;}
  const t=now();
  const c={id:uid(),name,areaId:modelAreaId(m),createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:m.timers.filter(x=>!x.removedAt).sort((a,b)=>a.order-b.order).map((x,i)=>({id:uid(),name:x.name,order:i,createdAt:t,removedAt:null,marker:clone(x.marker||null)}))};
  data.models.push(c);await put('models',c);toast('Modelo duplicado');render();
}
async function rebuildModelFromSession(s){
  if(modelById(s.modelId)){alert('Esta ação só fica disponível depois que o modelo de origem é excluído definitivamente.');return;}
  const raw=await iosTextPrompt({title:'Criar modelo deste registro',value:s.modelNameSnapshot||'Novo modelo',placeholder:'Nome do modelo'});
  const base=String(raw??'').trim();if(!base)return;
  let name=base,n=2;const names=new Set(activeModels().map(m=>m.name));while(names.has(name)){name=`${base} (${n++})`;}
  const chosen=[];
  for(const rt of s.timers.sort((a,b)=>a.order-b.order)){if(confirm(`Incluir “${rt.name}” no novo modelo?`))chosen.push(rt);}
  const t=now(),m={id:uid(),name,areaId:sessionAreaId(s),createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:chosen.map((rt,i)=>({id:uid(),name:rt.name,order:i,createdAt:t,removedAt:null,marker:clone(rt.marker||null)}))};
  data.models.push(m);await put('models',m);toast('Novo modelo criado');ui.modal={type:'editModel',id:m.id};render();
}
async function correctTimer(s,rt){
  const current=timerDuration(rt);
  const raw=await iosTextPrompt({title:'Corrigir tempo',message:`Novo tempo efetivo de “${rt.name}” em minutos.`,value:(current/60000).toFixed(1).replace('.',','),inputMode:'decimal',confirmText:'Aplicar'});
  if(raw==null)return;
  const mins=Number(String(raw).replace(',','.'));
  if(!Number.isFinite(mins)||mins<0){alert('Digite um número válido.');return;}
  if(!confirm('Aplicar esta correção de tempo?'))return;
  rt.correctedDurationMs=Math.round(mins*60000);await put('sessions',s);toast('Tempo corrigido');render();
}
async function editSessionTitle(s){
  const raw=await iosTextPrompt({title:'Editar título',value:s.title,placeholder:'Título do registro'});
  const n=String(raw??'').trim();if(!n)return;
  s.title=n;s.manualTitle=true;await put('sessions',s);render();
}
async function saveCurrentLayoutAsNewModel(){
  const s=data.current;if(!s)return;
  const raw=await iosTextPrompt({title:'Salvar como novo modelo',message:'A configuração atual dos cronômetros será copiada sem alterar este registro.',placeholder:'Nome do novo modelo'});
  const base=String(raw??'').trim();if(!base)return;
  if(activeModels().some(m=>m.name.toLocaleLowerCase()===base.toLocaleLowerCase())){alert('Já existe um modelo com esse nome.');return;}
  const t=now();
  const model={id:uid(),name:base,areaId:s.areaId||modelAreaId(modelById(s.modelId)),createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),
    timers:s.timers.filter(t=>!t.removedAt&&!t.isRemoved).sort((a,b)=>(a.order??0)-(b.order??0)).map((rt,i)=>({id:uid(),name:rt.name||`Cronômetro ${i+1}`,order:i,createdAt:t,removedAt:null,marker:clone(rt.marker||null)}))
  };
  data.models.push(model);await put('models',model);toast('Novo modelo salvo');render();
}
async function setActiveIconFromSvgCode(){
  const raw=await iosTextPrompt({title:'Código SVG',message:'Cole o código SVG completo.',placeholder:'<svg ...>...</svg>',confirmText:'Usar SVG',multiline:true});
  const code=String(raw??'').trim();if(!code)return;
  if(!/^<svg[\s>]/i.test(code)){alert('O código precisa começar com uma tag <svg>.');return;}
  data.settings.activeTimerIconData=svgTextToDataUrl(sanitizeSvg(code));
  data.settings.activeTimerIconSource='svg';data.settings.activeTimerIconName='SVG colado';
  await persistSettings();render();
}
async function setActiveIconFromUrl(){
  const raw=await iosTextPrompt({title:'Link do SVG',message:'Cole um link direto para um arquivo SVG.',placeholder:'https://…/icone.svg',confirmText:'Importar'});
  const text=String(raw??'').trim();if(!text)return;
  let url;try{url=new URL(text,location.href);if(!/^https?:$/.test(url.protocol))throw new Error();}catch(_){alert('Digite um link http ou https válido.');return;}
  try{
    const response=await fetch(url.href,{mode:'cors',cache:'no-store'});
    if(!response.ok)throw new Error('HTTP '+response.status);
    const svg=sanitizeSvg(await response.text());
    if(!/<svg[\s>]/i.test(svg))throw new Error('O link não retornou um SVG');
    data.settings.activeTimerIconData=svgTextToDataUrl(svg);data.settings.activeTimerIconSource='svg';data.settings.activeTimerIconName='SVG por link';
    toast('SVG importado e salvo no aparelho');
  }catch(_){
    data.settings.activeTimerIconData=url.href;data.settings.activeTimerIconSource='remoteSvg';data.settings.activeTimerIconName='SVG por link';
    toast('Link salvo; este ícone pode precisar de internet');
  }
  await persistSettings();render();
}

/* ---------- SALVAR REGISTRO ---------- */
async function saveSession(){
  const s=data.current;if(!s)return false;const t=now();
  if(s.globalPaused){s.globalPaused=false;s.pausedActiveTimerIds=[];}
  s.timers.forEach(rt=>{const oi=openInterval(rt);if(oi)oi.endedAt=t;});
  endPause(s,t);
  const measured=sessionTotal(s,t)>0;
  if(!measured){
    let note=s.note.trim();
    if(!note){
      const raw=await iosTextPrompt({title:'Registro sem medição',message:'Escreva uma nota explicando este registro antes de salvar.',placeholder:'Nota',confirmText:'Salvar',multiline:true});
      note=String(raw??'').trim();
    }
    if(!note){alert('A nota é obrigatória para salvar sem medição.');return false;}
    s.note=note;s.isNoMeasurement=true;
  }
  if(!s.manualTitle)s.title=`(sem título) ${fmtDateTime(s.firstTimerStartedAt??s.openedAt)}`;
  s.areaId=s.areaId||modelAreaId(modelById(s.modelId));
  s.savedAt=t;s.originalRecordedAt=s.firstTimerStartedAt??s.openedAt;s.status='saved';

  const adhoc=s.timers.filter(x=>x.isAdhoc);
  const model=modelById(s.modelId);
  if(adhoc.length&&model){
    for(const rt of adhoc){
      if(confirm(`Incorporar “${rt.name}” ao modelo “${model.name}” para os próximos registros?`)){
        const templ={id:uid(),name:rt.name,order:model.timers.filter(x=>!x.removedAt).length,createdAt:t,removedAt:null,marker:clone(rt.marker||null)};
        model.timers.push(templ);model.updatedAt=t;rt.templateId=templ.id;rt.isAdhoc=false;await put('models',model);
      }
    }
  }
  await put('sessions',clone(s));data.sessions.unshift(clone(s));
  const sameModel=modelById(s.modelId);data.current=sameModel?newSession(sameModel):null;await putState('current',data.current);
  stopTimerLoopAudio();haptic('save');render();showSavedConfirmation();return true;
}
;

/* ---------- ÁREAS: AÇÕES ---------- */
async function addArea(){
  const raw=await iosTextPrompt({title:'Nova área',message:'Exemplos: Unhas, Casa, Estudos.',placeholder:'Nome da área'});
  const name=String(raw??'').trim();if(!name)return;
  if(getAreas().some(a=>a.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Já existe uma área com esse nome.');return;}
  data.settings.areas=[...getAreas(),{id:`area-${uid()}`,name}];
  await persistSettings();render();
}
async function renameArea(id){
  const area=areaById(id);
  const raw=await iosTextPrompt({title:'Renomear área',value:area.name,placeholder:'Nome'});
  const name=String(raw??'').trim();if(!name)return;
  if(getAreas().some(a=>a.id!==id&&a.name.toLocaleLowerCase()===name.toLocaleLowerCase())){alert('Já existe uma área com esse nome.');return;}
  data.settings.areas=getAreas().map(a=>a.id===id?{...a,name}:a);
  await persistSettings();render();
}
async function deleteArea(id){
  if(id==='general')return;
  const area=areaById(id);
  if(!confirm(`Apagar a área “${area.name}”? Modelos e registros dessa área serão movidos para Geral.`))return;
  data.settings.areas=getAreas().filter(a=>a.id!==id);
  for(const m of data.models){if(m.areaId===id){m.areaId='general';await put('models',m);}}
  for(const s of data.sessions){if(s.areaId===id){s.areaId='general';await put('sessions',s);}}
  if(data.current?.areaId===id){data.current.areaId='general';await persistCurrent();}
  if(ui.historyArea===id)ui.historyArea='all';
  if(ui.statsArea===id)ui.statsArea='all';
  await persistSettings();render();
}

/* ---------- CSV COM ÁREA ---------- */
async function exportCSV(){
  const rows=[['sessionId','area','originalRecordedAt','savedAt','restoredAt','title','modelId','model','recordedTimerId','templateId','cronometro','tipo','duracaoMs','tempoTotalMs','tempoDecorridoMs','pausasMs','nota']];
  data.sessions.filter(s=>s.status==='saved').forEach(s=>s.timers.forEach(t=>rows.push([
    s.id,areaById(sessionAreaId(s)).name,new Date(s.originalRecordedAt).toISOString(),new Date(s.savedAt).toISOString(),
    s.restoredAt?new Date(s.restoredAt).toISOString():'',s.title,s.modelId,s.modelNameSnapshot,t.id,t.templateId||'',t.name,
    t.isAdhoc?'avulso':t.isRemoved?'removido':'modelo',timerDuration(t,s.savedAt),sessionTotal(s,s.savedAt),
    sessionElapsedNet(s,s.savedAt),pauseTotal(s,s.savedAt),s.note
  ])));
  await shareFile(`cronometro-${dayKey(now())}.csv`,'text/csv;charset=utf-8','\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\n'));
}

/* ---------- EVENTOS NOVOS/OVERRIDES ---------- */
function bindV080Events(){
  const byId=id=>document.getElementById(id);

  if(ui.modal?.type==='timerMarker'){
    const returnFromMarker=()=>{
      const m=ui.modal;
      ui.modal=m.scope==='model'?{type:'editModel',id:m.modelId}:{type:'organize'};
      render();
    };
    if(byId('closeModal'))byId('closeModal').onclick=returnFromMarker;
    document.querySelectorAll('.modal-wrap').forEach(w=>w.onclick=e=>{if(e.target===w)returnFromMarker();});
  }

  if(byId('historyArea'))byId('historyArea').onchange=e=>{
    ui.historyArea=e.target.value;ui.historyModel='all';render();
  };
  if(byId('statsArea'))byId('statsArea').onchange=e=>{ui.statsArea=e.target.value;render();};

  if(byId('addArea'))byId('addArea').onclick=addArea;
  document.querySelectorAll('[data-rename-area]').forEach(b=>b.onclick=()=>renameArea(b.dataset.renameArea));
  document.querySelectorAll('[data-delete-area]').forEach(b=>b.onclick=()=>deleteArea(b.dataset.deleteArea));

  if(byId('modelAreaSelect'))byId('modelAreaSelect').onchange=async e=>{
    const m=modelById(ui.modal?.id);if(!m)return;
    m.areaId=e.target.value;m.updatedAt=now();await put('models',m);
    if(data.current?.modelId===m.id){data.current.areaId=m.areaId;await persistCurrent();}
    render();
  };

  document.querySelectorAll('[data-model-marker]').forEach(b=>b.onclick=()=>{
    ui.modal={type:'timerMarker',scope:'model',modelId:ui.modal?.id,timerId:b.dataset.modelMarker,markerTab:'emoji'};render();
  });
  document.querySelectorAll('[data-current-marker]').forEach(b=>b.onclick=()=>{
    ui.modal={type:'timerMarker',scope:'current',timerId:b.dataset.currentMarker,markerTab:'emoji'};render();
  });
  document.querySelectorAll('[data-marker-tab]').forEach(b=>b.onclick=()=>{
    if(ui.modal?.type!=='timerMarker')return;ui.modal.markerTab=b.dataset.markerTab;render();
  });
  if(byId('applyEmojiMarker'))byId('applyEmojiMarker').onclick=async()=>{
    const value=String(byId('markerEmojiInput')?.value||'').trim();
    if(!value)return;await saveMarkerToTarget({type:'emoji',value});
  };
  document.querySelectorAll('[data-lucide-marker]').forEach(b=>b.onclick=()=>saveMarkerToTarget({type:'lucide',value:b.dataset.lucideMarker}));
  if(byId('importIconoirMarker'))byId('importIconoirMarker').onclick=()=>importIconoirMarker(byId('iconoirNameInput')?.value||'');
  if(byId('applySvgMarker'))byId('applySvgMarker').onclick=async()=>{
    const svg=sanitizeSvg(byId('markerSvgInput')?.value||'');
    if(!/^<svg[\s>]/i.test(svg)){alert('Cole um SVG válido.');return;}
    await saveMarkerToTarget({type:'svg',value:'SVG personalizado',data:svgTextToDataUrl(svg)});
  };
  if(byId('clearTimerMarker'))byId('clearTimerMarker').onclick=()=>saveMarkerToTarget(null);

  if(byId('titleRename'))byId('titleRename').onclick=async()=>{
    const current=data.current;if(!current)return;
    const raw=await iosTextPrompt({title:'Editar título',value:current.manualTitle?current.title:'',placeholder:'Título do registro'});
    const n=String(raw??'').trim();
    if(n){current.title=n;current.manualTitle=true;await persistCurrent();}
    ui.popover=null;render();
  };

  const unsafe=byId('updateCurrentModel');if(unsafe)unsafe.remove();
}

'use strict';

async function init(){
  db=await openDB();
  await seedFactoryDataIfNeeded();

  data.models=await getAll('models');
  data.sessions=await getAll('sessions');
  data.settings={...data.settings,...(await getState('settings')||{}),simultaneous:'single'};
  data.current=await getState('current');
  await migrateV080Data();

  if(localStorage.getItem('cronometro_public_demo_show_version_badge')==='1'&&!data.settings.showVersionBadge){
    data.settings.showVersionBadge=true;
    await persistSettings();
  }

  if(!(UI_CONFIG.themePresets||[]).some(p=>p.id===data.settings.colorTheme)){
    data.settings.colorTheme='original';
    await persistSettings();
  }

  let settingsChanged=false;
  if(!UI_CONFIG.timerModes?.[data.settings.timerSize]){data.settings.timerSize='small';settingsChanged=true;}
  if(!UI_CONFIG.animationSpeeds?.[data.settings.activeTimerAnimationSpeed]){data.settings.activeTimerAnimationSpeed='normal';settingsChanged=true;}
  if(typeof data.settings.animateActiveTimerIcon!=='boolean'){data.settings.animateActiveTimerIcon=true;settingsChanged=true;}
  if(typeof data.settings.blinkTotalColon!=='boolean'){data.settings.blinkTotalColon=true;settingsChanged=true;}
  if(!UI_CONFIG.activeIconSizes?.[data.settings.activeTimerIconSize]){data.settings.activeTimerIconSize='standard';settingsChanged=true;}
  if(!['default','svg','png','remoteSvg'].includes(data.settings.activeTimerIconSource)){data.settings.activeTimerIconSource='default';settingsChanged=true;}
  if(typeof data.settings.activeTimerIconData!=='string'){data.settings.activeTimerIconData='';settingsChanged=true;}
  if(typeof data.settings.activeTimerIconName!=='string'){data.settings.activeTimerIconName='DVD';settingsChanged=true;}
  if(typeof data.settings.timerSoundEnabled!=='boolean'){data.settings.timerSoundEnabled=false;settingsChanged=true;}
  if(typeof data.settings.timerSoundData!=='string'){data.settings.timerSoundData='';settingsChanged=true;}
  if(typeof data.settings.timerSoundName!=='string'){data.settings.timerSoundName='';settingsChanged=true;}
  if(!Number.isFinite(Number(data.settings.timerSoundVolume))){data.settings.timerSoundVolume=.35;settingsChanged=true;}
  data.settings.timerSoundVolume=Math.max(0,Math.min(1,Number(data.settings.timerSoundVolume)));
  if(!data.settings.timerSoundData&&data.settings.timerSoundEnabled){data.settings.timerSoundEnabled=false;settingsChanged=true;}
  if(settingsChanged)await persistSettings();

  let modelOrderChanged=false;
  activeModels().forEach((m,i)=>{
    if(!Number.isFinite(m.sortOrder)){
      m.sortOrder=i;
      modelOrderChanged=true;
    }
  });
  if(modelOrderChanged){
    for(const m of data.models)await put('models',m);
  }

  if(data.current?.globalPaused){
    data.current.globalPaused=false;
    data.current.pausedActiveTimerIds=[];
    await persistCurrent();
  }

  if(data.current?.status!=='active')data.current=null;

  if(!data.current){
    const model=activeModels()[0];
    if(model){
      data.current=newSession(model);
      await persistCurrent();
    }
  }

  await purgeExpired();
  render();
  try{
    if(!sessionStorage.getItem('cronometro_public_demo_notice')){
      sessionStorage.setItem('cronometro_public_demo_notice','1');
      setTimeout(()=>toast('Demonstração: clientes e registros fictícios já estão carregados'),450);
    }
  }catch(_){}

  tickHandle=setInterval(()=>{
    if(ui.tab==='timers'&&ui.timerView==='timers'&&data.current&&data.current.timers.some(isTimerActive))refreshTimerReadouts();
  },1000);

  if('serviceWorker' in navigator){
    try{await navigator.serviceWorker.register('./sw.js');}
    catch(error){console.warn('Service worker não registrado',error);}
  }

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden)render();
  });
}

init().catch(err=>{
  console.error(err);
  $app.innerHTML=`<main class="content"><h1>Erro ao abrir o aplicativo</h1><pre>${esc(err.message)}</pre></main>`;
});
;

'use strict';
if(globalThis.APP_META) globalThis.APP_META.version='0.8.1';
;

'use strict';

/* =========================
   v0.8.1 — overrides
   ========================= */

function trashIconMarkup(){
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 10v7M14 10v7"/></svg>`;
}
function recordDateMs(s){return s?.originalRecordedAt??s?.savedAt??s?.openedAt??now();}
function recordGrossMs(s){return sessionTotal(s,s.savedAt)+pauseTotal(s,s.savedAt);}
function toDateInputValue(ms){const d=new Date(ms);return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function toTimeInputValue(ms){const d=new Date(ms);return `${pad(d.getHours())}:${pad(d.getMinutes())}`;}
function autoGrowTextarea(el){if(!el)return;el.style.height='auto';el.style.height=Math.min(180,Math.max(42,el.scrollHeight))+'px';}

async function editRecordDate(s){
  if(!s)return;
  document.querySelector('.record-date-editor')?.remove();
  const ms=recordDateMs(s);
  const wrap=document.createElement('div');
  wrap.className='record-date-editor';
  wrap.innerHTML=`<section class="record-date-editor-card" role="dialog" aria-modal="true">
    <div class="record-date-editor-copy"><h2>Editar data do registro</h2></div>
    <div class="record-date-fields"><input id="recordDateInput" type="date" value="${toDateInputValue(ms)}"><input id="recordTimeInput" type="time" value="${toTimeInputValue(ms)}"></div>
    <div class="record-date-editor-actions"><button id="cancelRecordDate">Cancelar</button><button id="saveRecordDate">Salvar</button></div>
  </section>`;
  document.body.appendChild(wrap);
  const finish=()=>wrap.remove();
  wrap.querySelector('#cancelRecordDate').onclick=finish;
  wrap.onclick=e=>{if(e.target===wrap)finish();};
  wrap.querySelector('#saveRecordDate').onclick=async()=>{
    const ds=wrap.querySelector('#recordDateInput').value,ts=wrap.querySelector('#recordTimeInput').value||'00:00';
    if(!ds)return;
    const next=new Date(`${ds}T${ts}:00`);
    if(Number.isNaN(next.getTime()))return;
    s.originalRecordedAt=next.getTime();
    await put('sessions',s);
    finish();render();
  };
}

/* Histórico usa a data real/editável do registro para ordenar, agrupar e filtrar. */
function renderHistory(){
  const areas=getAreas();
  const sessions=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt).sort((a,b)=>recordDateMs(b)-recordDateMs(a));
  const filtered=sessions.filter(s=>{
    const q=ui.historyQuery.trim().toLocaleLowerCase();
    if(q&&!String(s.title||'').toLocaleLowerCase().includes(q))return false;
    if(ui.historyArea!=='all'&&sessionAreaId(s)!==ui.historyArea)return false;
    if(ui.historyModel!=='all'&&s.modelId!==ui.historyModel)return false;
    if(ui.historyDate&&dayKey(recordDateMs(s))!==ui.historyDate)return false;
    return true;
  });
  const groups={};filtered.forEach(s=>{const k=dayKey(recordDateMs(s));(groups[k]??=[]).push(s);});
  const list=Object.entries(groups).map(([k,arr])=>`<div class="history-day">${fmtDate(new Date(k+'T12:00:00').getTime())}</div>${arr.map(s=>{
    const area=areaById(sessionAreaId(s));
    return `<button class="history-card" data-session="${s.id}"><div class="top"><strong>${esc(s.title)}</strong>${s.isNoMeasurement?'':`<span class="history-total">${svgIcon('timers')}<span>${fmtDuration(sessionTotal(s,s.savedAt))}</span></span>`}</div><div class="history-meta">${esc(area.name)} • ${esc(s.modelNameSnapshot||modelById(s.modelId)?.name||'Modelo')}</div>${s.isNoMeasurement?'<span class="badge">Sem medição</span>':''}${s.restoredAt?'<span class="badge">Restaurado</span>':''}</button>`;
  }).join('')}`).join('');
  const modelOptions=activeModels().filter(m=>ui.historyArea==='all'||modelAreaId(m)===ui.historyArea);
  return shell(`<header class="topbar simple section-tab-header history-header"><span></span><h1>Registros</h1><button class="header-pill" id="historyTrash">Apagados</button></header><main class="content history-content"><div class="filters history-filters">
    <input id="historySearch" placeholder="Buscar título" value="${esc(ui.historyQuery)}">
    <select id="historyArea"><option value="all">Todas as áreas</option>${areas.map(a=>`<option value="${esc(a.id)}" ${ui.historyArea===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select>
    <select id="historyModel"><option value="all">Todos os modelos</option>${modelOptions.map(m=>`<option value="${m.id}" ${ui.historyModel===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>
    <div class="date-filter"><input id="historyDate" type="date" value="${esc(ui.historyDate)}">${ui.historyDate?`<button id="historyDateClear" aria-label="Limpar data">${svgIcon('close')}</button>`:''}</div>
  </div>${list||'<div class="empty">Nenhum registro encontrado.</div>'}</main>`);
}

function renderSessionDetail(s){
  const model=modelById(s.modelId);
  const timers=[...(s.timers||[])].sort((a,b)=>(a.order??0)-(b.order??0));
  const gross=recordGrossMs(s),working=sessionTotal(s,s.savedAt),pauses=pauseTotal(s,s.savedAt);
  return `<div class="modal-wrap record-detail-wrap"><section class="sheet record-detail-sheet"><div class="sheet-head record-detail-head">
    <button class="circle-button glass record-detail-close" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button>
    <div class="record-detail-title-stack"><button class="record-title-button" data-edit-session-title="${s.id}"><span>${esc(s.title)}</span>${svgIcon('pencil')}</button><button class="record-date-button" data-edit-record-date="${s.id}">${esc(fmtDateTime(recordDateMs(s)))} ${svgIcon('pencil')}</button></div>
    <button class="record-detail-check" id="closeRecordDetail" aria-label="Concluir">${svgIcon('check')}</button>
  </div><div class="record-detail-body">
    <section class="record-note-section"><h3 class="record-section-label">Anotações</h3><div class="record-note-card"><textarea id="detailNote" rows="1" data-note-session="${s.id}" placeholder="">${esc(s.note||'')}</textarea></div><div id="noteStatus" class="record-note-status"></div></section>
    <section class="panel record-summary"><div class="record-context-grid"><div class="record-context-item"><span>Área</span><strong>${esc(areaById(sessionAreaId(s)).name)}</strong></div><div class="record-context-item"><span>Modelo de origem</span><strong>${esc(model ? (model.deletedAt ? 'Modelo excluído' : model.name) : 'Modelo excluído')}</strong></div></div>${s.isNoMeasurement?'<div class="row"><span class="badge">Sem medição</span></div>':`<div class="row"><span>Tempo bruto</span><strong>${fmtDuration(gross)}</strong></div><div class="row"><span>Tempo trabalhando</span><strong class="detail-time-with-icon">${svgIcon('timers')}<span>${fmtDuration(working)}</span></strong></div><div class="row"><span>Pausas</span><strong>${fmtDuration(pauses)}</strong></div>`}${s.restoredAt?`<div class="row"><span>Restaurado em</span><span>${fmtDateTime(s.restoredAt)}</span></div>`:''}</section>
    ${!model?`<div class="record-actions"><button data-rebuild-model="${s.id}">Criar modelo deste registro</button></div>`:''}
    <div class="record-timers-list">${timers.map(t=>{const d=timerDuration(t,s.savedAt),zero=d<=0;return `<details class="record-timer-card ${zero?'zero':''}"><summary><span class="record-timer-title">${visualMarkerMarkup(t.marker,'record-inline-marker')}${esc(t.name)}${t.isAdhoc?'<span class="badge">Etapa avulsa</span>':''}${t.isRemoved?'<span class="badge">Removido</span>':''}</span><span class="record-timer-time">${svgIcon('timers')}<strong>${fmtDuration(d)}</strong></span></summary><div class="record-timer-extra">${zero?'<div class="record-zero-note">Nenhum tempo registrado neste cronômetro.</div>':''}<div class="muted small record-interval-label">Horários e intervalos</div>${t.intervals?.length?t.intervals.map(i=>`<div class="row small"><span>${fmtDateTime(i.startedAt)}</span><span>${i.endedAt?fmtDateTime(i.endedAt):'aberto'}</span></div>`).join(''):'<div class="muted small">Nenhum intervalo registrado.</div>'}<button class="action" data-correct-time="${s.id}" data-timer-id="${t.id}">Corrigir tempo</button></div></details>`}).join('')}</div>
    <div class="record-delete-wrap"><button class="record-delete-button" data-delete-session="${s.id}">${trashIconMarkup()}<span>Excluir</span></button></div>
  </div></section></div>`;
}
;

function statsSection(title,body){return `<details class="panel stats-collapsible"><summary>${esc(title)}</summary><div class="stats-collapsible-body">${body}</div></details>`;}
function renderStats(){
  const areas=getAreas();
  const ss=validMeasuredSessions().filter(s=>ui.statsArea==='all'||sessionAreaId(s)===ui.statsArea);
  const count=ss.length,total=ss.reduce((a,s)=>a+sessionTotal(s,s.savedAt),0),avg=count?total/count:0;
  const byTimer=new Map();
  ss.forEach(s=>s.timers.forEach(t=>{const d=timerDuration(t,s.savedAt);if(d<=0)return;const key=t.templateId||`adhoc:${t.name}`;const x=byTimer.get(key)||{name:t.name,vals:[],total:0};x.vals.push(d);x.total+=d;byTimer.set(key,x);}));
  const timers=[...byTimer.values()].sort((a,b)=>b.total-a.total),maxTotal=Math.max(1,...timers.map(x=>x.total));
  let trend='Sem dados suficientes';
  if(ss.length>=2){const ordered=[...ss].sort((a,b)=>recordDateMs(a)-recordDateMs(b));const half=Math.max(1,Math.floor(ordered.length/2));const a=ordered.slice(0,half).reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/half;const bArr=ordered.slice(-half);const b=bArr.reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/bArr.length;const pct=a?((b-a)/a*100):0;trend=pct<0?`${Math.abs(pct).toFixed(1).replace('.',',')}% mais rápido`:`${pct.toFixed(1).replace('.',',')}% mais lento`;}
  const timerRows=kind=>timers.map(x=>{let value;if(kind==='avg')value=x.total/x.vals.length;if(kind==='best')value=Math.min(...x.vals);if(kind==='worst')value=Math.max(...x.vals);return `<div class="row"><span>${esc(x.name)}</span><strong>${fmtDuration(value)}</strong></div>`}).join('')||'<div class="muted">Sem dados.</div>';
  const percentRows=timers.map(x=>`<div><div class="row"><span>${esc(x.name)}</span><strong>${total?(x.total/total*100).toFixed(1).replace('.',','):0}%</strong></div><div class="bar"><span style="width:${Math.min(100,x.total/maxTotal*100)}%"></span></div></div>`).join('')||'<div class="muted">Sem dados.</div>';
  const sections=count?[
    statsSection('Resumo',`<div class="row"><span>Registros medidos</span><strong>${count}</strong></div><div class="row"><span>Tempo acumulado</span><strong>${fmtDuration(total)}</strong></div><div class="row"><span>Média por registro</span><strong>${fmtDuration(avg)}</strong></div>`),
    statsSection('Tempo total por registro',[...ss].sort((a,b)=>recordDateMs(b)-recordDateMs(a)).slice(0,12).map(s=>`<div class="row"><span>${esc(s.title)}</span><strong>${fmtDuration(sessionTotal(s,s.savedAt))}</strong></div>`).join('')),
    statsSection('Tempo de cada cronômetro',timers.map(x=>`<div><div class="row"><span>${esc(x.name)}</span><strong>${fmtDuration(x.total)}</strong></div><div class="bar"><span style="width:${x.total/maxTotal*100}%"></span></div></div>`).join('')),
    statsSection('Média por cronômetro',timerRows('avg')),
    statsSection('Melhor tempo',timerRows('best')),
    statsSection('Pior tempo',timerRows('worst')),
    statsSection('Percentual no tempo total',percentRows),
    statsSection('Evolução / tendência',`<div class="stat-big">${esc(trend)}</div><p class="muted small">Comparação da média da primeira metade dos registros com a metade mais recente.</p>`)
  ].join(''):'';
  return shell(`<header class="topbar section-tab-header"><h1>Estatísticas</h1></header><div class="stats-area-filter"><select id="statsArea"><option value="all">Todas as áreas</option>${areas.map(a=>`<option value="${esc(a.id)}" ${ui.statsArea===a.id?'selected':''}>${esc(a.name)}</option>`).join('')}</select></div><main class="content"><h2 class="section-title">Visão geral</h2>${count?`<div class="stats-grid">${sections}</div>`:`<div class="empty">As estatísticas aparecerão depois que você salvar registros com medição nesta área.</div>`}</main>`);
}

function renderPendingModelSwitch(targetModelId){
  const m=modelById(targetModelId);if(!m)return '';
  return `<div class="modal-wrap pending-switch-wrap" id="pendingSwitchBackdrop"><section class="sheet pending-switch-sheet" role="dialog" aria-modal="true" aria-labelledby="pendingSwitchTitle"><div class="pending-switch-copy"><h2 id="pendingSwitchTitle">O que fazer com o registro atual?</h2><p>Antes de abrir “${esc(m.name)}”, escolha se deseja salvar ou descartar o registro atual.</p></div><div class="pending-switch-actions"><button class="pending-switch-button primary" id="pendingSwitchSave">Salvar e abrir o modelo</button><button class="pending-switch-button danger" id="pendingSwitchDiscard">Descartar e abrir o modelo</button><button class="pending-switch-button secondary" id="pendingSwitchCancel">Voltar aos cronômetros</button></div></section></div>`;
}

/* Organizador compacto com arraste pelo puxador. */
function organizeStateMarkup(s,t){const used=timerDuration(t)>0||isTimerActive(t);return `<span class="organize-state-icon">${svgIcon(used?'pause':'play')}</span>`;}
function renderOrganize(){
  const s=data.current;
  return `<div class="modal-wrap"><section class="sheet organize-sheet"><div class="sheet-head"><h2>Reordenar cronômetros</h2><button class="chip" id="closeModal">Concluir</button></div><p class="organize-hint">Arraste pelo puxador da direita. Toque no nome para renomear e no marcador para escolher emoji ou ícone.</p><div class="organize-list" id="organizeList">${s.timers.sort((a,b)=>a.order-b.order).map(t=>`<div class="organize-timer-card" data-organize-timer="${t.id}">${organizeStateMarkup(s,t)}<button class="organize-marker-button" data-current-marker="${t.id}" aria-label="Marcador de ${esc(t.name)}">${visualMarkerMarkup(t.marker)}</button><button class="organize-name-button" data-rename-current="${t.id}">${esc(t.name)}</button><button class="organize-delete-button" data-remove-current="${t.id}" aria-label="Remover ${esc(t.name)}">${trashIconMarkup()}</button><button class="organize-drag-handle" data-reorder-handle="${t.id}" aria-label="Arrastar ${esc(t.name)}">≡</button></div>`).join('')}</div></section></div>`;
}
async function persistOrganizeDomOrder(){
  const ids=[...document.querySelectorAll('#organizeList [data-organize-timer]')].map(el=>el.dataset.organizeTimer);
  if(!data.current||!ids.length)return;
  const map=new Map(data.current.timers.map(t=>[t.id,t]));
  data.current.timers=ids.map((id,i)=>{const t=map.get(id);if(t)t.order=i;return t;}).filter(Boolean);
  data.current.customized=true;await persistCurrent();
}
function bindOrganizerDrag(){
  const list=document.getElementById('organizeList');if(!list)return;
  list.querySelectorAll('[data-reorder-handle]').forEach(handle=>{
    handle.onpointerdown=e=>{
      if(e.button!=null&&e.button!==0)return;
      const card=handle.closest('[data-organize-timer]');if(!card)return;
      e.preventDefault();handle.setPointerCapture?.(e.pointerId);card.classList.add('dragging');
      const move=ev=>{
        ev.preventDefault();const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest?.('[data-organize-timer]');
        if(!target||target===card||target.parentElement!==list)return;
        const rect=target.getBoundingClientRect();const before=ev.clientY<rect.top+rect.height/2;
        list.insertBefore(card,before?target:target.nextSibling);
      };
      const up=async ev=>{handle.releasePointerCapture?.(e.pointerId);card.classList.remove('dragging');handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',up);handle.removeEventListener('pointercancel',up);await persistOrganizeDomOrder();};
      handle.addEventListener('pointermove',move,{passive:false});handle.addEventListener('pointerup',up);handle.addEventListener('pointercancel',up);
    };
  });
}
;

/* Ajustes gerais e Aparência separados. */
function renderSettings(){
  ui.settingsView=ui.settingsView||'main';
  if(ui.settingsView==='appearance')return renderAppearanceSettings();
  const areas=getAreas(),hasSound=!!data.settings.timerSoundData;
  return shell(`<header class="topbar simple section-tab-header"><h1>Ajustes</h1></header><main class="settings-content">
    <section class="settings-section"><div class="settings-card sound-settings-card"><button class="settings-row button-row" id="toggleTimerSound" aria-pressed="${data.settings.timerSoundEnabled?'true':'false'}"><span>Som do cronômetro</span><span class="ios-switch ${data.settings.timerSoundEnabled?'on':''}" aria-hidden="true"></span></button><label class="settings-row button-row accent-button-row" for="timerSoundFile"><span>${hasSound?'Trocar áudio':'Adicionar áudio'}</span><span class="secondary-value">${hasSound?esc(data.settings.timerSoundName||'Áudio adicionado'):'Nenhum áudio'}</span><input id="timerSoundFile" class="sr-only" type="file" accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav"></label>${hasSound?`<label class="settings-row volume-row"><span>Volume</span><span class="range-wrap"><input id="timerSoundVolume" type="range" min="0" max="100" step="1" value="${Math.round((data.settings.timerSoundVolume??.35)*100)}"><span>${Math.round((data.settings.timerSoundVolume??.35)*100)}%</span></span></label><button class="settings-row button-row danger" id="removeTimerSound"><span>Remover áudio</span></button>`:''}</div></section>
    <section class="settings-section"><div class="settings-card settings-navigation-card"><button class="settings-row button-row" id="openAppearanceSettings"><span>Aparência</span><span class="secondary-value">Tema, ícones e animações ›</span></button></div></section>
    <section class="settings-section"><h3 class="section-label">Áreas</h3><div class="settings-card areas-settings-card">${areas.map(a=>`<div class="settings-row area-settings-row"><span>${esc(a.name)}</span><span class="area-row-actions"><button data-rename-area="${esc(a.id)}">Renomear</button>${a.id!=='general'?`<button class="danger" data-delete-area="${esc(a.id)}">Apagar</button>`:''}</span></div>`).join('')}<button class="settings-row button-row accent-button-row" id="addArea"><span>Adicionar área</span></button></div><p class="section-footer">Use áreas para separar modelos, Histórico e Estatísticas, por exemplo: Unhas, Casa e Outros.</p></section>
    <section class="settings-section"><h3 class="section-label">Backup</h3><div class="settings-card"><button class="settings-row button-row accent-button-row" id="exportJson"><span>Fazer backup</span></button></div><p class="section-footer">Salve o arquivo JSON em uma pasta que você não se esqueça</p></section>
    <section class="settings-section"><div class="settings-card"><label class="settings-row button-row" for="importJsonFile"><span>Restaurar Backup</span><input id="importJsonFile" class="sr-only" type="file" accept="application/json,.json"></label></div><p class="section-footer">Restaura um backup substituindo os dados atuais pelos dados do arquivo JSON escolhido.</p></section>
    <section class="settings-section"><h3 class="section-label">Dados e exportação</h3><div class="settings-card"><button class="settings-row button-row" id="exportCsv"><span>Exportar CSV para planilhas</span></button><button class="settings-row button-row" id="exportPdf"><span>Exportar relatório PDF</span></button></div></section>
    <section class="settings-section"><h3 class="section-label">Armazenamento</h3><div class="settings-card"><div class="settings-row"><span>Dados salvos em</span><span class="secondary-value">Neste aparelho</span></div><div class="settings-row"><span>iCloud</span><span class="secondary-value">Apenas se salvo manualmente</span></div></div><p class="section-footer">Os registros são salvos em cache no seu navegador, caso o cache seja limpo, os dados serão perdidos.</p></section>
    <section class="settings-section"><div class="settings-card"><div class="settings-row"><span>Versão</span><span class="secondary-value">${esc(APP_META.version)}</span></div></div></section>
  </main>`);
}
function renderAppearanceSettings(){
  const presets=UI_CONFIG.themePresets||[],speeds=Object.values(UI_CONFIG.animationSpeeds||{}),iconSizes=Object.values(UI_CONFIG.activeIconSizes||{}),customSelected=data.settings.colorTheme==='custom';
  const currentIconName=data.settings.activeTimerIconSource==='default'?'DVD':(data.settings.activeTimerIconName||'Personalizado');
  const speedRow=data.settings.animateActiveTimerIcon?`<div class="settings-row animation-speed-row"><div class="animation-speed-options" role="group" aria-label="Velocidade da animação">${speeds.map(sp=>`<button data-animation-speed="${esc(sp.id)}" class="${data.settings.activeTimerAnimationSpeed===sp.id?'selected':''}">${esc(sp.name)}</button>`).join('')}</div></div>`:'';
  return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeAppearanceSettings" aria-label="Voltar">${svgIcon('back')}</button><h1>Aparência</h1><span></span></header><main class="settings-content">
    <section class="settings-section"><h3 class="section-label">Tema</h3><div class="settings-card color-card"><div class="theme-presets horizontal-themes">${presets.map(p=>`<button class="theme-preset ${data.settings.colorTheme===p.id?'selected':''}" data-color-theme="${esc(p.id)}"><span class="theme-dot" style="--theme-accent:${esc(p.accent)};--theme-action:${esc(p.action)}"></span><span>${esc(p.name)}</span></button>`).join('')}<button class="theme-preset ${customSelected?'selected':''}" data-color-theme="custom"><span class="theme-dot custom-dot" style="--theme-accent:${esc(data.settings.accentColor||'#007AFF')};--theme-action:${esc(data.settings.accentColor||'#007AFF')}"></span><span>Personalizada</span></button></div>${customSelected?`<div class="custom-theme-row"><input id="accentCustom" type="color" value="${esc(data.settings.accentColor||'#007AFF')}"><span>${esc((data.settings.accentColor||'#007AFF').toUpperCase())}</span></div>`:''}</div></section>
    <section class="settings-section"><div class="settings-card"><label class="settings-row" for="themeSelect"><span>Modo</span><span class="select-wrap"><select id="themeSelect"><option value="system" ${data.settings.theme==='system'?'selected':''}>Sistema</option><option value="light" ${data.settings.theme==='light'?'selected':''}>Claro</option><option value="dark" ${data.settings.theme==='dark'?'selected':''}>Escuro</option></select><span class="chevrons">${svgIcon('chevrons')}</span></span></label></div></section>
    <section class="settings-section"><h3 class="section-label">Ícone do cronômetro ativo</h3><div class="settings-card active-icon-source-card"><div class="settings-row"><span>Ícone atual</span><span class="secondary-value">${esc(currentIconName)}</span></div><label class="settings-row button-row accent-button-row" for="activeIconFile"><span>Escolher SVG ou PNG</span><input id="activeIconFile" class="sr-only" type="file" accept="image/svg+xml,image/png,.svg,.png"></label><button class="settings-row button-row accent-button-row" id="pasteSvgCode"><span>Colar código SVG</span></button><button class="settings-row button-row accent-button-row" id="pasteSvgUrl"><span>Colar link SVG</span></button>${data.settings.activeTimerIconSource!=='default'?`<button class="settings-row button-row" id="restoreDefaultActiveIcon"><span>Restaurar DVD</span></button>`:''}</div></section>
    <section class="settings-section"><div class="settings-card icon-size-settings-card"><div class="settings-row compact-title-row"><strong>Tamanho do ícone</strong></div><div class="settings-row animation-speed-row"><div class="animation-speed-options four-options" role="group" aria-label="Tamanho do ícone">${iconSizes.map(sz=>`<button data-active-icon-size="${esc(sz.id)}" class="${data.settings.activeTimerIconSize===sz.id?'selected':''}">${esc(sz.name)}</button>`).join('')}</div></div></div></section>
    <section class="settings-section"><div class="settings-card animation-settings-card"><button class="settings-row button-row" id="toggleActiveTimerAnimation"><span>Animar ícone do cronômetro ativo</span><span class="ios-switch ${data.settings.animateActiveTimerIcon?'on':''}" aria-hidden="true"></span></button>${speedRow}</div></section>
    <section class="settings-section"><div class="settings-card"><button class="settings-row button-row" id="toggleTotalColonBlink"><span>Piscar os dois pontos do tempo total</span><span class="ios-switch ${data.settings.blinkTotalColon?'on':''}" aria-hidden="true"></span></button><button class="settings-row button-row" id="toggleVersionBadge"><span>Mostrar versão no topo</span><span class="ios-switch ${data.settings.showVersionBadge?'on':''}" aria-hidden="true"></span></button></div></section>
  </main>`);
}

function bindV081Events(){
  const byId=id=>document.getElementById(id);
  document.querySelectorAll('[data-edit-record-date]').forEach(b=>b.onclick=()=>editRecordDate(data.sessions.find(s=>s.id===b.dataset.editRecordDate)));
  const note=byId('detailNote');if(note){autoGrowTextarea(note);let tm;note.oninput=e=>{autoGrowTextarea(e.target);clearTimeout(tm);tm=setTimeout(()=>saveSessionNote(e.target.dataset.noteSession,e.target.value),350);};}
  const activeNote=byId('currentNote');if(activeNote){autoGrowTextarea(activeNote);activeNote.oninput=e=>{autoGrowTextarea(e.target);data.current.note=e.target.value;clearTimeout(activeNote._saveTimer);activeNote._saveTimer=setTimeout(()=>persistCurrent(),180);};}
  bindOrganizerDrag();
  if(byId('openAppearanceSettings'))byId('openAppearanceSettings').onclick=()=>{ui.settingsView='appearance';render();};
  if(byId('closeAppearanceSettings'))byId('closeAppearanceSettings').onclick=()=>{ui.settingsView='main';render();};
  document.querySelectorAll('[data-tab]').forEach(b=>{const old=b.onclick;b.onclick=()=>{if(b.dataset.tab==='settings')ui.settingsView='main';old?.();};});
}

/* render() já chama bindV080Events; esta camada final adiciona os novos eventos. */
const __renderV081=render;
render=function(){
  __renderV081();
  bindV081Events();
};
;

'use strict';

/* =========================
   v0.8.2 — Áreas como perfis, clientes e métricas
   ========================= */

globalThis.APP_META=Object.freeze({version:'0.8.2',dataSchemaVersion:5,factoryDataVersion:1});

function normalizeSearchText(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().trim();}
function activeAreaId(){
  const ids=new Set(getAreas().map(a=>a.id));
  const preferred=data.settings.activeAreaId;
  if(preferred&&ids.has(preferred))return preferred;
  const current=sessionAreaId(data.current);
  return ids.has(current)?current:(getAreas()[0]?.id||'general');
}
function activeArea(){return areaById(activeAreaId());}
function areaType(areaOrId){const a=typeof areaOrId==='string'?areaById(areaOrId):areaOrId;return a?.type||'generic';}
function isClientArea(areaId=activeAreaId()){return areaType(areaId)==='clients';}
function areaTypeLabel(t){return t==='clients'?'Clientes / atendimentos':'Genérica';}
function personIconMarkup(){return `<svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 20c.5-4 2.8-6.2 6.5-6.2S18 16 18.5 20"/></svg>`;}
function clientsForArea(areaId=activeAreaId()){
  return (Array.isArray(data.settings.clients)?data.settings.clients:[]).filter(c=>c&&c.areaId===areaId&&!c.deletedAt).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
}
function clientById(id){return (data.settings.clients||[]).find(c=>c.id===id)||null;}
function clientLabelForSession(s){
  if(!s)return data.settings.clientEmptyLabel||'Sem cliente';
  return clientById(s.clientId)?.name||s.clientNameSnapshot||data.settings.clientEmptyLabel||'Sem cliente';
}
function sessionDisplayTitle(s){
  if(isClientArea(sessionAreaId(s)))return clientLabelForSession(s);
  return s?.title||`(sem título) ${fmtDateTime(recordDateMs(s))}`;
}
function activeAreaBadge(area=activeArea()){return `<span class="area-profile-badge" title="Área ativa">${esc(area?.name||'Sem área')}</span>`;}
function modelOptionsForActiveArea(){return activeModels().filter(m=>modelAreaId(m)===activeAreaId()).sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));}
function setActiveAreaState(id){
  const exists=getAreas().some(a=>a.id===id);if(!exists)return false;
  data.settings.activeAreaId=id;
  ui.historyModel='all';ui.historyClientId=null;
  return true;
}
async function persistActiveArea(id){if(!setActiveAreaState(id))return false;await persistSettings();return true;}

async function migrateV082Data(){
  let settingsChanged=false,currentChanged=false;
  let areas=getAreas().map(a=>({...a}));
  const general=areas.find(a=>a.id==='general');
  if(general&&general.name!=='Sem área'){general.name='Sem área';settingsChanged=true;}
  areas=areas.map(a=>{if(!a.type){settingsChanged=true;return {...a,type:'generic'};}return a;});
  if(!areas.some(a=>a.id==='general')){areas.push({id:'general',name:'Sem área',type:'generic'});settingsChanged=true;}
  data.settings.areas=areas;
  if(!Array.isArray(data.settings.clients)){data.settings.clients=[];settingsChanged=true;}
  if(typeof data.settings.clientEmptyLabel!=='string'||!data.settings.clientEmptyLabel.trim()){data.settings.clientEmptyLabel='Sem cliente';settingsChanged=true;}
  if(typeof data.settings.ignoreShortMeasurements!=='boolean'){data.settings.ignoreShortMeasurements=true;settingsChanged=true;}
  if(!Number.isFinite(Number(data.settings.shortMeasurementThresholdSec))){data.settings.shortMeasurementThresholdSec=10;settingsChanged=true;}
  data.settings.shortMeasurementThresholdSec=Math.max(1,Math.min(60,Math.round(Number(data.settings.shortMeasurementThresholdSec)||10)));
  if(!Number.isFinite(Number(data.settings.uiTextScale))){data.settings.uiTextScale=1;settingsChanged=true;}
  if(!Number.isFinite(Number(data.settings.uiCardScale))){data.settings.uiCardScale=1;settingsChanged=true;}
  if(!Number.isFinite(Number(data.settings.uiIconScale))){data.settings.uiIconScale=1;settingsChanged=true;}
  if(!['compact','standard','spacious'].includes(data.settings.uiDensity)){data.settings.uiDensity='standard';settingsChanged=true;}
  if(!['system','rounded'].includes(data.settings.uiFontPreset)){data.settings.uiFontPreset='system';settingsChanged=true;}
  if(!data.settings.activeAreaId||!areas.some(a=>a.id===data.settings.activeAreaId)){
    data.settings.activeAreaId=data.current?.areaId||modelAreaId(modelById(data.current?.modelId))||'general';settingsChanged=true;
  }
  for(const m of data.models){
    let changed=false;
    if(!m.areaId){m.areaId='general';changed=true;}
    if(changed)await put('models',m);
  }
  for(const s of data.sessions){
    let changed=false;
    if(!s.areaId){s.areaId=modelAreaId(modelById(s.modelId));changed=true;}
    if(isClientArea(s.areaId)){
      if(!Object.prototype.hasOwnProperty.call(s,'appointmentNote')){s.appointmentNote=s.note||'';changed=true;}
      if(!Object.prototype.hasOwnProperty.call(s,'clientNote')){s.clientNote='';changed=true;}
    }
    for(const t of (s.timers||[])){
      if(!Object.prototype.hasOwnProperty.call(t,'measurementStatus')){t.measurementStatus=timerDuration(t,s.savedAt)>0?'measured':'notNeeded';changed=true;}
      if(!Array.isArray(t.ignoredIntervals)){t.ignoredIntervals=[];changed=true;}
    }
    if(changed)await put('sessions',s);
  }
  if(data.current){
    if(!data.current.areaId){data.current.areaId=modelAreaId(modelById(data.current.modelId));currentChanged=true;}
    if(isClientArea(data.current.areaId)){
      if(!Object.prototype.hasOwnProperty.call(data.current,'appointmentNote')){data.current.appointmentNote=data.current.note||'';currentChanged=true;}
      if(!Object.prototype.hasOwnProperty.call(data.current,'clientNote')){data.current.clientNote='';currentChanged=true;}
      if(!Object.prototype.hasOwnProperty.call(data.current,'clientId')){data.current.clientId=null;currentChanged=true;}
    }
    for(const t of (data.current.timers||[])){
      if(!Array.isArray(t.ignoredIntervals)){t.ignoredIntervals=[];currentChanged=true;}
      if(!Object.prototype.hasOwnProperty.call(t,'measurementStatus')){t.measurementStatus=timerDuration(t)>0?'measured':'notNeeded';currentChanged=true;}
    }
    data.settings.activeAreaId=data.current.areaId;settingsChanged=true;
  }
  ui.historyArea=activeAreaId();ui.statsArea=activeAreaId();ui.historyClientId=null;
  if(settingsChanged)await persistSettings();
  if(currentChanged)await persistCurrent();
}

function recordedFromTemplate(t){
  return {id:uid(),templateId:t.id,name:t.name,order:t.order,isAdhoc:false,isRemoved:false,intervals:[],ignoredIntervals:[],correctedDurationMs:null,measurementStatus:'notNeeded',marker:clone(t.marker||null)};
}
function newSession(model){
  const t=now(),aid=modelAreaId(model),clients=isClientArea(aid);
  return {id:uid(),modelId:model.id,modelNameSnapshot:model.name,areaId:aid,title:'',manualTitle:false,note:'',appointmentNote:'',clientNote:'',clientId:null,clientNameSnapshot:'',openedAt:t,firstTimerStartedAt:null,savedAt:null,originalRecordedAt:null,restoredAt:null,deletedAt:null,status:'active',isNoMeasurement:false,globalPaused:false,pauseIntervals:[],pausedActiveTimerIds:[],customized:false,timers:model.timers.filter(x=>!x.removedAt).sort((a,b)=>a.order-b.order).map(recordedFromTemplate),clientMode:clients};
}
function currentTimerMode(){
  const base=UI_CONFIG.timerModes?.[data.settings.timerSize]||UI_CONFIG.timerModes?.small||{};
  if(data.settings.timerSize!=='medium')return base;
  return {...base,minHeight:88,radius:36,padY:14,padX:15,iconBox:48,iconSize:32,nameSize:16.5,timeSize:42,listGap:10};
}
const __applyThemeV082Base=applyTheme;
applyTheme=function(){
  __applyThemeV082Base();
  const root=document.documentElement,body=document.body;
  const ts=Math.max(.9,Math.min(1.12,Number(data.settings.uiTextScale)||1));
  const cs=Math.max(.9,Math.min(1.12,Number(data.settings.uiCardScale)||1));
  const is=Math.max(.9,Math.min(1.2,Number(data.settings.uiIconScale)||1));
  root.style.setProperty('--v082-text-scale',ts);root.style.setProperty('--v082-card-scale',cs);root.style.setProperty('--v082-icon-scale',is);
  body.classList.toggle('v082-rounded',data.settings.uiFontPreset==='rounded');
  body.classList.toggle('v082-text-scaled',Math.abs(ts-1)>.001);body.classList.toggle('v082-cards-scaled',Math.abs(cs-1)>.001);body.classList.toggle('v082-icons-scaled',Math.abs(is-1)>.001);
  body.classList.toggle('v082-compact',data.settings.uiDensity==='compact');body.classList.toggle('v082-spacious',data.settings.uiDensity==='spacious');
  body.dataset.timerMode=data.settings.timerSize;
};
function fitPromptToVisualViewport(backdrop){
  const vv=window.visualViewport;if(!vv||!backdrop)return()=>{};
  const update=()=>{backdrop.style.height=`${vv.height}px`;backdrop.style.top=`${vv.offsetTop}px`;backdrop.style.bottom='auto';};
  vv.addEventListener('resize',update);vv.addEventListener('scroll',update);update();
  return()=>{vv.removeEventListener('resize',update);vv.removeEventListener('scroll',update);};
}
function iosTextPrompt({title='Digite um texto',message='',value='',placeholder='',confirmText='Salvar',inputMode='text',multiline=false}={}){
  return new Promise(resolve=>{
    document.querySelector('.ios-text-prompt-backdrop')?.remove();
    const backdrop=document.createElement('div');backdrop.className='ios-text-prompt-backdrop';
    backdrop.innerHTML=`<section class="ios-text-prompt" role="dialog" aria-modal="true"><div class="ios-text-prompt-copy"><h2>${esc(title)}</h2>${message?`<p>${esc(message)}</p>`:''}</div><div class="ios-text-prompt-field">${multiline?`<textarea id="iosPromptInput" placeholder="${esc(placeholder)}">${esc(value)}</textarea>`:`<input id="iosPromptInput" type="text" inputmode="${esc(inputMode)}" autocomplete="off" autocapitalize="sentences" placeholder="${esc(placeholder)}" value="${esc(value)}">`}</div><div class="ios-text-prompt-actions"><button id="iosPromptCancel">Cancelar</button><button id="iosPromptConfirm">${esc(confirmText)}</button></div></section>`;
    document.body.appendChild(backdrop);const input=backdrop.querySelector('#iosPromptInput');const detach=fitPromptToVisualViewport(backdrop);
    const finish=result=>{detach();backdrop.remove();resolve(result);};
    backdrop.querySelector('#iosPromptCancel').onclick=()=>finish(null);backdrop.querySelector('#iosPromptConfirm').onclick=()=>finish(input.value);backdrop.onclick=e=>{if(e.target===backdrop)finish(null);};
    input.addEventListener('keydown',e=>{if(!multiline&&e.key==='Enter'){e.preventDefault();finish(input.value);}});
    requestAnimationFrame(()=>{try{input.focus({preventScroll:true});const len=input.value.length;if(!multiline&&input.setSelectionRange)input.setSelectionRange(len,len);setTimeout(()=>input.focus({preventScroll:true}),80);}catch(_){}});
  });
}
function hasPendingSession(s){return !!(s&&(s.firstTimerStartedAt||sessionTotal(s)>0||String(s.note||'').trim()||String(s.appointmentNote||'').trim()||String(s.clientNote||'').trim()||s.clientId||s.customized||s.manualTitle));}
function shortThresholdMs(){return data.settings.ignoreShortMeasurements===false?0:Math.max(0,Number(data.settings.shortMeasurementThresholdSec||10)*1000);}
function maybeIgnoreShortInterval(rt,interval){
  if(!rt||!interval||interval.endedAt==null||interval.restored)return false;
  const limit=shortThresholdMs(),dur=Math.max(0,interval.endedAt-interval.startedAt);if(!limit||dur>=limit)return false;
  rt.ignoredIntervals=Array.isArray(rt.ignoredIntervals)?rt.ignoredIntervals:[];
  rt.ignoredIntervals.push({...interval,ignoredAt:now(),durationMs:dur});
  rt.intervals=(rt.intervals||[]).filter(i=>i.id!==interval.id);
  if(timerDuration(rt)<=0)rt.measurementStatus='notNeeded';
  return true;
}
async function tapTimer(timerId){
  const s=data.current;if(!s)return;const rt=s.timers.find(t=>t.id===timerId);if(!rt)return;const t=now();
  if(!s.firstTimerStartedAt)s.firstTimerStartedAt=t;
  const active=s.timers.find(x=>isTimerActive(x));
  if(active?.id===rt.id){const oi=openInterval(rt);oi.endedAt=t;maybeIgnoreShortInterval(rt,oi);if(timerDuration(rt)>0)rt.measurementStatus='measured';startPause(s,t);syncTimerLoopAudio(true);await persistCurrent();haptic('light');render();return;}
  const snap=clone(s);
  if(active){const oi=openInterval(active);oi.endedAt=t;maybeIgnoreShortInterval(active,oi);if(timerDuration(active)>0)active.measurementStatus='measured';}
  else endPause(s,t);
  rt.intervals.push({id:uid(),startedAt:t,endedAt:null,origin:active?'switch':'resume'});rt.measurementStatus=timerDuration(rt)>0?'measured':rt.measurementStatus||'notNeeded';
  syncTimerLoopAudio(true);await persistCurrent();if(active){setUndo(snap);haptic('switch');}else{haptic('light');render();}
}
async function chooseModel(id){
  const m=modelById(id);if(!m)return;
  if(data.current&&data.current.status==='active'&&data.current.modelId!==id&&hasPendingSession(data.current)){ui.modal={type:'pendingModelSwitch',targetModelId:id};ui.popover=null;render();return;}
  stopTimerLoopAudio();await persistActiveArea(modelAreaId(m));data.current=newSession(m);await persistCurrent();ui.timerView='timers';ui.popover=null;ui.modal=!m.timers.some(t=>!t.removedAt)?{type:'editModel',id:m.id}:null;render();
}
async function openModelAfterPendingChoice(id,action){
  const m=modelById(id);if(!m)return;
  if(action==='save'){const ok=await saveSession();if(!ok)return;}else if(action==='discard'){stopTimerLoopAudio();data.current=null;await putState('current',null);}else{ui.modal=null;ui.popover=null;ui.timerView='timers';render();return;}
  stopTimerLoopAudio();await persistActiveArea(modelAreaId(m));data.current=newSession(m);await persistCurrent();ui.timerView='timers';ui.popover=null;ui.modal=!m.timers.some(t=>!t.removedAt)?{type:'editModel',id:m.id}:null;render();
}
async function activateArea(id){
  const a=areaById(id);if(!a)return;
  if(activeAreaId()===id)return;
  const first=activeModels().filter(m=>modelAreaId(m)===id).sort((x,y)=>(x.sortOrder??0)-(y.sortOrder??0))[0]||null;
  if(data.current&&hasPendingSession(data.current)&&sessionAreaId(data.current)!==id){
    if(first){ui.modal={type:'pendingModelSwitch',targetModelId:first.id};return render();}
    const ok=confirm(`Há um registro em andamento em “${activeArea().name}”. Salve ou descarte esse registro antes de abrir “${a.name}”.`);if(!ok)return;return;
  }
  await persistActiveArea(id);
  if(first){data.current=newSession(first);await persistCurrent();}
  else{data.current=null;await putState('current',null);}
  ui.timerView='models';render();
}
async function createModel(){
  const raw=await iosTextPrompt({title:'Novo modelo',message:`Este modelo será criado em “${activeArea().name}”.`,placeholder:'Nome do modelo'});const name=String(raw??'').trim();if(!name)return;
  if(activeModels().some(m=>modelAreaId(m)===activeAreaId()&&normalizeSearchText(m.name)===normalizeSearchText(name))){alert('Já existe um modelo com esse nome nesta área.');return;}
  const t=now(),m={id:uid(),name,areaId:activeAreaId(),createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:[]};data.models.push(m);await put('models',m);data.current=newSession(m);await persistCurrent();ui.modal={type:'editModel',id:m.id};render();
}
async function saveCurrentLayoutAsNewModel(){
  const s=data.current;if(!s)return;const raw=await iosTextPrompt({title:'Salvar como novo modelo',message:`Será criado em “${activeArea().name}”.`,placeholder:'Nome do novo modelo'});const base=String(raw??'').trim();if(!base)return;
  if(activeModels().some(m=>modelAreaId(m)===activeAreaId()&&normalizeSearchText(m.name)===normalizeSearchText(base))){alert('Já existe um modelo com esse nome nesta área.');return;}
  const t=now(),model={id:uid(),name:base,areaId:activeAreaId(),createdAt:t,updatedAt:t,deletedAt:null,sortOrder:nextModelOrder(),timers:s.timers.filter(t=>!t.removedAt&&!t.isRemoved).sort((a,b)=>(a.order??0)-(b.order??0)).map((rt,i)=>({id:uid(),name:rt.name||`Cronômetro ${i+1}`,order:i,createdAt:t,removedAt:null,marker:clone(rt.marker||null)}))};
  data.models.push(model);await put('models',model);toast('Novo modelo salvo');render();
}
;

/* Clientes */
function fuzzyClientScore(query,name){
  const q=normalizeSearchText(query),n=normalizeSearchText(name);if(!q)return 1;if(n===q)return 100;if(n.startsWith(q))return 90;if(n.includes(q))return 75;
  const qp=q.split(/\s+/).filter(Boolean),np=n.split(/\s+/);let score=0;for(const p of qp){if(np.some(x=>x.startsWith(p)))score+=18;else if(np.some(x=>x.includes(p)))score+=10;}
  let i=0;for(const ch of n){if(ch===q[i])i++;if(i===q.length)break;}if(i===q.length)score+=12;return score;
}
function clientSearchResults(query,areaId=activeAreaId()){
  return clientsForArea(areaId).map(c=>({c,score:fuzzyClientScore(query,c.name)})).filter(x=>!query||x.score>=12).sort((a,b)=>b.score-a.score||a.c.name.localeCompare(b.c.name,'pt-BR')).slice(0,8).map(x=>x.c);
}
async function createClient(name,areaId=activeAreaId()){
  const clean=String(name||'').trim();if(!clean)return null;const existing=clientsForArea(areaId).find(c=>normalizeSearchText(c.name)===normalizeSearchText(clean));if(existing)return existing;
  const c={id:`client-${uid()}`,areaId,name:clean,createdAt:now(),updatedAt:now(),deletedAt:null};data.settings.clients=[...(data.settings.clients||[]),c];await persistSettings();return c;
}
async function setSessionClient(session,client){
  if(!session)return;session.clientId=client?.id||null;session.clientNameSnapshot=client?.name||'';
  if(session.status==='saved')await put('sessions',session);else await persistCurrent();
}
function renderClientPicker(){
  const target=ui.modal?.target||'current',session=target==='current'?data.current:data.sessions.find(s=>s.id===ui.modal?.sessionId),aid=sessionAreaId(session)||activeAreaId();
  return `<div class="client-picker-wrap"><section class="client-picker-card"><div class="client-picker-head"><h2>Selecionar cliente</h2><button class="client-picker-close" id="closeClientPicker">${svgIcon('close')}</button></div><input class="client-picker-search" id="clientPickerSearch" placeholder="Buscar ou cadastrar cliente" autocomplete="off"><div class="client-picker-list" id="clientPickerList"></div></section></div>`;
}
function fillClientPickerList(query=''){
  const list=document.getElementById('clientPickerList');if(!list)return;const session=ui.modal?.target==='current'?data.current:data.sessions.find(s=>s.id===ui.modal?.sessionId),aid=sessionAreaId(session)||activeAreaId();const results=clientSearchResults(query,aid);const q=String(query||'').trim();
  list.innerHTML=`<button class="client-picker-item none" data-pick-client=""><strong>${esc(data.settings.clientEmptyLabel||'Sem cliente')}</strong><small>Salvar sem vincular uma cliente</small></button>${results.map(c=>`<button class="client-picker-item" data-pick-client="${esc(c.id)}"><strong>${esc(c.name)}</strong><small>${data.sessions.filter(s=>s.status==='saved'&&s.clientId===c.id).length} atendimento(s)</small></button>`).join('')}${q&&!results.some(c=>normalizeSearchText(c.name)===normalizeSearchText(q))?`<button class="client-picker-item create" data-create-client="${esc(q)}"><strong>＋ Cadastrar “${esc(q)}”</strong><small>Criar uma nova cliente nesta área</small></button>`:''}`;
  bindClientPickerItems();
}
function closeClientPicker(){ui.modal=null;render();}
function bindClientPickerItems(){
  document.querySelectorAll('[data-pick-client]').forEach(b=>b.onclick=async()=>{const session=ui.modal?.target==='current'?data.current:data.sessions.find(s=>s.id===ui.modal?.sessionId),c=b.dataset.pickClient?clientById(b.dataset.pickClient):null;await setSessionClient(session,c);ui.modal=null;render();});
  document.querySelectorAll('[data-create-client]').forEach(b=>b.onclick=async()=>{const session=ui.modal?.target==='current'?data.current:data.sessions.find(s=>s.id===ui.modal?.sessionId),c=await createClient(b.dataset.createClient,sessionAreaId(session)||activeAreaId());await setSessionClient(session,c);ui.modal=null;render();});
}
function renderClientProfile(clientId){
  const c=clientById(clientId);if(!c)return '';
  const ss=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt&&s.clientId===c.id).sort((a,b)=>recordDateMs(b)-recordDateMs(a));const measured=ss.filter(s=>!s.isNoMeasurement);const avg=measured.length?measured.reduce((a,s)=>a+sessionTotal(s,s.savedAt),0)/measured.length:0;
  const clientNotes=ss.filter(s=>String(s.clientNote||'').trim());const appointmentNotes=ss.filter(s=>String(s.appointmentNote||s.note||'').trim());
  const entries=(arr,key)=>arr.map(s=>`<article class="client-note-entry"><div class="meta">${esc(fmtDateTime(recordDateMs(s)))} · ${esc(s.modelNameSnapshot||modelById(s.modelId)?.name||'Modelo')}</div><p>${esc(String(s[key]||(key==='appointmentNote'?s.note:'')||''))}</p><button class="client-record-open" data-open-client-record="${s.id}">Abrir atendimento</button></article>`).join('')||'<div class="muted small">Nenhuma anotação.</div>';
  return `<div class="client-profile-wrap"><section class="client-profile-card"><div class="client-profile-head"><h2>${esc(c.name)}</h2><button class="client-profile-close" id="closeClientProfile">${svgIcon('close')}</button></div><div class="client-profile-summary"><div><small>Atendimentos</small><strong>${ss.length}</strong></div><div><small>Tempo médio</small><strong>${measured.length?fmtDuration(avg):'—'}</strong></div></div><section class="client-profile-section"><h3>Anotações sobre a cliente</h3>${entries(clientNotes,'clientNote')}</section><section class="client-profile-section"><h3>Anotações dos atendimentos</h3>${entries(appointmentNotes,'appointmentNote')}</section></section></div>`;
}

/* Área/tipo */
function renderAreaTypeChooser(name,id=null){
  return `<div class="area-type-wrap"><section class="area-type-card"><div class="area-type-head"><h2>Tipo da área</h2><button class="area-type-close" id="closeAreaType">${svgIcon('close')}</button></div><p class="muted small">Escolha quais recursos aparecem em “${esc(name)}”.</p><div class="area-type-options"><button data-area-type-choice="clients"><strong>Clientes / atendimentos</strong><small>Ativa cadastro de clientes, anotações e métricas por cliente.</small></button><button data-area-type-choice="generic"><strong>Genérica</strong><small>Usa apenas cronômetros, modelos, histórico e estatísticas universais.</small></button></div></section></div>`;
}
async function addArea(){
  const raw=await iosTextPrompt({title:'Nova área',message:'Exemplos: Clientes, Faxina, Estudos.',placeholder:'Nome da área'});const name=String(raw??'').trim();if(!name)return;if(getAreas().some(a=>normalizeSearchText(a.name)===normalizeSearchText(name))){alert('Já existe uma área com esse nome.');return;}ui.modal={type:'areaTypeNew',pendingAreaName:name};render();
}
async function createAreaWithType(name,type){
  const a={id:`area-${uid()}`,name,type:type==='clients'?'clients':'generic'};data.settings.areas=[...getAreas(),a];data.settings.activeAreaId=a.id;await persistSettings();ui.modal=null;render();
}
async function changeAreaType(id,type){data.settings.areas=getAreas().map(a=>a.id===id?{...a,type:type==='clients'?'clients':'generic'}:a);await persistSettings();ui.modal=null;render();}
async function deleteArea(id){
  if(id==='general')return;const area=areaById(id);if(!confirm(`Apagar a área “${area.name}”? Modelos e registros dessa área serão reclassificados como “Sem área”. Nenhum tempo ou anotação será apagado.`))return;
  data.settings.areas=getAreas().filter(a=>a.id!==id);for(const m of data.models){if(m.areaId===id){m.areaId='general';await put('models',m);}}for(const s of data.sessions){if(s.areaId===id){s.areaId='general';await put('sessions',s);}}if(data.current?.areaId===id){data.current.areaId='general';await persistCurrent();}if(data.settings.activeAreaId===id)data.settings.activeAreaId='general';await persistSettings();render();
}

/* Render de Modelos agrupados por Área. */
function renderModelsDrawer(){
  const areas=getAreas().slice().sort((a,b)=>a.id==='general'?1:b.id==='general'?-1:a.name.localeCompare(b.name,'pt-BR'));const active=activeAreaId();
  const groups=areas.map(a=>{const ms=activeModels().filter(m=>modelAreaId(m)===a.id).sort((x,y)=>(x.sortOrder??0)-(y.sortOrder??0));const rows=ms.map(m=>`<div class="model-row ${data.current?.modelId===m.id?'current':''}"><button class="model-main" data-choose-model="${m.id}"><span>${esc(m.name)}</span></button>${ui.modelsEditing?`<button class="model-more" data-model-options="${m.id}" aria-label="Opções">${svgIcon('more')}</button>`:''}</div>`).join('');return `<section class="models-area-group ${a.id===active?'active':'inactive'}"><button class="models-area-heading ${a.id===active?'active':''}" data-activate-area="${a.id}"><span>${esc(a.name)} <span class="area-type-pill">${esc(areaTypeLabel(a.type))}</span></span><span>${ms.length} modelo${ms.length===1?'':'s'}</span></button>${rows||'<div class="models-area-empty">Nenhum modelo nesta área.</div>'}</section>`;}).join('');
  return `<div class="models-drawer-backdrop" id="modelsDrawerBackdrop"><aside class="models-drawer"><div class="models-drawer-head"><button id="toggleModelsEdit">${ui.modelsEditing?'Concluir':'Editar'}</button><div><strong>Modelos</strong>${activeAreaBadge()}</div><button class="circle-button" id="closeModelsDrawer">${svgIcon('close')}</button></div><main class="models-page"><button class="create-model-card" id="createModel">${svgIcon('plus')}<span>Criar modelo em ${esc(activeArea().name)}</span></button>${groups}</main></aside></div>`;
}

/* Tela inicial: Área sempre aparente. Em áreas de cliente, cliente substitui o título livre como identificação. */
function renderTimers(){
  const models=activeModels(),s=data.current;
  if(!models.length)return shell(`<header class="topbar simple"><div class="section-profile-head">${activeAreaBadge()}<h1>Cronômetro</h1></div></header><main class="content"><div class="empty">Nenhum modelo criado.<br><br><button class="ios-button" id="createFirst">Criar modelo em ${esc(activeArea().name)}</button></div></main>`);
  if(!s){const own=modelOptionsForActiveArea();return shell(`<header class="topbar simple"><div class="section-profile-head">${activeAreaBadge()}<h1>Cronômetro</h1></div></header><main class="content"><div class="empty">Escolha um modelo para começar.<br><br><button class="ios-button" id="modelsBack">Ver modelos</button></div></main>${ui.timerView==='models'?renderModelsDrawer():''}`);}
  const model=modelById(s.modelId),timerMode=currentTimerMode(),central=timerMode.layout==='central';
  const cards=s.timers.sort((a,b)=>a.order-b.order).map(rt=>`<button class="timer-card ${central?'central':''} ${timerStateClass(s,rt)}" data-timer="${rt.id}" aria-label="${esc(rt.name)}, ${fmtDuration(timerDuration(rt))}">${timerStateIcon(s,rt)}<span class="timer-name-wrap">${visualMarkerMarkup(rt.marker)}<span class="name ${timerNameFit(rt.name)}">${esc(rt.name)}${rt.isAdhoc?'<span class="badge">Etapa avulsa</span>':''}</span></span><span class="time">${fmtDuration(timerDuration(rt))}</span></button>`).join('');
  const running=s.timers.some(isTimerActive),blink=running&&data.settings.blinkTotalColon,totalText=fmtDuration(sessionTotal(s)),widthClass=totalText.length>=9?'total-xlong':totalText.length>=7?'total-hours':'';
  const clientMode=isClientArea(sessionAreaId(s));const display=clientMode?clientLabelForSession(s):currentTitle();
  const titlePopover=!clientMode&&ui.popover?.type==='title'?`<div class="popover-backdrop" id="closePopover"></div><div class="title-popover floating-window"><button id="titleRename">Renomear</button><button id="titleEditModel">Editar modelo</button><button id="titleDiscard" class="danger">Descartar</button></div>`:'';
  const modelsDrawer=ui.timerView==='models'?renderModelsDrawer():'';
  return shell(`<header class="topbar timer-topbar">${activeAreaBadge(areaById(sessionAreaId(s)))}<div class="header-row"><button class="circle-button" id="modelsBack" aria-label="Modelos">${svgIcon('back')}</button><button class="current-title ${clientMode&&!s.clientId?'untitled':(!clientMode&&!s.manualTitle?'untitled':'')}" id="currentTitleButton">${esc(display)}</button><button class="circle-button" id="sessionMenu" aria-label="Detalhes">${svgIcon('more')}</button>${titlePopover}</div><div class="current-model-name">${esc(model?.name||s.modelNameSnapshot)}</div>${s.customized?'<div class="status-line">Personalizado neste registro</div>':''}</header><main class="content timer-content"><div class="timer-list">${cards}<button class="add-card" id="addAdhoc">${svgIcon('plus')}<span>Adicionar cronômetro</span></button></div></main><div class="floating-actions timer-actions ${widthClass}"><section class="total-card floating-card ${running?'running':''}"><span class="total-icon">${svgIcon('clock')}</span><span class="total-copy"><small>Tempo total</small><strong class="total-time">${fmtDurationWithBlinkingColons(sessionTotal(s),blink)}</strong></span></section><button class="save-btn" id="saveBtn">${svgIcon('check')}<span>Salvar</span></button></div>${modelsDrawer}`);
}

/* Histórico sempre segue a Área/perfil ativo. */
function historyMatchesQuery(s,q){
  const nq=normalizeSearchText(q);if(!nq)return true;if(ui.historyClientId)return s.clientId===ui.historyClientId;
  return [sessionDisplayTitle(s),s.title,s.modelNameSnapshot,clientLabelForSession(s)].some(v=>normalizeSearchText(v).includes(nq));
}
function historyClientSuggestionsMarkup(){
  if(!isClientArea()||!ui.historyQuery.trim()||ui.historyClientId)return '';
  const rs=clientSearchResults(ui.historyQuery);if(!rs.length)return '';
  return `<div class="history-search-suggestions">${rs.slice(0,5).map(c=>`<button data-history-client="${c.id}"><strong>${esc(c.name)}</strong><small>${data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt&&s.clientId===c.id).length} atendimento(s)</small></button>`).join('')}</div>`;
}
function renderHistory(){
  const aid=activeAreaId(),sessions=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt&&sessionAreaId(s)===aid).sort((a,b)=>recordDateMs(b)-recordDateMs(a));
  const filtered=sessions.filter(s=>historyMatchesQuery(s,ui.historyQuery)&&(ui.historyModel==='all'||s.modelId===ui.historyModel)&&(!ui.historyDate||dayKey(recordDateMs(s))===ui.historyDate));
  const groups={};filtered.forEach(s=>{const k=dayKey(recordDateMs(s));(groups[k]??=[]).push(s);});
  const list=Object.entries(groups).map(([k,arr])=>`<div class="history-day">${fmtDate(new Date(k+'T12:00:00').getTime())}</div>${arr.map(s=>{const clientMode=isClientArea(sessionAreaId(s)),title=sessionDisplayTitle(s);return `<button class="history-card" data-session="${s.id}"><div class="top"><strong class="${clientMode?'history-card-client-name':''}">${clientMode?personIconMarkup():''}${esc(title)}</strong>${s.isNoMeasurement?'':`<span class="history-total">${svgIcon('timers')}<span>${fmtDuration(sessionTotal(s,s.savedAt))}</span></span>`}</div><div class="history-meta">${esc(s.modelNameSnapshot||modelById(s.modelId)?.name||'Modelo')} · ${esc(fmtDateTime(recordDateMs(s)))}</div>${s.isNoMeasurement?'<span class="badge">Sem medição</span>':''}${s.restoredAt?'<span class="badge">Restaurado</span>':''}</button>`;}).join('')}`).join('');
  const modelOptions=modelOptionsForActiveArea();const searchPlaceholder=isClientArea()?'Buscar cliente ou registro':'Buscar título ou registro';
  return shell(`<header class="topbar simple section-tab-header history-header"><span></span><div class="section-profile-head">${activeAreaBadge()}<h1>Registros</h1></div><button class="header-pill" id="historyTrash">Apagados</button></header><main class="content history-content"><div class="filters history-filters history-filters-v082"><div class="history-search-wrap"><input id="historySearch" placeholder="${esc(searchPlaceholder)}" value="${esc(ui.historyQuery)}" autocomplete="off">${historyClientSuggestionsMarkup()}</div><select id="historyModel"><option value="all">Todos os modelos desta área</option>${modelOptions.map(m=>`<option value="${m.id}" ${ui.historyModel===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select><div class="date-filter date-filter-v082 ${ui.historyDate?'has-value':''}"><span class="date-placeholder">Filtrar por data</span><input id="historyDate" type="date" value="${esc(ui.historyDate)}">${ui.historyDate?`<button id="historyDateClear" aria-label="Limpar data">${svgIcon('close')}</button>`:''}</div></div>${list||'<div class="empty">Nenhum registro encontrado nesta área.</div>'}</main>`);
}
;

/* Notas e medição no registro salvo. */
function zeroMeasurementStatus(t){return t.measurementStatus==='missing'?'missing':'notNeeded';}
async function setTimerMeasurementStatus(sessionId,timerId,status){const s=data.sessions.find(x=>x.id===sessionId),t=s?.timers.find(x=>x.id===timerId);if(!s||!t)return;t.measurementStatus=status==='missing'?'missing':'notNeeded';await put('sessions',s);render();}
async function restoreIgnoredInterval(sessionId,timerId,index){const s=data.sessions.find(x=>x.id===sessionId),t=s?.timers.find(x=>x.id===timerId);if(!s||!t)return;const item=t.ignoredIntervals?.[Number(index)];if(!item)return;const restored={id:item.id||uid(),startedAt:item.startedAt,endedAt:item.endedAt,origin:item.origin||'restored',restored:true};t.intervals.push(restored);t.ignoredIntervals.splice(Number(index),1);t.measurementStatus='measured';await put('sessions',s);render();}
function savedNotesMarkup(s){
  if(isClientArea(sessionAreaId(s))){const a=String(s.appointmentNote||s.note||'').trim(),c=String(s.clientNote||'').trim();return `${a?`<section class="saved-note-block"><h3>Sobre este atendimento</h3><div class="saved-note-card">${esc(a)}</div></section>`:''}${c?`<section class="saved-note-block"><h3>Sobre a cliente</h3><div class="saved-note-card">${esc(c)}</div></section>`:''}<button class="edit-notes-button" data-edit-dual-notes="${s.id}">${a||c?'Editar anotações':'Adicionar anotações'}</button>`;}
  const n=String(s.note||'').trim();return `${n?`<section class="saved-note-block"><h3>Anotações</h3><div class="saved-note-card">${esc(n)}</div></section>`:''}<button class="edit-notes-button" data-edit-dual-notes="${s.id}">${n?'Editar anotação':'Adicionar anotação'}</button>`;
}
function renderSessionDetail(s){
  const model=modelById(s.modelId),timers=[...(s.timers||[])].sort((a,b)=>(a.order??0)-(b.order??0)),gross=recordGrossMs(s),working=sessionTotal(s,s.savedAt),pauses=pauseTotal(s,s.savedAt),clientMode=isClientArea(sessionAreaId(s));
  const heading=clientMode?clientLabelForSession(s):s.title;
  return `<div class="modal-wrap record-detail-wrap"><section class="sheet record-detail-sheet"><div class="sheet-head record-detail-head"><button class="circle-button glass record-detail-close" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><div class="record-detail-title-stack"><button class="record-title-button" ${clientMode?`data-edit-record-client="${s.id}"`:`data-edit-session-title="${s.id}"`}><span>${esc(heading)}</span>${svgIcon('pencil')}</button><button class="record-date-button" data-edit-record-date="${s.id}">${esc(fmtDateTime(recordDateMs(s)))} ${svgIcon('pencil')}</button></div><button class="record-detail-check" id="closeRecordDetail" aria-label="Concluir">${svgIcon('check')}</button></div><div class="record-detail-body">${savedNotesMarkup(s)}<section class="panel record-summary"><div class="record-context-grid"><div class="record-context-item"><span>Área</span><strong>${esc(areaById(sessionAreaId(s)).name)}</strong><button class="client-record-open" data-reclassify-record="${s.id}">Alterar área</button></div><div class="record-context-item"><span>Modelo de origem</span><strong>${esc(model?(model.deletedAt?'Modelo excluído':model.name):'Modelo excluído')}</strong></div></div>${clientMode?`<div class="row"><span>Cliente</span><strong>${esc(clientLabelForSession(s))}</strong></div>${s.clientId?`<button class="action" data-open-client="${s.clientId}">Ver todas as anotações desta cliente</button>`:''}`:''}${s.isNoMeasurement?'<div class="row"><span class="badge">Sem medição</span></div>':`<div class="row"><span>Tempo bruto</span><strong>${fmtDuration(gross)}</strong></div><div class="row"><span>Tempo trabalhando</span><strong class="detail-time-with-icon">${svgIcon('timers')}<span>${fmtDuration(working)}</span></strong></div><div class="row"><span>Pausas</span><strong>${fmtDuration(pauses)}</strong></div>`}</section>${!model?`<div class="record-actions"><button data-rebuild-model="${s.id}">Criar modelo deste registro</button></div>`:''}<div class="record-timers-list">${timers.map(t=>{const d=timerDuration(t,s.savedAt),zero=d<=0,status=zeroMeasurementStatus(t),ignored=(t.ignoredIntervals||[]);return `<details class="record-timer-card ${zero?'zero':''}"><summary><span class="record-timer-title">${visualMarkerMarkup(t.marker,'record-inline-marker')}${esc(t.name)}${zero&&status==='missing'?'<span class="measurement-missing-badge">Sem medição</span>':''}</span><span class="record-timer-time">${svgIcon('timers')}<strong>${fmtDuration(d)}</strong></span></summary><div class="record-timer-extra">${zero?`<div class="measurement-status-box"><div class="measurement-status-title">Como tratar este zero nas estatísticas?</div><div class="measurement-status-options"><button data-measurement-status="notNeeded" data-session-id="${s.id}" data-timer-id="${t.id}" class="${status==='notNeeded'?'selected':''}">Não foi necessário</button><button data-measurement-status="missing" data-session-id="${s.id}" data-timer-id="${t.id}" class="${status==='missing'?'selected':''}">Sem medição</button></div></div>`:''}${ignored.length?`<div class="ignored-short-note">${ignored.length} toque(s) curto(s) ignorado(s): ${ignored.map((x,i)=>`${Math.round((x.durationMs||0)/1000)} s <button class="restore-short-button" data-restore-short="${s.id}" data-timer-id="${t.id}" data-index="${i}">Restaurar</button>`).join(' · ')}</div>`:''}<div class="muted small record-interval-label">Horários e intervalos</div>${t.intervals?.length?t.intervals.map(i=>`<div class="row small"><span>${fmtDateTime(i.startedAt)}</span><span>${i.endedAt?fmtDateTime(i.endedAt):'aberto'}</span></div>`).join(''):'<div class="muted small">Nenhum intervalo registrado.</div>'}<button class="action" data-correct-time="${s.id}" data-timer-id="${t.id}">Corrigir tempo</button></div></details>`;}).join('')}</div><div class="record-delete-wrap"><button class="record-delete-button" data-delete-session="${s.id}">${trashIconMarkup()}<span>Excluir</span></button></div></div></section></div>`;
}
function renderRecordAreaPicker(sessionId){const s=data.sessions.find(x=>x.id===sessionId);if(!s)return '';return `<div class="area-type-wrap"><section class="area-type-card"><div class="area-type-head"><h2>Alterar área do registro</h2><button class="area-type-close" id="closeRecordAreaPicker">${svgIcon('close')}</button></div><p class="muted small">Cronômetros, tempos e anotações não serão alterados. Apenas a classificação deste registro muda.</p><div class="area-type-options">${getAreas().map(a=>`<button data-record-area-choice="${a.id}" ${sessionAreaId(s)===a.id?'disabled':''}><strong>${esc(a.name)}</strong><small>${esc(areaTypeLabel(a.type))}</small></button>`).join('')}</div></section></div>`;}
async function reclassifyRecordArea(sessionId,areaId){const s=data.sessions.find(x=>x.id===sessionId);if(!s||!getAreas().some(a=>a.id===areaId))return;s.areaId=areaId;await put('sessions',s);ui.modal={type:'session',id:s.id};render();}
function renderNotesEditor(sessionId){const s=data.sessions.find(x=>x.id===sessionId);if(!s)return '';const clientMode=isClientArea(sessionAreaId(s));return `<div class="notes-editor-wrap"><section class="notes-editor-card"><div class="notes-editor-head"><h2>Anotações</h2><button class="notes-editor-close" id="closeNotesEditor">${svgIcon('close')}</button></div><div class="notes-editor-body">${clientMode?`<label>Sobre este atendimento<textarea id="editAppointmentNote">${esc(s.appointmentNote||s.note||'')}</textarea></label><label>Sobre a cliente<textarea id="editClientNote">${esc(s.clientNote||'')}</textarea></label>`:`<label>Anotação<textarea id="editAppointmentNote">${esc(s.note||'')}</textarea></label>`}</div><button class="notes-editor-save" id="saveNotesEditor">Salvar anotações</button></section></div>`;}
async function saveNotesEditor(){const s=data.sessions.find(x=>x.id===ui.modal?.sessionId);if(!s)return;const a=document.getElementById('editAppointmentNote')?.value||'',c=document.getElementById('editClientNote')?.value||'';if(isClientArea(sessionAreaId(s))){s.appointmentNote=a;s.note=a;s.clientNote=c;}else s.note=a;await put('sessions',s);ui.modal={type:'session',id:s.id};render();}
function renderSessionMenu(){const s=data.current,clientMode=isClientArea(sessionAreaId(s));const noteCard=clientMode?`<section class="sheet-card notes-detail-card"><div class="dual-notes"><div class="note-block"><label for="currentAppointmentNote">Sobre este atendimento</label><textarea id="currentAppointmentNote" rows="1">${esc(s.appointmentNote||s.note||'')}</textarea></div><div class="note-block"><label for="currentClientNote">Sobre a cliente</label><textarea id="currentClientNote" rows="1">${esc(s.clientNote||'')}</textarea></div></div></section>`:`<section class="sheet-card notes-detail-card"><textarea id="currentNote" class="notes-box" rows="1" placeholder="Notas">${esc(s.note||'')}</textarea></section>`;return `<div class="modal-wrap"><section class="sheet details-sheet" role="dialog" aria-modal="true"><div class="sheet-head liquid-head"><button class="circle-button glass detail-close-button" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><h2>Detalhes</h2><span class="sheet-spacer"></span></div><div class="sheet-body">${noteCard}<h3 class="detail-section-label">Tamanho dos cronômetros</h3><section class="sheet-card timer-size-detail-card"><div class="detail-size-options animation-speed-options" role="group" aria-label="Tamanho dos cronômetros"><button data-timer-size="small" class="${data.settings.timerSize==='small'?'selected':''}">Pequeno</button><button data-timer-size="medium" class="${data.settings.timerSize==='medium'?'selected':''}">Médio</button><button data-timer-size="large" class="${data.settings.timerSize==='large'?'selected':''}">Grande</button></div></section><section class="sheet-card detail-action-card"><button class="detail-action" id="menuCustomize">Reordenar cronômetros</button></section><section class="sheet-card detail-action-card"><button class="detail-action" id="saveAsNewModel">Salvar como novo modelo</button></section></div></section></div>`;}
;

/* Estatísticas: Área ativa, zero legítimo e sem medição separados. */
function statsTimerData(ss){
  const map=new Map();
  ss.forEach(s=>(s.timers||[]).forEach(t=>{const key=t.templateId||`adhoc:${normalizeSearchText(t.name)}`,d=timerDuration(t,s.savedAt),status=d>0?'measured':zeroMeasurementStatus(t),x=map.get(key)||{name:t.name,necessary:[],impact:[],missing:0,notNeeded:0,seen:0,total:0};x.seen++;if(status==='missing'){x.missing++;map.set(key,x);return;}if(d>0){x.necessary.push(d);x.impact.push(d);x.total+=d;}else{x.notNeeded++;x.impact.push(0);}map.set(key,x);}));return [...map.values()].sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'pt-BR'));
}
function renderStats(){
  const aid=activeAreaId(),ss=validMeasuredSessions().filter(s=>sessionAreaId(s)===aid),count=ss.length,total=ss.reduce((a,s)=>a+sessionTotal(s,s.savedAt),0),avg=count?total/count:0,timers=statsTimerData(ss);let trend='Sem dados suficientes';
  if(ss.length>=2){const ordered=[...ss].sort((a,b)=>recordDateMs(a)-recordDateMs(b)),half=Math.max(1,Math.floor(ordered.length/2)),a=ordered.slice(0,half).reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/half,bArr=ordered.slice(-half),b=bArr.reduce((x,s)=>x+sessionTotal(s,s.savedAt),0)/bArr.length,pct=a?((b-a)/a*100):0;trend=pct<0?`${Math.abs(pct).toFixed(1).replace('.',',')}% mais rápido`:`${pct.toFixed(1).replace('.',',')}% mais lento`;}
  const metricRows=timers.map(x=>{const necessary=x.necessary.length?x.necessary.reduce((a,b)=>a+b,0)/x.necessary.length:null,impact=x.impact.length?x.impact.reduce((a,b)=>a+b,0)/x.impact.length:null,pct=x.seen?x.notNeeded/x.seen*100:0;return `<div class="timer-metric-row"><div class="metric-main"><span>${esc(x.name)}</span><strong>${necessary==null?'—':fmtDuration(necessary)}</strong></div><small>Média quando necessário · impacto médio ${impact==null?'—':fmtDuration(impact)} · não foi necessário ${pct.toFixed(0)}%${x.missing?` · ${x.missing} sem medição`:''}</small></div>`;}).join('')||'<div class="muted">Sem dados.</div>';
  const clientSection=isClientArea(aid)?(()=>{const clients=new Map();ss.forEach(s=>{if(!s.clientId)return;const x=clients.get(s.clientId)||{name:clientLabelForSession(s),count:0,total:0};x.count++;x.total+=sessionTotal(s,s.savedAt);clients.set(s.clientId,x);});return statsSection('Clientes',[...clients.entries()].sort((a,b)=>b[1].count-a[1].count).map(([id,x])=>`<div class="row"><button class="client-record-open" data-open-client="${id}">${esc(x.name)}</button><strong>${x.count} · média ${fmtDuration(x.total/x.count)}</strong></div>`).join('')||'<div class="muted">Nenhuma cliente vinculada.</div>');})():'';
  const sections=count?[statsSection('Resumo',`<div class="row"><span>Registros medidos</span><strong>${count}</strong></div><div class="row"><span>Tempo acumulado</span><strong>${fmtDuration(total)}</strong></div><div class="row"><span>Média por registro</span><strong>${fmtDuration(avg)}</strong></div>`),clientSection,statsSection('Cronômetros — médias e frequência',metricRows),statsSection('Tempo total por registro',[...ss].sort((a,b)=>recordDateMs(b)-recordDateMs(a)).slice(0,12).map(s=>`<div class="row"><span>${esc(sessionDisplayTitle(s))}</span><strong>${fmtDuration(sessionTotal(s,s.savedAt))}</strong></div>`).join('')),statsSection('Evolução / tendência',`<div class="row"><span>Comparação entre metades do período</span><strong>${esc(trend)}</strong></div>`)].filter(Boolean).join(''):'';
  return shell(`<header class="topbar section-tab-header"><div class="section-profile-head">${activeAreaBadge()}<h1>Estatísticas</h1></div></header><main class="content"><h2 class="section-title">Visão geral</h2>${count?`<div class="stats-grid">${sections}</div>`:`<div class="empty">As estatísticas aparecerão depois que você salvar registros com medição nesta área.</div>`}</main>`);
}
async function saveSession(){
  const s=data.current;if(!s)return false;const t=now();if(s.globalPaused){s.globalPaused=false;s.pausedActiveTimerIds=[];}
  s.timers.forEach(rt=>{const oi=openInterval(rt);if(oi){oi.endedAt=t;maybeIgnoreShortInterval(rt,oi);}rt.measurementStatus=timerDuration(rt,t)>0?'measured':(rt.measurementStatus==='missing'?'missing':'notNeeded');});endPause(s,t);
  const measured=sessionTotal(s,t)>0;const clientMode=isClientArea(sessionAreaId(s));
  if(clientMode){s.appointmentNote=s.appointmentNote??s.note??'';s.note=s.appointmentNote;s.clientNote=s.clientNote||'';s.clientNameSnapshot=clientById(s.clientId)?.name||s.clientNameSnapshot||'';if(!s.manualTitle)s.title=clientLabelForSession(s);}
  if(!measured){const hasNote=clientMode?String(s.appointmentNote||s.clientNote||'').trim():String(s.note||'').trim();if(!hasNote){const raw=await iosTextPrompt({title:'Registro sem medição',message:'Escreva uma anotação para explicar este registro antes de salvar.',placeholder:'Anotação',confirmText:'Salvar',multiline:true});const note=String(raw??'').trim();if(!note){alert('Uma anotação é necessária para salvar um registro sem nenhuma medição.');return false;}if(clientMode){s.appointmentNote=note;s.note=note;}else s.note=note;}s.isNoMeasurement=true;}
  if(!clientMode&&!s.manualTitle)s.title=`(sem título) ${fmtDateTime(s.firstTimerStartedAt??s.openedAt)}`;
  s.areaId=sessionAreaId(s)||activeAreaId();s.savedAt=t;s.originalRecordedAt=s.firstTimerStartedAt??s.openedAt;s.status='saved';
  const adhoc=s.timers.filter(x=>x.isAdhoc),model=modelById(s.modelId);if(adhoc.length&&model){for(const rt of adhoc){if(confirm(`Incorporar “${rt.name}” ao modelo “${model.name}” para os próximos registros?`)){const templ={id:uid(),name:rt.name,order:model.timers.filter(x=>!x.removedAt).length,createdAt:t,removedAt:null,marker:clone(rt.marker||null)};model.timers.push(templ);model.updatedAt=t;rt.templateId=templ.id;rt.isAdhoc=false;await put('models',model);}}}
  await put('sessions',clone(s));data.sessions.unshift(clone(s));const sameModel=modelById(s.modelId);data.current=sameModel?newSession(sameModel):null;await putState('current',data.current);data.settings.activeAreaId=s.areaId;await persistSettings();stopTimerLoopAudio();haptic('save');render();showSavedConfirmation();return true;
}
function renderSettings(){
  ui.settingsView=ui.settingsView||'main';if(ui.settingsView==='appearance')return renderAppearanceSettings();if(ui.settingsView==='advanced')return renderAdvancedSettings();
  const areas=getAreas();const soundName=data.settings.timerSoundName||'Nenhum áudio escolhido';
  return shell(`<header class="topbar section-tab-header"><h1>Ajustes</h1></header><main class="settings-content"><section class="settings-section sound-section"><h3 class="section-label">Som do cronômetro</h3><div class="settings-card sound-settings-card"><button class="settings-row button-row" id="toggleTimerSound"><span>Som durante a contagem</span><span class="ios-switch ${data.settings.timerSoundEnabled?'on':''}" aria-hidden="true"></span></button><label class="settings-row button-row accent-button-row" for="timerSoundFile"><span>Escolher áudio</span><input id="timerSoundFile" class="sr-only" type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,.mp3,.m4a,.wav"></label><div class="settings-row audio-file-row"><span>Arquivo</span><span class="audio-file-name">${esc(soundName)}</span></div>${data.settings.timerSoundData?`<div class="settings-row volume-row"><label for="timerSoundVolume">Volume</label><input id="timerSoundVolume" type="range" min="0" max="100" value="${Math.round(data.settings.timerSoundVolume*100)}"><span>${Math.round(data.settings.timerSoundVolume*100)}%</span></div><button class="settings-row button-row" id="removeTimerSound"><span>Remover áudio</span></button>`:''}</div></section><section class="settings-section"><h3 class="section-label">Áreas / perfis</h3><div class="settings-card"><div class="settings-row"><span>Área ativa</span><strong>${esc(activeArea().name)}</strong></div>${areas.map(a=>`<div class="settings-row area-manage-row"><span><strong>${esc(a.name)}</strong><span class="area-type-pill">${esc(areaTypeLabel(a.type))}</span></span><span class="area-actions"><button data-rename-area="${a.id}">Renomear</button><button data-change-area-type="${a.id}">Tipo</button>${a.id!=='general'?`<button class="danger" data-delete-area="${a.id}">Excluir</button>`:''}</span></div>`).join('')}<button class="settings-row button-row accent-button-row" id="addArea"><span>Adicionar área</span></button></div></section>${areas.some(a=>a.type==='clients')?`<section class="settings-section"><h3 class="section-label">Clientes</h3><div class="settings-card"><button class="settings-row button-row" id="editClientEmptyLabel"><span>Texto quando não houver cliente</span><span class="secondary-value">${esc(data.settings.clientEmptyLabel||'Sem cliente')}</span></button></div></section>`:''}<section class="settings-section"><h3 class="section-label">Aparência</h3><div class="settings-card settings-navigation-card"><button class="settings-row button-row" id="openAppearanceSettings"><span>Aparência e personalização</span><span>${svgIcon('back')}</span></button></div></section><section class="settings-section"><h3 class="section-label">Dados</h3><div class="settings-card"><button class="settings-row button-row accent-button-row" id="exportJson"><span>Exportar arquivo completo de dados</span></button><label class="settings-row button-row accent-button-row" for="importJsonFile"><span>Restaurar backup JSON</span><input id="importJsonFile" class="sr-only" type="file" accept="application/json,.json"></label><button class="settings-row button-row accent-button-row" id="exportCsv"><span>Exportar CSV</span></button><button class="settings-row button-row accent-button-row" id="exportPdf"><span>Exportar PDF</span></button></div></section><section class="settings-section"><div class="settings-card"><div class="settings-row"><span>Versão</span><span class="secondary-value">${esc(APP_META.version)}</span></div></div></section></main>`);
}
function renderAppearanceSettings(){
  const base=(()=>{const presets=UI_CONFIG.themePresets||[],speeds=Object.values(UI_CONFIG.animationSpeeds||{}),iconSizes=Object.values(UI_CONFIG.activeIconSizes||{}),customSelected=data.settings.colorTheme==='custom',currentIconName=data.settings.activeTimerIconSource==='default'?'DVD':(data.settings.activeTimerIconName||'Personalizado'),speedRow=data.settings.animateActiveTimerIcon?`<div class="settings-row animation-speed-row"><div class="animation-speed-options" role="group">${speeds.map(sp=>`<button data-animation-speed="${esc(sp.id)}" class="${data.settings.activeTimerAnimationSpeed===sp.id?'selected':''}">${esc(sp.name)}</button>`).join('')}</div></div>`:'';return `<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeAppearanceSettings">${svgIcon('back')}</button><h1>Aparência</h1><span></span></header><main class="settings-content"><section class="settings-section"><h3 class="section-label">Tema</h3><div class="settings-card color-card"><div class="theme-presets horizontal-themes">${presets.map(p=>`<button class="theme-preset ${data.settings.colorTheme===p.id?'selected':''}" data-color-theme="${esc(p.id)}"><span class="theme-dot" style="--theme-accent:${esc(p.accent)};--theme-action:${esc(p.action)}"></span><span>${esc(p.name)}</span></button>`).join('')}<button class="theme-preset ${customSelected?'selected':''}" data-color-theme="custom"><span class="theme-dot custom-dot" style="--theme-accent:${esc(data.settings.accentColor||'#007AFF')};--theme-action:${esc(data.settings.accentColor||'#007AFF')}"></span><span>Personalizada</span></button></div>${customSelected?`<div class="custom-theme-row"><input id="accentCustom" type="color" value="${esc(data.settings.accentColor||'#007AFF')}"><span>${esc((data.settings.accentColor||'#007AFF').toUpperCase())}</span></div>`:''}</div></section><section class="settings-section"><div class="settings-card"><label class="settings-row" for="themeSelect"><span>Modo</span><span class="select-wrap"><select id="themeSelect"><option value="system" ${data.settings.theme==='system'?'selected':''}>Sistema</option><option value="light" ${data.settings.theme==='light'?'selected':''}>Claro</option><option value="dark" ${data.settings.theme==='dark'?'selected':''}>Escuro</option></select><span class="chevrons">${svgIcon('chevrons')}</span></span></label></div></section><section class="settings-section"><h3 class="section-label">Ícone do cronômetro ativo</h3><div class="settings-card active-icon-source-card"><div class="settings-row"><span>Ícone atual</span><span class="secondary-value">${esc(currentIconName)}</span></div><label class="settings-row button-row accent-button-row" for="activeIconFile"><span>Escolher SVG ou PNG</span><input id="activeIconFile" class="sr-only" type="file" accept="image/svg+xml,image/png,.svg,.png"></label><button class="settings-row button-row accent-button-row" id="pasteSvgCode"><span>Colar código SVG</span></button><button class="settings-row button-row accent-button-row" id="pasteSvgUrl"><span>Colar link SVG</span></button>${data.settings.activeTimerIconSource!=='default'?`<button class="settings-row button-row" id="restoreDefaultActiveIcon"><span>Restaurar DVD</span></button>`:''}</div></section><section class="settings-section"><div class="settings-card icon-size-settings-card"><div class="settings-row compact-title-row"><strong>Tamanho do ícone</strong></div><div class="settings-row animation-speed-row"><div class="animation-speed-options four-options">${iconSizes.map(sz=>`<button data-active-icon-size="${esc(sz.id)}" class="${data.settings.activeTimerIconSize===sz.id?'selected':''}">${esc(sz.name)}</button>`).join('')}</div></div></div></section><section class="settings-section"><div class="settings-card animation-settings-card"><button class="settings-row button-row" id="toggleActiveTimerAnimation"><span>Animar ícone do cronômetro ativo</span><span class="ios-switch ${data.settings.animateActiveTimerIcon?'on':''}"></span></button>${speedRow}</div></section><section class="settings-section"><div class="settings-card"><button class="settings-row button-row" id="toggleTotalColonBlink"><span>Piscar os dois pontos do tempo total</span><span class="ios-switch ${data.settings.blinkTotalColon?'on':''}"></span></button><button class="settings-row button-row" id="toggleVersionBadge"><span>Mostrar versão no topo</span><span class="ios-switch ${data.settings.showVersionBadge?'on':''}"></span></button></div></section><section class="settings-section"><h3 class="section-label">Avançado</h3><div class="settings-card settings-navigation-card"><button class="settings-row button-row" id="openAdvancedSettings"><span>Personalização avançada</span><span>${svgIcon('back')}</span></button></div></section></main>`;})();return shell(base);
}
function renderAdvancedSettings(){
  const pct=n=>Math.round(Number(n||1)*100);return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeAdvancedSettings">${svgIcon('back')}</button><h1>Personalização avançada</h1><span></span></header><main class="settings-content"><section class="settings-section"><h3 class="section-label">Interface</h3><div class="settings-card advanced-settings-grid"><div class="advanced-setting"><div class="advanced-setting-head"><strong>Tamanho geral dos textos</strong><span>${pct(data.settings.uiTextScale)}%</span></div><input id="uiTextScale" type="range" min="90" max="112" value="${pct(data.settings.uiTextScale)}"></div><div class="advanced-setting"><div class="advanced-setting-head"><strong>Tamanho dos cartões</strong><span>${pct(data.settings.uiCardScale)}%</span></div><input id="uiCardScale" type="range" min="90" max="112" value="${pct(data.settings.uiCardScale)}"></div><div class="advanced-setting"><div class="advanced-setting-head"><strong>Tamanho dos ícones</strong><span>${pct(data.settings.uiIconScale)}%</span></div><input id="uiIconScale" type="range" min="90" max="120" value="${pct(data.settings.uiIconScale)}"></div><div class="advanced-setting"><div class="advanced-setting-head"><strong>Densidade</strong><span></span></div><div class="advanced-segment">${[['compact','Compacta'],['standard','Padrão'],['spacious','Espaçosa']].map(([id,l])=>`<button data-ui-density="${id}" class="${data.settings.uiDensity===id?'selected':''}">${l}</button>`).join('')}</div></div><div class="advanced-setting"><div class="advanced-setting-head"><strong>Fonte</strong><span>opções testadas</span></div><div class="advanced-segment two"><button data-ui-font="system" class="${data.settings.uiFontPreset==='system'?'selected':''}">Sistema / iOS</button><button data-ui-font="rounded" class="${data.settings.uiFontPreset==='rounded'?'selected':''}">Arredondada</button></div></div></div></section><section class="settings-section"><h3 class="section-label">Cronometragem</h3><div class="settings-card"><button class="settings-row button-row" id="toggleIgnoreShort"><span>Ignorar toques muito curtos</span><span class="ios-switch ${data.settings.ignoreShortMeasurements?'on':''}"></span></button><div class="advanced-setting"><div class="advanced-setting-head"><strong>Tempo mínimo válido</strong><span>${data.settings.shortMeasurementThresholdSec}s</span></div><input id="shortThreshold" type="range" min="1" max="30" value="${data.settings.shortMeasurementThresholdSec}" ${data.settings.ignoreShortMeasurements?'':'disabled'}></div></div></section></main>`);
}
async function exportCSV(){const rows=[['sessionId','area','areaType','cliente','originalRecordedAt','savedAt','title','modelId','model','recordedTimerId','cronometro','statusMedicao','duracaoMs','tempoTrabalhandoMs','pausasMs','anotacaoAtendimento','anotacaoCliente']];data.sessions.filter(s=>s.status==='saved').forEach(s=>(s.timers||[]).forEach(t=>rows.push([s.id,areaById(sessionAreaId(s)).name,areaType(sessionAreaId(s)),clientLabelForSession(s),new Date(recordDateMs(s)).toISOString(),new Date(s.savedAt).toISOString(),s.title,s.modelId,s.modelNameSnapshot,t.id,t.name,timerDuration(t,s.savedAt)>0?'medido':zeroMeasurementStatus(t),timerDuration(t,s.savedAt),sessionTotal(s,s.savedAt),pauseTotal(s,s.savedAt),s.appointmentNote||s.note||'',s.clientNote||''])));await shareFile(`cronometro-${dayKey(now())}.csv`,'text/csv;charset=utf-8','\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\n'));}
;

/* Eventos v0.8.2 */
function bindV082Events(){
  const byId=id=>document.getElementById(id);
  document.querySelectorAll('[data-activate-area]').forEach(b=>b.onclick=e=>{e.stopPropagation();activateArea(b.dataset.activateArea);});
  if(byId('currentTitleButton')&&isClientArea(sessionAreaId(data.current)))byId('currentTitleButton').onclick=()=>{ui.popover=null;ui.modal={type:'clientPicker',target:'current'};render();};
  document.querySelectorAll('[data-edit-record-client]').forEach(b=>b.onclick=()=>{ui.modal={type:'clientPicker',target:'saved',sessionId:b.dataset.editRecordClient};render();});
  document.querySelectorAll('[data-open-client]').forEach(b=>b.onclick=()=>{ui.modal={type:'clientProfile',clientId:b.dataset.openClient};render();});
  document.querySelectorAll('[data-open-client-record]').forEach(b=>b.onclick=()=>{ui.modal={type:'session',id:b.dataset.openClientRecord};render();});
  document.querySelectorAll('[data-edit-dual-notes]').forEach(b=>b.onclick=()=>{ui.modal={type:'notesEditor',sessionId:b.dataset.editDualNotes};render();});
  document.querySelectorAll('[data-reclassify-record]').forEach(b=>b.onclick=()=>{ui.modal={type:'recordAreaPicker',sessionId:b.dataset.reclassifyRecord};render();});
  document.querySelectorAll('[data-measurement-status]').forEach(b=>b.onclick=()=>setTimerMeasurementStatus(b.dataset.sessionId,b.dataset.timerId,b.dataset.measurementStatus));
  document.querySelectorAll('[data-restore-short]').forEach(b=>b.onclick=()=>restoreIgnoredInterval(b.dataset.restoreShort,b.dataset.timerId,b.dataset.index));
  document.querySelectorAll('[data-history-client]').forEach(b=>b.onclick=()=>{const c=clientById(b.dataset.historyClient);if(!c)return;ui.historyClientId=c.id;ui.historyQuery=c.name;render();});
  if(byId('historySearch'))byId('historySearch').oninput=e=>{ui.historyQuery=e.target.value;ui.historyClientId=null;render();};
  const ap=byId('currentAppointmentNote');if(ap){autoGrowTextarea(ap);ap.oninput=e=>{autoGrowTextarea(e.target);data.current.appointmentNote=e.target.value;data.current.note=e.target.value;clearTimeout(ap._tm);ap._tm=setTimeout(()=>persistCurrent(),180);};}
  const cn=byId('currentClientNote');if(cn){autoGrowTextarea(cn);cn.oninput=e=>{autoGrowTextarea(e.target);data.current.clientNote=e.target.value;clearTimeout(cn._tm);cn._tm=setTimeout(()=>persistCurrent(),180);};}
  if(byId('openAdvancedSettings'))byId('openAdvancedSettings').onclick=()=>{ui.settingsView='advanced';render();};
  if(byId('closeAdvancedSettings'))byId('closeAdvancedSettings').onclick=()=>{ui.settingsView='appearance';render();};
  if(byId('editClientEmptyLabel'))byId('editClientEmptyLabel').onclick=async()=>{const raw=await iosTextPrompt({title:'Texto sem cliente',message:'Esse texto aparece quando nenhum cliente estiver vinculado.',value:data.settings.clientEmptyLabel||'Sem cliente',placeholder:'Sem cliente'});const v=String(raw??'').trim();if(v){data.settings.clientEmptyLabel=v;await persistSettings();render();}};
  document.querySelectorAll('[data-change-area-type]').forEach(b=>b.onclick=()=>{const a=areaById(b.dataset.changeAreaType);ui.modal={type:'areaTypeExisting',areaId:a.id,pendingAreaName:a.name};render();});
  if(byId('modelAreaSelect'))byId('modelAreaSelect').onchange=async e=>{const m=modelById(ui.modal?.id);if(!m)return;m.areaId=e.target.value;m.updatedAt=now();await put('models',m);if(data.current?.modelId===m.id){data.current.areaId=m.areaId;await persistCurrent();data.settings.activeAreaId=m.areaId;await persistSettings();}render();};
  const rangeBind=(id,key,div=100)=>{const el=byId(id);if(!el)return;el.oninput=e=>{data.settings[key]=Number(e.target.value)/div;applyTheme();const label=e.target.closest('.advanced-setting')?.querySelector('.advanced-setting-head span:last-child');if(label)label.textContent=`${e.target.value}%`;};el.onchange=async()=>persistSettings();};
  rangeBind('uiTextScale','uiTextScale');rangeBind('uiCardScale','uiCardScale');rangeBind('uiIconScale','uiIconScale');
  document.querySelectorAll('[data-ui-density]').forEach(b=>b.onclick=async()=>{data.settings.uiDensity=b.dataset.uiDensity;await persistSettings();render();});
  document.querySelectorAll('[data-ui-font]').forEach(b=>b.onclick=async()=>{data.settings.uiFontPreset=b.dataset.uiFont;await persistSettings();render();});
  if(byId('toggleIgnoreShort'))byId('toggleIgnoreShort').onclick=async()=>{data.settings.ignoreShortMeasurements=!data.settings.ignoreShortMeasurements;await persistSettings();render();};
  if(byId('shortThreshold')){byId('shortThreshold').oninput=e=>{data.settings.shortMeasurementThresholdSec=Number(e.target.value);const label=e.target.closest('.advanced-setting')?.querySelector('.advanced-setting-head span:last-child');if(label)label.textContent=`${e.target.value}s`;};byId('shortThreshold').onchange=()=>persistSettings();}
}
const __renderV082Base=render;let __v082Migrated=false;let __v082MigrationPromise=null;
function __renderV082Enhanced(){
  __renderV082Base();
  if(ui.modal?.type==='clientPicker')$app.insertAdjacentHTML('beforeend',renderClientPicker());
  if(ui.modal?.type==='clientProfile')$app.insertAdjacentHTML('beforeend',renderClientProfile(ui.modal.clientId));
  if(ui.modal?.type==='notesEditor')$app.insertAdjacentHTML('beforeend',renderNotesEditor(ui.modal.sessionId));
  if(ui.modal?.type==='recordAreaPicker')$app.insertAdjacentHTML('beforeend',renderRecordAreaPicker(ui.modal.sessionId));
  if(ui.modal?.type==='areaTypeNew'||ui.modal?.type==='areaTypeExisting')$app.insertAdjacentHTML('beforeend',renderAreaTypeChooser(ui.modal.pendingAreaName,ui.modal.areaId));
  applyTheme();
  if(ui.modal?.type==='clientPicker'){const wrap=document.querySelector('.client-picker-wrap'),detach=fitPromptToVisualViewport(wrap);wrap._detach=detach;fillClientPickerList('');const input=document.getElementById('clientPickerSearch');if(input){input.oninput=e=>fillClientPickerList(e.target.value);setTimeout(()=>input.focus({preventScroll:true}),50);}if(document.getElementById('closeClientPicker'))document.getElementById('closeClientPicker').onclick=()=>{detach();closeClientPicker();};wrap.onclick=e=>{if(e.target===wrap){detach();closeClientPicker();}};}
  if(ui.modal?.type==='clientProfile'){const wrap=document.querySelector('.client-profile-wrap');document.getElementById('closeClientProfile')?.addEventListener('click',()=>{ui.modal=null;render();});wrap?.addEventListener('click',e=>{if(e.target===wrap){ui.modal=null;render();}});}
  if(ui.modal?.type==='notesEditor'){const wrap=document.querySelector('.notes-editor-wrap'),detach=fitPromptToVisualViewport(wrap);document.getElementById('closeNotesEditor')?.addEventListener('click',()=>{detach();ui.modal={type:'session',id:ui.modal.sessionId};render();});document.getElementById('saveNotesEditor')?.addEventListener('click',()=>{detach();saveNotesEditor();});wrap?.addEventListener('click',e=>{if(e.target===wrap){detach();ui.modal={type:'session',id:ui.modal.sessionId};render();}});}
  if(ui.modal?.type==='recordAreaPicker'){const wrap=document.querySelector('.area-type-wrap');document.getElementById('closeRecordAreaPicker')?.addEventListener('click',()=>{ui.modal={type:'session',id:ui.modal.sessionId};render();});document.querySelectorAll('[data-record-area-choice]').forEach(b=>b.onclick=()=>reclassifyRecordArea(ui.modal.sessionId,b.dataset.recordAreaChoice));wrap?.addEventListener('click',e=>{if(e.target===wrap){ui.modal={type:'session',id:ui.modal.sessionId};render();}});}
  if(ui.modal?.type==='areaTypeNew'||ui.modal?.type==='areaTypeExisting'){const wrap=document.querySelector('.area-type-wrap');document.getElementById('closeAreaType')?.addEventListener('click',()=>{ui.modal=null;render();});document.querySelectorAll('[data-area-type-choice]').forEach(b=>b.onclick=()=>ui.modal.type==='areaTypeNew'?createAreaWithType(ui.modal.pendingAreaName,b.dataset.areaTypeChoice):changeAreaType(ui.modal.areaId,b.dataset.areaTypeChoice));wrap?.addEventListener('click',e=>{if(e.target===wrap){ui.modal=null;render();}});}
  bindV082Events();
}
render=function(){if(__v082Migrated)return __renderV082Enhanced();if(__v082MigrationPromise)return;if(!db||!data||!data.settings||!Array.isArray(data.models))return __renderV082Enhanced();__v082MigrationPromise=migrateV082Data().then(()=>{__v082Migrated=true;__v082MigrationPromise=null;__renderV082Enhanced();}).catch(err=>{__v082MigrationPromise=null;console.error('Falha na migração v0.8.2',err);__renderV082Enhanced();});};
setTimeout(()=>{if(!$app?.querySelector?.('.boot-message')&&!__v082Migrated)render();},0);
;

/* v0.8.3 — correções visuais e de layout. */
globalThis.APP_META=Object.freeze({version:'0.8.3',dataSchemaVersion:5,factoryDataVersion:1});
;

/* v0.8.4 — laboratório integrado da barra inferior */
globalThis.APP_META=Object.freeze({version:'0.8.4',dataSchemaVersion:5,factoryDataVersion:1});

const BOTTOM_BAR_LAB_DEFAULTS={widthPercent:93,offsetX:0,bottom:18,height:50,padding:1.5,gap:6,radius:999,backgroundLight:'#F2F2F2',backgroundDark:'#1C1C1E',backgroundOpacity:.53,blur:7,saturation:100,brightness:100,borderWidth:.75,borderLight:'#FFFFFF',borderDark:'#474747',borderOpacity:1,shadow1Enabled:true,shadow1X:0,shadow1Y:12,shadow1Blur:34,shadow1Spread:0,shadow1Opacity:.19,shadow2Enabled:true,shadow2X:0,shadow2Y:2,shadow2Blur:10,shadow2Spread:0,shadow2Opacity:.185,pillLight:'#EBEBEB',pillDark:'#3A3A3C',pillOpacity:1,pillRadius:999,itemPadX:3,itemPadY:0,iconSize:35,iconStroke:1.5,iconLight:'#333333',iconDark:'#C2C2C2',activeIconLight:'#007AFF',activeIconDark:'#0A84FF',iconOffsetY:0,inactiveOpacity:1,activeOpacity:1,showLabels:false,labelSize:10,labelWeight:600,labelActiveWeight:700,labelGap:0,animationEnabled:true,animationType:'scale',animationDuration:180,activeScale:1,pressScale:.97};
function labClone(o){return JSON.parse(JSON.stringify(o));}
function normalizeBottomBarLab(raw){const src=raw&&typeof raw==='object'?raw:{};return {enabled:!!src.enabled,config:{...BOTTOM_BAR_LAB_DEFAULTS,...(src.config&&typeof src.config==='object'?src.config:{})}};}
function rgbaHex(hex,alpha=1){const h=String(hex||'#000000').replace('#','').trim();const x=h.length===3?h.split('').map(c=>c+c).join(''):h.padEnd(6,'0').slice(0,6);const n=parseInt(x,16);if(!Number.isFinite(n))return `rgba(0,0,0,${Math.max(0,Math.min(1,alpha))})`;return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${Math.max(0,Math.min(1,Number(alpha)||0))})`;}
function labShadow(enabled,x,y,blur,spread,opacity){return enabled?`${Number(x)||0}px ${Number(y)||0}px ${Math.max(0,Number(blur)||0)}px ${Number(spread)||0}px rgba(0,0,0,${Math.max(0,Math.min(.7,Number(opacity)||0))})`:'none';}
function labGetDraft(){if(!ui.bottomBarLabDraft)ui.bottomBarLabDraft=labClone(normalizeBottomBarLab(data.settings.bottomBarLab).config);return ui.bottomBarLabDraft;}
function labGetPath(obj,path){return path.split('.').reduce((a,k)=>a?.[k],obj);}
function labSetPath(obj,path,value){const p=path.split('.');let x=obj;for(let i=0;i<p.length-1;i++){if(!x[p[i]]||typeof x[p[i]]!=='object')x[p[i]]={};x=x[p[i]];}x[p.at(-1)]=value;}
function removeLabVars(){const root=document.documentElement;['--lab-tabbar-width','--lab-tabbar-offset-x','--lab-tabbar-blur','--lab-tabbar-saturation','--lab-tabbar-brightness','--lab-tab-pill-radius','--lab-item-pad-x','--lab-item-pad-y','--lab-label-gap','--lab-active-icon-color','--lab-inactive-opacity','--lab-active-opacity','--lab-active-scale','--lab-press-scale','--lab-icon-offset-y','--lab-label-size','--lab-label-weight','--lab-label-active-weight','--lab-animation-duration'].forEach(k=>root.style.removeProperty(k));root.classList.remove('bottom-bar-labels-on');delete root.dataset.labAnimation;}
function applyBottomBarLabToDocument(){const root=document.documentElement,lab=normalizeBottomBarLab(data.settings.bottomBarLab),c=lab.config;root.classList.toggle('bottom-bar-lab-enabled',lab.enabled);if(!lab.enabled){removeLabVars();return;}root.classList.toggle('bottom-bar-labels-on',!!c.showLabels);root.dataset.labAnimation=c.animationEnabled?(c.animationType||'scale'):'none';const vars={'--light-tabbar-bg':rgbaHex(c.backgroundLight,c.backgroundOpacity),'--dark-tabbar-bg':rgbaHex(c.backgroundDark,c.backgroundOpacity),'--light-tabbar-border':rgbaHex(c.borderLight,c.borderOpacity),'--dark-tabbar-border':rgbaHex(c.borderDark,c.borderOpacity),'--light-tabbar-icon':c.iconLight,'--dark-tabbar-icon':c.iconDark,'--light-tabbar-selected-bg':rgbaHex(c.pillLight,c.pillOpacity),'--dark-tabbar-selected-bg':rgbaHex(c.pillDark,c.pillOpacity),'--tabbar-bottom':`${c.bottom}px`,'--tabbar-height':`${c.height}px`,'--tabbar-padding':`${c.padding}px`,'--tabbar-gap':`${c.gap}px`,'--tabbar-radius':`${c.radius}px`,'--tabbar-border-width':`${c.borderWidth}px`,'--tabbar-shadow':`${labShadow(c.shadow1Enabled,c.shadow1X,c.shadow1Y,c.shadow1Blur,c.shadow1Spread,c.shadow1Opacity)}, ${labShadow(c.shadow2Enabled,c.shadow2X,c.shadow2Y,c.shadow2Blur,c.shadow2Spread,c.shadow2Opacity)}`,'--tab-icon':`${c.iconSize}px`,'--tab-icon-stroke':c.iconStroke,'--lab-tabbar-width':`${c.widthPercent}%`,'--lab-tabbar-offset-x':`${c.offsetX}px`,'--lab-tabbar-blur':`${c.blur}px`,'--lab-tabbar-saturation':Math.max(0,c.saturation)/100,'--lab-tabbar-brightness':Math.max(0,c.brightness)/100,'--lab-tab-pill-radius':`${c.pillRadius}px`,'--lab-item-pad-x':`${c.itemPadX}px`,'--lab-item-pad-y':`${c.itemPadY}px`,'--lab-label-gap':`${c.labelGap}px`,'--lab-inactive-opacity':c.inactiveOpacity,'--lab-active-opacity':c.activeOpacity,'--lab-active-scale':c.activeScale,'--lab-press-scale':c.pressScale,'--lab-icon-offset-y':`${c.iconOffsetY}px`,'--lab-label-size':`${c.labelSize}px`,'--lab-label-weight':c.labelWeight,'--lab-label-active-weight':c.labelActiveWeight,'--lab-animation-duration':`${c.animationDuration}ms`,'--lab-active-icon-light':c.activeIconLight,'--lab-active-icon-dark':c.activeIconDark};for(const [k,v] of Object.entries(vars))root.style.setProperty(k,v);const dark=root.dataset.theme==='dark'||(root.dataset.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);root.style.setProperty('--lab-active-icon-color',dark?c.activeIconDark:c.activeIconLight);}
const __applyThemeV084=applyTheme;applyTheme=function(){__applyThemeV084();applyBottomBarLabToDocument();};
function labRange(path,label,min,max,step,value,suffix='',help=''){return `<div class="lab-field"><div class="lab-field-copy"><strong>${label}</strong>${help?`<small>${help}</small>`:''}</div><div class="lab-range-wrap"><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-lab-range="${path}" data-lab-suffix="${suffix}"><span class="lab-value" data-lab-value="${path}">${value}${suffix}</span></div></div>`;}
function labColor(path,label,value,help=''){return `<div class="lab-field"><div class="lab-field-copy"><strong>${label}</strong>${help?`<small>${help}</small>`:''}</div><input type="color" value="${value}" data-lab-color="${path}"></div>`;}
function labSwitch(path,label,value,help=''){return `<div class="lab-field"><div class="lab-field-copy"><strong>${label}</strong>${help?`<small>${help}</small>`:''}</div><button class="lab-mini-switch" data-lab-toggle="${path}"><span class="ios-switch ${value?'on':''}"></span></button></div>`;}
function labSelect(path,label,value,options,help=''){return `<div class="lab-field"><div class="lab-field-copy"><strong>${label}</strong>${help?`<small>${help}</small>`:''}</div><select data-lab-select="${path}">${options.map(([v,l])=>`<option value="${v}" ${value===v?'selected':''}>${l}</option>`).join('')}</select></div>`;}
function labSection(title,body,open=false){return `<details class="lab-details" ${open?'open':''}><summary>${title}</summary><div class="lab-details-body">${body}</div></details>`;}
function renderBottomBarLab(){const c=labGetDraft(),lab=normalizeBottomBarLab(data.settings.bottomBarLab),mode=ui.bottomBarLabPreviewMode||'light';const tabs=[['timers','Cronômetros'],['history','Registros'],['stats','Estatísticas'],['settings','Ajustes']];return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeBottomBarLab">${svgIcon('back')}</button><h1>Laboratório da barra</h1><span></span></header><main class="settings-content bottom-bar-lab-screen"><section class="settings-section"><div class="settings-card"><div class="settings-row lab-status-row"><span class="status-copy"><strong>Usar personalização no aplicativo</strong><small>${lab.enabled?'Ativa agora':'Barra padrão ativa'}</small></span><button class="lab-mini-switch" id="toggleBottomBarLabEnabled"><span class="ios-switch ${lab.enabled?'on':''}"></span></button></div></div><p class="lab-intro">Edite à vontade na prévia. Só o botão <strong>Aplicar no aplicativo</strong> grava o desenho atual como sua barra oficial.</p></section><section class="settings-section"><div class="settings-card lab-preview-card"><div class="lab-preview-toolbar"><strong>Prévia ao vivo</strong><div class="lab-theme-segment"><button data-lab-preview-theme="light" class="${mode==='light'?'selected':''}">Claro</button><button data-lab-preview-theme="dark" class="${mode==='dark'?'selected':''}">Escuro</button></div></div><div class="lab-preview-stage ${mode==='dark'?'dark':''}" id="labPreviewStage"><div class="lab-preview-fake-content"><div class="lab-preview-fake-line"></div><div class="lab-preview-fake-card"></div><div class="lab-preview-fake-card"></div></div><div class="lab-preview-bar" id="labPreviewBar">${tabs.map(([ic,l],i)=>`<button class="lab-preview-tab ${i===1?'active':''}">${svgIcon(ic)}<span class="tab-label">${l}</span></button>`).join('')}</div></div></div></section><section class="settings-section"><h3 class="section-label">Atalhos de visual</h3><div class="settings-card"><div class="advanced-setting"><div class="lab-preset-row"><button data-lab-preset="default">Padrão</button><button data-lab-preset="glass">Vidro</button><button data-lab-preset="compact">Compacta</button><button data-lab-preset="bold">Marcante</button></div></div></div></section><section class="settings-section"><h3 class="section-label">Editor</h3><div class="settings-card lab-control-card">${labSection('Formato e posição',labRange('widthPercent','Largura',70,100,1,c.widthPercent,'%')+labRange('offsetX','Deslocamento horizontal',-50,50,1,c.offsetX,' px')+labRange('bottom','Distância da base',0,60,1,c.bottom,' px')+labRange('height','Altura',42,88,1,c.height,' px')+labRange('padding','Padding interno',0,16,.5,c.padding,' px')+labRange('gap','Espaço entre abas',0,20,1,c.gap,' px')+labRange('radius','Arredondamento',0,999,1,c.radius,' px'),true)}${labSection('Fundo / vidro',labColor('backgroundLight','Cor do fundo — claro',c.backgroundLight)+labColor('backgroundDark','Cor do fundo — escuro',c.backgroundDark)+labRange('backgroundOpacity','Transparência',0,1,.01,c.backgroundOpacity,'')+labRange('blur','Desfoque',0,40,1,c.blur,' px')+labRange('saturation','Saturação',0,220,5,c.saturation,'%')+labRange('brightness','Brilho',50,160,5,c.brightness,'%'))}${labSection('Borda',labRange('borderWidth','Espessura',0,5,.25,c.borderWidth,' px')+labColor('borderLight','Cor — claro',c.borderLight)+labColor('borderDark','Cor — escuro',c.borderDark)+labRange('borderOpacity','Opacidade',0,1,.01,c.borderOpacity,''))}${labSection('Sombras',labSwitch('shadow1Enabled','Sombra principal',c.shadow1Enabled)+labRange('shadow1X','Sombra 1 · X',-30,30,1,c.shadow1X,' px')+labRange('shadow1Y','Sombra 1 · Y',-20,40,1,c.shadow1Y,' px')+labRange('shadow1Blur','Sombra 1 · desfoque',0,80,1,c.shadow1Blur,' px')+labRange('shadow1Spread','Sombra 1 · expansão',-20,30,1,c.shadow1Spread,' px')+labRange('shadow1Opacity','Sombra 1 · opacidade',0,.5,.005,c.shadow1Opacity,'')+labSwitch('shadow2Enabled','Segunda sombra',c.shadow2Enabled)+labRange('shadow2X','Sombra 2 · X',-30,30,1,c.shadow2X,' px')+labRange('shadow2Y','Sombra 2 · Y',-20,40,1,c.shadow2Y,' px')+labRange('shadow2Blur','Sombra 2 · desfoque',0,80,1,c.shadow2Blur,' px')+labRange('shadow2Spread','Sombra 2 · expansão',-20,30,1,c.shadow2Spread,' px')+labRange('shadow2Opacity','Sombra 2 · opacidade',0,.5,.005,c.shadow2Opacity,''))}${labSection('Aba selecionada',labColor('pillLight','Bolha — claro',c.pillLight)+labColor('pillDark','Bolha — escuro',c.pillDark)+labRange('pillOpacity','Opacidade da bolha',0,1,.01,c.pillOpacity,'')+labRange('pillRadius','Arredondamento da bolha',0,999,1,c.pillRadius,' px')+labRange('itemPadX','Padding horizontal',0,18,1,c.itemPadX,' px')+labRange('itemPadY','Padding vertical',0,12,1,c.itemPadY,' px'))}${labSection('Ícones',labRange('iconSize','Tamanho',18,52,1,c.iconSize,' px')+labRange('iconStroke','Espessura',.75,4,.25,c.iconStroke,'')+labColor('iconLight','Cor — claro',c.iconLight)+labColor('iconDark','Cor — escuro',c.iconDark)+labColor('activeIconLight','Selecionado — claro',c.activeIconLight)+labColor('activeIconDark','Selecionado — escuro',c.activeIconDark)+labRange('iconOffsetY','Posição vertical',-10,10,1,c.iconOffsetY,' px')+labRange('inactiveOpacity','Opacidade inativos',.2,1,.05,c.inactiveOpacity,'')+labRange('activeOpacity','Opacidade ativo',.2,1,.05,c.activeOpacity,''))}${labSection('Títulos das abas',labSwitch('showLabels','Mostrar títulos',c.showLabels,'Desativado mantém apenas os ícones.')+labRange('labelSize','Tamanho do texto',8,16,.5,c.labelSize,' px')+labRange('labelWeight','Peso do texto',300,800,50,c.labelWeight,'')+labRange('labelActiveWeight','Peso selecionado',300,900,50,c.labelActiveWeight,'')+labRange('labelGap','Distância ícone ↔ título',0,10,1,c.labelGap,' px'))}${labSection('Animação e toque',labSwitch('animationEnabled','Animar troca de aba',c.animationEnabled)+labSelect('animationType','Estilo',c.animationType,[['scale','Escala'],['spring','Elástica'],['glow','Brilho'],['none','Sem animação']])+labRange('animationDuration','Duração',80,700,10,c.animationDuration,' ms')+labRange('activeScale','Escala do ativo',.8,1.2,.01,c.activeScale,'×')+labRange('pressScale','Escala ao tocar',.8,1,.01,c.pressScale,'×'))}</div></section><div class="lab-tertiary-row"><button id="reloadAppliedBottomBar">Descartar alterações</button><button id="resetBottomBarDraft">Restaurar padrão</button></div><div class="lab-actions"><button class="lab-secondary" id="previewApplyOnly">Ver na barra agora</button><button class="lab-apply" id="applyBottomBarLab">Aplicar no aplicativo</button></div></main>`,'settings');}
function updateLabPreview(){const bar=document.getElementById('labPreviewBar'),stage=document.getElementById('labPreviewStage');if(!bar||!stage)return;const c=labGetDraft(),dark=(ui.bottomBarLabPreviewMode||'light')==='dark';stage.classList.toggle('dark',dark);const bg=rgbaHex(dark?c.backgroundDark:c.backgroundLight,c.backgroundOpacity),border=rgbaHex(dark?c.borderDark:c.borderLight,c.borderOpacity),icon=dark?c.iconDark:c.iconLight,active=dark?c.activeIconDark:c.activeIconLight,pill=rgbaHex(dark?c.pillDark:c.pillLight,c.pillOpacity),sh1=labShadow(c.shadow1Enabled,c.shadow1X,c.shadow1Y,c.shadow1Blur,c.shadow1Spread,c.shadow1Opacity),sh2=labShadow(c.shadow2Enabled,c.shadow2X,c.shadow2Y,c.shadow2Blur,c.shadow2Spread,c.shadow2Opacity);const v={'--lp-width':`${c.widthPercent}%`,'--lp-offset-x':`${c.offsetX}px`,'--lp-bottom':`${Math.min(40,c.bottom)}px`,'--lp-height':`${c.height}px`,'--lp-padding':`${c.padding}px`,'--lp-gap':`${c.gap}px`,'--lp-radius':`${c.radius}px`,'--lp-bg':bg,'--lp-border-width':`${c.borderWidth}px`,'--lp-border':border,'--lp-shadow':`${sh1}, ${sh2}`,'--lp-blur':`${c.blur}px`,'--lp-saturation':Math.max(0,c.saturation)/100,'--lp-brightness':Math.max(0,c.brightness)/100,'--lp-pill-radius':`${c.pillRadius}px`,'--lp-item-pad-x':`${c.itemPadX}px`,'--lp-item-pad-y':`${c.itemPadY}px`,'--lp-icon':icon,'--lp-active-icon':active,'--lp-selected-bg':pill,'--lp-icon-size':`${c.iconSize}px`,'--lp-icon-stroke':c.iconStroke,'--lp-inactive-opacity':c.inactiveOpacity,'--lp-active-opacity':c.activeOpacity,'--lp-active-scale':c.activeScale,'--lp-label-display':c.showLabels?'block':'none','--lp-label-size':`${c.labelSize}px`,'--lp-label-weight':c.labelWeight,'--lp-label-active-weight':c.labelActiveWeight,'--lp-label-gap':`${c.labelGap}px`,'--lp-duration':`${c.animationDuration}ms`};for(const [k,val] of Object.entries(v))bar.style.setProperty(k,val);}
function setLabPreset(id){const c=labGetDraft();if(id==='default')Object.assign(c,labClone(BOTTOM_BAR_LAB_DEFAULTS));if(id==='glass')Object.assign(c,{backgroundOpacity:.34,blur:20,saturation:150,brightness:108,borderOpacity:.6,borderWidth:.75,shadow1Opacity:.14,height:54,padding:2,radius:999,pillOpacity:.62});if(id==='compact')Object.assign(c,{widthPercent:78,height:46,bottom:20,padding:1,gap:3,iconSize:30,radius:22,pillRadius:18,backgroundOpacity:.78,blur:12});if(id==='bold')Object.assign(c,{widthPercent:94,height:58,bottom:16,padding:3,gap:7,iconSize:38,iconStroke:2.25,pillOpacity:1,activeScale:1.07,animationType:'spring',animationDuration:330,backgroundOpacity:.8});render();}
function applyDraftTemporarily(){const saved=data.settings.bottomBarLab;data.settings.bottomBarLab={enabled:true,config:labClone(labGetDraft())};applyBottomBarLabToDocument();data.settings.bottomBarLab=saved;toast('Prévia aplicada à barra até sair desta tela');}
async function persistBottomBarLab(){data.settings.bottomBarLab={enabled:true,config:labClone(labGetDraft())};await persistSettings();applyBottomBarLabToDocument();toast('Barra inferior aplicada');render();}
const __renderSettingsV084=renderSettings;renderSettings=function(){if(ui.settingsView==='bottomBarLab')return renderBottomBarLab();return __renderSettingsV084();};
const __renderAdvancedSettingsV084=renderAdvancedSettings;renderAdvancedSettings=function(){const html=__renderAdvancedSettingsV084();return html.replace('</main>',`<section class="settings-section"><h3 class="section-label">Laboratório</h3><div class="settings-card settings-navigation-card"><button class="settings-row button-row" id="openBottomBarLab"><span>Editor da barra inferior</span><span class="secondary-value">Formato, vidro, cores e animação ›</span></button></div><p class="section-footer">As alterações podem ser aplicadas diretamente ao aplicativo.</p></section></main>`);};
const __bindV082EventsV084=bindV082Events;bindV082Events=function(){__bindV082EventsV084();applyBottomBarLabToDocument();const byId=id=>document.getElementById(id);if(byId('openBottomBarLab'))byId('openBottomBarLab').onclick=()=>{ui.bottomBarLabDraft=labClone(normalizeBottomBarLab(data.settings.bottomBarLab).config);ui.bottomBarLabPreviewMode=document.documentElement.dataset.theme==='dark'?'dark':'light';ui.settingsView='bottomBarLab';render();};if(byId('closeBottomBarLab'))byId('closeBottomBarLab').onclick=()=>{ui.bottomBarLabDraft=null;ui.settingsView='advanced';applyBottomBarLabToDocument();render();};if(byId('toggleBottomBarLabEnabled'))byId('toggleBottomBarLabEnabled').onclick=async()=>{const x=normalizeBottomBarLab(data.settings.bottomBarLab);x.enabled=!x.enabled;data.settings.bottomBarLab=x;await persistSettings();applyBottomBarLabToDocument();render();};document.querySelectorAll('[data-lab-preview-theme]').forEach(b=>b.onclick=()=>{ui.bottomBarLabPreviewMode=b.dataset.labPreviewTheme;document.querySelectorAll('[data-lab-preview-theme]').forEach(x=>x.classList.toggle('selected',x===b));updateLabPreview();});document.querySelectorAll('[data-lab-range]').forEach(el=>el.oninput=()=>{const v=Number(el.value);labSetPath(labGetDraft(),el.dataset.labRange,v);const out=document.querySelector(`[data-lab-value="${el.dataset.labRange}"]`);if(out)out.textContent=`${el.value}${el.dataset.labSuffix||''}`;updateLabPreview();});document.querySelectorAll('[data-lab-color]').forEach(el=>el.oninput=()=>{labSetPath(labGetDraft(),el.dataset.labColor,el.value);updateLabPreview();});document.querySelectorAll('[data-lab-select]').forEach(el=>el.onchange=()=>{labSetPath(labGetDraft(),el.dataset.labSelect,el.value);updateLabPreview();});document.querySelectorAll('[data-lab-toggle]').forEach(btn=>btn.onclick=()=>{const p=btn.dataset.labToggle,c=labGetDraft(),v=!labGetPath(c,p);labSetPath(c,p,v);btn.querySelector('.ios-switch')?.classList.toggle('on',v);updateLabPreview();});document.querySelectorAll('[data-lab-preset]').forEach(btn=>btn.onclick=()=>setLabPreset(btn.dataset.labPreset));if(byId('resetBottomBarDraft'))byId('resetBottomBarDraft').onclick=()=>{ui.bottomBarLabDraft=labClone(BOTTOM_BAR_LAB_DEFAULTS);render();};if(byId('reloadAppliedBottomBar'))byId('reloadAppliedBottomBar').onclick=()=>{ui.bottomBarLabDraft=labClone(normalizeBottomBarLab(data.settings.bottomBarLab).config);render();};if(byId('previewApplyOnly'))byId('previewApplyOnly').onclick=applyDraftTemporarily;if(byId('applyBottomBarLab'))byId('applyBottomBarLab').onclick=persistBottomBarLab;if(ui.settingsView==='bottomBarLab')updateLabPreview();};
;

/* v0.8.5 — Som do cronômetro em página própria */
globalThis.APP_META=Object.freeze({version:'0.8.5',dataSchemaVersion:5,factoryDataVersion:1});

function renderTimerSoundSettings(){
  const hasSound=!!data.settings.timerSoundData;
  const soundName=hasSound?(data.settings.timerSoundName||'Áudio escolhido'):'Nenhum áudio escolhido';
  const volume=Math.round((Number(data.settings.timerSoundVolume)||0)*100);
  return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeSoundSettings" aria-label="Voltar">${svgIcon('back')}</button><h1>Som do cronômetro</h1><span></span></header><main class="settings-content sound-detail-settings">
    <section class="settings-section"><div class="settings-card sound-settings-card">
      <button class="settings-row button-row" id="toggleTimerSound" aria-pressed="${data.settings.timerSoundEnabled?'true':'false'}"><span>Som durante a contagem</span><span class="ios-switch ${data.settings.timerSoundEnabled?'on':''}" aria-hidden="true"></span></button>
      <label class="settings-row button-row accent-button-row" for="timerSoundFile"><span>Escolher áudio</span><span class="secondary-value audio-file-name">${esc(soundName)}</span><input id="timerSoundFile" class="sr-only" type="file" accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,.mp3,.m4a,.wav"></label>
      <label class="settings-row volume-row"><span>Volume</span><span class="range-wrap"><input id="timerSoundVolume" type="range" min="0" max="100" step="1" value="${volume}" ${hasSound?'':'disabled'}><span>${volume}%</span></span></label>
    </div><p class="section-footer">O áudio toca em loop somente enquanto algum cronômetro estiver contando.</p></section>
    ${hasSound?`<section class="settings-section"><div class="settings-card"><button class="settings-row button-row danger" id="removeTimerSound"><span>Remover áudio</span></button></div></section>`:''}
  </main>`);
}

const __renderSettingsV085=renderSettings;
renderSettings=function(){
  if(ui.settingsView==='sound')return renderTimerSoundSettings();
  const html=__renderSettingsV085();
  if((ui.settingsView||'main')!=='main')return html;
  const start=html.indexOf('<section class="settings-section sound-section">');
  if(start<0)return html;
  const end=html.indexOf('</section>',start);
  if(end<0)return html;
  const hasSound=!!data.settings.timerSoundData;
  const status=hasSound?(data.settings.timerSoundEnabled?'Ativado':'Desativado'):'Nenhum áudio';
  const replacement=`<section class="settings-section"><div class="settings-card settings-navigation-card"><button class="settings-row button-row" id="openSoundSettings"><span>Som do cronômetro</span><span class="secondary-value">${esc(status)} ›</span></button></div></section>`;
  return html.slice(0,start)+replacement+html.slice(end+'</section>'.length);
};

const __bindV082EventsV085=bindV082Events;
bindV082Events=function(){
  __bindV082EventsV085();
  const byId=id=>document.getElementById(id);
  if(byId('openSoundSettings'))byId('openSoundSettings').onclick=()=>{ui.settingsView='sound';render();};
  if(byId('closeSoundSettings'))byId('closeSoundSettings').onclick=()=>{ui.settingsView='main';render();};
};
;

/* v0.8.6 — ícone de Estatísticas fornecido pelo usuário */
globalThis.APP_META=Object.freeze({version:'0.8.6',dataSchemaVersion:5,factoryDataVersion:1});

const __svgIconV086=svgIcon;
svgIcon=function(name){
  if(name!=='stats')return __svgIconV086(name);
  return `<svg class="sf-icon stats-uploaded-icon" viewBox="0 0 75.517578125 70.619140625" aria-hidden="true">
    <g fill="currentColor" stroke="currentColor" fill-rule="nonzero" stroke-width="1" transform="scale(1,-1) translate(0,-70.619140625)">
      <path d="M 9.41015625,20.32421875 L 9.41015625,34.181640625 Q 9.41015625,35.27734375 10.076171875,35.921875 Q 10.7421875,36.56640625 11.90234375,36.56640625 L 18.60546875,36.56640625 Q 19.72265625,36.56640625 20.3994140625,35.921875 Q 21.076171875,35.27734375 21.076171875,34.181640625 L 21.076171875,20.32421875 Q 21.076171875,19.20703125 20.3994140625,18.583984375 Q 19.72265625,17.9609375 18.60546875,17.9609375 L 11.90234375,17.9609375 Q 10.7421875,17.9609375 10.076171875,18.583984375 Q 9.41015625,19.20703125 9.41015625,20.32421875 Z M 24.40625,20.32421875 L 24.40625,42.23828125 Q 24.40625,43.3125 25.072265625,43.95703125 Q 25.73828125,44.6015625 26.876953125,44.6015625 L 33.580078125,44.6015625 Q 34.71875,44.6015625 35.3955078125,43.95703125 Q 36.072265625,43.3125 36.072265625,42.23828125 L 36.072265625,20.32421875 Q 36.072265625,19.20703125 35.3955078125,18.583984375 Q 34.71875,17.9609375 33.580078125,17.9609375 L 26.876953125,17.9609375 Q 25.73828125,17.9609375 25.072265625,18.583984375 Q 24.40625,19.20703125 24.40625,20.32421875 Z M 39.423828125,20.32421875 L 39.423828125,50.294921875 Q 39.423828125,51.412109375 40.1005859375,52.0458984375 Q 40.77734375,52.6796875 41.916015625,52.6796875 L 48.59765625,52.6796875 Q 49.736328125,52.6796875 50.4130859375,52.0458984375 Q 51.08984375,51.412109375 51.08984375,50.294921875 L 51.08984375,20.32421875 Q 51.08984375,19.20703125 50.4130859375,18.583984375 Q 49.736328125,17.9609375 48.59765625,17.9609375 L 41.916015625,17.9609375 Q 40.77734375,17.9609375 40.1005859375,18.583984375 Q 39.423828125,19.20703125 39.423828125,20.32421875 Z M 54.44140625,20.32421875 L 54.44140625,58.3515625 Q 54.44140625,59.447265625 55.1181640625,60.0810546875 Q 55.794921875,60.71484375 56.912109375,60.71484375 L 63.615234375,60.71484375 Q 64.75390625,60.71484375 65.4306640625,60.0810546875 Q 66.107421875,59.447265625 66.107421875,58.3515625 L 66.107421875,20.32421875 Q 66.107421875,19.20703125 65.4306640625,18.583984375 Q 64.75390625,17.9609375 63.615234375,17.9609375 L 56.912109375,17.9609375 Q 55.794921875,17.9609375 55.1181640625,18.583984375 Q 54.44140625,19.20703125 54.44140625,20.32421875 Z M 8.98046875,9.904296875 Q 8.20703125,9.904296875 7.6376953125,10.4521484375 Q 7.068359375,11 7.068359375,11.794921875 Q 7.068359375,12.58984375 7.6376953125,13.1376953125 Q 8.20703125,13.685546875 8.98046875,13.685546875 L 66.537109375,13.685546875 Q 67.310546875,13.685546875 67.8798828125,13.1376953125 Q 68.44921875,12.58984375 68.44921875,11.794921875 Q 68.44921875,11 67.8798828125,10.4521484375 Q 67.310546875,9.904296875 66.537109375,9.904296875 Z"/>
    </g>
  </svg>`;
};
;

/* v0.8.7 — painel de Dados/Backup com lembrete por antiguidade */
globalThis.APP_META=Object.freeze({version:'0.8.7',dataSchemaVersion:5,factoryDataVersion:1});

function backupShareIcon(){
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3"/><path d="m7.8 7.2 4.2-4.2 4.2 4.2"/><path d="M8 9H6.6A2.6 2.6 0 0 0 4 11.6v6.8A2.6 2.6 0 0 0 6.6 21h10.8a2.6 2.6 0 0 0 2.6-2.6v-6.8A2.6 2.6 0 0 0 17.4 9H16"/></svg>`;
}
function backupImportIcon(){
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v13"/><path d="m7.8 11.8 4.2 4.2 4.2-4.2"/><path d="M8 9H6.6A2.6 2.6 0 0 0 4 11.6v6.8A2.6 2.6 0 0 0 6.6 21h10.8a2.6 2.6 0 0 0 2.6-2.6v-6.8A2.6 2.6 0 0 0 17.4 9H16"/></svg>`;
}
function backupChevron(){return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>`;}
function backupAlertIcon(){return backupShareIcon();}
function backupDateLabel(ms){
  const d=new Date(ms);if(!Number.isFinite(d.getTime()))return '';
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function backupAgeInfo(){
  const raw=Number(data.settings.lastBackupExportAt||0);
  if(!raw||!Number.isFinite(raw))return {tone:'stale',title:'Backup ainda não registrado',text:'O app ainda não registrou um backup externo criado por você.',subtitle:'Nenhum backup externo registrado'};
  const age=Math.max(0,now()-raw),days=Math.floor(age/86400000);
  const when=days===0?'hoje':days===1?'ontem':`há ${days} dias`;
  const dated=backupDateLabel(raw);
  if(days<7)return {tone:'ok',title:'Backup em dia',text:`Último backup criado ${when}.`,subtitle:`Último backup: ${dated}`};
  if(days<14)return {tone:'warn',title:'Lembrete de backup',text:`O último backup foi criado ${when}. Talvez seja uma boa hora para criar outro.`,subtitle:`Último backup: ${dated}`};
  return {tone:'stale',title:'Backup desatualizado',text:`Já faz ${days} dias desde o último backup externo.`,subtitle:`Último backup: ${dated}`};
}
function renderDataBackupSectionV087(){
  const info=backupAgeInfo();
  return `<section class="settings-section data-backup-section"><h3 class="section-label">Dados</h3>
    <div class="backup-alert ${info.tone}"><span class="backup-alert-icon">${backupAlertIcon()}</span><span class="backup-alert-copy"><strong class="backup-alert-title">${esc(info.title)}</strong><span class="backup-alert-text">${esc(info.text)}</span></span></div>
    <div class="data-backup-card">
      <button class="data-backup-row" id="exportJson"><span class="data-backup-row-icon">${backupShareIcon()}</span><span class="data-backup-row-copy"><strong class="data-backup-row-title">Exportar dados</strong><span class="data-backup-row-subtitle">${esc(info.subtitle)}</span></span><span class="data-backup-chevron">${backupChevron()}</span></button>
      <label class="data-backup-row data-backup-file-label" for="importJsonFile"><span class="data-backup-row-icon">${backupImportIcon()}</span><span class="data-backup-row-copy"><strong class="data-backup-row-title">Importar dados</strong><span class="data-backup-row-subtitle">Substitui os dados atuais pelo conteúdo do backup JSON</span></span><span class="data-backup-chevron">${backupChevron()}</span><input id="importJsonFile" class="sr-only" type="file" accept="application/json,.json"></label>
    </div>
    <p class="data-backup-footnote">O backup JSON inclui registros, modelos, áreas, clientes e personalizações do aplicativo.</p>
  </section>
  <section class="settings-section data-export-other"><h3 class="section-label">Outros formatos</h3><div class="settings-card"><button class="settings-row button-row accent-button-row" id="exportCsv"><span>Exportar CSV</span></button><button class="settings-row button-row accent-button-row" id="exportPdf"><span>Exportar PDF</span></button></div></section>`;
}

const __renderSettingsV087=renderSettings;
renderSettings=function(){
  const html=__renderSettingsV087();
  if((ui.settingsView||'main')!=='main')return html;
  const marker='<section class="settings-section"><h3 class="section-label">Dados</h3>';
  const start=html.indexOf(marker);
  if(start<0)return html;
  const next=html.indexOf('<section class="settings-section">',start+marker.length);
  if(next<0)return html;
  return html.slice(0,start)+renderDataBackupSectionV087()+html.slice(next);
};

async function exportJSON(){
  const createdAt=now();
  const payload={
    schemaVersion:APP_META.dataSchemaVersion,
    exportedAt:new Date(createdAt).toISOString(),
    models:data.models,
    sessions:data.sessions,
    settings:{...data.settings,lastBackupExportAt:createdAt},
    currentSession:data.current
  };
  const name=`cronometro-dados-${dayKey(createdAt)}.json`;
  const type='application/json';
  const blob=new Blob([JSON.stringify(payload,null,2)],{type});
  const file=new File([blob],name,{type});
  let completed=false;
  try{
    if(navigator.canShare?.({files:[file]})){
      await navigator.share({files:[file],title:name});
      completed=true;
    }else{
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);completed=true;
    }
  }catch(error){
    if(error?.name==='AbortError')return;
    console.error(error);
    try{
      const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);completed=true;
    }catch(fallbackError){
      console.error(fallbackError);alert('Não foi possível gerar o arquivo de backup.');return;
    }
  }
  if(completed){
    data.settings.lastBackupExportAt=createdAt;
    await persistSettings();
    toast('Backup externo criado');
    render();
  }
}
;

/* v0.8.8 — modo Clássico / Ultra Visual */
globalThis.APP_META=Object.freeze({version:'0.8.8',dataSchemaVersion:5,factoryDataVersion:1});

function visualStyleModeV088(){
  return data?.settings?.visualStyleMode==='ultra'?'ultra':'classic';
}
function applyVisualStyleV088(mode=visualStyleModeV088()){
  document.documentElement.dataset.visualStyle=mode==='ultra'?'ultra':'classic';
}
function visualStyleSettingsBlockV088(){
  const mode=visualStyleModeV088();
  return `<section class="settings-section visual-style-section"><h3 class="section-label">Estilo visual</h3><div class="settings-card visual-style-card">
    <div class="visual-style-intro">Escolha entre o visual atual, mais leve, e a camada Ultra com Glow, vidro e cor suave.</div>
    <div class="visual-style-picker" role="group" aria-label="Estilo visual do aplicativo">
      <button class="visual-style-option ${mode==='classic'?'selected':''}" data-visual-style-mode="classic" aria-pressed="${mode==='classic'}"><span class="visual-style-option-head"><span class="visual-style-swatch"></span><span>Clássico</span></span><small>Mais leve e otimizado.</small><span class="visual-style-chip">PADRÃO</span></button>
      <button class="visual-style-option ${mode==='ultra'?'selected':''}" data-visual-style-mode="ultra" aria-pressed="${mode==='ultra'}"><span class="visual-style-option-head"><span class="visual-style-swatch ultra"></span><span>Ultra</span></span><small>Glow, transparência e profundidade.</small><span class="visual-style-chip">FANCY</span></button>
    </div>
    <div class="visual-style-footnote">O app sempre inicia pela camada Clássica. Se Ultra estiver selecionado, os efeitos entram logo depois da abertura para reduzir o risco de travamentos.</div>
  </div></section>`;
}

const __renderAppearanceV088=renderAppearanceSettings;
renderAppearanceSettings=function(){
  const html=__renderAppearanceV088();
  const marker='<main class="settings-content">';
  if(!html.includes(marker))return html;
  return html.replace(marker,marker+visualStyleSettingsBlockV088());
};

let ultraBootSettledV088=false;
let ultraBootTimerV088=null;
const __renderV088=render;
render=function(){
  const mode=visualStyleModeV088();
  if(!ultraBootSettledV088&&mode==='ultra')applyVisualStyleV088('classic');
  else applyVisualStyleV088(mode);
  const result=__renderV088();
  if(!ultraBootSettledV088){
    ultraBootSettledV088=true;
    if(mode==='ultra'){
      clearTimeout(ultraBootTimerV088);
      ultraBootTimerV088=setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>applyVisualStyleV088('ultra'))),120);
    }
  }
  return result;
};

document.addEventListener('click',async event=>{
  const button=event.target.closest?.('[data-visual-style-mode]');
  if(!button)return;
  const mode=button.dataset.visualStyleMode==='ultra'?'ultra':'classic';
  if(!data?.settings)return;
  data.settings.visualStyleMode=mode;
  applyVisualStyleV088(mode);
  try{await persistSettings();}catch(error){console.error('Falha ao salvar estilo visual',error);}
  render();
  toast(mode==='ultra'?'Modo Ultra ativado':'Modo Clássico ativado');
});

applyVisualStyleV088('classic');
;

/* v0.8.9 — retrocompatibilidade de clientes em backups legados */
globalThis.APP_META=Object.freeze({version:'0.8.9',dataSchemaVersion:6,factoryDataVersion:1});

function legacyClientCleanNameV089(value){
  return String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
}

function legacyClientExactKeyV089(value){
  return legacyClientCleanNameV089(value).toLocaleLowerCase('pt-BR');
}

function legacyClientPlaceholderKeyV089(value){
  return legacyClientCleanNameV089(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('pt-BR');
}

function legacyClientIsPlaceholderV089(value,emptyLabel='Sem cliente'){
  const clean=legacyClientCleanNameV089(value);
  if(!clean)return true;
  const key=legacyClientPlaceholderKeyV089(clean);
  const emptyKey=legacyClientPlaceholderKeyV089(emptyLabel);
  if(key===emptyKey||key==='sem cliente')return true;
  if(/^\(?sem titulo\)?(?:\s|$)/i.test(key))return true;
  return false;
}

function legacyClientOwnV089(obj,key){
  return !!obj&&Object.prototype.hasOwnProperty.call(obj,key);
}

function legacyClientCloneV089(value){
  if(typeof structuredClone==='function'){
    try{return structuredClone(value);}catch(_){}
  }
  return JSON.parse(JSON.stringify(value));
}

function legacyClientMergeAreaTypesV089(importedAreas,currentAreas){
  const current=Array.isArray(currentAreas)?currentAreas:[];
  const byId=new Map(current.filter(Boolean).map(a=>[a.id,a]));
  const byName=new Map();
  for(const area of current){
    if(!area?.name)continue;
    const key=legacyClientExactKeyV089(area.name);
    const list=byName.get(key)||[];
    list.push(area);byName.set(key,list);
  }
  return (Array.isArray(importedAreas)?importedAreas:current).filter(Boolean).map(area=>{
    if(area.type)return {...area};
    let hint=byId.get(area.id)||null;
    if(!hint&&area.name){
      const matches=byName.get(legacyClientExactKeyV089(area.name))||[];
      if(matches.length===1)hint=matches[0];
    }
    return {...area,type:hint?.type==='clients'?'clients':'generic'};
  });
}

function legacyClientAreaIdForSessionV089(session,models){
  if(session?.areaId)return session.areaId;
  const model=(Array.isArray(models)?models:[]).find(m=>m?.id===session?.modelId);
  return model?.areaId||'general';
}

function legacyClientAreaIsClientsV089(areaId,settings){
  return (Array.isArray(settings?.areas)?settings.areas:[]).some(a=>a?.id===areaId&&a.type==='clients');
}

function legacyClientPrepareSettingsV089(payload){
  const imported=legacyClientCloneV089(payload?.settings||{});
  const currentAreas=(typeof data!=='undefined'&&Array.isArray(data?.settings?.areas))?data.settings.areas:[];
  const sourceAreas=Array.isArray(imported.areas)?imported.areas:currentAreas;
  imported.areas=legacyClientMergeAreaTypesV089(sourceAreas,currentAreas);
  imported.clients=Array.isArray(imported.clients)?imported.clients.map(c=>{
    const out={...c};
    if(!Array.isArray(out.aliases))out.aliases=[];
    return out;
  }):[];
  return imported;
}

function legacyClientBuildIndexV089(clients){
  const index=new Map();
  for(const client of clients){
    if(!client||client.deletedAt||!client.areaId||!legacyClientCleanNameV089(client.name))continue;
    const key=`${client.areaId}\u0000${legacyClientExactKeyV089(client.name)}`;
    if(!index.has(key))index.set(key,client);
  }
  return index;
}

function legacyClientLinkSessionV089(session,{models,settings,clients,index,legacyBackup}){
  if(!session||typeof session!=='object')return {changed:false,created:false};
  const areaId=legacyClientAreaIdForSessionV089(session,models);
  if(!legacyClientAreaIsClientsV089(areaId,settings))return {changed:false,created:false};

  let changed=false;
  if(!session.areaId){session.areaId=areaId;changed=true;}

  const oldTitle=typeof session.title==='string'?session.title:'';
  if(oldTitle&&!legacyClientOwnV089(session,'legacyTitle')){
    session.legacyTitle=oldTitle;
    changed=true;
  }

  const currentClient=session.clientId?clients.find(c=>c?.id===session.clientId&&!c.deletedAt):null;
  if(currentClient){
    if(!session.clientNameSnapshot){session.clientNameSnapshot=currentClient.name;changed=true;}
    return {changed,created:false};
  }

  const missingClientField=!legacyClientOwnV089(session,'clientId');
  const danglingClientId=!!session.clientId&&!currentClient;
  if(!legacyBackup&&!missingClientField&&!danglingClientId){
    return {changed,created:false};
  }

  const explicitSnapshot=legacyClientCleanNameV089(session.clientNameSnapshot||'');
  const legacyName=legacyClientCleanNameV089(session.legacyTitle||oldTitle);
  const name=explicitSnapshot||legacyName;
  if(legacyClientIsPlaceholderV089(name,settings.clientEmptyLabel||'Sem cliente')){
    if(missingClientField){session.clientId=null;changed=true;}
    return {changed,created:false};
  }

  const key=`${areaId}\u0000${legacyClientExactKeyV089(name)}`;
  let client=index.get(key)||null;
  let created=false;
  if(!client){
    const t=typeof now==='function'?now():Date.now();
    const idPart=typeof uid==='function'?uid():`${t}-${Math.random().toString(36).slice(2)}`;
    client={id:`client-${idPart}`,areaId,name,aliases:[],createdAt:t,updatedAt:t,deletedAt:null};
    clients.push(client);index.set(key,client);created=true;
  }

  if(session.clientId!==client.id){session.clientId=client.id;changed=true;}
  if(session.clientNameSnapshot!==client.name){session.clientNameSnapshot=client.name;changed=true;}
  return {changed,created};
}

function migrateLegacyBackupClientsV089(payload){
  const migrated=legacyClientCloneV089(payload);
  const schema=Number(migrated?.schemaVersion);
  const legacyBackup=!Number.isFinite(schema)||schema<5;
  const models=Array.isArray(migrated.models)?migrated.models:[];
  const settings=legacyClientPrepareSettingsV089(migrated);
  const clients=settings.clients;
  const index=legacyClientBuildIndexV089(clients);
  let linkedSessions=0,createdClients=0;

  for(const session of (Array.isArray(migrated.sessions)?migrated.sessions:[])){
    const result=legacyClientLinkSessionV089(session,{models,settings,clients,index,legacyBackup});
    if(result.changed&&session.clientId)linkedSessions++;
    if(result.created)createdClients++;
  }

  if(migrated.currentSession){
    const result=legacyClientLinkSessionV089(migrated.currentSession,{models,settings,clients,index,legacyBackup});
    if(result.created)createdClients++;
  }

  migrated.settings=settings;
  migrated.schemaVersion=Math.max(Number.isFinite(schema)?schema:0,6);
  migrated.migrationInfo={
    ...(migrated.migrationInfo||{}),
    legacyClientMigrationV089:true,
    linkedSessions,
    createdClients
  };
  return migrated;
}

async function repairAlreadyImportedLegacyClientsV089(){
  if(typeof data==='undefined'||!data?.settings||!Array.isArray(data.sessions))return {changed:false,linkedSessions:0,createdClients:0};
  const models=Array.isArray(data.models)?data.models:[];
  const settings=data.settings;
  settings.clients=Array.isArray(settings.clients)?settings.clients:[];
  for(const client of settings.clients)if(client&&!Array.isArray(client.aliases))client.aliases=[];
  const clients=settings.clients;
  const index=legacyClientBuildIndexV089(clients);
  let changed=false,linkedSessions=0,createdClients=0;
  const changedSessions=[];

  for(const session of data.sessions){
    if(legacyClientOwnV089(session,'clientId'))continue;
    const result=legacyClientLinkSessionV089(session,{models,settings,clients,index,legacyBackup:false});
    if(result.changed){changed=true;changedSessions.push(session);if(session.clientId)linkedSessions++;}
    if(result.created)createdClients++;
  }

  let currentChanged=false;
  if(data.current&&!legacyClientOwnV089(data.current,'clientId')){
    const result=legacyClientLinkSessionV089(data.current,{models,settings,clients,index,legacyBackup:false});
    if(result.changed){changed=true;currentChanged=true;}
    if(result.created)createdClients++;
  }

  if(!changed)return {changed:false,linkedSessions,createdClients};
  await persistSettings();
  for(const session of changedSessions)await put('sessions',session);
  if(currentChanged)await persistCurrent();
  return {changed:true,linkedSessions,createdClients};
}

const __replaceFromBackupV089=replaceFromBackup;
replaceFromBackup=async function(payload){
  const migrated=migrateLegacyBackupClientsV089(payload);
  await __replaceFromBackupV089(migrated);
  /* Normaliza também campos introduzidos nas versões 0.8.0/0.8.2. */
  try{if(typeof migrateV080Data==='function')await migrateV080Data();}catch(error){console.error('Falha na normalização v0.8.0 após importação',error);}
  try{if(typeof migrateV082Data==='function')await migrateV082Data();}catch(error){console.error('Falha na normalização v0.8.2 após importação',error);}
};

let legacyClientRepairStateV089='pending';
const __renderV089=render;
render=function(){
  const result=__renderV089();
  if(legacyClientRepairStateV089==='pending'&&typeof db!=='undefined'&&db&&typeof data!=='undefined'&&data?.settings&&Array.isArray(data.sessions)){
    legacyClientRepairStateV089='running';
    Promise.resolve().then(repairAlreadyImportedLegacyClientsV089).then(info=>{
      legacyClientRepairStateV089='done';
      if(info.changed){
        try{toast(`Clientes recuperadas: ${info.createdClients}`);}catch(_){}
        __renderV089();
      }
    }).catch(error=>{
      legacyClientRepairStateV089='done';
      console.error('Falha ao reparar clientes de registros legados',error);
    });
  }
  return result;
};
;

'use strict';
/* v0.8.9 — correção da troca de área com registro pendente.
   A área é escolhida dentro do popover lateral. O fluxo antigo abria o modal
   pendingModelSwitch sem fechar esse popover, deixando o modal atrás do menu. */
(function(){
  if(typeof activateArea!=='function')return;
  const activateAreaBeforeV089=activateArea;
  activateArea=async function(id){
    /* O popover precisa sair da árvore visual antes de qualquer modal/confirm. */
    if(typeof ui!=='undefined'&&ui)ui.popover=null;
    return activateAreaBeforeV089(id);
  };
})();
;
