(() => {
  'use strict';

  const NOTICE_ID='demoPresentationNotice';
  const BACKDROP_ID='demoPresentationBackdrop';

  function ensureBackdrop(){
    if(document.getElementById(BACKDROP_ID))return;
    const backdrop=document.createElement('div');
    backdrop.id=BACKDROP_ID;
    backdrop.className='demo-presentation-backdrop';
    backdrop.setAttribute('aria-hidden','true');
    document.body.appendChild(backdrop);
  }

  function removeBackdrop(){
    document.getElementById(BACKDROP_ID)?.remove();
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
    if(title)title.textContent='Versão de demonstração';

    const text=notice.querySelector('p');
    if(text){
      text.textContent='Os nomes, telefones, atendimentos, anotações e tempos exibidos são fictícios e foram criados exclusivamente para apresentar as funcionalidades. Nenhum dado real de clientes ou do meu trabalho é exibido aqui.';
    }

    return true;
  }

  const observer=new MutationObserver(()=>polishNotice());
  observer.observe(document.documentElement,{childList:true,subtree:true});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',polishNotice,{once:true});
  }else{
    polishNotice();
  }
})();
