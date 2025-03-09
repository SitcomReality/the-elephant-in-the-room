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
        // Store previous position for velocity calculation
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
        this.numNodes = 7; // Increased from 5 to 7
        this.trunkSwinging = false;
        this.swingForce = 15; // Force applied during swing
        this.swingDecay = 0.9; // How quickly the swing force decays
        this.currentSwingForce = 0;
        
        // Add property for yeeting objects on click
        this.yeetStrength = 10;
        
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
        
        // Reset speed and other upgradeable properties to defaults
        this.speed = 3;
        this.swingForce = 15;
        
        // Reset the trunk to initial configuration
        this.numNodes = 7;
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
        
        // Check if player is clicking to yeet objects directly touching the elephant
        if (mouse.down) {
            this.yeetObjectsInContact(roomObjects, mouse);
        }
        
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
        } else {
            // Even when not swinging, add a small force towards the mouse for the last node
            const lastNode = this.trunkNodes[this.trunkNodes.length - 1];
            const dx = mouse.x - lastNode.x;
            const dy = mouse.y - lastNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                // Normalize and apply a gentle force
                const dirX = dx / dist;
                const dirY = dy / dist;
                lastNode.x += dirX * 0.8;
                lastNode.y += dirY * 0.8;
            }
        }
        
        // Update all nodes (except first)
        for (let i = 1; i < this.trunkNodes.length; i++) {
            const node = this.trunkNodes[i];
            const prevNode = this.trunkNodes[i - 1];
            
            if (i !== 1 || !this.trunkSwinging) {
                // Add a bit of natural movement to the trunk
                const wobble = Math.sin(Date.now() / 300 + i) * 0.2;
                const targetAngle = this.trunkAngle + wobble;
                
                // For all nodes except the first and the last during swing
                node.update(prevNode.x + Math.cos(targetAngle) * this.trunkLength, 
                           prevNode.y + Math.sin(targetAngle) * this.trunkLength, 0.3);
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
        
        // Always check for collisions between all trunk nodes and room objects
        this.checkTrunkCollisions(roomObjects);
    }
    
    yeetObjectsInContact(roomObjects, mouse) {
        // Find objects that are in contact with the elephant
        roomObjects.forEach(obj => {
            if (circleRectangleCollision(
                this.x, this.y, this.radius,
                obj.x, obj.y, obj.width, obj.height, obj.angle
            )) {
                // Calculate direction from elephant to mouse
                const dx = mouse.x - this.x;
                const dy = mouse.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > 0) {
                    // Normalize and apply force
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    
                    // Apply force based on object mass
                    const forceFactor = this.yeetStrength / (obj.mass || 1);
                    obj.vx += dirX * forceFactor;
                    obj.vy += dirY * forceFactor;
                }
                
                // Add some rotation - reduce this value for stiffer rotation
                const torque = (Math.random() - 0.5) * this.yeetStrength / (obj.mass || 1) * 0.5; // Reduced by half with *0.5
                obj.angularVelocity += torque;
            }
        });
    }
    
    checkTrunkCollisions(roomObjects) {
        // Check all nodes (except the first one attached to elephant)
        for (let i = 1; i < this.trunkNodes.length; i++) {
            const node = this.trunkNodes[i];
            const prevNode = this.trunkNodes[i - 1];
            
            // Calculate node velocity by comparing current and previous positions
            const nodeVx = node.x - node.prevX;
            const nodeVy = node.y - node.prevY;
            const nodeSpeed = Math.sqrt(nodeVx * nodeVx + nodeVy * nodeVy);
            
            roomObjects.forEach(obj => {
                // Check if node is colliding with object
                if (circleRectangleCollision(
                    node.x, node.y, node.radius,
                    obj.x, obj.y, obj.width, obj.height, obj.angle
                )) {
                    // Whether swinging or not, apply force if the trunk is moving fast enough
                    if (nodeSpeed > 1.0) {
                        // Calculate force direction (from previous node to this node)
                        const forceX = node.x - prevNode.x;
                        const forceY = node.y - prevNode.y;
                        
                        // Normalize
                        const forceMag = Math.sqrt(forceX * forceX + forceY * forceY);
                        if (forceMag > 0) {
                            const normalizedForceX = forceX / forceMag;
                            const normalizedForceY = forceY / forceMag;
                            
                            // Apply force based on object mass and node speed
                            const forceFactor = nodeSpeed / (obj.mass || 1);
                            // Limit the maximum force to prevent objects from flying too crazily
                            const maxForce = this.trunkSwinging ? 15 : 5;
                            const appliedForce = Math.min(forceFactor, maxForce);
                            
                            obj.vx += normalizedForceX * appliedForce;
                            obj.vy += normalizedForceY * appliedForce;
                        }
                        
                        // Add some rotation to the object based on the direction of the trunk hit
                        if (nodeSpeed > 1.0) {
                            // Calculate torque direction based on hit location relative to center
                            const hitOffsetX = node.x - (obj.x + obj.width / 2);
                            const hitOffsetY = node.y - (obj.y + obj.height / 2);
                            
                            // Cross product to determine rotation direction
                            const torqueDirection = normalizedForceX * hitOffsetY - normalizedForceY * hitOffsetX;
                            
                            // Apply angular velocity based on hit strength and object's mass
                            // Reduce the rotation factor to make it stiffer
                            obj.angularVelocity += torqueDirection * 0.0005 * nodeSpeed / obj.mass; // Reduced from 0.001 to 0.0005
                        }
                    }
                    
                    // Make the trunk node bounce off the object slightly
                    node.x += (node.x - obj.x) * 0.1;
                    node.y += (node.y - obj.y) * 0.1;
                }
            });
        }
    }
    
    addTrunkNode() {
        // Get the last node's position
        const lastNode = this.trunkNodes[this.trunkNodes.length - 1];
        const secondLastNode = this.trunkNodes[this.trunkNodes.length - 2];
        
        // Calculate direction from second-last to last node
        const dx = lastNode.x - secondLastNode.x;
        const dy = lastNode.y - secondLastNode.y;
        const angle = Math.atan2(dy, dx);
        
        // Create new node extending in the same direction
        const newX = lastNode.x + Math.cos(angle) * this.trunkLength;
        const newY = lastNode.y + Math.sin(angle) * this.trunkLength;
        
        // Add the new node
        this.trunkNodes.push(new TrunkNode(newX, newY));
        this.numNodes++;
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