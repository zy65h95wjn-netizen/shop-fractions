// Synthetic fixtures only. Run: node pulse/tests/history_helpers.js
'use strict';
const assert=require('node:assert/strict');
const {series,eastDay,shiftDay,valueOf,reading,validDay}=require('../history-v1.js');
const rows=[
  {day:'2026-10-15',resting_heart_rate:83.75,heart_rate:76.125,hrv_sdnn:'38.456',blood_oxygen_saturation:97.625},
  {day:'2026-10-13',resting_heart_rate:81,heart_rate:0,hrv_sdnn:'',blood_oxygen_saturation:null},
  {day:'2026-10-12',resting_heart_rate:null,heart_rate:NaN,hrv_sdnn:Infinity,blood_oxygen_saturation:'invalid'},
  {day:'2026-10-16',resting_heart_rate:99}, // future: outside all windows
  {day:'2026-02-30',resting_heart_rate:100}
];
const unchanged=structuredClone(rows);
for(const metric of ['resting_heart_rate','heart_rate','hrv_sdnn','blood_oxygen_saturation']){
  for(const days of [7,30,90]){
    const points=series(rows,metric,days,'2026-10-15');
    assert.equal(points.length,days);
    assert.equal(points[0].day,({7:'2026-10-09',30:'2026-09-16',90:'2026-07-18'})[days]);
    assert.equal(points.at(-1).day,'2026-10-15');
    assert.equal(points.at(-2).value,null,'absent calendar day stays missing');
    assert.equal(points.at(-4).value,null,'null, invalid and nonfinite readings stay missing');
    assert.equal(points.at(-1).value,Number(rows[0][metric]));
    assert.ok(points.every((p,i)=>i===0||p.day>points[i-1].day),'chronological order');
  }
}
assert.deepEqual(rows,unchanged,'presentation must not mutate protected data');
assert.equal(series(rows,'heart_rate',7,'2026-10-15').at(-3).value,0,'observed zero is distinct from a missing day');
assert.equal(series(rows,'hrv_sdnn',7,'2026-10-15').at(-3).value,null,'empty string must not become zero');
for(const v of [null,undefined,'',' ',NaN,Infinity,'oops',false,[],{}])assert.equal(valueOf(v),null);
assert.equal(reading(76.125,'bpm'),'76.125 bpm');
assert.equal(reading(null,'%'),'No reading');
assert.equal(eastDay('2026-10-15T03:59:59Z'),'2026-10-14');
assert.equal(eastDay('2026-10-15T04:00:00Z'),'2026-10-15');
assert.equal(eastDay('2026-11-01T05:30:00Z'),'2026-11-01');
assert.equal(eastDay('2026-11-01T06:30:00Z'),'2026-11-01','repeated DST hour stays same calendar day');
assert.equal(eastDay('2026-03-08T06:59:59Z'),'2026-03-08');
assert.equal(eastDay('2026-03-08T07:00:00Z'),'2026-03-08');
assert.equal(shiftDay('2026-03-08',-1),'2026-03-07');
assert.equal(shiftDay('2026-11-01',1),'2026-11-02');
assert.equal(shiftDay('2028-03-01',-1),'2028-02-29');
assert.equal(validDay('2026-02-30'),false);
assert.deepEqual(series(rows,'step_count',7,'2026-10-15'),[]);
assert.deepEqual(series(rows,'heart_rate',14,'2026-10-15'),[]);
assert.ok(series([], 'heart_rate',90,'2026-10-15').every(p=>p.value===null));
console.log('PASS: all four metrics × three ranges, NY midnight/DST/leap day, chronological dates, exact precision, missing/invalid data, no mutation or steps');
