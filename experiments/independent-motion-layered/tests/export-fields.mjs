import {writeFileSync,mkdirSync} from 'node:fs';
import {makeField} from '../dist/layers.js';
mkdirSync('/tmp/layered-qa',{recursive:true});
for(let side=0;side<2;side++)writeFileSync(`/tmp/layered-qa/field-${side}.rgba`,makeField(side));
