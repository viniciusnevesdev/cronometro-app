(() => {
  'use strict';

  const NOTICE_ID='demoPresentationNotice';
  const BACKDROP_ID='demoPresentationBackdrop';
  const TITLE_TEXT='Versão de demonstração';
  const BODY_TEXT='Os nomes, telefones, atendimentos, anotações e tempos exibidos são fictícios e foram criados exclusivamente para apresentar as funcionalidades. Nenhum dado real de clientes ou do meu trabalho é exibido aqui.';

  function ensureBackdrop(){
    if(document.getElementById(BACKDROP_ID))return;
    const backdrop=document.createElement('div');
    backdrop.id=BACKDROP_ID;
    backdrop.className='demo-presentation-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    document.body.appendChild(backdrop);
  }

  function removeBackdrop(){
    const backdrop=document.getElementById(BACKDROP_ID);
    if(backdrop)backdrop.remove();
  }

  function polishNotice(){
    const notice=document.getElementById(NOTICE_ID);
    if(!notice){removeBackdrop();return false;}

    ensureBackdrop();

    if(!notice.querySelector('.presentation-notice-icon')){
      const icon=document.createElement('div');
      icon.className='presentation-notice-icon';
      icon.setAttribute('aria-hidden','true');
      icon.textContent='⚠️';
      const closeButton=notice.querySelector('button');
      if(closeButton?.nextSibling)notice.insertBefore(icon,closeButton.nextSibling);
      else notice.appendChild(icon);
    }

    const title=notice.querySelector('strong');
    if(title && title.textContent!==TITLE_TEXT)title.textContent=TITLE_TEXT;

    const text=notice.querySelector('p');
    if(text && text.textContent!==BODY_TEXT)text.textContent=BODY_TEXT;

    return true;
  }

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(()=>{
      scheduled=false;
      polishNotice();
    });
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',polishNotice,{once:true});
  }else{
    polishNotice();
  }
})();
