export class RoomObject {
    constructor(x, y, width, height, color, mass, name) {
        this.x = x;
        this.y = y;
        this.initialX = x; // Store initial position for reset
        this.initialY = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.mass = mass || 1;
        this.name = name || 'object';
        this.vx = 0;
        this.vy = 0;
    }
    
    resetVelocity() {
        this.vx = 0;
        this.vy = 0;
        this.x = this.initialX;
        this.y = this.initialY;
    }
    
    update(canvasWidth, canvasHeight) {
        // Update position
        this.x += this.vx;
        this.y += this.vy;
        
        // Apply friction
        this.vx *= 0.95;
        this.vy *= 0.95;
        
        // Reset velocity if it's very small
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        if (Math.abs(this.vy) < 0.1) this.vy = 0;
        
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
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}