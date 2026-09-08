'use strict';
const CACHE='cronometro-public-presentation-0.8.9-1';
const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './initial-data.json',
  './manifest.webmanifest',
  './app-icon-192.png',
  './app-icon-512.png',
  './apple-touch-icon.png',
  './launch.html',
  './recover.html',
  './safe.html',
  './diagnostico.html'
];
const SCOPE_PATH=new URL(self.registration.scope).pathname;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(key=>(key.startsWith('cronometro-public-demo-')||key.startsWith('cronometro-public-presentation-'))&&key!==CACHE).map(key=>caches.delete(key)))),
    self.clients.claim()
  ]));
});

function relPath(url){
  return url.pathname.startsWith(SCOPE_PATH)?url.pathname.slice(SCOPE_PATH.length):url.pathname;
}
function isSpecialNavigation(url){
  const rel=relPath(url);
  return rel==='launch.html'||rel==='recover.html'||rel==='safe.html'||rel==='diagnostico.html';
}
async function networkFirst(request,fallbackIndex=false){
  try{
    const response=await fetch(request);
    if(response&&response.ok){
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  }catch(error){
    const hit=await caches.match(request,{ignoreSearch:true});
    if(hit)return hit;
    if(fallbackIndex){
      const fallback=await caches.match('./index.html');
      if(fallback)return fallback;
    }
    throw error;
  }
}
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request,!isSpecialNavigation(url)));
    return;
  }

  event.respondWith(networkFirst(event.request,false).catch(()=>caches.match(event.request,{ignoreSearch:true})));
});
