// Water particle system for elephant trunk

export class WaterParticle {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.creationTime = Date.now();
        this.radius = 3; // Base radius for collision
        this.lifetime = 3000; // 3 seconds by default
    }
    
    update() {
        // Simple physics
        this.x += this.vx;
        this.vy += 0.05; // Gravity
        this.y += this.vy;
        
        // Slow down
        this.vx *= 0.98;
        this.vy *= 0.98;
    }
    
    isExpired() {
        return Date.now() - this.creationTime > this.lifetime;
    }
    
    getRemainingLifetimePercent() {
        return 1 - ((Date.now() - this.creationTime) / this.lifetime);
    }
}

export class WaterSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 10; // Default max particles
        this.lastEmissionTime = 0;
        this.emissionCooldown = 250; // 250ms between emissions
        this.waterColor = '#5A9BD5'; // Base water color
        this.particleLifetime = 3000; // 3 seconds
    }
    
    canEmit() {
        return this.particles.length < this.maxParticles && 
               Date.now() - this.lastEmissionTime > this.emissionCooldown;
    }
    
    emit(x, y, directionX, directionY, speed) {
        if (!this.canEmit()) return;
        
        // Add small random variation to direction
        const angleVariation = (Math.random() - 0.5) * 0.5; // +/- 0.25 radians
        const angle = Math.atan2(directionY, directionX) + angleVariation;
        
        // Calculate new direction with variation
        const adjustedSpeed = speed * (0.8 + Math.random() * 0.4); // 80-120% of base speed
        const vx = Math.cos(angle) * adjustedSpeed;
        const vy = Math.sin(angle) * adjustedSpeed;
        
        // Create new particle
        const particle = new WaterParticle(x, y, vx, vy);
        particle.lifetime = this.particleLifetime; // Use current lifetime setting
        this.particles.push(particle);
        
        // Update emission time
        this.lastEmissionTime = Date.now();
    }
    
    update() {
        // Update all particles
        this.particles.forEach(particle => particle.update());
        
        // Remove expired particles
        this.particles = this.particles.filter(p => !p.isExpired());
    }
    
    render(ctx) {
        if (this.particles.length === 0) return;
        
        // Group nearby particles
        const groups = this.groupParticles();
        
        // Render each group as a blob
        groups.forEach(group => this.renderWaterBlob(ctx, group));
    }
    
    groupParticles() {
        const groups = [];
        const processed = new Set();
        
        // For each particle, find all neighbors within proximity
        for (let i = 0; i < this.particles.length; i++) {
            if (processed.has(i)) continue;
            
            const group = [this.particles[i]];
            processed.add(i);
            
            // Find all connected particles
            this.findConnectedParticles(i, processed, group);
            
            groups.push(group);
        }
        
        return groups;
    }
    
    findConnectedParticles(index, processed, group) {
        const particle = this.particles[index];
        const proximity = 20; // Maximum distance to consider particles connected
        
        for (let i = 0; i < this.particles.length; i++) {
            if (processed.has(i)) continue;
            
            const other = this.particles[i];
            const dx = particle.x - other.x;
            const dy = particle.y - other.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < proximity) {
                group.push(other);
                processed.add(i);
                this.findConnectedParticles(i, processed, group);
            }
        }
    }
    
    renderWaterBlob(ctx, particles) {
        if (particles.length === 0) return;
        
        // Start with base points from particles
        let points = particles.map(p => ({ x: p.x, y: p.y }));
        
        // For single particles, create a small circle shape
        if (points.length === 1) {
            const p = points[0];
            const radius = 5;
            points = [];
            
            // Create a small puddle with 6 points
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                points.push({
                    x: p.x + Math.cos(angle) * radius,
                    y: p.y + Math.sin(angle) * radius
                });
            }
        } else {
            // For blobs with multiple particles, compute convex hull
            points = this.computeConvexHull(points);
            
            // Expand slightly and add wobble
            points = this.expandAndWobble(points);
        }
        
        // Calculate alpha based on the oldest particle's remaining lifetime
        const oldestParticle = particles.reduce(
            (oldest, current) => 
                current.creationTime < oldest.creationTime ? current : oldest, 
            particles[0]
        );
        
        const alpha = oldestParticle.getRemainingLifetimePercent();
        
        // Draw the water blob
        ctx.save();
        ctx.fillStyle = `rgba(90, 155, 213, ${alpha * 0.7})`;
        ctx.beginPath();
        
        if (points.length > 0) {
            ctx.moveTo(points[0].x, points[0].y);
            
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            
            ctx.closePath();
            ctx.fill();
            
            // Add highlight
            ctx.fillStyle = `rgba(164, 194, 244, ${alpha * 0.3})`;
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    // Compute convex hull using Graham scan
    computeConvexHull(points) {
        if (points.length <= 3) return points;
        
        // Find point with lowest y-coordinate
        let lowestPoint = points[0];
        for (let i = 1; i < points.length; i++) {
            if (points[i].y < lowestPoint.y || 
                (points[i].y === lowestPoint.y && points[i].x < lowestPoint.x)) {
                lowestPoint = points[i];
            }
        }
        
        // Sort points by polar angle
        const sortedPoints = [...points].sort((a, b) => {
            const angleA = Math.atan2(a.y - lowestPoint.y, a.x - lowestPoint.x);
            const angleB = Math.atan2(b.y - lowestPoint.y, b.x - lowestPoint.x);
            return angleA - angleB;
        });
        
        // Build convex hull
        const hull = [sortedPoints[0], sortedPoints[1]];
        
        for (let i = 2; i < sortedPoints.length; i++) {
            while (hull.length > 1 && this.cross(
                hull[hull.length - 2], 
                hull[hull.length - 1], 
                sortedPoints[i]
            ) <= 0) {
                hull.pop();
            }
            hull.push(sortedPoints[i]);
        }
        
        return hull;
    }
    
    // Cross product to determine if we make a left turn
    cross(o, a, b) {
        return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
    
    // Expand the shape outward and add wobble effects
    expandAndWobble(points) {
        if (points.length <= 2) return points;
        
        // Find center of shape
        let centerX = 0, centerY = 0;
        points.forEach(p => {
            centerX += p.x;
            centerY += p.y;
        });
        centerX /= points.length;
        centerY /= points.length;
        
        // Add time-based wobble factor
        const wobbleFactor = Math.sin(Date.now() / 200) * 0.2 + 1.0;
        
        // Expand points outward from center with wobble
        return points.map((p, i) => {
            // Direction from center to point
            const dx = p.x - centerX;
            const dy = p.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance === 0) return p;
            
            // Normalize direction
            const nx = dx / distance;
            const ny = dy / distance;
            
            // Individual point wobble - varies by position and time
            const individualWobble = Math.sin((Date.now() / 300) + i * 0.7) * 2 + 1.0;
            
            // Expansion factor - base expansion (2) plus wobble
            const expansionFactor = 2 + wobbleFactor * individualWobble;
            
            // Return expanded point
            return {
                x: p.x + nx * expansionFactor,
                y: p.y + ny * expansionFactor
            };
        });
    }
    
    increaseMaxParticles() {
        this.maxParticles += 1;
    }
    
    increaseLifetime() {
        this.particleLifetime += 500; // Add 500ms
    }
}