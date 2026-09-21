'use strict';
/* UZE Beta: adaptação deliberadamente isolada da apresentação.
   O núcleo continua compatível com backups antigos; esta camada concentra os
   dados no escopo interno "principal" e nunca é carregada pela UZE estável. */
(() => {
  const RELEASE=String(window.APP_RELEASE||'');
  const UZE_AREA='principal';
  const excluded=new Set(['teste','treino','sem titulo','sem cliente','manutencao','alongamento','modelo novo','novo modelo','molde','f1','aula','cliente','atendimento']);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
  const clearlyLegacyClientName=value=>{
    const name=String(value||'').trim().replace(/\s+/g,' ');
    if(!name||name.length<3||name.length>80||excluded.has(normalize(name)))return false;
    const parts=name.split(' ');
    // Conservador: um a cinco nomes próprios, apenas letras, sem termos
    // operacionais. Permite nomes curtos reais como "Ana".
    return parts.length<=5&&parts.every(part=>/^[A-ZÀ-Ý][A-Za-zÀ-ÿ'-]{1,}$/.test(part));
  };

  async function uzeSeedClients(){
    try{
      const response=await fetch('./initial-data.json',{cache:'no-store'});
      if(!response.ok)return [];
      const seed=await response.json();
      return Array.isArray(seed?.settings?.clients)?seed.settings.clients:[];
    }catch(error){console.warn('Não foi possível consultar clientes do seed UZE.',error);return [];}
  }

  async function migrateUzeNativeClients(){
    if(typeof data==='undefined'||typeof db==='undefined')return;
    let settingsChanged=false,currentChanged=false;
    const clients=Array.isArray(data.settings.clients)?data.settings.clients.slice():[];
    const seedClients=await uzeSeedClients();
    const referencedIds=new Set([...data.sessions,data.current].filter(Boolean).map(session=>session.clientId).filter(Boolean));
    for(const seedClient of seedClients){
      if(!seedClient?.id||!referencedIds.has(seedClient.id)||clients.some(client=>client?.id===seedClient.id))continue;
      clients.push({...clone(seedClient),areaId:UZE_AREA});
      settingsChanged=true;
    }
    const byName=new Map();
    for(const client of clients){
      if(!client||client.deletedAt||!client.name)continue;
      client.areaId=UZE_AREA;
      byName.set(normalize(client.name),client);
    }
    const findOrCreate=async name=>{
      const key=normalize(name);let client=byName.get(key);
      if(client)return client;
      // createdAt nulo é intencional: um vínculo legado não prova a data real
      // de cadastro e não deve contaminar a métrica de clientes novas.
      client={id:`client-${uid()}`,areaId:UZE_AREA,name,createdAt:null,migratedAt:now(),updatedAt:now(),deletedAt:null,aliases:[]};
      clients.push(client);byName.set(key,client);settingsChanged=true;
      return client;
    };
    for(const model of data.models){
      let changed=false;
      if(model.areaId!==UZE_AREA){model.areaId=UZE_AREA;changed=true;}
      if(changed)await put('models',model);
    }
    for(const session of data.sessions){
      let changed=false;
      if(session.areaId!==UZE_AREA){session.areaId=UZE_AREA;changed=true;}
      if(!Object.prototype.hasOwnProperty.call(session,'clientId')){session.clientId=null;changed=true;}
      if(typeof session.clientNameSnapshot!=='string'){session.clientNameSnapshot='';changed=true;}
      // Preserva title: o vínculo é aditivo e reversível via backup.
      const linked=clients.find(client=>client?.id===session.clientId&&!client.deletedAt);
      const snapshotName=clearlyLegacyClientName(session.clientNameSnapshot)?String(session.clientNameSnapshot).trim():'';
      const titleName=clearlyLegacyClientName(session.title)?String(session.title).trim():'';
      const legacyName=snapshotName||titleName;
      if(!linked&&legacyName){
        const client=await findOrCreate(legacyName);
        if(titleName&&!session.legacyTitle)session.legacyTitle=session.title;
        session.clientId=client.id;session.clientNameSnapshot=client.name;changed=true;
      }else if(linked&&!session.clientNameSnapshot){
        session.clientNameSnapshot=linked.name;changed=true;
      }
      if(changed)await put('sessions',session);
    }
    if(data.current){
      if(data.current.areaId!==UZE_AREA){data.current.areaId=UZE_AREA;currentChanged=true;}
      if(!Object.prototype.hasOwnProperty.call(data.current,'clientId')){data.current.clientId=null;currentChanged=true;}
      if(typeof data.current.clientNameSnapshot!=='string'){data.current.clientNameSnapshot='';currentChanged=true;}
      const currentLinked=clients.find(client=>client?.id===data.current.clientId&&!client.deletedAt);
      const currentSnapshot=clearlyLegacyClientName(data.current.clientNameSnapshot)?String(data.current.clientNameSnapshot).trim():'';
      const currentTitle=clearlyLegacyClientName(data.current.title)?String(data.current.title).trim():'';
      if(!currentLinked&&(currentSnapshot||currentTitle)){
        const client=await findOrCreate(currentSnapshot||currentTitle);
        if(currentTitle&&!data.current.legacyTitle)data.current.legacyTitle=data.current.title;
        data.current.clientId=client.id;data.current.clientNameSnapshot=client.name;currentChanged=true;
      }
    }
    if(!Array.isArray(data.settings.clients)||JSON.stringify(data.settings.clients)!==JSON.stringify(clients)){data.settings.clients=clients;settingsChanged=true;}
    if(data.settings.activeAreaId!==UZE_AREA){data.settings.activeAreaId=UZE_AREA;settingsChanged=true;}
    if(data.settings.clientEmptyLabel!=='Escolher cliente'){data.settings.clientEmptyLabel='Escolher cliente';settingsChanged=true;}
    if(settingsChanged)await persistSettings();
    if(currentChanged)await persistCurrent();
  }

  const tabSvg={
    timers:'<svg class="sf-icon uze-tab-icon" viewBox="0 0 20.7578 24.5703" aria-hidden="true"><path d="M10.1719 22.4531C15.7422 22.4531 20.3516 17.8438 20.3516 12.2812C20.3516 6.71094 15.7344 2.10156 10.1641 2.10156C4.60156 2.10156 0 6.71094 0 12.2812C0 17.8438 4.60938 22.4531 10.1719 22.4531ZM10.1719 21C5.34375 21 1.46094 17.1094 1.46094 12.2812C1.46094 7.44531 5.33594 3.5625 10.1641 3.5625C15 3.5625 18.8828 7.44531 18.8906 12.2812C18.8984 17.1094 15.0078 21 10.1719 21ZM9.22656 2.69531L11.1094 2.69531L11.1094 0.96875C11.1094 0.4375 10.6953 0 10.1641 0C9.64844 0 9.22656 0.4375 9.22656 0.96875ZM16.4922 4.96094L17.7969 6.30469L19.0469 5.03906C19.25 4.83594 19.3672 4.57031 19.3672 4.32812C19.3672 3.83594 18.9688 3.4375 18.4531 3.4375C18.1641 3.4375 17.9453 3.52344 17.7344 3.72656Z" fill="currentColor" fill-opacity=".85"/><path d="M10.1719 13.7891C11 13.7891 11.6562 13.1172 11.6562 12.2891C11.6562 11.7031 11.3281 11.2031 10.7734 10.9375L10.7734 5.64062C10.7734 5.30469 10.5078 5.04688 10.1641 5.04688C9.83594 5.04688 9.5625 5.30469 9.5625 5.64062L9.5625 10.9297C9.02344 11.2031 8.67969 11.7031 8.67969 12.2891C8.67969 13.1172 9.33594 13.7891 10.1719 13.7891Z" fill="currentColor" fill-opacity=".85"/></svg>',
    history:'<svg class="sf-icon uze-tab-icon" viewBox="0 0 20.5 14.5547" aria-hidden="true"><path d="M5.57031 14.0234h13.8203c.3906 0 .7032-.3046.7032-.6953 0-.3906-.3126-.6875-.7032-.6875H5.57031c-.39062 0-.6875.2969-.6875.6875 0 .3907.29688.6953.6875.6953ZM1.22656 14.5547a1.22656 1.22656 0 1 0 0-2.4531 1.22656 1.22656 0 0 0 0 2.4531ZM5.57031 7.96875h13.8203c.3906 0 .7032-.29687.7032-.6875 0-.39062-.3126-.69531-.7032-.69531H5.57031c-.39062 0-.6875.30469-.6875.69531 0 .39063.29688.6875.6875.6875ZM1.22656 8.50781a1.22656 1.22656 0 1 0 0-2.45312 1.22656 1.22656 0 0 0 0 2.45312ZM5.57031 1.92188h13.8203c.3906 0 .7032-.30469.7032-.69532 0-.39062-.3126-.6875-.7032-.6875H5.57031c-.39062 0-.6875.29688-.6875.6875 0 .39063.29688.69532.6875.69532ZM1.22656 2.45312a1.22656 1.22656 0 1 0 0-2.45312 1.22656 1.22656 0 0 0 0 2.45312Z" fill="currentColor" fill-opacity=".85"/></svg>',
    stats:'<svg class="sf-icon uze-tab-icon" viewBox="0 0 22.7266 18.4766" aria-hidden="true"><path d="M0 17.7891c0 .3906.320312.6875.695312.6875H21.625c.375 0 .6953-.2969.6953-.6875 0-.3907-.3203-.6875-.6953-.6875H.695312C.320312 17.1016 0 17.3984 0 17.7891Z" fill="currentColor" fill-opacity=".85"/><path d="M17.2266 14.6875c0 .5391.3437.8594.9062.8594h2.4375c.5469 0 .8985-.3203.8985-.8594V7.78906c0-.53125-.3516-.85937-.8985-.85937h-2.4375c-.5625 0-.9062.32812-.9062.85937ZM11.7656 14.6875c0 .5391.3516.8594.9063.8594h2.4297c.5546 0 .9062-.3203.9062-.8594v-11.5c0-.54687-.3516-.86719-.9062-.86719h-2.4297c-.5547 0-.9063.32032-.9063.86719ZM6.30469 14.6875c0 .5391.35156.8594.89843.8594h2.4375c.55469 0 .90625-.3203.90625-.8594V.859375C10.5469.328125 10.1953 0 9.64062 0H7.20312c-.54687 0-.89843.328125-.89843.859375ZM.851562 14.6875c0 .5391.34375.8594.898438.8594H4.1875c.54688 0 .90625-.3203.90625-.8594V5.52344c0-.52344-.35937-.85938-.90625-.85938H1.75c-.554688 0-.898438.33594-.898438.85938Z" fill="currentColor" fill-opacity=".85"/></svg>',
    settings:'<svg class="sf-icon uze-tab-icon" viewBox="0 0 21.3594 20.9609" aria-hidden="true"><path d="M9.53125 20.9609h1.89065c.539 0 .914-.3125 1.039-0.8515l.5157-2.1797c.3593-.125.7187-.2657 1.039-.4141l1.9063 1.1797c.4531.2891.9531.2422 1.3203-.1328l1.3281-1.3203c.375-.375.4297-.8828.125-1.3437l-1.1719-1.8907c.1485-.336.2891-.6796.3985-1.0234l2.1953-.5156c.539-.125.8359-.5.8359-1.0391V9.5625c0-.5312-.2969-.8984-.8359-1.0312l-2.1797-.5235c-.125-.375-.2734-.7187-.3984-1.0234l1.1718-1.9219c.2891-.4609.2578-.9375-.125-1.3203l-1.3438-1.3281c-.3828-.3516-.8437-.4297-1.2968-.1407l-1.9297 1.1954c-.3125-.1563-.6641-.2891-1.0391-.4141L12.4609.851562C12.3359.3125 11.9609 0 11.4219 0H9.53125c-.53906 0-.91406.3125-1.03906.851562L7.97656 3.03906c-.35937.125-.71875.25782-1.04687.42188L5.00781 2.27344c-.45312-.28907-.92969-.22657-1.29687.14062L2.36719 3.74219c-.38282.38281-.41407.85937-.125 1.32031l1.17187 1.92187c-.125.3047-.27343.64844-.39843 1.02344L.835938 8.53125C.304688 8.66406 0 9.03125 0 9.5625v1.8672c0 .5391.304688.9141.835938 1.0391l2.195312.5156c.10938.3438.25.6875.39844 1.0235l-1.17188 1.8906c-.30469.4609-.25.9687.125 1.3437l1.32813 1.3203c.36718.375.86718.4219 1.3203.1328l1.90626-1.1797c.32812.1484.67968.2891 1.03906.4141l.51563 2.1797c.125.539.5.8515 1.03906.8515ZM10.4766 14.0625a3.58594 3.58594 0 1 1 0-7.17188 3.58594 3.58594 0 0 1 0 7.17188Z" fill="currentColor" fill-opacity=".85"/></svg>'
  };
  const baseSvg=svgIcon;
  svgIcon=name=>tabSvg[name]||baseSvg(name);
  const lineIcon=paths=>`<svg class="sf-icon uze-line-icon" viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
  const uzeIcons={
    note:lineIcon('<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>'),
    appearance:lineIcon('<path d="M4 7h10"/><path d="M18 7h2"/><circle cx="16" cy="7" r="2"/><path d="M4 17h2"/><path d="M10 17h10"/><circle cx="8" cy="17" r="2"/>'),
    optimized:lineIcon('<path d="M5 12h14"/><path d="M12 5v14"/><circle cx="12" cy="12" r="8"/>'),
    ultra:lineIcon('<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z"/><path d="m18.5 16 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8Z"/>'),
    reorder:lineIcon('<path d="M8 6h12"/><path d="M8 12h12"/><path d="M8 18h12"/><path d="m3 5 2-2 2 2"/><path d="M5 3v16"/><path d="m3 17 2 2 2-2"/>'),
    duplicate:lineIcon('<rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    search:lineIcon('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
    compass:lineIcon('<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>')
  };
  const themeIcon=mode=>mode==='light'
    ?'<svg class="uze-theme-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'
    :mode==='dark'
      ?'<svg class="uze-theme-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="6.5" fill="currentColor"/></svg>'
      :'<svg class="uze-theme-icon" viewBox="0 0 20 20" aria-hidden="true"><defs><clipPath id="uze-system-half"><path d="M3 17 17 3H3Z"/></clipPath></defs><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="10" cy="10" r="6.5" fill="currentColor" clip-path="url(#uze-system-half)"/></svg>';

  clientLabelForSession=function(session){
    if(!session)return 'Escolher cliente';
    return clientById(session.clientId)?.name||session.clientNameSnapshot||'Escolher cliente';
  };

  renderNotesEditor=function(sessionId){
    const session=data.sessions.find(item=>item.id===sessionId);if(!session)return '';
    const linked=!!clientById(session.clientId);
    return `<div class="notes-editor-wrap"><section class="notes-editor-card"><div class="notes-editor-head"><h2>Notas</h2><button class="notes-editor-close" id="closeNotesEditor">${svgIcon('close')}</button></div><div class="notes-editor-body"><label><strong>Sobre o atendimento</strong><textarea id="editAppointmentNote">${esc(session.appointmentNote||session.note||'')}</textarea></label><label class="${linked?'':'note-disabled'}"><strong>Sobre a cliente</strong><textarea id="editClientNote" ${linked?'':'disabled'}>${esc(session.clientNote||'')}</textarea>${linked?'':'<small>Vincule uma cliente para adicionar notas sobre ela.</small>'}</label></div><button class="notes-editor-save" id="saveNotesEditor">Salvar anotações</button></section></div>`;
  };

  function renderUzeActiveIcon(){
    const sizes=Object.values(UI_CONFIG.activeIconSizes||{}),speeds=Object.values(UI_CONFIG.animationSpeeds||{});
    const source=data.settings.activeTimerIconSource||'default';
    const sourceLabels={default:'Padrão do aplicativo',file:'Arquivo no aparelho',svg:'SVG personalizado',remoteSvg:'Link SVG'};
    const name=data.settings.activeTimerIconName||sourceLabels[source]||'Ícone personalizado';
    return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeUzeActiveIcon" aria-label="Voltar">${svgIcon('back')}</button><h1>Ícone ativo</h1><span></span></header><main class="settings-content uze-active-icon-settings">
      <section class="settings-section"><h3 class="section-label">Ícone atual</h3><div class="settings-card uze-active-icon-summary"><span class="uze-active-icon-preview">${activeTimerIconMarkup()}</span><span><strong>${esc(name)}</strong><small>${esc(sourceLabels[source]||'Personalizado')}</small></span></div></section>
      <section class="settings-section"><h3 class="section-label">Alterar ícone</h3><div class="settings-card"><label class="settings-row button-row" for="activeIconFile"><span>Escolher SVG ou PNG</span><input id="activeIconFile" class="sr-only" type="file" accept="image/svg+xml,image/png,.svg,.png"></label><button class="settings-row button-row" id="pasteSvgCode"><span>Colar código SVG</span></button><button class="settings-row button-row" id="pasteSvgUrl"><span>Usar URL de SVG</span></button>${source!=='default'?'<button class="settings-row button-row" id="restoreDefaultActiveIcon"><span>Restaurar padrão</span></button>':''}</div></section>
      <section class="settings-section"><h3 class="section-label">Visual</h3><div class="settings-card"><div class="settings-row uze-option-row"><span>Tamanho</span><div class="animation-speed-options">${sizes.map(item=>`<button data-active-icon-size="${esc(item.id)}" class="${data.settings.activeTimerIconSize===item.id?'selected':''}">${esc(item.name)}</button>`).join('')}</div></div><button class="settings-row button-row" id="toggleActiveTimerAnimation"><span>Animar ícone do cronômetro ativo</span><span class="ios-switch ${data.settings.animateActiveTimerIcon?'on':''}"></span></button>${data.settings.animateActiveTimerIcon?`<div class="settings-row uze-option-row"><span>Velocidade</span><div class="animation-speed-options">${speeds.map(item=>`<button data-animation-speed="${esc(item.id)}" class="${data.settings.activeTimerAnimationSpeed===item.id?'selected':''}">${esc(item.name)}</button>`).join('')}</div></div>`:''}</div></section>
    </main>`,'settings');
  }

  function renderUzeAppearance(){
    const presets=UI_CONFIG.themePresets||[],custom=data.settings.colorTheme==='custom';
    return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeAppearanceSettings" aria-label="Voltar">${svgIcon('back')}</button><h1>Aparência</h1><span></span></header><main class="settings-content uze-appearance-settings">
      <section class="settings-section"><h3 class="section-label">Cores</h3><div class="settings-card color-card"><div class="theme-presets horizontal-themes">${presets.map(preset=>`<button class="theme-preset ${data.settings.colorTheme===preset.id?'selected':''}" data-color-theme="${esc(preset.id)}"><span class="theme-dot" style="--theme-accent:${esc(preset.accent)};--theme-action:${esc(preset.action)}"></span><span>${esc(preset.name)}</span></button>`).join('')}<button class="theme-preset ${custom?'selected':''}" data-color-theme="custom"><span class="theme-dot custom-dot" style="--theme-accent:${esc(data.settings.accentColor||'#007AFF')};--theme-action:${esc(data.settings.accentColor||'#007AFF')}"></span><span>Personalizada</span></button></div>${custom?`<div class="custom-theme-row"><input id="accentCustom" type="color" value="${esc(data.settings.accentColor||'#007AFF')}"><span>${esc((data.settings.accentColor||'#007AFF').toUpperCase())}</span></div>`:''}</div></section>
      <section class="settings-section"><div class="settings-card settings-navigation-card"><button class="settings-row button-row uze-navigation-row" id="openUzeActiveIcon"><span class="uze-navigation-copy"><strong>Ícone do cronômetro ativo</strong></span><span class="uze-chevron" aria-hidden="true">›</span></button></div></section>
      <section class="settings-section"><div class="settings-card"><button class="settings-row button-row" id="toggleTotalColonBlink"><span>Piscar os dois pontos do tempo total</span><span class="ios-switch ${data.settings.blinkTotalColon?'on':''}"></span></button></div></section>
      <section class="settings-section"><h3 class="section-label">Avançado</h3><div class="settings-card settings-navigation-card"><button class="settings-row button-row uze-navigation-row" id="openAdvancedSettings"><span class="uze-navigation-copy"><strong>Personalização avançada</strong></span><span class="uze-chevron" aria-hidden="true">›</span></button></div></section>
    </main>`,'settings');
  }

  function backupStatus(){
    const value=Number(data.settings.lastBackupExportAt||0);
    if(!value||!Number.isFinite(value))return {label:'Nenhum backup registrado',attention:true};
    const days=Math.max(0,Math.floor((now()-value)/86400000));
    if(days===0)return {label:'Último backup: hoje',attention:false};
    if(days===1)return {label:'Último backup: ontem',attention:false};
    return {label:`Último backup há ${days} dias`,attention:days>=7};
  }

  function renderUzeSettingsMain(){
    const theme=data.settings.theme||'system',visual=visualStyleModeV088(),release=String(window.APP_RELEASE||''),backup=backupStatus();
    const themeOptions=[['light','Claro'],['system','Sistema'],['dark','Escuro']];
    const visualOptions=[['classic','Otimizado',uzeIcons.optimized],['ultra','Ultra',uzeIcons.ultra]];
    return shell(`<header class="topbar section-tab-header compact-tab-header settings-compact-header"><h1>Ajustes</h1></header><main class="settings-content settings-v090">
      <section class="settings-section uze-mode-section"><h2 class="uze-settings-heading">Tema</h2><div class="uze-segment" data-selected="${esc(theme)}" data-options="3">${themeOptions.map(([id,label])=>`<button data-uze-theme="${id}" class="${theme===id?'selected':''}">${themeIcon(id)}<span>${label}</span></button>`).join('')}</div></section>
      <section class="settings-section uze-mode-section"><h2 class="uze-settings-heading">Estilo visual</h2><div class="uze-segment uze-visual-segment" data-selected="${esc(visual)}" data-options="2">${visualOptions.map(([id,label,icon])=>`<button data-visual-style-mode="${id}" class="${visual===id?'selected':''}">${icon}<span>${label}</span></button>`).join('')}</div></section>
      <section class="settings-section"><div class="settings-card settings-navigation-card uze-settings-navigation">
        <button class="settings-row button-row uze-navigation-row" id="openClientsDirectory"><span class="settings-icon-label">${personIconMarkup()}<span><strong>Clientes</strong><small>Cadastrar e gerenciar clientes</small></span></span><span class="uze-chevron" aria-hidden="true">›</span></button>
        <button class="settings-row button-row uze-navigation-row" id="openSoundSettings"><span class="settings-icon-label">${uzeIcons.note}<span><strong>Som do cronômetro</strong><small>${data.settings.timerSoundEnabled?'Ativado':'Desativado'}</small></span></span><span class="uze-chevron" aria-hidden="true">›</span></button>
        <button class="settings-row button-row uze-navigation-row" id="openAppearanceSettings"><span class="settings-icon-label">${uzeIcons.appearance}<span><strong>Aparência</strong><small>Visual, ícones e detalhes</small></span></span><span class="uze-chevron" aria-hidden="true">›</span></button>
      </div></section>
      <section class="settings-section"><h3 class="section-label">Dados</h3><div class="data-backup-card"><button class="data-backup-row ${backup.attention?'is-attention':''}" id="exportJson"><span class="data-backup-row-icon">${backupShareIcon()}</span><span class="data-backup-row-copy"><strong class="data-backup-row-title">Exportar backup</strong><span class="data-backup-row-subtitle">${esc(backup.label)}</span></span></button><label class="data-backup-row" for="importJsonFile"><span class="data-backup-row-icon">${backupImportIcon()}</span><span class="data-backup-row-copy"><strong class="data-backup-row-title">Restaurar backup</strong><span class="data-backup-row-subtitle">Substitui os dados atuais pelo backup JSON</span></span><input id="importJsonFile" class="sr-only" type="file" accept="application/json,.json"></label></div></section>
      <section class="settings-section"><h3 class="section-label">Outros formatos</h3><div class="settings-card"><button class="settings-row button-row" id="exportCsv"><span>Exportar CSV</span></button><button class="settings-row button-row" id="exportPdf"><span>Exportar PDF</span></button></div></section><p class="settings-version-v090">Versão ${esc(release)}</p>
    </main>`,'settings');
  }

  function uzeClientRows(query=''){
    const needle=normalize(query),clients=(data.settings.clients||[]).filter(client=>client&&!client.deletedAt&&(!needle||normalize(client.name).includes(needle))).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
    if(!clients.length)return `<div class="empty">${needle?'Nenhuma cliente encontrada.':'Nenhuma cliente cadastrada.'}</div>`;
    return `<div class="client-directory-card">${clients.map(client=>{const count=data.sessions.filter(session=>session.status==='saved'&&!session.deletedAt&&session.clientId===client.id).length;return `<button class="client-directory-row" data-open-client="${esc(client.id)}"><span><strong>${esc(client.name)}</strong>${client.whatsapp?`<small>${esc(client.whatsapp)}</small>`:''}</span><span>${count} atend.</span></button>`;}).join('')}</div>`;
  }

  function renderUzeClients(){
    const query=String(ui.uzeClientQuery||'');
    return shell(`<header class="topbar simple section-tab-header appearance-header"><button class="appearance-back" id="closeClientsDirectory" aria-label="Voltar">${svgIcon('back')}</button><h1>Clientes</h1><button class="uze-header-action" id="createUzeClient" aria-label="Cadastrar cliente">${svgIcon('plus')}</button></header><main class="settings-content clients-directory-screen"><label class="uze-client-search">${uzeIcons.search}<input id="uzeClientSearch" type="search" placeholder="Pesquisar clientes" value="${esc(query)}" autocomplete="off"></label><button class="uze-create-client" id="createUzeClientMain">${svgIcon('plus')}<span>Cadastrar nova cliente</span></button><div id="uzeClientRows">${uzeClientRows(query)}</div></main>`,'settings');
  }

  renderClientProfile=function(clientId){
    const client=clientById(clientId);if(!client)return '';
    const sessions=data.sessions.filter(session=>session.status==='saved'&&!session.deletedAt&&session.clientId===client.id).sort((a,b)=>recordDateMs(b)-recordDateMs(a));
    const measured=sessions.filter(session=>!session.isNoMeasurement),average=measured.length?measured.reduce((sum,session)=>sum+sessionTotal(session,session.savedAt),0)/measured.length:0;
    const notes=[...new Set(sessions.map(session=>String(session.clientNote||'').trim()).filter(Boolean))];
    return `<div class="client-profile-wrap"><section class="client-profile-card uze-client-profile"><div class="client-profile-head"><button class="uze-profile-edit" data-edit-uze-client="${esc(client.id)}">${svgIcon('pencil')}<span>Editar</span></button><h2>${esc(client.name)}</h2><button class="client-profile-close" id="closeClientProfile">${svgIcon('close')}</button></div><div class="client-contact-strip"><span><small>WhatsApp</small><strong>${esc(client.whatsapp||'Não informado')}</strong></span><span><small>Atendimentos</small><strong>${sessions.length}</strong></span><span><small>Tempo médio</small><strong>${measured.length?fmtDuration(average):'—'}</strong></span></div><section class="client-profile-section"><h3>Notas sobre a cliente</h3>${notes.length?notes.map(note=>`<p>${esc(note)}</p>`).join(''):'<div class="muted small">Nenhuma anotação.</div>'}</section><section class="client-profile-section"><h3>Histórico</h3>${sessions.length?sessions.map(session=>`<button class="uze-client-history-row" data-open-client-record="${esc(session.id)}"><span>${esc(session.modelNameSnapshot||modelById(session.modelId)?.name||'Modelo')}</span><strong>${esc(fmtDate(recordDateMs(session)))}</strong></button>`).join(''):'<div class="muted small">Nenhum atendimento vinculado.</div>'}</section><button class="uze-delete-client" data-delete-uze-client="${esc(client.id)}">Excluir cliente</button></section></div>`;
  };

  renderAppearanceSettings=renderUzeAppearance;
  renderSettings=function(){
    const view=ui.settingsView||'main';
    if(view==='appearance')return renderUzeAppearance();
    if(view==='uzeActiveIcon')return renderUzeActiveIcon();
    if(view==='advanced')return renderAdvancedSettings();
    if(view==='sound')return renderTimerSoundSettings();
    if(view==='clients')return renderUzeClients();
    return renderUzeSettingsMain();
  };

  renderSessionMenu=function(){
    const session=data.current,linked=!!clientById(session?.clientId);if(!session)return '';
    return `<div class="modal-wrap"><section class="sheet details-sheet demo-details-sheet" role="dialog" aria-modal="true"><div class="sheet-head liquid-head"><button class="circle-button glass detail-close-button" id="closeModal" aria-label="Fechar">${svgIcon('close')}</button><h2>Detalhes</h2><span class="sheet-spacer"></span></div><div class="sheet-body"><h3 class="detail-section-label">Notas</h3><section class="sheet-card notes-detail-card"><div class="dual-notes"><div class="note-block"><label for="currentAppointmentNote">Sobre o atendimento</label><textarea id="currentAppointmentNote" rows="2">${esc(session.appointmentNote||session.note||'')}</textarea></div><div class="note-block ${linked?'':'note-disabled'}"><label for="currentClientNote">Sobre a cliente</label><textarea id="currentClientNote" rows="2" ${linked?'':'disabled'}>${esc(session.clientNote||'')}</textarea>${linked?'':'<small>Vincule uma cliente para adicionar notas sobre ela.</small>'}</div></div></section><h3 class="detail-section-label">Tamanho dos cronômetros</h3><section class="sheet-card timer-size-detail-card"><div class="detail-size-options animation-speed-options" role="group" aria-label="Tamanho dos cronômetros">${[['small','Pequeno'],['medium','Médio'],['large','Grande']].map(([id,label])=>`<button data-timer-size="${id}" class="${data.settings.timerSize===id?'selected':''}">${label}</button>`).join('')}</div></section><section class="uze-model-actions"><button class="detail-action" id="menuCustomize" aria-label="Reordenar cronômetros">${uzeIcons.reorder}<span>Reordenar</span></button><button class="detail-action" id="saveAsNewModel" aria-label="Salvar como novo modelo">${uzeIcons.duplicate}<span>Novo modelo</span></button></section></div></section></div>`;
  };

  renderTimerMarkerEditor=function(){
    const target=markerTarget();if(!target)return '';
    const marker=target.timer.marker||null,allowed=new Set(['lucide','iconoir','svg']),tab=allowed.has(ui.modal.markerTab)?ui.modal.markerTab:'lucide';
    const lucideNames=Object.keys(V080_LUCIDE_MARKERS);let pane='';
    if(tab==='lucide')pane=`<div class="marker-pane"><div class="marker-grid">${lucideNames.map(name=>`<button data-lucide-marker="${esc(name)}" aria-label="${esc(name)}">${lucideMarkerSvg(name)}</button>`).join('')}</div></div>`;
    else if(tab==='iconoir')pane=`<div class="marker-pane"><input id="iconoirNameInput" placeholder="Nome do ícone, ex.: home-simple" value="${marker?.type==='iconoir'?esc(marker.value):''}"></div><div class="marker-editor-actions"><button class="primary" id="importIconoirMarker">Importar ícone</button></div>`;
    else pane='<div class="marker-pane"><textarea id="markerSvgInput" placeholder="Cole o código SVG completo"></textarea></div><div class="marker-editor-actions"><button class="primary" id="applySvgMarker">Usar SVG</button></div>';
    return `<div class="modal-wrap"><section class="sheet marker-editor-sheet"><div class="sheet-head"><h2>Ícone do cronômetro</h2><button class="chip" id="closeModal">Fechar</button></div>${visualMarkerMarkup(marker,'marker-preview')}<div class="marker-tabs">${[['lucide','Biblioteca'],['iconoir','Iconoir'],['svg','SVG']].map(([id,label])=>`<button data-marker-tab="${id}" class="${tab===id?'selected':''}">${label}</button>`).join('')}</div>${pane}<div class="marker-editor-actions"><button id="clearTimerMarker">Sem ícone</button></div></section></div>`;
  };

  renderEditModel=function(model){
    const timers=model.timers.filter(timer=>!timer.removedAt).sort((a,b)=>a.order-b.order);
    return `<div class="modal-wrap"><section class="sheet"><div class="sheet-head"><h2>${esc(model.name)}</h2><button class="chip" id="closeToModels">Concluir</button></div><div class="toolbar"><button id="renameModel">Renomear modelo</button><button id="addTemplate">＋ Cronômetro</button></div>${timers.length?timers.map((timer,index)=>`<div class="panel"><div class="row"><span class="model-timer-heading">${visualMarkerMarkup(timer.marker)}<strong>${esc(timer.name)}</strong></span><span class="toolbar"><button data-move-template="${timer.id}" data-dir="-1" ${index===0?'disabled':''}>↑</button><button data-move-template="${timer.id}" data-dir="1" ${index===timers.length-1?'disabled':''}>↓</button></span></div><div class="toolbar"><button data-edit-template="${timer.id}">Editar nome</button><button data-model-marker="${timer.id}">Ícone</button><button data-remove-template="${timer.id}" class="danger">Remover</button></div></div>`).join(''):'<div class="empty">Este modelo está vazio. Você pode mantê-lo assim ou adicionar cronômetros.</div>'}</section></div>`;
  };

  renderOrganize=function(){
    const session=data.current;
    return `<div class="modal-wrap"><section class="sheet organize-sheet"><div class="sheet-head"><h2>Reordenar cronômetros</h2><button class="chip" id="closeModal">Concluir</button></div><p class="organize-hint">Arraste pelo puxador. Toque no nome para renomear e no ícone para alterá-lo.</p><div class="organize-list" id="organizeList">${session.timers.sort((a,b)=>a.order-b.order).map(timer=>`<div class="organize-timer-card" data-organize-timer="${timer.id}">${organizeStateMarkup(session,timer)}<button class="organize-marker-button" data-current-marker="${timer.id}" aria-label="Ícone de ${esc(timer.name)}">${visualMarkerMarkup(timer.marker)}</button><button class="organize-name-button" data-rename-current="${timer.id}">${esc(timer.name)}</button><button class="organize-delete-button" data-remove-current="${timer.id}" aria-label="Remover ${esc(timer.name)}">${trashIconMarkup()}</button><button class="organize-drag-handle" data-reorder-handle="${timer.id}" aria-label="Arrastar ${esc(timer.name)}">≡</button></div>`).join('')}</div></section></div>`;
  };

  async function createUzeClient(){
    const raw=await iosTextPrompt({title:'Cadastrar cliente',placeholder:'Nome da cliente'}),name=String(raw??'').trim();if(!name)return;
    const existing=(data.settings.clients||[]).find(client=>!client.deletedAt&&normalize(client.name)===normalize(name));
    const client=existing||await createClient(name,UZE_AREA);
    if(!existing){const phone=await iosTextPrompt({title:'WhatsApp',message:'Opcional',placeholder:'(00) 00000-0000'});client.whatsapp=String(phone??'').trim();client.updatedAt=now();await persistSettings();}
    ui.modal={type:'clientProfile',clientId:client.id};render();
  }

  async function editUzeClient(clientId){
    const client=clientById(clientId);if(!client)return;
    const rawName=await iosTextPrompt({title:'Editar cliente',value:client.name,placeholder:'Nome da cliente'}),name=String(rawName??'').trim();if(!name)return;
    const rawPhone=await iosTextPrompt({title:'WhatsApp',message:'Opcional',value:client.whatsapp||'',placeholder:'(00) 00000-0000'});
    client.name=name;client.whatsapp=String(rawPhone??client.whatsapp??'').trim();client.updatedAt=now();
    for(const session of data.sessions){if(session.clientId===client.id){session.clientNameSnapshot=name;await put('sessions',session);}}
    if(data.current?.clientId===client.id){data.current.clientNameSnapshot=name;await persistCurrent();}
    await persistSettings();render();
  }

  async function deleteUzeClient(clientId){
    const client=clientById(clientId);if(!client||!confirm(`Excluir “${client.name}” do cadastro? Os atendimentos e nomes registrados serão preservados.`))return;
    client.deletedAt=now();client.updatedAt=now();await persistSettings();ui.modal=null;render();
  }

  const baseRender=render;
  render=function(){
    const result=baseRender();
    const root=document.querySelector('.app-shell');
    if(root&&RELEASE){
      let badge=document.getElementById('uzeBetaVersionBadge');
      if(!badge){badge=document.createElement('span');badge.id='uzeBetaVersionBadge';badge.className='app-version-badge uze-beta-version-badge';root.appendChild(badge);}
      badge.textContent=RELEASE;
    }
    document.querySelectorAll('[data-uze-theme]').forEach(button=>button.onclick=async event=>{event.stopPropagation();const mode=button.dataset.uzeTheme,segment=button.closest('.uze-segment');segment.dataset.selected=mode;segment.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===button));data.settings.theme=mode;applyTheme();await persistSettings();});
    document.querySelectorAll('.uze-visual-segment [data-visual-style-mode]').forEach(button=>button.onclick=async event=>{event.stopPropagation();const mode=button.dataset.visualStyleMode==='ultra'?'ultra':'classic',segment=button.closest('.uze-segment');segment.dataset.selected=mode;segment.querySelectorAll('button').forEach(item=>item.classList.toggle('selected',item===button));data.settings.visualStyleMode=mode;applyVisualStyleV088(mode);await persistSettings();toast(mode==='ultra'?'Modo Ultra ativado':'Modo Otimizado ativado');});
    if(document.getElementById('openClientsDirectory'))document.getElementById('openClientsDirectory').onclick=()=>{ui.settingsView='clients';render();};
    if(document.getElementById('openUzeActiveIcon'))document.getElementById('openUzeActiveIcon').onclick=()=>{ui.settingsView='uzeActiveIcon';render();};
    if(document.getElementById('closeUzeActiveIcon'))document.getElementById('closeUzeActiveIcon').onclick=()=>{ui.settingsView='appearance';render();};
    if(document.getElementById('closeClientsDirectory'))document.getElementById('closeClientsDirectory').onclick=()=>{ui.settingsView='main';render();};
    ['createUzeClient','createUzeClientMain'].forEach(id=>{const button=document.getElementById(id);if(button)button.onclick=createUzeClient;});
    const search=document.getElementById('uzeClientSearch');if(search)search.oninput=event=>{ui.uzeClientQuery=event.target.value;const rows=document.getElementById('uzeClientRows');if(rows)rows.innerHTML=uzeClientRows(ui.uzeClientQuery);document.querySelectorAll('[data-open-client]').forEach(button=>button.onclick=()=>{ui.modal={type:'clientProfile',clientId:button.dataset.openClient};render();});};
    document.querySelectorAll('[data-edit-uze-client]').forEach(button=>button.onclick=()=>editUzeClient(button.dataset.editUzeClient));
    document.querySelectorAll('[data-delete-uze-client]').forEach(button=>button.onclick=()=>deleteUzeClient(button.dataset.deleteUzeClient));
    return result;
  };
  async function ensureUzeDemoDataset(){
    const saved=data.sessions.filter(session=>session?.status==='saved'&&!session.deletedAt);
    const hasDemo=saved.some(session=>/^demo-s\\d+$/.test(String(session.id||'')));
    if(saved.length&&!hasDemo)return;
    let payload;
    try{const response=await fetch('./initial-data.json',{cache:'no-store'});if(!response.ok)return;payload=await response.json();}catch(error){console.warn('Não foi possível atualizar os dados fictícios UZE.',error);return;}
    if(!payload?.demo?.enabled||!Array.isArray(payload.demo.sessions))return;
    let settingsChanged=false;
    const seedClients=Array.isArray(payload.settings?.clients)?payload.settings.clients:[];
    if(!Array.isArray(data.settings.clients))data.settings.clients=[];
    for(const seed of seedClients){
      let current=data.settings.clients.find(client=>client?.id===seed.id);
      if(!current){current=clone(seed);data.settings.clients.push(current);settingsChanged=true;}
      else if(String(current.id||'').startsWith('client-demo-')){
        for(const key of ['name','whatsapp','createdAt','updatedAt','areaId'])if(current[key]!==seed[key]){current[key]=seed[key];settingsChanged=true;}
      }
    }
    const models=Array.isArray(payload.models)?payload.models:[];
    for(const seed of models){
      if(data.models.some(model=>model?.id===seed.id))continue;
      const model=clone(seed);data.models.push(model);await put('models',model);
    }
    const existingIds=new Set(data.sessions.map(session=>String(session?.id||'')));
    const baseNow=Date.now();
    for(const spec of payload.demo.sessions){
      if(existingIds.has(String(spec.id)))continue;
      const session=typeof materializeDemoSession==='function'?materializeDemoSession(spec,models,data.settings.clients,baseNow):null;
      if(!session)continue;
      data.sessions.push(session);existingIds.add(String(session.id));await put('sessions',session);
    }
    if(settingsChanged)await persistSettings();
  }

  async function reconcileWhenRuntimeIsReady(attempt=0){
    if(typeof data!=='undefined'&&typeof db!=='undefined'&&db&&data?.settings&&Array.isArray(data.sessions)){
      await ensureUzeDemoDataset();await migrateUzeNativeClients();render();return;
    }
    if(attempt<120)setTimeout(()=>reconcileWhenRuntimeIsReady(attempt+1),50);
    else console.error('A reconciliação de clientes UZE não encontrou o runtime pronto.');
  }
  window.addEventListener('load',()=>reconcileWhenRuntimeIsReady(),{once:true});
})();
