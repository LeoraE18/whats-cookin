import { describe,expect,it } from 'vitest';
import { matchRecipes } from './matching.js';
describe('pantry recipe matching',()=>{
  const recipes=[{title:'Bean toast',ingredients:['butter beans','sourdough','olive oil']},{title:'Lemon bowl',ingredients:['chickpeas','lemon']},{title:'Herb soup',ingredients:['parsley','beans','onion','stock']}];
  it('puts complete matches in make now and names every missing ingredient',()=>{const result=matchRecipes(recipes,['butter beans','sourdough','olive oil']);expect(result.makeNow.map(x=>x.title)).toEqual(['Bean toast']);expect(result.makeNow[0].missing).toEqual([]);});
  it('separates one or two missing items from more creative matches',()=>{const result=matchRecipes(recipes,['lemon','parsley']);expect(result.almost[0].missing).toEqual(['chickpeas']);expect(result.creative[0].missing).toEqual(['beans','onion','stock']);});
  it('ignores empty pantry input without claiming a match',()=>{expect(matchRecipes(recipes,[]).makeNow).toEqual([]);expect(matchRecipes(recipes,[]).creative).toEqual([]);});
  it('matches whole ingredient words without confusing egg with eggplant',()=>{const result=matchRecipes([{title:'Plant dish',ingredients:['eggplant','beans']}],['egg']);expect(result.makeNow).toEqual([]);expect(result.almost).toEqual([]);expect(result.creative).toEqual([]);});
});
