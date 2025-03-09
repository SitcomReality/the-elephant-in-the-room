// Spritesheet definitions and utility functions for loading sprites
export const spritesheet = new Image();
spritesheet.src = '/eitr_furniture_pickups.png';

// Sprite definitions from the spritesheet
export const sprites = {
  rectangular_table: { x: 59, y: 92, width: 142, height: 73, name: "rectangular table", mass: 5 },
  pool_table: { x: 300, y: 65, width: 168, height: 106, name: "pool table", mass: 7 },
  pot_plant: { x: 582, y: 73, width: 117, height: 111, name: "pot plant", mass: 2 },
  queen_bed: { x: 53, y: 300, width: 150, height: 169, name: "queen bed", mass: 8 },
  coffee_table: { x: 315, y: 338, width: 137, height: 98, name: "coffee table", mass: 4 },
  bookshelf: { x: 595, y: 349, width: 102, height: 73, name: "bookshelf", mass: 6 },
  pickup_10percent: { x: 78, y: 594, width: 101, height: 92, type: "score" },
  pickup_plus50: { x: 338, y: 598, width: 95, height: 80, type: "points" },
  pickup_plus1x: { x: 576, y: 577, width: 129, height: 125, type: "multiplier" },
  pickup_r: { x: 81, y: 845, width: 122, height: 101, type: "reset" },
  pickup_e: { x: 318, y: 829, width: 138, height: 135, type: "rocket" },
  pickup_d: { x: 580, y: 846, width: 121, height: 96, type: "blind" }
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