'use strict';
/* UZE Beta: adaptação deliberadamente isolada da apresentação.
   O núcleo continua compatível com backups antigos; esta camada concentra os
   dados no escopo interno "principal" e nunca é carregada pela UZE estável. */
(() => {
  const RELEASE=String(window.APP_RELEASE||'');
  const UZE_AREA='principal';
  const excluded=new Set(['teste','treino','modelo novo','novo modelo','sem título','sem cliente']);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR');
  const clearlyLegacyClientName=value=>{
    const name=String(value||'').trim().replace(/\s+/g,' ');
    if(!name||name.length<5||name.length>80||excluded.has(normalize(name)))return false;
    const parts=name.split(' ');
    // Conservador: dois a quatro nomes próprios, só letras e cada palavra
    // iniciada por maiúscula. "teste" e títulos operacionais ficam intactos.
    return parts.length>=2&&parts.length<=4&&parts.every(part=>/^[A-ZÀ-Ý][A-Za-zÀ-ÿ'-]{1,}$/.test(part));
  };

  async function migrateUzeNativeClients(){
    if(typeof data==='undefined'||typeof db==='undefined')return;
    let settingsChanged=false,currentChanged=false;
    const clients=Array.isArray(data.settings.clients)?data.settings.clients.slice():[];
    const byName=new Map();
    for(const client of clients){
      if(!client||client.deletedAt||!client.name)continue;
      client.areaId=UZE_AREA;
      byName.set(normalize(client.name),client);
    }
    const findOrCreate=async name=>{
      const key=normalize(name);let client=byName.get(key);
      if(client)return client;
      client={id:`client-${uid()}`,areaId:UZE_AREA,name,createdAt:now(),updatedAt:now(),deletedAt:null};
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
      if(!session.clientId&&clearlyLegacyClientName(session.title)){
        const client=await findOrCreate(String(session.title).trim());
        session.clientId=client.id;session.clientNameSnapshot=client.name;changed=true;
      }else if(session.clientId){
        const client=clients.find(c=>c?.id===session.clientId);
        if(client&&!session.clientNameSnapshot){session.clientNameSnapshot=client.name;changed=true;}
      }
      if(changed)await put('sessions',session);
    }
    if(data.current){
      if(data.current.areaId!==UZE_AREA){data.current.areaId=UZE_AREA;currentChanged=true;}
      if(!Object.prototype.hasOwnProperty.call(data.current,'clientId')){data.current.clientId=null;currentChanged=true;}
      if(typeof data.current.clientNameSnapshot!=='string'){data.current.clientNameSnapshot='';currentChanged=true;}
      if(!data.current.clientId&&clearlyLegacyClientName(data.current.title)){
        const client=await findOrCreate(String(data.current.title).trim());
        data.current.clientId=client.id;data.current.clientNameSnapshot=client.name;currentChanged=true;
      }
    }
    if(!Array.isArray(data.settings.clients)||JSON.stringify(data.settings.clients)!==JSON.stringify(clients)){data.settings.clients=clients;settingsChanged=true;}
    if(data.settings.activeAreaId!==UZE_AREA){data.settings.activeAreaId=UZE_AREA;settingsChanged=true;}
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
  const baseSettings=renderSettings;
  renderSettings=function(){
    if(ui.settingsView==='sound'||ui.settingsView==='appearance'||ui.settingsView==='advanced')return baseSettings();
    const theme=data.settings.theme||'system',release=String(window.APP_RELEASE||'');
    const note='<svg class="sf-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>';
    return shell(`<header class="topbar section-tab-header"><h1>Ajustes</h1></header><main class="settings-content settings-v090"><section class="settings-section"><div class="settings-card theme-mode-card"><div class="theme-mode-segment">${[['system','Sistema'],['light','Claro'],['dark','Escuro']].map(([id,label])=>`<button data-uze-theme="${id}" class="${theme===id?'selected':''}">${label}</button>`).join('')}</div></div></section><section class="settings-section"><div class="settings-card settings-navigation-card"><button class="settings-row button-row" id="openSoundSettings"><span>${note} Som do cronômetro</span><span class="secondary-value">${data.settings.timerSoundEnabled?'Ativado':'Desativado'} ›</span></button><button class="settings-row button-row" id="openAppearanceSettings"><span>Aparência</span><span class="secondary-value">Clássico, Ultra e ícones ›</span></button></div></section><section class="settings-section"><h3 class="section-label">Dados</h3><div class="data-backup-card"><button class="data-backup-row" id="exportJson"><span class="data-backup-row-copy"><strong class="data-backup-row-title">Exportar backup</strong><span class="data-backup-row-subtitle">${data.settings.lastBackupExportAt?'Último backup registrado':'Nenhum backup registrado'}</span></span></button><label class="data-backup-row" for="importJsonFile"><span class="data-backup-row-copy"><strong class="data-backup-row-title">Restaurar backup</strong><span class="data-backup-row-subtitle">Substitui os dados atuais pelo backup JSON</span></span><input id="importJsonFile" class="sr-only" type="file" accept="application/json,.json"></label></div></section><section class="settings-section"><h3 class="section-label">Outros formatos</h3><div class="settings-card"><button class="settings-row button-row" id="exportCsv"><span>Exportar CSV</span></button><button class="settings-row button-row" id="exportPdf"><span>Exportar PDF</span></button></div></section><p class="settings-version-v090">Versão ${release}</p></main>`);
  };
  const baseRender=render;
  render=function(){
    const result=baseRender();
    const root=document.querySelector('.app-shell');
    if(root&&RELEASE){
      let badge=document.getElementById('uzeBetaVersionBadge');
      if(!badge){badge=document.createElement('span');badge.id='uzeBetaVersionBadge';badge.className='app-version-badge uze-beta-version-badge';root.appendChild(badge);}
      badge.textContent=RELEASE;
    }
    document.querySelectorAll('[data-uze-theme]').forEach(button=>button.onclick=async()=>{data.settings.theme=button.dataset.uzeTheme;await persistSettings();applyTheme();render();});
    return result;
  };
  window.addEventListener('load',()=>setTimeout(async()=>{
    await migrateUzeNativeClients();
    render();
  },0),{once:true});
})();
