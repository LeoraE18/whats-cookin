import {describe,expect,it} from 'vitest';
import {scaleQuantity} from './recipeUtils';
describe('ingredient serving calculations',()=>{
  it('scales a recipe down and up',()=>{expect(scaleQuantity(1.5,3,2)).toBe(1);expect(scaleQuantity(2,2,6)).toBe(6);});
  it('keeps precision readable and handles missing original servings',()=>{expect(scaleQuantity(1,3,1)).toBe(0.33);expect(scaleQuantity(2,0,4)).toBe(2);});
});
