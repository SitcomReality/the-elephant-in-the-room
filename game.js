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

// Game objects
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 20,
    speed: 3,
    direction: 0, // direction in radians
    color: '#888888',
    trunkLength: 30,
    trunkWidth: 10,
    trunkAngle: 0,
    swinging: false,
    swingAngle: 0,
    swingSpeed: 0.2,
    swingRange: Math.PI * 1.5, // How far the trunk swings
};

const roomObjects = [
    // Furniture and other objects in the room
    { x: 100, y: 100, width: 120, height: 80, color: '#8B4513', mass: 5, name: 'table' },
    { x: 300, y: 150, width: 80, height: 80, color: '#A0522D', mass: 2, name: 'chair' },
    { x: 500, y: 100, width: 150, height: 60, color: '#DEB887', mass: 6, name: 'sofa' },
    { x: 650, y: 300, width: 100, height: 60, color: '#CD853F', mass: 3, name: 'coffee table' },
    { x: 100, y: 400, width: 40, height: 40, color: '#D2B48C', mass: 1, name: 'small box' },
    { x: 400, y: 450, width: 60, height: 60, color: '#8B4513', mass: 2, name: 'end table' },
    { x: 600, y: 450, width: 30, height: 40, color: '#A0522D', mass: 0.5, name: 'vase' },
    { x: 200, y: 250, width: 50, height: 50, color: '#D2B48C', mass: 1.5, name: 'stool' },
];

const humans = [];
const doors = [
    { x: 0, y: canvas.height / 2, direction: 0 },       // Left door
    { x: canvas.width, y: canvas.height / 2, direction: Math.PI }, // Right door
    { x: canvas.width / 2, y: 0, direction: Math.PI / 2 },       // Top door
    { x: canvas.width / 2, y: canvas.height, direction: 3 * Math.PI / 2 }  // Bottom door
];

// Input handling
const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

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

// Mouse handling for trunk swinging
window.addEventListener('mousemove', (e) => {
    if (gameOver) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate angle between player and mouse
    player.trunkAngle = Math.atan2(mouseY - player.y, mouseX - player.x);
});

window.addEventListener('mousedown', (e) => {
    if (gameOver) return;
    
    // Start trunk swing
    player.swinging = true;
    player.swingAngle = 0;
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
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    // Reset room objects to their original positions
    roomObjects.forEach(obj => {
        obj.vx = 0;
        obj.vy = 0;
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
    
    const human = {
        x: door.x,
        y: door.y,
        radius: 15,
        speed: 1,
        direction: door.direction,
        fovAngle: Math.PI / 3, // 60 degrees field of view
        visionDistance: 200,
        visionColor: 'rgba(255, 0, 0, 0.3)',
        changeDirectionTime: 0,
        directionChangeInterval: 3000, // Change direction every 3 seconds
    };
    
    humans.push(human);
}

function updatePlayer() {
    // Movement
    let dx = 0;
    let dy = 0;
    
    if (keys.up) dy -= player.speed;
    if (keys.down) dy += player.speed;
    if (keys.left) dx -= player.speed;
    if (keys.right) dx += player.speed;
    
    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        const factor = player.speed / Math.sqrt(dx * dx + dy * dy);
        dx *= factor;
        dy *= factor;
    }
    
    // Update player position with boundary checking
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    if (newX - player.radius > 0 && newX + player.radius < canvas.width) {
        player.x = newX;
    }
    
    if (newY - player.radius > 0 && newY + player.radius < canvas.height) {
        player.y = newY;
    }
    
    // Update player direction if moving
    if (dx !== 0 || dy !== 0) {
        player.direction = Math.atan2(dy, dx);
    }
    
    // Update trunk swing
    if (player.swinging) {
        player.swingAngle += player.swingSpeed;
        
        if (player.swingAngle >= player.swingRange) {
            player.swinging = false;
            player.swingAngle = 0;
        }
        
        // Calculate actual trunk angle during swing
        const effectiveTrunkAngle = player.trunkAngle - player.swingRange/2 + player.swingAngle;
        
        // Check for objects that could be hit by the trunk
        roomObjects.forEach(obj => {
            // Calculate trunk tip position
            const trunkTipX = player.x + Math.cos(effectiveTrunkAngle) * player.trunkLength;
            const trunkTipY = player.y + Math.sin(effectiveTrunkAngle) * player.trunkLength;
            
            // Check if trunk tip is inside object
            if (trunkTipX > obj.x && trunkTipX < obj.x + obj.width &&
                trunkTipY > obj.y && trunkTipY < obj.y + obj.height) {
                
                // Object doesn't have velocity yet, initialize it
                if (obj.vx === undefined) {
                    obj.vx = 0;
                    obj.vy = 0;
                }
                
                // Apply force based on mass
                const forceMagnitude = 10 / (obj.mass || 1);
                obj.vx += Math.cos(effectiveTrunkAngle) * forceMagnitude;
                obj.vy += Math.sin(effectiveTrunkAngle) * forceMagnitude;
            }
        });
    }
}

function updateObjects() {
    roomObjects.forEach(obj => {
        if (obj.vx !== undefined && obj.vy !== undefined) {
            // Update position
            obj.x += obj.vx;
            obj.y += obj.vy;
            
            // Apply friction
            obj.vx *= 0.95;
            obj.vy *= 0.95;
            
            // Reset velocity if it's very small
            if (Math.abs(obj.vx) < 0.1) obj.vx = 0;
            if (Math.abs(obj.vy) < 0.1) obj.vy = 0;
            
            // Bounce off walls
            if (obj.x < 0) {
                obj.x = 0;
                obj.vx = -obj.vx * 0.5;
            } else if (obj.x + obj.width > canvas.width) {
                obj.x = canvas.width - obj.width;
                obj.vx = -obj.vx * 0.5;
            }
            
            if (obj.y < 0) {
                obj.y = 0;
                obj.vy = -obj.vy * 0.5;
            } else if (obj.y + obj.height > canvas.height) {
                obj.y = canvas.height - obj.height;
                obj.vy = -obj.vy * 0.5;
            }
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
        // Random direction change
        if (currentTime - human.changeDirectionTime > human.directionChangeInterval) {
            human.direction += (Math.random() - 0.5) * Math.PI / 2; // Change by up to 45 degrees
            human.changeDirectionTime = currentTime;
        }
        
        // Move human
        human.x += Math.cos(human.direction) * human.speed;
        human.y += Math.sin(human.direction) * human.speed;
        
        // Bounce off walls
        if (human.x - human.radius < 0) {
            human.x = human.radius;
            human.direction = Math.PI - human.direction;
        } else if (human.x + human.radius > canvas.width) {
            human.x = canvas.width - human.radius;
            human.direction = Math.PI - human.direction;
        }
        
        if (human.y - human.radius < 0) {
            human.y = human.radius;
            human.direction = -human.direction;
        } else if (human.y + human.radius > canvas.height) {
            human.y = canvas.height - human.radius;
            human.direction = -human.direction;
        }
        
        // Check if human can see the player
        if (isPlayerInVision(human)) {
            endGame();
        }
    });
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
        // Check if line intersects with the rectangle
        if (lineIntersectsRect(x1, y1, x2, y2, obj.x, obj.y, obj.width, obj.height)) {
            return true;
        }
    }
    
    return false;
}

function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    // Check if line intersects with any of the four sides of the rectangle
    return (
        lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||          // Top
        lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) || // Bottom
        lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx, ry + rh) ||          // Left
        lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)   // Right
    );
}

function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the direction of the lines
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    // If uA and uB are between 0-1, lines are colliding
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

function drawVisionCone(human) {
    ctx.save();
    
    // Define the vision cone path
    ctx.beginPath();
    ctx.moveTo(human.x, human.y);
    
    const leftAngle = human.direction - human.fovAngle / 2;
    const rightAngle = human.direction + human.fovAngle / 2;
    
    // Draw vision triangle with line-of-sight consideration
    const rayCount = 20; // Number of rays to cast
    
    for (let i = 0; i <= rayCount; i++) {
        const rayAngle = leftAngle + (rightAngle - leftAngle) * (i / rayCount);
        const rayLength = human.visionDistance;
        
        // Cast a ray in this direction
        const endX = human.x + Math.cos(rayAngle) * rayLength;
        const endY = human.y + Math.sin(rayAngle) * rayLength;
        
        // Find the closest intersection with an object
        let minT = 1; // Parameter along the ray (0 to 1)
        
        for (const obj of roomObjects) {
            // Check intersection with all four sides of the object
            checkIntersection(human.x, human.y, endX, endY, obj.x, obj.y, obj.x + obj.width, obj.y);
            checkIntersection(human.x, human.y, endX, endY, obj.x, obj.y + obj.height, obj.x + obj.width, obj.y + obj.height);
            checkIntersection(human.x, human.y, endX, endY, obj.x, obj.y, obj.x, obj.y + obj.height);
            checkIntersection(human.x, human.y, endX, endY, obj.x + obj.width, obj.y, obj.x + obj.width, obj.y + obj.height);
        }
        
        function checkIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
            const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
            if (den === 0) return; // Lines are parallel
            
            const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
            const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
            
            if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
                if (ua < minT) minT = ua;
            }
        }
        
        // Calculate the actual visible endpoint
        const visibleX = human.x + minT * (endX - human.x);
        const visibleY = human.y + minT * (endY - human.y);
        
        ctx.lineTo(visibleX, visibleY);
    }
    
    ctx.closePath();
    
    // Fill with semi-transparent color
    ctx.fillStyle = human.visionColor;
    ctx.fill();
    
    ctx.restore();
}

function drawPlayer() {
    // Draw player body (elephant)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw elephant ears
    ctx.fillStyle = '#777';
    // Left ear
    ctx.beginPath();
    ctx.ellipse(
        player.x - player.radius * 0.7, 
        player.y - player.radius * 0.5, 
        player.radius * 0.6, 
        player.radius * 0.8, 
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Right ear
    ctx.beginPath();
    ctx.ellipse(
        player.x + player.radius * 0.7, 
        player.y - player.radius * 0.5, 
        player.radius * 0.6, 
        player.radius * 0.8, 
        0, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Draw trunk
    let trunkDisplayAngle = player.trunkAngle;
    
    // Adjust angle during swing
    if (player.swinging) {
        trunkDisplayAngle = player.trunkAngle - player.swingRange/2 + player.swingAngle;
    }
    
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(trunkDisplayAngle);
    
    // Draw curved trunk
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
        player.trunkLength * 0.5, 
        player.trunkWidth * 0.5, 
        player.trunkLength, 
        0
    );
    ctx.lineWidth = player.trunkWidth;
    ctx.lineCap = 'round';
    ctx.strokeStyle = player.color;
    ctx.stroke();
    
    ctx.restore();
    
    // Draw eyes
    ctx.fillStyle = 'black';
    const eyeOffset = player.radius * 0.3;
    const eyeSize = player.radius * 0.2;
    
    ctx.beginPath();
    ctx.arc(
        player.x + Math.cos(player.direction + Math.PI/4) * eyeOffset,
        player.y + Math.sin(player.direction + Math.PI/4) * eyeOffset,
        eyeSize, 0, Math.PI * 2
    );
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(
        player.x + Math.cos(player.direction - Math.PI/4) * eyeOffset,
        player.y + Math.sin(player.direction - Math.PI/4) * eyeOffset,
        eyeSize, 0, Math.PI * 2
    );
    ctx.fill();
}

function drawHumans() {
    humans.forEach(human => {
        // Draw vision cone first (so it's behind the human)
        drawVisionCone(human);
        
        // Draw human body
        ctx.fillStyle = '#3366CC';
        ctx.beginPath();
        ctx.arc(human.x, human.y, human.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator (face)
        ctx.fillStyle = '#FFE0BD';
        ctx.beginPath();
        ctx.arc(
            human.x + Math.cos(human.direction) * human.radius * 0.6,
            human.y + Math.sin(human.direction) * human.radius * 0.6,
            human.radius * 0.6, 0, Math.PI * 2
        );
        ctx.fill();
    });
}

function drawRoomObjects() {
    roomObjects.forEach(obj => {
        ctx.fillStyle = obj.color;
        ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
    });
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

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!gameOver) {
        // Update game objects
        updatePlayer();
        updateObjects();
        updateHumans();
        updateScore();
        
        // Draw game objects
        drawRoomObjects();
        drawHumans();
        drawPlayer();
        
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

