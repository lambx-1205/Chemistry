(() => {
"use strict";
const root=document.documentElement;
const key="organic-atlas-theme";
const button=document.getElementById("theme-toggle");
const icon=button?.querySelector(".theme-toggle-icon");
const label=button?.querySelector(".theme-toggle-label");
const meta=document.querySelector('meta[name="theme-color"]');
function getInitialTheme(){
 try{
  const saved=localStorage.getItem(key);
  if(saved==="dark"||saved==="light")return saved;
 }catch(_){}
 return window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
}
function applyTheme(theme,save){
 const dark=theme==="dark";
 root.dataset.theme=dark?"dark":"light";
 root.style.colorScheme=dark?"dark":"light";
 if(button){
  button.setAttribute("aria-pressed",String(dark));
  button.setAttribute("aria-label",dark?"ライトモードに切り替え":"ダークモードに切り替え");
  if(icon)icon.textContent=dark?"☀":"☾";
  if(label)label.textContent=dark?"ライトモード":"ダークモード";
 }
 if(meta)meta.setAttribute("content",dark?"#111914":"#f5f6f2");
 if(save){try{localStorage.setItem(key,dark?"dark":"light");}catch(_){}}
}
applyTheme(root.dataset.theme==="dark"?"dark":getInitialTheme(),false);
if(button)button.addEventListener("click",()=>applyTheme(root.dataset.theme==="dark"?"light":"dark",true));
})();