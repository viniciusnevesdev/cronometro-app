(() => {
  'use strict';

  const RANGE_OPTIONS = [15,30,90,365];
  ui.analyticsRangeDays = RANGE_OPTIONS.includes(Number(ui.analyticsRangeDays)) ? Number(ui.analyticsRangeDays) : 30;
  ui.analyticsModelId = ui.analyticsModelId || 'all';

  const fmtPct = value => `${Math.abs(value).toFixed(1).replace('.',',')}%`;
  const mean = values => values.length ? values.reduce((a,b)=>a+b,0)/values.length : 0;
  const median = values => {
    if(!values.length) return 0;
    const a = [...values].sort((x,y)=>x-y), mid = Math.floor(a.length/2);
    return a.length % 2 ? a[mid] : (a[mid-1] + a[mid]) / 2;
  };
  const standardDeviation = values => {
    if(values.length < 2) return 0;
    const m = mean(values);
    return Math.sqrt(values.reduce((sum,v)=>sum + Math.pow(v-m,2),0) / values.length);
  };
  const analyticsIcon = name => ({
    trendUp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l5-5 4 4 7-8"/><path d="M15 7h5v5"/></svg>',
    trendDown:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8l5 5 4-4 7 8"/><path d="M15 17h5v-5"/></svg>',
    stable:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>',
    clock:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    gauge:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 17a8 8 0 1 1 16 0"/><path d="m12 13 4-4"/><path d="M7 17h10"/></svg>',
    pause:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    layers:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4"/><path d="m4 17 8 4 8-4"/></svg>'
  }[name] || '');

  function rangeBounds(days, offset=0){
    const end = now() - (offset * days * 86400000);
    const start = end - (days * 86400000);
    return {start,end};
  }

  function measuredSessionsFor(bounds){
    return data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt&&!s.isNoMeasurement&&recordDateMs(s)>=bounds.start&&recordDateMs(s)<=bounds.end&&(ui.analyticsModelId==='all'||s.modelId===ui.analyticsModelId));
  }

  function trendData(current,previous){
    const c = current.map(s=>sessionTotal(s,s.savedAt));
    const p = previous.map(s=>sessionTotal(s,s.savedAt));
    if(!c.length || !p.length) return {tone:'neutral',label:'Sem comparação suficiente',pct:null};
    const cm = mean(c), pm = mean(p), pct = pm ? ((cm-pm)/pm*100) : 0;
    if(Math.abs(pct) < 0.5) return {tone:'neutral',label:'Tempo praticamente estável',pct};
    if(pct < 0) return {tone:'positive',label:`${fmtPct(pct)} mais rápido`,pct};
    return {tone:'negative',label:`${fmtPct(pct)} mais lento`,pct};
  }

  function lineChartMarkup(sessions){
    const ordered = [...sessions].sort((a,b)=>recordDateMs(a)-recordDateMs(b));
    if(ordered.length < 2) return '<div class="analytics-empty-chart">Salve pelo menos dois atendimentos neste período para ver a evolução.</div>';
    const vals = ordered.map(s=>({x:recordDateMs(s),y:sessionTotal(s,s.savedAt),label:fmtDate(recordDateMs(s))}));
    const W=560,H=210,pL=46,pR=16,pT=18,pB=34,innerW=W-pL-pR,innerH=H-pT-pB;
    const minY=Math.min(...vals.map(v=>v.y)),maxY=Math.max(...vals.map(v=>v.y)),range=Math.max(1,maxY-minY);
    const pts=vals.map((v,i)=>({...v,px:pL+(vals.length===1?innerW/2:i*innerW/(vals.length-1)),py:pT+innerH-(v.y-minY)/range*innerH}));
    const path=pts.map((p,i)=>`${i?'L':'M'} ${p.px.toFixed(1)} ${p.py.toFixed(1)}`).join(' ');
    const guides=[0,.5,1].map(f=>{const y=pT+innerH*(1-f),value=minY+range*f;return `<line x1="${pL}" y1="${y}" x2="${W-pR}" y2="${y}"/><text x="${pL-7}" y="${y+4}" text-anchor="end">${esc(fmtDuration(value))}</text>`;}).join('');
    const dots=pts.map((p,i)=>`<circle cx="${p.px}" cy="${p.py}" r="4"><title>${esc(p.label)} · ${esc(fmtDuration(p.y))}</title></circle>${(i===0||i===pts.length-1||pts.length<=5)?`<text x="${p.px}" y="${H-9}" text-anchor="middle" class="analytics-date-label">${esc(p.label.slice(0,5))}</text>`:''}`).join('');
    return `<svg class="analytics-line-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Evolução do tempo trabalhado por atendimento">${guides}<path class="analytics-trend-line" d="${path}"/>${dots}</svg>`;
  }

  function modelBreakdownMarkup(sessions){
    const map=new Map();
    sessions.forEach(s=>{const name=s.modelNameSnapshot||modelById(s.modelId)?.name||'Modelo';map.set(name,(map.get(name)||0)+1);});
    const rows=[...map.entries()].sort((a,b)=>b[1]-a[1]);
    if(!rows.length)return '<div class="analytics-empty-chart">Sem atendimentos no período.</div>';
    const max=Math.max(...rows.map(x=>x[1]),1);
    return `<div class="analytics-bars">${rows.map(([name,count])=>`<div class="analytics-bar-row"><div><span>${esc(name)}</span><strong>${count}</strong></div><div class="analytics-bar-track"><span style="width:${Math.max(5,count/max*100)}%"></span></div></div>`).join('')}</div>`;
  }

  function bottleneckMarkup(sessions){
    const map=new Map();
    sessions.forEach(s=>(s.timers||[]).forEach(t=>{const d=timerDuration(t,s.savedAt);if(d<=0)return;const x=map.get(t.name)||{sum:0,count:0};x.sum+=d;x.count++;map.set(t.name,x);}));
    const rows=[...map.entries()].map(([name,x])=>({name,avg:x.sum/x.count})).sort((a,b)=>b.avg-a.avg).slice(0,5);
    if(!rows.length)return '<div class="analytics-empty-chart">Sem tempos de etapas suficientes.</div>';
    const max=Math.max(...rows.map(x=>x.avg),1);
    return `<div class="analytics-bars bottleneck-bars">${rows.map(x=>`<div class="analytics-bar-row"><div><span>${esc(x.name)}</span><strong>${fmtDuration(x.avg)}</strong></div><div class="analytics-bar-track"><span style="width:${Math.max(5,x.avg/max*100)}%"></span></div></div>`).join('')}</div>`;
  }

  function analyticsCard(title,body,extra=''){
    return `<section class="analytics-card ${extra}"><h3>${title}</h3>${body}</section>`;
  }

  function renderAnalytics(){
    const days=ui.analyticsRangeDays;
    const current=measuredSessionsFor(rangeBounds(days,0));
    const previous=measuredSessionsFor(rangeBounds(days,1));
    const durations=current.map(s=>sessionTotal(s,s.savedAt));
    const grosses=current.map(s=>recordGrossMs(s));
    const pauses=current.map(s=>pauseTotal(s,s.savedAt));
    const avg=mean(durations),med=median(durations),sd=standardDeviation(durations),consistency=avg?Math.max(0,100-(sd/avg*100)):0;
    const pauseTotalMs=pauses.reduce((a,b)=>a+b,0), grossTotalMs=grosses.reduce((a,b)=>a+b,0);
    const pauseRatio=grossTotalMs?pauseTotalMs/grossTotalMs*100:0;
    const trend=trendData(current,previous);
    const toneIcon=trend.tone==='positive'?'trendUp':trend.tone==='negative'?'trendDown':'stable';
    const models=activeModels().slice().sort((a,b)=>(a.sortOrder??0)-(b.sortOrder??0));
    const all=data.sessions.filter(s=>s.status==='saved'&&!s.deletedAt&&!s.isNoMeasurement&&(ui.analyticsModelId==='all'||s.modelId===ui.analyticsModelId));
    const globalAvg=mean(all.map(s=>sessionTotal(s,s.savedAt)));
    const rangeLabel=days===365?'último ano':`últimos ${days} dias`;

    return shell(`<header class="topbar section-tab-header demo-tab-header compact-tab-header analytics-header"><h1>Estatísticas</h1></header>
      <main class="content analytics-content">
        <section class="analytics-controls" aria-label="Filtros das estatísticas">
          <div class="analytics-range-segment">${RANGE_OPTIONS.map(d=>`<button data-analytics-range="${d}" class="${days===d?'selected':''}">${d===365?'1 ano':`${d} dias`}</button>`).join('')}</div>
          <select id="analyticsModelFilter"><option value="all">Todos os modelos</option>${models.map(m=>`<option value="${esc(m.id)}" ${ui.analyticsModelId===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>
        </section>

        ${!current.length?`<div class="empty analytics-empty">Nenhum atendimento medido nos ${esc(rangeLabel)}.</div>`:`
          <section class="analytics-hero trend-${trend.tone}">
            <div class="analytics-hero-icon">${analyticsIcon(toneIcon)}</div>
            <div><small>Evolução do tempo médio</small><strong>${esc(trend.label)}</strong><span>comparado com o período anterior</span></div>
          </section>

          <section class="analytics-kpi-grid">
            <article class="analytics-kpi"><span class="analytics-kpi-icon">${analyticsIcon('clock')}</span><small>Tempo médio</small><strong>${fmtDuration(avg)}</strong><em>${current.length} atendimento${current.length===1?'':'s'}</em></article>
            <article class="analytics-kpi"><span class="analytics-kpi-icon">${analyticsIcon('gauge')}</span><small>Tempo típico</small><strong>${fmtDuration(med)}</strong><em>mediana do período</em></article>
            <article class="analytics-kpi"><span class="analytics-kpi-icon">${analyticsIcon('stable')}</span><small>Consistência</small><strong>${consistency.toFixed(0)}%</strong><em>${consistency>=80?'bem estável':consistency>=60?'variação moderada':'alta variação'}</em></article>
            <article class="analytics-kpi"><span class="analytics-kpi-icon">${analyticsIcon('pause')}</span><small>Pausas</small><strong>${pauseRatio.toFixed(1).replace('.',',')}%</strong><em>do tempo bruto</em></article>
          </section>

          ${analyticsCard('Evolução por atendimento',lineChartMarkup(current),'analytics-chart-card')}
          ${analyticsCard('Onde seu tempo está indo',bottleneckMarkup(current),'analytics-chart-card')}
          ${analyticsCard('Distribuição por modelo',modelBreakdownMarkup(current),'analytics-chart-card')}

          <details class="analytics-global-card"><summary><span>${analyticsIcon('layers')}<strong>Estatísticas globais</strong></span><small>curiosidade · todos os períodos</small></summary><div class="analytics-global-grid"><div><span>Atendimentos medidos</span><strong>${all.length}</strong></div><div><span>Tempo médio global</span><strong>${all.length?fmtDuration(globalAvg):'—'}</strong></div></div></details>
        `}
      </main>`,'stats');
  }

  renderStats = renderAnalytics;

  if(typeof renderSettings === 'function'){
    const baseRenderSettings = renderSettings;
    renderSettings = function(){
      return baseRenderSettings().replace('section-tab-header demo-tab-header','section-tab-header demo-tab-header compact-tab-header settings-compact-header');
    };
  }

  const baseBindV082Events = typeof bindV082Events === 'function' ? bindV082Events : null;
  if(baseBindV082Events){
    bindV082Events = function(){
      baseBindV082Events();
      document.querySelectorAll('[data-analytics-range]').forEach(b=>b.onclick=()=>{ui.analyticsRangeDays=Number(b.dataset.analyticsRange);render();});
      const modelFilter=document.getElementById('analyticsModelFilter');
      if(modelFilter)modelFilter.onchange=()=>{ui.analyticsModelId=modelFilter.value;render();};
    };
  }
})();
