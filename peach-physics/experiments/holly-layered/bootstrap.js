'use strict';
// Explicit Canvas preview uses the actual production fallback selection.
if(new URLSearchParams(location.search).get('backend')==='canvas'){
 const get=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};
}
