/* Per-character state around the byte-identical approved Holly playback engine. */
(function(root){
'use strict';
class ElfVoiceBank {
 constructor({profiles,character,enabled,available,withAudio,status}){
  this.character=character;this.players={};this.profiles=profiles;
  for(const [id,profile] of Object.entries(profiles)){
   const player=new HollyAudio({
    eligible:()=>character()===id&&enabled()&&available()&&!this.occupiedByOther(id),
    withAudio,
    status:text=>{if(character()===id)status(text.replaceAll('Holly',profile.label));}
   });
   // Configure unstarted players only. Holly retains the approved constructor's
   // exact recordings, durations, cursor policy, cancellation and playback code.
   if(id!=='holly'){
    if(!Array.isArray(profile.clips)||profile.clips.length!==2)throw Error('Two recorded takes required for '+id);
    player.clips=profile.clips.map(clip=>({...clip,buffer:null,bytes:null,loading:null,decoding:null,error:'',plays:0}));
   }
   this.players[id]=player;
  }
 }
 has(id=this.character()){return !!this.players[id];}
 current(){return this.players[this.character()]||null;}
 label(){return this.profiles[this.character()]?.label||'';}
 occupiedByOther(id){return Object.entries(this.players).some(([other,p])=>other!==id&&(p.active||p.pending));}
 preload(){return Promise.allSettled(Object.values(this.players).map(p=>p.preload()));}
 activate(ac){this.current()?.activate(ac);}
 request(kind){return this.current()?.request(kind)||false;}
 cancel(reason,forget=true){for(const p of Object.values(this.players))p.cancel(reason,forget);}
 pending(){return Object.values(this.players).some(p=>!!p.pending);}
 physicalSample(controller,accepted,now){this.current()?.physicalSample(controller,accepted,now);}
 snapshot(){return {character:this.character(),current:this.current()?.snapshot()||null,players:Object.fromEntries(Object.entries(this.players).map(([id,p])=>[id,p.snapshot()])),activeCount:Object.values(this.players).filter(p=>p.active).length,pendingCount:Object.values(this.players).filter(p=>p.pending).length};}
}
root.ElfVoiceBank=ElfVoiceBank;
})(globalThis);
