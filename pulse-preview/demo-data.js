'use strict';
// Fictional local-only data. Never reads Apple Health, Supabase, storage or credentials.
(() => {
  function nyDay(date) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone:'America/New_York', year:'numeric', month:'2-digit', day:'2-digit'
    }).formatToParts(date);
    const fields = Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return fields.year+'-'+fields.month+'-'+fields.day;
  }
  function previous(day, amount) {
    const d = new Date(day+'T12:00:00Z');
    d.setUTCDate(d.getUTCDate()-amount);
    return d.toISOString().slice(0,10);
  }
  function makeData() {
    const today=nyDay(new Date()), now=new Date().toISOString();
    const daily=Array.from({length:90},(_,i)=>({
      day:previous(today,i),
      resting_heart_rate:i%11===5?null:Number((66+4*Math.sin(i/5)).toFixed(2)),
      heart_rate:i%13===6?null:Number((72+8*Math.sin(i/6)).toFixed(2)),
      hrv_sdnn:i%10===4?null:Number((49+9*Math.cos(i/8)).toFixed(2)),
      blood_oxygen_saturation:i%17===9?null:Number((97.5+0.6*Math.sin(i/10)).toFixed(2))
    }));
    const events=[
      {id:'demo-trt-event',kind:'trt',effective_at:previous(today,24)+'T12:00:00Z',data:{dose_mg:50,interval_days:4,route:'IM'}},
      {id:'demo-med-event',kind:'medication',effective_at:previous(today,18)+'T12:00:00Z',data:{name:'Example medication',status:'active',dose:'demo only',frequency:'once daily'}},
      {id:'demo-caffeine-event',kind:'caffeine',effective_at:previous(today,8)+'T12:00:00Z',data:{level:'reduced',notes:'Fictional example'}}
    ];
    return {
      resting_hr_method:'latest_end_at_per_local_day',
      latest:{
        resting_heart_rate:{value:daily[0].resting_heart_rate,at:now},
        heart_rate:{value:daily[0].heart_rate,at:now},
        hrv_sdnn:{value:daily[0].hrv_sdnn,at:now},
        blood_oxygen_saturation:{value:daily[0].blood_oxygen_saturation,at:now}
      },
      daily,events,
      steps:{today:4821,yesterday:8896,last_completed_day:previous(today,1)}
    };
  }
  window.RestingBeastDemo=Object.freeze({makeData});
})();
