// Import modules
import { humanCollisionDialogue, objectHitDialogue } from './dialogue.js';
import { Player } from './player.js';
import { RoomObject } from './objects.js';
import { Human } from './human.js';
import { renderSpeechBubble, renderScoreMultiplier } from './ui.js';
import { circleRectangleCollision, lineIntersectsRect } from './physics.js';
import { upgrades, levelUpQuotes } from './progression.js';
import { sprites, getFurnitureSprites, getPickupSprites } from './sprites.js';

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

// Score multiplier system
let scoreMultiplier = 0;
let maxMultiplier = 5.0; // Cap the multiplier at 5x
let multiplierIncreaseAmount = 0.1;
let lastMultiplierIncreaseTime = 0;
let multiplierDecayDelay = 3000; // Start decaying after 3 seconds of no increase
let baseDecayRate = 0.01; // Base decay rate per second
let multiplierRecentlyIncreased = false;
let recentlyIncreasedReset = 0;

// Level progression system
let playerLevel = 1;
let levelUpThresholds = [100, 250, 450, 700, 1000, 1500, 2000, 3000, 4000, 5000]; // Score needed for each level
let isLevelingUp = false;
let availableUpgrades = [];
let selectedUpgrades = [];

// Pickup system
let lastPickupSpawnTime = 0;
let pickupSpawnInterval = 10000; // 10 seconds
let pickupLifetime = 3000; // 3 seconds
let activePickups = []; // Changed from single pickup to array
let secondaryPickupTimer = 0;
let secondaryPickupInterval = 0; // Will be randomized between 8-12 seconds

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
const furnitureSprites = getFurnitureSprites();
const roomObjects = [
    new RoomObject(100, 100, 140, 70, furnitureSprites[0], furnitureSprites[0].mass, furnitureSprites[0].name),
    new RoomObject(300, 150, 160, 100, furnitureSprites[1], furnitureSprites[1].mass, furnitureSprites[1].name),
    new RoomObject(500, 100, 120, 110, furnitureSprites[2], furnitureSprites[2].mass, furnitureSprites[2].name),
    new RoomObject(650, 300, 140, 100, furnitureSprites[4], furnitureSprites[4].mass, furnitureSprites[4].name),
    new RoomObject(100, 400, 100, 70, furnitureSprites[5], furnitureSprites[5].mass, furnitureSprites[5].name),
    new RoomObject(400, 450, 150, 160, furnitureSprites[3], furnitureSprites[3].mass, furnitureSprites[3].name),
];

const player = new Player(canvas.width / 2, canvas.height / 2);

const humans = [];
const doors = [
    { x: 0, y: canvas.height / 2, direction: 0 },       // Left door
    { x: canvas.width, y: canvas.height / 2, direction: Math.PI }, // Right door
    { x: canvas.width / 2, y: 0, direction: Math.PI / 2 },       // Top door
    { x: canvas.width / 2, y: canvas.height, direction: 3 * Math.PI / 2 }  // Bottom door
];

// Input handling
window.addEventListener('keydown', (e) => {
    if (gameOver || isLevelingUp) return;
    
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
    
    // If in level up screen, handle card hover
    if (isLevelingUp) {
        const cards = document.querySelectorAll('.upgrade-card');
        cards.forEach(card => {
            const cardRect = card.getBoundingClientRect();
            const isHovered = (
                e.clientX >= cardRect.left && 
                e.clientX <= cardRect.right && 
                e.clientY >= cardRect.top && 
                e.clientY <= cardRect.bottom
            );
            
            if (isHovered) {
                card.style.transform = 'scale(1.05)';
                card.style.borderColor = '#ffcc00';
                card.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.5)';
            } else {
                card.style.transform = 'scale(1.0)';
                card.style.borderColor = '#555';
                card.style.boxShadow = 'none';
            }
        });
    }
});

window.addEventListener('mousedown', (e) => {
    if (gameOver) return;
    
    if (isLevelingUp) {
        // Check if we're clicking on an upgrade card
        const cards = document.querySelectorAll('.upgrade-card');
        cards.forEach((card, index) => {
            const cardRect = card.getBoundingClientRect();
            if (
                e.clientX >= cardRect.left && 
                e.clientX <= cardRect.right && 
                e.clientY >= cardRect.top && 
                e.clientY <= cardRect.bottom
            ) {
                selectUpgrade(index);
            }
        });
    } else {
        mouse.down = true;
        player.startTrunkSwing();
    }
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
    lastPickupSpawnTime = 0;
    scoreMultiplier = 0;
    lastMultiplierIncreaseTime = 0;
    
    // Reset level progression
    playerLevel = 1;
    selectedUpgrades = [];
    
    // Reset player position and properties
    player.reset(canvas.width / 2, canvas.height / 2);
    
    // Reset room objects to their original positions
    roomObjects.forEach(obj => {
        obj.resetVelocity();
    });
    
    // Clear all humans except initial one
    humans.length = 0;
    
    // Add initial human
    spawnHuman();
    
    // Clear any active pickups
    activePickups = [];
    
    // Initialize secondary pickup timer
    secondaryPickupInterval = 8000 + Math.floor(Math.random() * 4000);
    secondaryPickupTimer = Date.now() + secondaryPickupInterval;
    
    // Update UI
    updateLevelProgressUI();
    
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
    
    // Check for collision with active pickups
    for (let i = activePickups.length - 1; i >= 0; i--) {
        const pickup = activePickups[i];
        const playerRect = {
            x: player.x - player.radius,
            y: player.y - player.radius,
            width: player.radius * 2,
            height: player.radius * 2
        };
        
        const pickupRect = {
            x: pickup.x,
            y: pickup.y,
            width: 40,
            height: 40
        };
        
        if (rectsIntersect(playerRect, pickupRect)) {
            collectPickup(pickup);
            activePickups.splice(i, 1);
        }
    }
}

function rectsIntersect(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
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
                        
                        // Increase score multiplier if object was moving fast enough
                        const objSpeed = Math.sqrt(obj.vx * obj.vx + obj.vy * obj.vy);
                        if (objSpeed > 1.0 && currentTime - human.lastHitTime > 1000) {
                            increaseMultiplier(currentTime);
                            human.lastHitTime = currentTime; // Prevent multiple increases from same hit
                        }
                    }
                }
            });
        }
    });
}

function increaseMultiplier(currentTime) {
    // Increase multiplier
    scoreMultiplier = Math.min(scoreMultiplier + multiplierIncreaseAmount, maxMultiplier);
    lastMultiplierIncreaseTime = currentTime;
    
    // Flag for animation
    multiplierRecentlyIncreased = true;
    recentlyIncreasedReset = currentTime + 500; // Animation lasts 500ms
}

function updateMultiplier(currentTime) {
    // Reset the "recently increased" flag if needed
    if (multiplierRecentlyIncreased && currentTime > recentlyIncreasedReset) {
        multiplierRecentlyIncreased = false;
    }
    
    // Only decay if enough time has passed since last increase
    if (currentTime - lastMultiplierIncreaseTime > multiplierDecayDelay && scoreMultiplier > 0) {
        // Calculate decay rate - higher multiplier decays faster
        const decayFactor = 1 + (scoreMultiplier / maxMultiplier) * 4; // 1x to 5x faster decay
        const actualDecayRate = baseDecayRate * decayFactor;
        
        // Calculate time-based decay amount
        const deltaTime = (currentTime - Math.max(lastMultiplierIncreaseTime + multiplierDecayDelay, 
                            lastUpdateTime)) / 1000; // Convert to seconds
        
        // Apply decay
        scoreMultiplier = Math.max(0, scoreMultiplier - (actualDecayRate * deltaTime));
    }
}

let lastUpdateTime = Date.now();

function updateHumans() {
    const currentTime = Date.now();
    
    // Spawn new human every 10 seconds
    if (currentTime - lastHumanSpawnTime > humanSpawnInterval) {
        spawnHuman();
        lastHumanSpawnTime = currentTime;
    }
    
    humans.forEach(human => {
        // Update human
        human.update(currentTime, player, room seminarObjects, humans, canvas.width, canvas.height, doors);
        
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

function updateScore(currentTime) {
    // Only update score if game is not paused
    if (isLevelingUp) return;
    
    // Calculate base score from time
    const baseScore = Math.floor((currentTime - gameStartTime) / 1000);
    
    // Apply multiplier
    const multiplierBonus = scoreMultiplier * baseScore;
    const newScore = Math.floor(baseScore + multiplierBonus);
    
    // Check for level up when score changes
    if (score !== newScore) {
        score = newScore;
        checkLevelProgression();
    }
    
    // Update display
    document.getElementById('score').textContent = `Score: ${score}`;
    
    // Update last update time
    lastUpdateTime = currentTime;
}

function updateLevelProgressUI() {
    // Find next level threshold
    const nextLevelIndex = playerLevel - 1;
    const previousThreshold = nextLevelIndex > 0 ? levelUpThresholds[nextLevelIndex - 1] : 0;
    const nextThreshold = levelUpThresholds[nextLevelIndex] || levelUpThresholds[levelUpThresholds.length - 1];
    
    // Calculate progress to next level
    const progress = Math.min(
        (score - previousThreshold) / (nextThreshold - previousThreshold) * 100, 
        100
    );
    
    // Update progress bar
    const progressBar = document.getElementById('level-progress-bar');
    progressBar.style.width = `${progress}%`;
    
    // Update level indicator
    document.getElementById('level-indicator').textContent = `Level ${playerLevel}`;
}

function checkLevelProgression() {
    // Check if we've crossed any threshold
    if (playerLevel <= levelUpThresholds.length && score >= levelUpThresholds[playerLevel - 1]) {
        // Level up!
        playerLevel++;
        showLevelUpScreen();
    }
    
    // Update the UI
    updateLevelProgressUI();
}

function showLevelUpScreen() {
    isLevelingUp = true;
    
    // Create level up screen if it doesn't exist
    let levelUpScreen = document.getElementById('level-up-screen');
    if (!levelUpScreen) {
        levelUpScreen = document.createElement('div');
        levelUpScreen.id = 'level-up-screen';
        document.getElementById('game-container').appendChild(levelUpScreen);
    }
    
    // Generate available upgrades (3 random ones)
    generateAvailableUpgrades();
    
    // Get a random level up quote
    const randomQuote = levelUpQuotes[Math.floor(Math.random() * levelUpQuotes.length)];
    
    // Create level up screen content
    levelUpScreen.innerHTML = `
        <h2 id="level-up-title">Level ${playerLevel}</h2>
        <p id="level-up-quote">"${randomQuote}"</p>
        <div id="upgrade-options">
            ${availableUpgrades.map((upgrade, index) => `
                <div class="upgrade-card" data-index="${index}">
                    <div class="upgrade-icon">${upgrade.icon}</div>
                    <h3 class="upgrade-title">${upgrade.title}</h3>
                    <p class="upgrade-description">${upgrade.description}</p>
                </div>
            `).join('')}
        </div>
    `;
    
    // Add click handlers
    const cards = document.querySelectorAll('.upgrade-card');
    cards.forEach((card, index) => {
        card.addEventListener('click', () => selectUpgrade(index));
    });
    
    // Show the screen
    levelUpScreen.style.display = 'flex';
}

function generateAvailableUpgrades() {
    // Start with all possible upgrades
    let possibleUpgrades = [...upgrades];
    
    // Filter out any one-time upgrades that have already been selected
    possibleUpgrades = possibleUpgrades.filter(upgrade => 
        !(upgrade.oneTime && selectedUpgrades.includes(upgrade.id))
    );
    
    // Randomly select 3 upgrades from the available pool
    availableUpgrades = [];
    for (let i = 0; i < 3; i++) {
        if (possibleUpgrades.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * possibleUpgrades.length);
        availableUpgrades.push(possibleUpgrades[randomIndex]);
        
        // Remove this upgrade from the pool if we don't want duplicates in the selection
        possibleUpgrades.splice(randomIndex, 1);
    }
}

function selectUpgrade(index) {
    const selectedUpgrade = availableUpgrades[index];
    if (!selectedUpgrade) return;
    
    // Apply the upgrade effect
    applyUpgrade(selectedUpgrade);
    
    // Add to selected upgrades list
    selectedUpgrades.push(selectedUpgrade.id);
    
    // Hide level up screen
    const levelUpScreen = document.getElementById('level-up-screen');
    if (levelUpScreen) {
        levelUpScreen.style.display = 'none';
    }
    
    // Unpause game
    isLevelingUp = false;
    
    // Teleport all humans to random doors as a grace period
    teleportAllHumans();
}

function applyUpgrade(upgrade) {
    switch (upgrade.id) {
        case 'trunk_length':
            player.addTrunkNode();
            break;
        case 'movement_speed':
            player.speed += 0.5;
            break;
        case 'trunk_strength':
            player.swingForce += 2;
            break;
        case 'pickup_frequency':
            pickupSpawnInterval = Math.max(3000, pickupSpawnInterval - 1000); // Min 3 seconds
            break;
    }
}

function teleportAllHumans() {
    const currentTime = Date.now();
    humans.forEach(human => {
        human.teleportToDoor(doors, player, currentTime);
    });
}

function updatePickups() {
    const currentTime = Date.now();
    
    // Check if we need to spawn a new pickup from primary timer
    if (currentTime - lastPickupSpawnTime > pickupSpawnInterval) {
        spawnPickup();
        lastPickupSpawnTime = currentTime;
    }
    
    // Check if we need to spawn a new pickup from secondary timer
    if (currentTime > secondaryPickupTimer) {
        spawnPickup();
        // Set next secondary pickup timer (random between 8-12 seconds)
        secondaryPickupInterval = 8000 + Math.floor(Math.random() * 4000);
        secondaryPickupTimer = currentTime + secondaryPickupInterval;
    }
    
    // Check if pickups have expired
    activePickups = activePickups.filter(pickup => {
        const hasExpired = currentTime - pickup.spawnTime > pickupLifetime;
        if (hasExpired) {
            // If pickup is temporary effect and active, handle its expiration
            if (pickup.isActive && pickup.type === 'blind') {
                endBlindEffect();
            } else if (pickup.isActive && pickup.type === 'rocket') {
                endSpeedBoostEffect();
            }
        }
        return !hasExpired;
    });
}

function spawnPickup() {
    // Pickup types with equal probability
    const pickupTypes = [
        'score', // +10% score
        'reset', // Teleport all humans
        'points', // +50 points
        'multiplier', // +1.0x multiplier
        'rocket', // Speed boost
        'blind' // Reduce human vision
    ];
    
    const pickupType = pickupTypes[Math.floor(Math.random() * pickupTypes.length)];
    const pickupSprites = getPickupSprites();
    const pickupSprite = pickupSprites.find(s => s.type === pickupType) || null;
    
    // Find a position away from the player and not inside objects
    let x, y;
    let validPosition = false;
    
    while (!validPosition) {
        x = Math.random() * (canvas.width - 80) + 40;
        y = Math.random() * (canvas.height - 80) + 40;
        
        // Check distance from player (should be at least 100px away)
        const distToPlayer = Math.sqrt(
            Math.pow(x - player.x, 2) + 
            Math.pow(y - player.y, 2)
        );
        
        if (distToPlayer < 100) continue;
        
        // Check collision with objects
        let collides = false;
        for (const obj of roomObjects) {
            if (rectsIntersect(
                { x, y, width: 40, height: 40 },
                { x: obj.x, y: obj.y, width: obj.width, height: obj.height }
            )) {
                collides = true;
                break;
            }
        }
        
        // Check collision with other pickups
        for (const pickup of activePickups) {
            if (rectsIntersect(
                { x, y, width: 40, height: 40 },
                { x: pickup.x, y: pickup.y, width: 40, height: 40 }
            )) {
                collides = true;
                break;
            }
        }
        
        validPosition = !collides;
    }
    
    // Create the pickup
    const pickup = {
        type: pickupType,
        x,
        y,
        spawnTime: Date.now(),
        isActive: false, // For tracking temporary effects
        duration: 5000, // Duration for temporary effects (5 seconds)
        sprite: pickupSprite // Add sprite reference
    };
    
    activePickups.push(pickup);
}

function collectPickup(pickup) {
    // Apply pickup effect based on type
    switch (pickup.type) {
        case 'score':
            // Increase score by 10%
            score += Math.floor(score * 0.1);
            break;
        case 'reset':
            // Teleport all humans to random doors
            teleportAllHumans();
            break;
        case 'points':
            // Add 50 points directly
            score += 50;
            break;
        case 'multiplier':
            // Add 1.0 to current multiplier
            scoreMultiplier = Math.min(scoreMultiplier + 1.0, maxMultiplier);
            lastMultiplierIncreaseTime = Date.now();
            multiplierRecentlyIncreased = true;
            recentlyIncreasedReset = Date.now() + 500;
            break;
        case 'rocket':
            // Temporary speed boost
            applySpeedBoostEffect(pickup);
            break;
        case 'blind':
            // Temporary vision reduction for humans
            applyBlindEffect(pickup);
            break;
    }
    
    // Check for level up after score changes
    checkLevelProgression();
}

// New effect functions
function applySpeedBoostEffect(pickup) {
    // Store original speed before boost
    if (!player.originalSpeed) {
        player.originalSpeed = player.speed;
    }
    // Apply speed boost
    player.speed = player.originalSpeed * 1.75;
    
    // Mark pickup as active and schedule end of effect
    pickup.isActive = true;
    pickup.endTime = Date.now() + pickup.duration;
    
    // Schedule effect end
    setTimeout(() => {
        endSpeedBoostEffect();
    }, pickup.duration);
}

function endSpeedBoostEffect() {
    if (player.originalSpeed) {
        player.speed = player.originalSpeed;
        player.originalSpeed = null;
    }
}

function applyBlindEffect(pickup) {
    // Store original vision distance for all humans
    humans.forEach(human => {
        if (!human.originalMaxVisionDistance) {
            human.originalMaxVisionDistance = human.maxVisionDistance;
        }
        human.maxVisionDistance = human.originalMaxVisionDistance / 2;
        human.visionDistance = Math.min(human.visionDistance, human.maxVisionDistance);
    });
    
    // Mark pickup as active and schedule end of effect
    pickup.isActive = true;
    pickup.endTime = Date.now() + pickup.duration;
    
    // Schedule effect end
    setTimeout(() => {
        endBlindEffect();
    }, pickup.duration);
}

function endBlindEffect() {
    humans.forEach(human => {
        if (human.originalMaxVisionDistance) {
            // Reset the vision growth process
            human.maxVisionDistance = human.originalMaxVisionDistance;
            human.visionGrowthStartTime = Date.now();
            human.visionDistance = Math.min(human.visionDistance, human.maxVisionDistance / 2);
            human.originalMaxVisionDistance = null;
        }
    });
}

function renderPickup(pickup) {
    if (pickup.sprite) {
        // Draw from spritesheet
        ctx.save();
        
        // Add glow effect
        ctx.shadowColor = getPickupGlowColor(pickup.type);
        ctx.shadowBlur = 10;
        
        ctx.drawImage(
            spritesheet,
            pickup.sprite.x, pickup.sprite.y,
            pickup.sprite.width, pickup.sprite.height,
            pickup.x, pickup.y,
            40, 40
        );
        
        ctx.restore();
    } else {
        // Fallback to old rendering method
        // Determine style based on pickup type
        let color, text, glowColor;
        
        switch (pickup.type) {
            case 'score':
                color = '#0066ff';
                text = '+10%';
                glowColor = '#0099ff';
                break;
            case 'reset':
                color = '#ff3300';
                text = 'Reset';
                glowColor = '#ff6600';
                break;
            case 'points':
                color = '#00cc66';
                text = '+50';
                glowColor = '#00ff80';
                break;
            case 'multiplier':
                color = '#ffcc00';
                text = '+1.0x';
                glowColor = '#ffdd44';
                break;
            case 'rocket':
                color = '#ff00cc';
                text = '';
                glowColor = '#ff66dd';
                break;
            case 'blind':
                color = '#9900cc';
                text = '';
                glowColor = '#cc66ff';
                break;
        }
        
        // Draw pickup
        ctx.fillStyle = color;
        ctx.fillRect(pickup.x, pickup.y, 40, 40);
        
        // Add glow effect
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(pickup.x, pickup.y, 40, 40);
        ctx.shadowBlur = 0;
        
        // Draw text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, pickup.x + 20, pickup.y + 20);
    }
}

// Helper function to get glow color for pickups
function getPickupGlowColor(type) {
    switch (type) {
        case 'score': return '#0099ff';
        case 'reset': return '#ff6600';
        case 'points': return '#00ff80';
        case 'multiplier': return '#ffdd44';
        case 'rocket': return '#ff66dd';
        case 'blind': return '#cc66ff';
        default: return '#ffffff';
    }
}

function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game objects
    roomObjects.forEach(obj => obj.render(ctx));
    
    // Draw active pickups
    activePickups.forEach(pickup => {
        renderPickup(pickup);
    });
    
    // Draw humans
    humans.forEach(human => {
        human.render(ctx, renderSpeechBubble);
    });
    
    // Draw player
    player.render(ctx);
    
    // Render multiplier
    if (scoreMultiplier > 0) {
        renderScoreMultiplier(ctx, scoreMultiplier, maxMultiplier, 120, 10, multiplierRecentlyIncreased);
    }
}

function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const currentTime = Date.now();
    
    if (!gameOver) {
        if (!isLevelingUp) {
            // Update game objects
            updatePlayer();
            updateObjects();
            updateHumans();
            updateMultiplier(currentTime);
            updatePickups();
        }
        
        updateScore(currentTime);
        
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

// Create level progress UI
const levelProgressContainer = document.createElement('div');
levelProgressContainer.id = 'level-progress-container';
levelProgressContainer.innerHTML = '<div id="level-progress-bar"></div>';

const levelIndicator = document.createElement('div');
levelIndicator.id = 'level-indicator';
levelIndicator.textContent = 'Level 1';

document.getElementById('game-container').appendChild(levelProgressContainer);
document.getElementById('game-container').appendChild(levelIndicator);

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

// Make game state globally accessible
window.gameState = {
    canvas,
    ctx,
    roomObjects
};

// End game function
function endGame() {
    gameOver = true;
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over').classList.remove('hidden');
}

// Handle window resize
window.addEventListener('resize', () => {
    // Update canvas dimensions to match container
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;
});