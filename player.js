// Import physics utilities
import { circleRectangleCollision } from './physics.js';

// Trunk node class for the multi-node trunk system
class TrunkNode {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.prevX = x;
        this.prevY = y;
        this.radius = 5; // Collision radius for node
    }

    update(targetX, targetY, stiffness = 0.1) {
        // Store previous position for constraint solving
        this.prevX = this.x;
        this.prevY = this.y;
        
        // Move towards target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        this.x += dx * stiffness;
        this.y += dy * stiffness;
    }
}

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.speed = 3;
        this.direction = 0; // direction in radians
        this.color = '#888888';
        
        // Trunk properties
        this.trunkLength = 10; // Distance between nodes
        this.trunkWidth = 10;
        this.trunkAngle = 0;
        this.trunkNodes = [];
        this.numNodes = 5; // Number of nodes in trunk
        this.trunkSwinging = false;
        this.swingForce = 15; // Force applied during swing
        this.swingDecay = 0.9; // How quickly the swing force decays
        this.currentSwingForce = 0;
        
        // Initialize trunk nodes
        this.initTrunk();
    }
    
    initTrunk() {
        this.trunkNodes = [];
        
        // Create nodes starting from elephant's position
        for (let i = 0; i < this.numNodes; i++) {
            const angle = this.trunkAngle;
            const distance = i * this.trunkLength;
            const x = this.x + Math.cos(angle) * distance;
            const y = this.y + Math.sin(angle) * distance;
            
            this.trunkNodes.push(new TrunkNode(x, y));
        }
    }
    
    reset(x, y) {
        this.x = x;
        this.y = y;
        this.direction = 0;
        this.trunkAngle = 0;
        this.trunkSwinging = false;
        this.currentSwingForce = 0;
        this.initTrunk();
    }
    
    startTrunkSwing() {
        if (!this.trunkSwinging) {
            this.trunkSwinging = true;
            this.currentSwingForce = this.swingForce;
        }
    }
    
    update(keys, mouse, canvasWidth, canvasHeight, roomObjects) {
        // Movement
        let dx = 0;
        let dy = 0;
        
        if (keys.up) dy -= this.speed;
        if (keys.down) dy += this.speed;
        if (keys.left) dx -= this.speed;
        if (keys.right) dx += this.speed;
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
            const factor = this.speed / Math.sqrt(dx * dx + dy * dy);
            dx *= factor;
            dy *= factor;
        }
        
        // Update player position with boundary checking
        const newX = this.x + dx;
        const newY = this.y + dy;
        
        let canMoveX = true;
        let canMoveY = true;
        
        // Check for collisions with room objects
        if (dx !== 0 || dy !== 0) {
            roomObjects.forEach(obj => {
                if (circleRectangleCollision(
                    newX, this.y, this.radius,
                    obj.x, obj.y, obj.width, obj.height
                )) {
                    canMoveX = false;
                }
                
                if (circleRectangleCollision(
                    this.x, newY, this.radius,
                    obj.x, obj.y, obj.width, obj.height
                )) {
                    canMoveY = false;
                }
            });
        }
        
        // Apply movement if allowed and within canvas bounds
        if (canMoveX && newX - this.radius > 0 && newX + this.radius < canvasWidth) {
            this.x = newX;
        }
        
        if (canMoveY && newY - this.radius > 0 && newY + this.radius < canvasHeight) {
            this.y = newY;
        }
        
        // Update player direction if moving
        if (dx !== 0 || dy !== 0) {
            this.direction = Math.atan2(dy, dx);
        }
        
        // Calculate angle between player and mouse
        this.trunkAngle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        
        // Update trunk nodes
        this.updateTrunk(mouse, roomObjects);
    }
    
    updateTrunk(mouse, roomObjects) {
        // First node is fixed to the elephant's position
        this.trunkNodes[0].x = this.x;
        this.trunkNodes[0].y = this.y;
        
        // If swinging, apply force to the last node towards mouse position
        if (this.trunkSwinging) {
            const lastNode = this.trunkNodes[this.trunkNodes.length - 1];
            
            // Vector from last node to mouse
            const dx = mouse.x - lastNode.x;
            const dy = mouse.y - lastNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Normalize direction vector
                const dirX = dx / dist;
                const dirY = dy / dist;
                
                // Apply force
                lastNode.x += dirX * this.currentSwingForce;
                lastNode.y += dirY * this.currentSwingForce;
                
                // Decay swing force
                this.currentSwingForce *= this.swingDecay;
                
                // End swing when force gets small enough
                if (this.currentSwingForce < 0.5) {
                    this.trunkSwinging = false;
                    this.currentSwingForce = 0;
                }
            }
        }
        
        // Verlet integration to update nodes
        for (let i = 1; i < this.trunkNodes.length; i++) {
            const node = this.trunkNodes[i];
            
            if (i !== 1 || !this.trunkSwinging) {
                // For all nodes except the first and the last during swing
                const prevNode = this.trunkNodes[i - 1];
                node.update(prevNode.x + Math.cos(this.trunkAngle) * this.trunkLength, 
                           prevNode.y + Math.sin(this.trunkAngle) * this.trunkLength, 0.3);
            }
        }
        
        // Apply constraints to maintain consistent distances between nodes
        for (let iteration = 0; iteration < 3; iteration++) {
            for (let i = 1; i < this.trunkNodes.length; i++) {
                const node = this.trunkNodes[i];
                const prevNode = this.trunkNodes[i - 1];
                
                // Calculate distance
                const dx = node.x - prevNode.x;
                const dy = node.y - prevNode.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance === 0) continue;
                
                // Calculate correction factor
                const difference = (this.trunkLength - distance) / distance;
                
                // Move nodes to maintain distance
                if (i === 1) {
                    // First node after head is fixed, so only move the current node
                    node.x += dx * difference;
                    node.y += dy * difference;
                } else {
                    // Move both nodes
                    const correction = 0.5 * difference;
                    
                    prevNode.x -= dx * correction;
                    prevNode.y -= dy * correction;
                    node.x += dx * correction;
                    node.y += dy * correction;
                }
            }
        }
        
        // Check for collisions between trunk nodes and room objects
        this.checkTrunkCollisions(roomObjects);
    }
    
    checkTrunkCollisions(roomObjects) {
        // Skip the first node (attached to elephant)
        for (let i = 1; i < this.trunkNodes.length; i++) {
            const node = this.trunkNodes[i];
            
            roomObjects.forEach(obj => {
                // Check if node is colliding with object
                if (circleRectangleCollision(
                    node.x, node.y, node.radius,
                    obj.x, obj.y, obj.width, obj.height
                )) {
                    // If this is during an active swing, apply force to object
                    if (this.trunkSwinging && this.currentSwingForce > 1.0) {
                        // Initialize velocity if needed
                        if (obj.vx === undefined) {
                            obj.vx = 0;
                            obj.vy = 0;
                        }
                        
                        // Calculate force direction (from previous node to this node)
                        const prevNode = this.trunkNodes[i - 1];
                        let forceX = node.x - prevNode.x;
                        let forceY = node.y - prevNode.y;
                        
                        // Normalize
                        const forceMag = Math.sqrt(forceX * forceX + forceY * forceY);
                        if (forceMag > 0) {
                            forceX /= forceMag;
                            forceY /= forceMag;
                            
                            // Apply force based on object mass and current swing force
                            const forceFactor = this.currentSwingForce / (obj.mass || 1);
                            obj.vx += forceX * forceFactor;
                            obj.vy += forceY * forceFactor;
                        }
                    }
                }
            });
        }
    }
    
    render(ctx) {
        // Draw player body (elephant)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw elephant ears
        ctx.fillStyle = '#777';
        // Left ear
        ctx.beginPath();
        ctx.ellipse(
            this.x - this.radius * 0.7, 
            this.y - this.radius * 0.5, 
            this.radius * 0.6, 
            this.radius * 0.8, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Right ear
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.radius * 0.7, 
            this.y - this.radius * 0.5, 
            this.radius * 0.6, 
            this.radius * 0.8, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Draw trunk as a smooth curve through nodes
        ctx.beginPath();
        ctx.moveTo(this.trunkNodes[0].x, this.trunkNodes[0].y);
        
        // Use quadratic curves to connect the nodes smoothly
        for (let i = 1; i < this.trunkNodes.length; i++) {
            const currentNode = this.trunkNodes[i];
            const prevNode = this.trunkNodes[i - 1];
            
            if (i < this.trunkNodes.length - 1) {
                const nextNode = this.trunkNodes[i + 1];
                
                // Calculate control point as the midpoint
                const cpX = currentNode.x;
                const cpY = currentNode.y;
                
                // End point is midway between current and next node
                const endX = (currentNode.x + nextNode.x) / 2;
                const endY = (currentNode.y + nextNode.y) / 2;
                
                ctx.quadraticCurveTo(cpX, cpY, endX, endY);
            } else {
                // For the last segment, just draw to the last node
                ctx.lineTo(currentNode.x, currentNode.y);
            }
        }
        
        ctx.lineWidth = this.trunkWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = this.color;
        ctx.stroke();
        
        // Draw eyes
        ctx.fillStyle = 'black';
        const eyeOffset = this.radius * 0.3;
        const eyeSize = this.radius * 0.2;
        
        ctx.beginPath();
        ctx.arc(
            this.x + Math.cos(this.direction + Math.PI/4) * eyeOffset,
            this.y + Math.sin(this.direction + Math.PI/4) * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(
            this.x + Math.cos(this.direction - Math.PI/4) * eyeOffset,
            this.y + Math.sin(this.direction - Math.PI/4) * eyeOffset,
            eyeSize, 0, Math.PI * 2
        );
        ctx.fill();
        
        // Uncomment to debug trunk nodes
        /*
        for (let i = 0; i < this.trunkNodes.length; i++) {
            const node = this.trunkNodes[i];
            ctx.fillStyle = i === this.trunkNodes.length - 1 ? 'red' : 'blue';
            ctx.beginPath();
            ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        */
    }
}