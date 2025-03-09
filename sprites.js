// Spritesheet definitions and utility functions for loading sprites
export const spritesheet = new Image();
spritesheet.src = '/eitr_spritesheet.png';

// Sprite definitions from the spritesheet
export const sprites = {
  dining_table_made_of: { x: 31, y: 55, width: 196, height: 85, name: "dining table", mass: 5 },
  pool_table_with_warm: { x: 302, y: 62, width: 165, height: 103, name: "pool table", mass: 7 },
  books_on_top_of_a_sh: { x: 587, y: 81, width: 105, height: 86, name: "bookshelf", mass: 3 },
  queen_bed_with_a_cat: { x: 45, y: 308, width: 169, height: 150, name: "queen bed", mass: 8 },
  wooden_chest: { x: 322, y: 332, width: 124, height: 106, name: "wooden chest", mass: 6 },
  filing_cabinet_made_: { x: 578, y: 324, width: 129, height: 118, name: "filing cabinet", mass: 4 },
  pickup_10percent: { x: 63, y: 576, width: 130, height: 129, type: "score" },
  pickup_plus50: { x: 322, y: 581, width: 130, height: 111, type: "points" },
  pickup_plus1x: { x: 580, y: 574, width: 125, height: 123, type: "multiplier" },
  pickup_R: { x: 81, y: 845, width: 122, height: 101, type: "reset" },
  pickup_E: { x: 318, y: 829, width: 137, height: 134, type: "rocket" },
  pickup_D: { x: 580, y: 846, width: 121, height: 96, type: "blind" }
};

// Get furniture sprites only
export function getFurnitureSprites() {
  return Object.entries(sprites)
    .filter(([key]) => !key.startsWith('pickup_'))
    .map(([key, sprite]) => ({ ...sprite, id: key }));
}

// Get pickup sprites only
export function getPickupSprites() {
  return Object.entries(sprites)
    .filter(([key]) => key.startsWith('pickup_'))
    .map(([key, sprite]) => ({ ...sprite, id: key }));
}