export function scaleQuantity(quantity:number,originalServings:number,servings:number){if(!originalServings)return quantity;return Number((quantity*servings/originalServings).toFixed(2));}
