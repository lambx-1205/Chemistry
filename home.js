(function(){
"use strict";
var data=window.OrganicAtlasData;
if(!data)return;
var compounds=document.querySelector("[data-stat-compounds]");
var reactions=document.querySelector("[data-stat-reactions]");
if(compounds)compounds.textContent=Array.isArray(data.compounds)?String(data.compounds.length):"—";
if(reactions)reactions.textContent=Array.isArray(data.edges)?String(data.edges.length):"—";
})();
