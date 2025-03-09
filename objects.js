import { spritesheet } from './sprites.js';

export class RoomObject {
    constructor(x, y, width, height, sprite, mass, name) {
        this.x = x;
        this.y = y;
        this.initialX = x; // Store initial position for reset
        this.initialY = y;
        this.width = width;
        this.height = height;
        this.sprite = sprite; // Sprite data object
        this.mass = mass || 1;
        this.name = name || 'object';
        this.vx = 0;
        this.vy = 0;
        
        // Add rotation properties
        this.angle = 0;
        this.angularVelocity = 0;
        this.rotationInertia = mass * (width * width + height * height) / 12; // Moment of inertia for rectangle
    }
    
    resetVelocity() {
        this.vx = 0;
        this.vy = 0;
        this.x = this.initialX;
        this.y = this.initialY;
        this.angle = 0;
        this.angularVelocity = 0;
    }
    
    update(canvasWidth, canvasHeight) {
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Update rotation
        this.angle += this.angularVelocity;
        
        // Apply friction
        this.vx *= 0.95;
        this.vy *= 0.95;
        this.angularVelocity *= 0.95;
        
        // Reset velocity if it's very small
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        if (Math.abs(this.vy) < 0.1) this.vy = 0;
        if (Math.abs(this.angularVelocity) < 0.01) this.angularVelocity = 0;
        
        // Bounce off walls
        if (this.x < 0) {
            this.x = 0;
            this.vx = -this.vx * 0.5;
        } else if (this.x + this.width > canvasWidth) {
            this.x = canvasWidth - this.width;
            this.vx = -this.vx * 0.5;
        }
        
        if (this.y < 0) {
            this.y = 0;
            this.vy = -this.vy * 0.5;
        } else if (this.y + this.height > canvasHeight) {
            this.y = canvasHeight - this.height;
            this.vy = -this.vy * 0.5;
        }
    }
    
    render(ctx) {
        if (this.sprite) {
            // Save the current context state
            ctx.save();
            
            // Translate to the center of the object
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            
            // Rotate the context
            ctx.rotate(this.angle);
            
            // Draw sprite from spritesheet (adjust to draw from center)
            ctx.drawImage(
                spritesheet, 
                this.sprite.x, this.sprite.y, 
                this.sprite.width, this.sprite.height,
                -this.width / 2, -this.height / 2, 
                this.width, this.height
            );
            
            // Restore the context
            ctx.restore();
        } else {
            // Fallback to colored rectangle
            ctx.fillStyle = 'black'; // default color if sprite is not provided
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    
    // Get the corners of the object after rotation
    getCorners() {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        return [
            // Top-left
            {
                x: centerX + (-halfWidth * cos - -halfHeight * sin),
                y: centerY + (-halfWidth * sin + -halfHeight * cos)
            },
            // Top-right
            {
                x: centerX + (halfWidth * cos - -halfHeight * sin),
                y: centerY + (halfWidth * sin + -halfHeight * cos)
            },
            // Bottom-right
            {
                x: centerX + (halfWidth * cos - halfHeight * sin),
                y: centerY + (halfWidth * sin + halfHeight * cos)
            },
            // Bottom-left
            {
                x: centerX + (-halfWidth * cos - halfHeight * sin),
                y: centerY + (-halfWidth * sin + halfHeight * cos)
            }
        ];
    }
    
    // Check if this object collides with another
    collidesWith(other) {
        // Use Separating Axis Theorem (SAT) for rotated rectangles
        const thisCorners = this.getCorners();
        const otherCorners = other.getCorners();
        
        // Get the axes to test (normals of each edge)
        const axes = [];
        for (let i = 0; i < 4; i++) {
            const next = (i + 1) % 4;
            axes.push({
                x: -(thisCorners[next].y - thisCorners[i].y),
                y: thisCorners[next].x - thisCorners[i].x
            });
            axes.push({
                x: -(otherCorners[next].y - otherCorners[i].y),
                y: otherCorners[next].x - otherCorners[i].x
            });
        }
        
        // Normalize axes
        axes.forEach(axis => {
            const length = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
            axis.x /= length;
            axis.y /= length;
        });
        
        // Test each axis
        for (const axis of axes) {
            // Project corners onto axis
            let thisMin = Infinity, thisMax = -Infinity;
            let otherMin = Infinity, otherMax = -Infinity;
            
            for (const corner of thisCorners) {
                const projection = corner.x * axis.x + corner.y * axis.y;
                thisMin = Math.min(thisMin, projection);
                thisMax = Math.max(thisMax, projection);
            }
            
            for (const corner of otherCorners) {
                const projection = corner.x * axis.x + corner.y * axis.y;
                otherMin = Math.min(otherMin, projection);
                otherMax = Math.max(otherMax, projection);
            }
            
            // Check for separation
            if (thisMax < otherMin || otherMax < thisMin) {
                return false; // Separated, no collision
            }
        }
        
        return true; // No separation found, objects are colliding
    }
    
    // Handle collision response
    handleCollision(other) {
        // Calculate collision normal (approximate using centers)
        const dx = other.x + other.width / 2 - (this.x + this.width / 2);
        const dy = other.y + other.height / 2 - (this.y + this.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist === 0) return; // Avoid division by zero
        
        const nx = dx / dist;
        const ny = dy / dist;
        
        // Calculate relative velocity
        const rvx = other.vx - this.vx;
        const rvy = other.vy - this.vy;
        
        // Calculate relative velocity along normal
        const velAlongNormal = rvx * nx + rvy * ny;
        
        // If objects are moving away from each other, do nothing
        if (velAlongNormal > 0) return;
        
        // Calculate restitution (bounciness)
        const restitution = 0.4;
        
        // Calculate impulse scalar
        const impulseScalar = -(1 + restitution) * velAlongNormal / 
                            (1 / this.mass + 1 / other.mass);
        
        // Apply impulse
        const impulseX = impulseScalar * nx;
        const impulseY = impulseScalar * ny;
        
        this.vx -= impulseX / this.mass;
        this.vy -= impulseY / this.mass;
        other.vx += impulseX / other.mass;
        other.vy += impulseY / other.mass;
        
        // Make rotations stiffer by reducing the angular impulse
        const angularDamping = 0.4; // Reduce angular impulse by 60%
        
        // Apply angular impulse based on offset from center
        const thisOffsetX = dx / 2;
        const thisOffsetY = dy / 2;
        const otherOffsetX = -dx / 2;
        const otherOffsetY = -dy / 2;
        
        // Cross product to calculate torque with damping
        this.angularVelocity += (thisOffsetX * impulseY - thisOffsetY * impulseX) / this.rotationInertia * angularDamping;
        other.angularVelocity += (otherOffsetX * impulseY - otherOffsetY * impulseX) / other.rotationInertia * angularDamping;
        
        // Push objects apart to prevent sticking
        const penetration = 0.1; // Small value to separate objects
        const correctionX = penetration * nx;
        const correctionY = penetration * ny;
        
        this.x -= correctionX * (other.mass / (this.mass + other.mass));
        this.y -= correctionY * (other.mass / (this.mass + other.mass));
        other.x += correctionX * (this.mass / (this.mass + other.mass));
        other.y += correctionY * (this.mass / (this.mass + other.mass));
    }
}