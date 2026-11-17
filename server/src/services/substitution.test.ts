import {describe,expect,it} from 'vitest';
import {substitutionResponse} from '../index.js';
describe('AI substitution response validation',()=>{
  it('requires a complete, qualified response with quantities and warnings',()=>{
    const valid={possible:true,substitute:'Unsweetened oat milk',quantity:'1 cup',why:'It adds liquid with a mild flavor.',tasteTexture:'Slightly less rich.',adjustments:'Keep the heat moderate.',warnings:'Check the package for allergens; results may vary.'};
    expect(substitutionResponse.parse(valid)).toEqual(valid);
    expect(()=>substitutionResponse.parse({...valid,warnings:undefined})).toThrow();
    expect(()=>substitutionResponse.parse({...valid,possible:'probably'})).toThrow();
  });
  it('supports explicit uncertainty without promising a replacement',()=>{
    const uncertain={possible:false,substitute:'',quantity:'',why:'No dependable swap for this recipe.',tasteTexture:'Not applicable.',adjustments:'Choose another recipe if needed.',warnings:'The result is uncertain.'};
    expect(substitutionResponse.parse(uncertain).possible).toBe(false);
  });
});
