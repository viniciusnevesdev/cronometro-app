(() => {
  'use strict';

  const chevronDownIcon = () => '<svg class="sf-icon disclosure-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5"/></svg>';
  const trendIcon = tone => {
    if(tone === 'positive') return '<svg class="sf-icon trend-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16l5-5 4 4 5-7"/><path d="M14 8h5v5"/></svg>';
    if(tone === 'negative') return '<svg class="sf-icon trend-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8l5 5 4-4 5 7"/><path d="M14 16h5v-5"/></svg>';
    return '<svg class="sf-icon trend-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>';
  };

  if(typeof renderHistory === 'function'){
    const baseRenderHistory = renderHistory;
    renderHistory = function(){
      return baseRenderHistory().replace(/<h1>Registros<\/h1>/g,'<h1>Histórico</h1>');
    };
  }

  if(typeof renderBottomBarLab === 'function'){
    const baseRenderBottomBarLab = renderBottomBarLab;
    renderBottomBarLab = function(){
      return baseRenderBottomBarLab().replace(/>Registros</g,'>Histórico<');
    };
  }

  if(typeof renderNotesEditor === 'function'){
    const baseRenderNotesEditor = renderNotesEditor;
    renderNotesEditor = function(sessionId){
      return baseRenderNotesEditor(sessionId).replace(/Sobre este atendimento/g,'Notas do atendimento');
    };
  }

  if(typeof renderSessionMenu === 'function'){
    const baseRenderSessionMenu = renderSessionMenu;
    renderSessionMenu = function(){
      return baseRenderSessionMenu().replace(/Sobre este atendimento/g,'Notas do atendimento');
    };
  }

  if(typeof clientNotesDisclosureDemo === 'function'){
    clientNotesDisclosureDemo = function(s){
      if(!isClientArea(sessionAreaId(s))) return '';
      const clientText = String(s.clientNote || '').trim();
      if(!clientText) return '';
      return `<details class="client-info-disclosure client-info-card"><summary><span>Informações coletadas sobre a cliente neste atendimento</span>${chevronDownIcon()}</summary><div class="client-info-tongue">${esc(clientText)}</div></details>`;
    };
  }

  if(typeof renderSessionDetail === 'function'){
    renderSessionDetail = function(s){
      const model = modelById(s.modelId);
      const timers = [...(s.timers || [])].sort((a,b)=>(a.order ?? 0) - (b.order ?? 0));
      const gross = recordGrossMs(s);
      const working = sessionTotal(s,s.savedAt);
      const pauses = pauseTotal(s,s.savedAt);
      const heading = clientLabelForSession(s);
      const appointment = String(s.appointmentNote || s.note || '').trim();
      const modelName = model ? (model.deletedAt ? 'Modelo excluído' : model.name) : 'Modelo excluído';
      const clientLink = s.clientId
        ? `<button class="record-client-profile-link" data-open-client="${s.clientId}">${esc(heading)}</button>`
        : `<span class="record-client-profile-link is-empty">${esc(heading)}</span>`;
      const moreClient = s.clientId
        ? `<button class="record-client-more-inline" data-open-client="${s.clientId}">Ver mais sobre essa cliente</button>`
        : '';

      return `<div class="modal-wrap record-detail-wrap"><section class="sheet record-detail-sheet">
        <div class="sheet-head record-detail-head demo-record-head">
          <button class="circle-button glass record-detail-close" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button>
          <h2 class="record-detail-heading">Detalhes do registro</h2>
          <button class="record-detail-check" id="closeRecordDetail" aria-label="Concluir">${svgIcon('check')}</button>
        </div>
        <div class="record-detail-body">
          <div class="record-client-line">${clientLink}<button class="record-client-edit" data-edit-record-client="${s.id}" aria-label="Alterar cliente deste atendimento">${svgIcon('pencil')}</button></div>
          ${moreClient}
          <button class="record-date-button demo-record-date" data-edit-record-date="${s.id}">${esc(fmtDateTime(recordDateMs(s)))} ${svgIcon('pencil')}</button>
          ${appointment ? `<section class="record-note-section"><h3 class="record-section-label">Notas do atendimento</h3><div class="saved-note-card demo-appointment-note">${esc(appointment)}</div><button class="edit-notes-button" data-edit-dual-notes="${s.id}">Editar anotações</button></section>` : `<button class="edit-notes-button demo-add-note" data-edit-dual-notes="${s.id}">Adicionar anotações</button>`}
          ${clientNotesDisclosureDemo(s)}
          <div class="record-detail-divider"></div>
          <section class="panel record-summary demo-record-summary">
            <div class="record-model-block"><div class="record-model-inline"><span>Modelo:</span><strong>${esc(modelName)}</strong></div></div>
            ${s.isNoMeasurement ? '<div class="row"><span class="badge">Sem medição</span></div>' : `<div class="record-time-grid"><div class="record-time-item record-time-working"><span>Tempo trabalhado</span><strong>${fmtDuration(working)}</strong></div><div class="record-time-item"><span>Tempo bruto total</span><strong>${fmtDuration(gross)}</strong></div><div class="record-time-item"><span>Pausas</span><strong>${fmtDuration(pauses)}</strong></div></div>`}
          </section>
          ${!model ? `<div class="record-actions"><button data-rebuild-model="${s.id}">Criar modelo deste registro</button></div>` : ''}
          <div class="record-timers-list demo-record-timers">${timers.map(t=>{
            const d = timerDuration(t,s.savedAt), zero = d <= 0, status = zeroMeasurementStatus(t), ignored = t.ignoredIntervals || [];
            return `<details class="record-timer-card ${zero ? 'zero' : ''}"><summary><span class="record-timer-title">${visualMarkerMarkup(t.marker,'record-inline-marker')}${esc(t.name)}${zero && status === 'missing' ? '<span class="measurement-missing-badge">Sem medição</span>' : ''}</span><span class="record-timer-time">${svgIcon('timers')}<strong>${fmtDuration(d)}</strong></span></summary><div class="record-timer-extra">${zero ? `<div class="measurement-status-box"><div class="measurement-status-title">Como tratar este zero nas estatísticas?</div><div class="measurement-status-options"><button data-measurement-status="notNeeded" data-session-id="${s.id}" data-timer-id="${t.id}" class="${status === 'notNeeded' ? 'selected' : ''}">Não foi necessário</button><button data-measurement-status="missing" data-session-id="${s.id}" data-timer-id="${t.id}" class="${status === 'missing' ? 'selected' : ''}">Sem medição</button></div></div>` : ''}${ignored.length ? `<div class="ignored-short-note">${ignored.length} toque(s) curto(s) ignorado(s): ${ignored.map((x,i)=>`${Math.round((x.durationMs || 0)/1000)} s <button class="restore-short-button" data-restore-short="${s.id}" data-timer-id="${t.id}" data-index="${i}">Restaurar</button>`).join(' · ')}</div>` : ''}<div class="muted small record-interval-label">Horários e intervalos</div>${t.intervals?.length ? t.intervals.map(i=>`<div class="row small"><span>${fmtDateTime(i.startedAt)}</span><span>${i.endedAt ? fmtDateTime(i.endedAt) : 'aberto'}</span></div>`).join('') : '<div class="muted small">Nenhum intervalo registrado.</div>'}<button class="action" data-correct-time="${s.id}" data-timer-id="${t.id}">Corrigir tempo</button></div></details>`;
          }).join('')}</div>
          <div class="record-delete-wrap"><button class="record-delete-button" data-delete-session="${s.id}">${trashIconMarkup()}<span>Excluir registro</span></button><div class="record-delete-help">esse atendimento/registro será movido para “apagados”</div></div>
        </div>
      </section></div>`;
    };
  }

  if(typeof renderStats === 'function'){
    const baseRenderStats = renderStats;
    renderStats = function(){
      const html = baseRenderStats();
      return html.replace(/<div class="stat-big">([^<]*)<\/div>/,(_,raw)=>{
        const text = String(raw || '');
        const match = text.match(/([0-9]+(?:[,.][0-9]+)?)%/);
        const magnitude = match ? Number(match[1].replace(',','.')) : NaN;
        const tone = Number.isFinite(magnitude) && magnitude === 0 ? 'neutral' : text.includes('mais rápido') ? 'positive' : text.includes('mais lento') ? 'negative' : 'neutral';
        return `<div class="stat-big trend-result trend-${tone}">${trendIcon(tone)}<span>${text}</span></div>`;
      });
    };
  }
})();
