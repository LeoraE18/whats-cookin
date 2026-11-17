import { beforeAll,afterAll,describe,expect,it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { app,configureDatabase } from './index.js';

const pg=new PGlite();
const client={query:async(sql:string,values?:unknown[])=>{if(!values&&sql.includes(';')){let result:any;for(const statement of sql.split(';').map(s=>s.trim()).filter(Boolean))result=await pg.query(statement);return result;}return pg.query(sql,values);}};
let server:any;let base='';let token='';let userId='';let secondId='';let secondToken='';let recipeId='';
async function request(path:string,init:RequestInit={}){return fetch(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...init.headers}});}
async function body(res:Response){return res.json();}

beforeAll(async()=>{
  configureDatabase(client);
  await migrate(client);
  await seed(client);
  server=app.listen(0);
  await new Promise<void>(resolve=>server.once('listening',resolve));
  const address=server.address();base=`http://127.0.0.1:${address.port}/api`;
});
afterAll(async()=>{if(server)await new Promise<void>(resolve=>server.close(()=>resolve()));await pg.close();});

describe('database-backed API',()=>{
  it('migrates idempotently, seeds original recipes and filters in the database',async()=>{
    await migrate(client);
    expect(((await pg.query('SELECT count(*)::int n FROM recipes')).rows[0] as any).n).toBeGreaterThanOrEqual(15);
    const vegan=await body(await request('/recipes?diet=Vegan&category=Lunch'));
    expect(vegan.some((r:any)=>r.slug==='lemony-chickpea-herb-bowls')).toBe(true);
    const quick=await body(await request('/recipes?maxTime=10'));
    expect(quick.every((r:any)=>r.prep_minutes+r.cook_minutes<=10)).toBe(true);
    expect((await request('/health')).status).toBe(200);
  });

  it('registers and logs in a user, scopes private data and denies admin operations',async()=>{
    const registered=await body(await request('/auth/register',{method:'POST',body:JSON.stringify({name:'Test Cook',email:'cook@example.test',password:'secure-test-password'})}));
    token=registered.token;userId=registered.user.id;
    expect((await request('/auth/me')).status).toBe(200);
    expect((await request('/admin/recipes')).status).toBe(403);
    const login=await body(await request('/auth/login',{method:'POST',body:JSON.stringify({email:'cook@example.test',password:'secure-test-password'})}));
    expect(login.user.id).toBe(userId);
    const pantry=await request('/pantry',{method:'PUT',body:JSON.stringify({items:[{name:'quinoa'}]})});expect(pantry.status).toBe(200);
    expect((await body(await request('/pantry')))).toHaveLength(1);
    const second=await body(await request('/auth/register',{method:'POST',body:JSON.stringify({name:'Other Cook',email:'other@example.test',password:'another-secure-password'})}));
    secondId=second.user.id;secondToken=second.token;token=secondToken;
    expect((await body(await request('/pantry')))).toHaveLength(0);
    token=login.token;
  });

  it('matches pantry ingredients and persists ratings, favorites, plans and generated groceries',async()=>{
    const recipe=(await body(await request('/recipes/lemony-chickpea-herb-bowls')));
    recipeId=recipe.id;
    const match=await body(await request('/match',{method:'POST',body:JSON.stringify({ingredients:['chickpeas','quinoa','lemon','parsley','olive oil']})}));
    expect(match.makeNow.some((r:any)=>r.slug==='lemony-chickpea-herb-bowls')).toBe(true);
    expect((await request(`/recipes/${recipe.slug}/favorite`,{method:'POST'})).status).toBe(200);
    expect((await body(await request('/favorites')))).toHaveLength(1);
    expect((await request(`/recipes/${recipe.slug}/rating`,{method:'POST',body:JSON.stringify({stars:5,comment:'Made it at home.'})})).status).toBe(201);
    const weekStart='2026-11-16';const day='2026-11-17';
    const added=await body(await request('/meal-plan',{method:'POST',body:JSON.stringify({weekStart,day,meal:'dinner',recipeId,servings:4})}));
    expect((await request(`/meal-plan/${added.id}`,{method:'PUT',body:JSON.stringify({servings:6,day:'2026-11-18'})})).status).toBe(200);
    const grocery=await body(await request('/shopping-list/from-plan',{method:'POST',body:JSON.stringify({weekStart})}));
    expect(grocery.added).toBeGreaterThan(0);
    const list=await body(await request('/shopping-list'));
    expect(list.items.some((i:any)=>i.name==='chickpeas'&&Number(i.quantity)===3)).toBe(true);
    await request('/shopping-list/from-plan',{method:'POST',body:JSON.stringify({weekStart})});
    const regenerated=await body(await request('/shopping-list'));
    expect(regenerated.items.filter((i:any)=>i.name==='chickpeas')).toHaveLength(1);
    expect(Number(regenerated.items.find((i:any)=>i.name==='chickpeas').quantity)).toBe(3);
    await request('/shopping-list/items',{method:'POST',body:JSON.stringify({name:'chickpeas',quantity:1,unit:'can',category:'Canned goods'})});
    const combined=await body(await request('/shopping-list'));
    expect(Number(combined.items.find((i:any)=>i.name==='chickpeas').quantity)).toBe(4);
  });

  it('enforces admin-only recipe CRUD, approval, complaint review and role changes',async()=>{
    await pg.query("UPDATE users SET role='admin' WHERE id=$1",[userId]);
    const created=await body(await request('/admin/recipes',{method:'POST',body:JSON.stringify({title:'Admin test beans',slug:'admin-test-beans',description:'An original recipe for a focused integration test.',imageUrl:'/images/lunch.svg',prepMinutes:5,cookMinutes:10,difficulty:'Easy',servings:2,cuisine:'Test kitchen',instructions:['Warm the beans gently until steaming hot.'],categories:['bowls'],diets:[],ingredients:[{name:'white beans',quantity:1,unit:'can',category:'Canned goods',allergens:[]}]})}));
    expect(created.id).toBeTruthy();
    expect((await request(`/admin/recipes/${created.id}/status`,{method:'PATCH',body:JSON.stringify({status:'published'})})).status).toBe(200);
    const editBody={title:'Admin test beans updated',slug:'admin-test-beans',description:'An edited original recipe for an integration test.',imageUrl:'/images/lunch.svg',prepMinutes:5,cookMinutes:10,difficulty:'Easy',servings:3,cuisine:'Test kitchen',instructions:['Warm the beans gently until steaming hot.'],categories:['bowls'],diets:['Vegan'],ingredients:[{name:'white beans',quantity:1,unit:'can',category:'Canned goods',allergens:[]}]};
    expect((await request(`/admin/recipes/${created.id}`,{method:'PUT',body:JSON.stringify(editBody)})).status).toBe(409);
    const whiteBeans=(await body(await request('/admin/ingredients'))).find((i:any)=>i.name==='white beans');
    expect((await request(`/admin/ingredients/${whiteBeans.id}`,{method:'PUT',body:JSON.stringify({name:'white beans',category:'Canned goods',allergens:[],verified:true,brandFlag:false})})).status).toBe(200);
    const edit=await body(await request(`/admin/recipes/${created.id}`,{method:'PUT',body:JSON.stringify(editBody)}));
    expect(edit.id).toBe(created.id);
    const complaint=await body(await request(`/recipes/${created.id}/report`,{method:'POST',body:JSON.stringify({reason:'Recipe did not work',details:'Test complaint'})}));
    expect((await request(`/admin/reports/${complaint.id}`,{method:'PATCH',body:JSON.stringify({status:'resolved'})})).status).toBe(200);
    expect((await request(`/admin/recipes/${created.id}`,{method:'DELETE'})).status).toBe(204);
    const category=await body(await request('/admin/categories',{method:'POST',body:JSON.stringify({name:'Test category',slug:'test-category'})}));
    expect((await request(`/admin/categories/${category.id}`,{method:'PUT',body:JSON.stringify({name:'Test category updated',slug:'test-category-updated'})})).status).toBe(200);
    expect((await request(`/admin/categories/${category.id}`,{method:'DELETE'})).status).toBe(204);
    const diet=await body(await request('/admin/diets',{method:'POST',body:JSON.stringify({name:'Test diet',explanation:'A test-only reviewed dietary rule.'})}));
    expect((await request(`/admin/diets/${diet.id}`,{method:'PUT',body:JSON.stringify({name:'Updated test diet',explanation:'An updated test-only dietary rule.'})})).status).toBe(200);
    expect((await request(`/admin/diets/${diet.id}`,{method:'DELETE'})).status).toBe(204);
    const source=await body(await request('/admin/sources',{method:'POST',body:JSON.stringify({name:'Test original source',license:'original',permissionNotes:'Created in an integration test.'})}));
    expect((await request(`/admin/sources/${source.id}`,{method:'PUT',body:JSON.stringify({name:'Updated test source',license:'licensed',permissionNotes:'Test license record.'})})).status).toBe(200);
    expect((await request(`/admin/sources/${source.id}`,{method:'DELETE'})).status).toBe(204);
    const ingredient=await body(await request('/admin/ingredients',{method:'POST',body:JSON.stringify({name:'test ingredient',category:'Other',allergens:[],verified:false,brandFlag:false})}));
    expect((await request(`/admin/ingredients/${ingredient.id}`,{method:'PUT',body:JSON.stringify({name:'test ingredient',category:'Pantry',allergens:['soy'],verified:true,brandFlag:false})})).status).toBe(200);
    expect((await request(`/admin/users/${secondId}`,{method:'PATCH',body:JSON.stringify({status:'suspended'})})).status).toBe(200);
    expect((await request(`/admin/users/${userId}`,{method:'PATCH',body:JSON.stringify({role:'user'})})).status).toBe(200);
    token=secondToken;
    expect((await request('/auth/me')).status).toBe(401);
    expect((await request('/auth/login',{method:'POST',body:JSON.stringify({email:'other@example.test',password:'another-secure-password'})})).status).toBe(401);
  });
});
