/* The Bible Challenge — reconstructed application shell loader.
 * The PR5 foundation remains frozen in pr5-core.js; later reconstruction
 * layers load additively so the monolithic application stays untouched.
 */
(()=>{'use strict';
if(window.__TBC_RECONSTRUCTION_LOADER__)return;window.__TBC_RECONSTRUCTION_LOADER__=true;
const current=document.currentScript;
const base=new URL('.',current?.src||document.baseURI);
function addStyle(name,marker){
  if(document.querySelector(`link[${marker}]`))return;
  const link=document.createElement('link');link.rel='stylesheet';link.href=new URL(name,base).href;link.setAttribute(marker,'true');document.head.appendChild(link);
}
function addScript(name,marker,onload){
  if(document.querySelector(`script[${marker}]`))return null;
  const script=document.createElement('script');script.src=new URL(name,base).href;script.async=false;script.setAttribute(marker,'true');if(onload)script.addEventListener('load',onload,{once:true});document.head.appendChild(script);return script;
}
addStyle('pr7-library-progress.css','data-pr7-style');
addScript('pr5-core.js','data-pr5-core',()=>addScript('pr7-library-progress.js','data-pr7-script'));
})();
