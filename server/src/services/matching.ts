export type MatchRecipe<T extends { ingredients: string[] }> = T & { have: string[]; missing: string[]; match: number };
function containsIngredient(recipeIngredient:string,available:string){
  const needle=available.trim().toLowerCase().replace(/\s+/g,' ');const haystack=recipeIngredient.trim().toLowerCase().replace(/\s+/g,' ');
  if(!needle)return false;
  const escaped=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  return new RegExp(`(^|[^a-z0-9])${escaped}(?=$|[^a-z0-9])`).test(haystack);
}
export function matchRecipes<T extends { ingredients: string[] }>(recipes:T[], available:string[]){
  const normalized=available.map(x=>x.trim().toLowerCase()).filter(Boolean);
  const matches=recipes.map(recipe=>{const have=recipe.ingredients.filter(i=>normalized.some(n=>containsIngredient(i,n)||containsIngredient(n,i)));const missing=recipe.ingredients.filter(i=>!have.includes(i));return {...recipe,have,missing,match:recipe.ingredients.length?have.length/recipe.ingredients.length:0};}).filter(r=>r.have.length>0).sort((a,b)=>a.missing.length-b.missing.length||b.match-a.match);
  return {makeNow:matches.filter(m=>m.missing.length===0),almost:matches.filter(m=>m.missing.length>0&&m.missing.length<=2),creative:matches.filter(m=>m.missing.length>2)};
}
