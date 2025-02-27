// Import modules
import { humanCollisionDialogue, objectHitDialogue } from './dialogue.js';
import { Player } from './player.js';
import { RoomObject } from './objects.js';
import { Human } from './human.js';
import { renderSpeechBubble } from './ui.js';
import { circleRectangleCollision, lineIntersectsRect } from './physics.js';

// Game canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions to match container
canvas.width = canvas.parentElement.clientWidth;
canvas.height = canvas.parentElement.clientHeight;

// Game variables
let gameOver = false;
let score = 0;
let gameStartTime = Date.now();
let lastHumanSpawnTime = 0;
let humanSpawnInterval = 10000; // 10 seconds

// Input state
export const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

export const mouse = {
    x: 0,
    y: 0,
    down: false
};

// Game objects
const player = new Player(canvas.width / 2, canvas.height / 2);

const roomObjects = [
    new RoomObject(100, 100, 120, 80, '#8B4513', 5, 'table'),
    new RoomObject(300, 150, 80, 80, '#A0522D', 2, 'chair'),
    new RoomObject(500, 100, 150, 60, '#DEB887', 6, 'sofa'),
    new RoomObject(650, 300, 100, 60, '#CD853F', 3, 'coffee table'),
    new RoomObject(100, 400, 40, 40, '#D2B48C', 1, 'small box'),
    new RoomObject(400, 450, 60, 60, '#8B4513', 2, 'end table'),
    new RoomObject(600, 450, 30, 40, '#A0522D', 0.5, 'vase'),
    new RoomObject(200, 250, 50, 50, '#D2B48C', 1.5, 'stool'),
];

const humans = [];
const doors = [
    { x: 0, y: canvas.height / 2, direction: 0 },       // Left door
    { x: canvas.width, y: canvas.height / 2, direction: Math.PI }, // Right door
    { x: canvas.width / 2, y: 0, direction: Math.PI / 2 },       // Top door
    { x: canvas.width / 2, y: canvas.height, direction: 3 * Math.PI / 2 }  // Bottom door
];

// Input handling
window.addEventListener('keydown', (e) => {
    if (gameOver) return;
    
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = true;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            break;
    }
});

window.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = false;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
    }
});

// Mouse handling
window.addEventListener('mousemove', (e) => {
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener('mousedown', (e) => {
    if (gameOver) return;
    mouse.down = true;
    player.startTrunkSwing();
});

window.addEventListener('mouseup', () => {
    mouse.down = false;
});

// Restart button
document.getElementById('restart-btn').addEventListener('click', () => {
    resetGame();
});

// Game functions
function resetGame() {
    gameOver = false;
    score = 0;
    gameStartTime = Date.now();
    lastHumanSpawnTime = 0;
    
    // Reset player position
    player.reset(canvas.width / 2, canvas.height / 2);
    
    // Reset room objects to their original positions
    roomObjects.forEach(obj => {
        obj.resetVelocity();
    });
    
    // Clear all humans except initial one
    humans.length = 0;
    
    // Add initial human
    spawnHuman();
    
    // Hide game over screen
    document.getElementById('game-over').classList.add('hidden');
    
    // Start animation loop again
    requestAnimationFrame(gameLoop);
}

function spawnHuman() {
    const doorIndex = Math.floor(Math.random() * doors.length);
    const door = doors[doorIndex];
    
    const human = new Human(door.x, door.y, door.direction);
    humans.push(human);
}

function updatePlayer() {
    player.update(keys, mouse, canvas.width, canvas.height, roomObjects);
}

function updateObjects() {
    const currentTime = Date.now();
    
    roomObjects.forEach(obj => {
        obj.update(canvas.width, canvas.height);
        
        // Check for collision with humans if the object is moving
        if (Math.abs(obj.vx) > 0.5 || Math.abs(obj.vy) > 0.5) {
            humans.forEach(human => {
                if (circleRectangleCollision(
                    human.x, human.y, human.radius,
                    obj.x, obj.y, obj.width, obj.height
                )) {
                    // Make the object bounce off the human
                    obj.vx = -obj.vx * 0.8;
                    obj.vy = -obj.vy * 0.8;
                    
                    // Make human show speech bubble if enough time has passed
                    if (currentTime - human.lastSpeechTime > 5000) {
                        human.speak(getRandomDialogue(objectHitDialogue), currentTime);
                    }
                }
            });
        }
    });
}

function updateHumans() {
    const currentTime = Date.now();
    
    // Spawn new human every 10 seconds
    if (currentTime - lastHumanSpawnTime > humanSpawnInterval) {
        spawnHuman();
        lastHumanSpawnTime = currentTime;
    }
    
    humans.forEach(human => {
        // Update human
        human.update(currentTime, player, roomObjects, humans, canvas.width, canvas.height, doors);
        
        // Check if human can see the player
        if (isPlayerInVision(human)) {
            endGame();
        }
    });
}

// Helper function to get random dialogue
function getRandomDialogue(dialogueArray) {
    const randomIndex = Math.floor(Math.random() * dialogueArray.length);
    return dialogueArray[randomIndex];
}

function isPlayerInVision(human) {
    // Vector from human to player
    const dx = player.x - human.x;
    const dy = player.y - human.y;
    
    // Calculate angle between human direction and player position
    const angleToPlayer = Math.atan2(dy, dx);
    
    // Calculate the angle difference, adjusting for the circular nature of angles
    let angleDiff = angleToPlayer - human.direction;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
    
    // Check if player is within the human's FOV
    if (Math.abs(angleDiff) > human.fovAngle / 2) {
        return false;
    }
    
    // Calculate distance to player
    const distanceToPlayer = Math.sqrt(dx * dx + dy * dy);
    
    if (distanceToPlayer > human.visionDistance) {
        return false;
    }
    
    // Check if line of sight is blocked by objects
    return !isLineOfSightBlocked(human.x, human.y, player.x, player.y);
}

function isLineOfSightBlocked(x1, y1, x2, y2) {
    // Check each object to see if it blocks the line of sight
    for (const obj of roomObjects) {
        // Check intersection with the object
        if (lineIntersectsRect(x1, y1, x2, y2, obj.x, obj.y, obj.width, obj.height)) {
            return true;
        }
    }
    
    return false;
}

function updateScore() {
    score = Math.floor((Date.now() - gameStartTime) / 1000);
    document.getElementById('score').textContent = `Score: ${score}`;
}

function endGame() {
    gameOver = true;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game objects
    roomObjects.forEach(obj => obj.render(ctx));
    
    // Draw humans
    humans.forEach(human => {
        human.render(ctx, renderSpeechBubble);
    });
    
    // Draw player
    player.render(ctx);
}

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameOver) {
        // Update game objects
        updatePlayer();
        updateObjects();
        updateHumans();
        updateScore();
        
        // Render everything
        render();
        
        // Continue the game loop
        requestAnimationFrame(gameLoop);
    }
}

// Initial setup
spawnHuman();
// First human always faces away from player
humans[0].direction = Math.atan2(player.y - humans[0].y, player.x - humans[0].x) + Math.PI;

// Start the game
resetGame();

// Export game state for other modules
export const getGameState = () => ({
    canvas,
    ctx,
    gameOver,
    score,
    player,
    roomObjects,
    humans,
    doors
});