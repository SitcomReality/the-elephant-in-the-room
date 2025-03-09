import { circleRectangleCollision, calculateVisionRay, lineIntersectsRect } from './physics.js';

export class Human {
    constructor(x, y, direction) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.speed = 1;
        this.direction = direction;
        this.targetDirection = direction; // For smooth rotation
        this.rotationStartTime = 0; // When rotation started
        this.rotationDuration = 0; // How long rotation should take
        this.isRotating = false; // Flag for rotation state
        this.fovAngle = Math.PI / 3; // 60 degrees field of view
        this.visionDistance = 0; // Start with no vision
        this.maxVisionDistance = 200; // Maximum vision distance
        this.originalMaxVisionDistance = null; // For storing original vision when affected by pickups
        this.visionGrowthStartTime = Date.now(); // When vision started growing
        this.visionGrowthDuration = 2000; // Vision grows over 2 seconds
        this.visionColor = 'rgba(255, 0, 0, 0.3)';
        this.changeDirectionTime = 0;
        this.directionChangeInterval = 3000; // Change direction every 3 seconds
        this.lastSpeechTime = 0; // For speech bubble cooldown
        this.speechText = null; // Current speech text
        this.speechEndTime = 0; // When to remove speech bubble
        this.collisionImmunityEndTime = Date.now() + 5000; // 5 seconds of collision immunity
        this.lastHitTime = 0; // Track last time this human was hit by object
    }
    
    speak(text, currentTime) {
        this.speechText = text;
        this.lastSpeechTime = currentTime;
        this.speechEndTime = currentTime + 3000; // Show for 3 seconds
        // Grant collision immunity
        this.collisionImmunityEndTime = currentTime + 5000;
    }
    
    update(currentTime, player, roomObjects, humans, canvasWidth, canvasHeight, doors) {
        // Update vision distance for newly spawned humans or when returning from blinded state
        if (this.visionDistance < this.maxVisionDistance) {
            const elapsed = currentTime - this.visionGrowthStartTime;
            const progress = Math.min(elapsed / this.visionGrowthDuration, 1);
            this.visionDistance = this.maxVisionDistance * progress;
        }
        
        // Store previous position and direction
        const previousX = this.x;
        const previousY = this.y;
        const previousDirection = this.direction;
        
        // Handle direction changes with smooth rotation
        if (currentTime - this.changeDirectionTime > this.directionChangeInterval && !this.isRotating) {
            // Set new target direction
            this.targetDirection = this.direction + (Math.random() - 0.5) * Math.PI / 2;
            this.rotationStartTime = currentTime;
            this.rotationDuration = 500 + Math.random() * 500; // Random duration between 500-1000ms
            this.isRotating = true;
            this.changeDirectionTime = currentTime; // Reset timer
        }
        
        // Update direction with smooth rotation
        if (this.isRotating) {
            const elapsed = currentTime - this.rotationStartTime;
            const progress = Math.min(elapsed / this.rotationDuration, 1);
            
            let easingFactor;
            if (progress <= 0.75) {
                // First 75% of rotation uses ease-out
                easingFactor = 1 - Math.pow(1 - progress / 0.75, 3);
            } else {
                // Last 25% uses linear movement
                easingFactor = 0.75 + (progress - 0.75) / 0.25;
            }
            
            // Calculate angle difference, accounting for wrapping
            let angleDiff = this.targetDirection - this.direction;
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            
            // Apply easing to rotation
            this.direction = this.direction + angleDiff * easingFactor - (this.isRotating && progress < 1 ? angleDiff * easingFactor : 0);
            
            // Check if rotation is complete
            if (progress >= 1) {
                this.direction = this.targetDirection;
                this.isRotating = false;
            }
        }
        
        // Calculate new position
        const newX = this.x + Math.cos(this.direction) * this.speed;
        const newY = this.y + Math.sin(this.direction) * this.speed;
        
        let canMoveX = true;
        let canMoveY = true;
        let isStuck = false;
        let directionChanged = false;
        
        // Check for collisions with room objects
        roomObjects.forEach(obj => {
            if (circleRectangleCollision(
                newX, this.y, this.radius,
                obj.x, obj.y, obj.width, obj.height, obj.angle
            )) {
                canMoveX = false;
            }
            
            if (circleRectangleCollision(
                this.x, newY, this.radius,
                obj.x, obj.y, obj.width, obj.height, obj.angle
            )) {
                canMoveY = false;
            }
            
            // Check if human is stuck inside an object
            if (circleRectangleCollision(
                this.x, this.y, this.radius,
                obj.x, obj.y, obj.width, obj.height, obj.angle
            )) {
                isStuck = true;
            }
        });
        
        // Check for collisions with other humans (if not immune)
        if (currentTime > this.collisionImmunityEndTime) {
            humans.forEach(otherHuman => {
                if (this === otherHuman) return;
                
                // Skip collision check if the other human is immune
                if (currentTime <= otherHuman.collisionImmunityEndTime) return;
                
                // Check horizontal collision
                const xDistance = newX - otherHuman.x;
                const yDistance = this.y - otherHuman.y;
                const totalDistance = Math.sqrt(xDistance * xDistance + yDistance * yDistance);
                
                if (totalDistance < this.radius + otherHuman.radius) {
                    canMoveX = false;
                    
                    // Make humans talk to each other and grant collision immunity
                    this.handleHumanCollision(currentTime, otherHuman);
                }
                
                // Check vertical collision
                const xDist = this.x - otherHuman.x;
                const yDist = newY - otherHuman.y;
                const totalDist = Math.sqrt(xDist * xDist + yDist * yDist);
                
                if (totalDist < this.radius + otherHuman.radius) {
                    canMoveY = false;
                }
            });
        }
        
        // If human is stuck, teleport them to a random door
        if (isStuck) {
            this.teleportToDoor(doors, player, currentTime);
        } else {
            // Apply movement if allowed
            if (canMoveX) {
                this.x = newX;
            } else {
                // Bounce off obstacle
                this.direction = Math.PI - this.direction;
                this.targetDirection = this.direction;
                directionChanged = true;
            }
            
            if (canMoveY) {
                this.y = newY;
            } else {
                // Bounce off obstacle
                this.direction = -this.direction;
                this.targetDirection = this.direction;
                directionChanged = true;
            }
        }
        
        // Check if bounced off walls
        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.direction = Math.PI - this.direction;
            this.targetDirection = this.direction;
            directionChanged = true;
        } else if (this.x + this.radius > canvasWidth) {
            this.x = canvasWidth - this.radius;
            this.direction = Math.PI - this.direction;
            this.targetDirection = this.direction;
            directionChanged = true;
        }
        
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.direction = -this.direction;
            this.targetDirection = this.direction;
            directionChanged = true;
        } else if (this.y + this.radius > canvasHeight) {
            this.y = canvasHeight - this.radius;
            this.direction = -this.direction;
            this.targetDirection = this.direction;
            directionChanged = true;
        }
        
        // Reset vision when direction changes due to bouncing
        if (directionChanged) {
            this.resetVision(currentTime);
        }
    }
    
    handleHumanCollision(currentTime, otherHuman) {
        // Only create speech bubble if enough time has passed
        if (currentTime - this.lastSpeechTime > 5000) {
            // This will be handled by the game.js which has access to dialogue data
            // For now, we'll just set speech times and grant immunity
            this.lastSpeechTime = currentTime;
            this.collisionImmunityEndTime = currentTime + 5000;
            
            // Also return true to indicate that dialogue should be shown
            return true;
        }
        return false;
    }
    
    teleportToDoor(doors, player, currentTime) {
        const doorIndex = Math.floor(Math.random() * doors.length);
        const door = doors[doorIndex];
        this.x = door.x;
        this.y = door.y;
        // Face away from player
        this.direction = Math.atan2(player.y - this.y, player.x - this.x) + Math.PI;
        this.targetDirection = this.direction; // Reset target direction too
        // Reset vision growth for teleported humans
        this.resetVision(currentTime);
        // Give immunity after teleport
        this.collisionImmunityEndTime = currentTime + 5000;
    }
    
    resetVision(currentTime) {
        this.visionDistance = 0;
        this.visionGrowthStartTime = currentTime;
    }
    
    isLineOfSightBlocked(x1, y1, x2, y2, roomObjects) {
        // Check each object to see if it blocks the line of sight
        for (const obj of roomObjects) {
            // Check intersection with the object, passing the rotation angle
            if (lineIntersectsRect(x1, y1, x2, y2, obj.x, obj.y, obj.width, obj.height, obj.angle)) {
                return true;
            }
        }
        
        return false;
    }
    
    drawVisionCone(ctx) {
        ctx.save();
        
        // Define the vision cone path
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        
        const leftAngle = this.direction - this.fovAngle / 2;
        const rightAngle = this.direction + this.fovAngle / 2;
        
        // Draw vision triangle with line-of-sight consideration
        const rayCount = 20; // Number of rays to cast
        
        // Get roomObjects from game state
        const { roomObjects } = window.gameState || { roomObjects: [] };
        
        for (let i = 0; i <= rayCount; i++) {
            const rayAngle = leftAngle + (rightAngle - leftAngle) * (i / rayCount);
            const rayLength = this.visionDistance; // Use current vision distance
            
            // Cast a ray in this direction and find the closest intersection
            const intersection = calculateVisionRay(this.x, this.y, rayAngle, rayLength, roomObjects);
            
            // Add the visible endpoint to our vision cone
            ctx.lineTo(intersection.x, intersection.y);
        }
        
        ctx.closePath();
        
        // Fill with semi-transparent color
        ctx.fillStyle = this.visionColor;
        ctx.fill();
        
        ctx.restore();
    }
    
    render(ctx, renderSpeechBubble) {
        // Draw vision cone
        this.drawVisionCone(ctx);
        
        // Draw human body
        ctx.fillStyle = '#3366CC';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw direction indicator (face)
        ctx.fillStyle = '#FFE0BD';
        ctx.beginPath();
        ctx.arc(
            this.x + Math.cos(this.direction) * this.radius * 0.6,
            this.y + Math.sin(this.direction) * this.radius * 0.6,
            this.radius * 0.6, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw speech bubble if active
        const currentTime = Date.now();
        if (this.speechText && currentTime < this.speechEndTime) {
            renderSpeechBubble(ctx, this.x, this.y, this.radius, this.speechText);
        }
    }
}