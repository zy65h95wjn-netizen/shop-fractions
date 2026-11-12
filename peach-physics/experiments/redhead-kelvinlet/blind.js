// No preference data is generated automatically. Identity is revealed only
// after ten actual button votes, and is never sent to a server.
export class BlindTrial{
 constructor(){
  this.seed=crypto.getRandomValues(new Uint32Array(1))[0];let s=this.seed;
  const random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
  const sides=[false,false,false,false,false,true,true,true,true,true];
  for(let i=sides.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[sides[i],sides[j]]=[sides[j],sides[i]];}
  const starts=[0,1.6,3.4,6.1,8.1,10.1,12,13.6,15.6,17];
  this.trials=starts.map((start,i)=>({start,left:sides[i]?'B':'A+',right:sides[i]?'A+':'B'}));
  for(let i=9;i>0;i--){const j=Math.floor(random()*(i+1));[this.trials[i],this.trials[j]]=[this.trials[j],this.trials[i]];}
  this.votes=[];this.index=0;
 }
 get current(){return this.trials[this.index];}
 vote(choice){const trial=this.current;this.votes.push({trial:this.index+1,start:trial.start,choice,preferred:choice==='tie'?'tie':choice==='X'?trial.left:trial.right});this.index++;return this.index===10;}
 result(){const B=this.votes.filter(v=>v.preferred==='B').length;return {seed:this.seed,trials:this.trials,votes:this.votes,B,Aplus:this.votes.filter(v=>v.preferred==='A+').length,ties:this.votes.filter(v=>v.preferred==='tie').length,passesPracticalRule:this.votes.length===10&&B>=8,note:'Practical preference rule, not statistical proof; anonymous single-browser observer.'};}
}
