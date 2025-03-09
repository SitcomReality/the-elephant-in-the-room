// Collision detection utilities

export function circleRectangleCollision(circleX, circleY, circleRadius, rectX, rectY, rectWidth, rectHeight, rectAngle = 0) {
    if (rectAngle === 0) {
        // Use existing collision for non-rotated rectangles
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        
        const distanceX = circleX - closestX;
        const distanceY = circleY - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared < (circleRadius * circleRadius);
    } else {
        // For rotated rectangles, transform the circle into the rectangle's local space
        const centerRectX = rectX + rectWidth / 2;
        const centerRectY = rectY + rectHeight / 2;
        
        // Translate circle to rectangle's local coordinates
        const translatedX = circleX - centerRectX;
        const translatedY = circleY - centerRectY;
        
        // Rotate circle to align with rectangle
        const rotatedX = translatedX * Math.cos(-rectAngle) - translatedY * Math.sin(-rectAngle);
        const rotatedY = translatedX * Math.sin(-rectAngle) + translatedY * Math.cos(-rectAngle);
        
        // Add back the offset to get the rotated position
        const localCircleX = rotatedX + centerRectX;
        const localCircleY = rotatedY + centerRectY;
        
        // Now use the regular AABB-circle collision
        return circleRectangleCollision(
            localCircleX, localCircleY, circleRadius,
            rectX, rectY, rectWidth, rectHeight, 0
        );
    }
}

export function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
    // Check if line intersects with any of the four sides of the rectangle
    return (
        lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||          // Top
        lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) || // Bottom
        lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx, ry + rh) ||          // Left
        lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)   // Right
    );
}

export function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the direction of the lines
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    // If uA and uB are between 0-1, lines are colliding
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

export function lineIntersectsRotatedRect(x1, y1, x2, y2, rect) {
    // Get the corners of the rotated rectangle
    const corners = rect.getCorners();
    
    // Check if line intersects with any of the four sides of the rotated rectangle
    for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (lineIntersectsLine(
            x1, y1, x2, y2,
            corners[i].x, corners[i].y, corners[j].x, corners[j].y
        )) {
            return true;
        }
    }
    
    return false;
}

export function calculateVisionRay(startX, startY, angle, maxDistance, roomObjects) {
    const endX = startX + Math.cos(angle) * maxDistance;
    const endY = startY + Math.sin(angle) * maxDistance;
    
    let closestIntersection = { x: endX, y: endY, t: 1 };
    
    // Check each object for intersection
    for (const obj of roomObjects) {
        // Get the corners of the rotated rectangle
        const corners = obj.getCorners();
        
        // Check all four sides of the rotated object
        for (let i = 0; i < 4; i++) {
            const j = (i + 1) % 4;
            const intersection = rayLineIntersection(
                startX, startY, endX, endY,
                corners[i].x, corners[i].y, corners[j].x, corners[j].y
            );
            
            if (intersection && intersection.t < closestIntersection.t && intersection.t > 0) {
                closestIntersection = intersection;
            }
        }
    }
    
    return closestIntersection;
}

export function rayLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the denominator
    const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    
    // If den is 0, lines are parallel
    if (den === 0) {
        return null;
    }
    
    // Calculate the numerators
    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den;
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den;
    
    // If uA and uB are between 0-1, lines intersect
    if (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1) {
        const intersectionX = x1 + uA * (x2 - x1);
        const intersectionY = y1 + uA * (y2 - y1);
        
        return {
            x: intersectionX,
            y: intersectionY,
            t: uA // Parameter along the ray (0 to 1)
        };
    }
    
    return null;
}

export function updateFurniturePhysics(furniture, canvasWidth, canvasHeight) {
    furniture.forEach(obj => {
        // Update position
        obj.x += obj.vx;
        obj.y += obj.vy;
        
        // Update rotation - make rotation stiffer by reducing angular velocity more
        obj.angle += obj.angularVelocity * 0.7; // Apply a 30% reduction to make rotation stiffer
        
        // Apply friction - increased for better stickiness
        obj.vx *= 0.95;
        obj.vy *= 0.95;
        obj.angularVelocity *= 0.9; // More friction on rotation
        
        // Reset velocity if it's very small
        if (Math.abs(obj.vx) < 0.1) obj.vx = 0;
        if (Math.abs(obj.vy) < 0.1) obj.vy = 0;
        if (Math.abs(obj.angularVelocity) < 0.01) obj.angularVelocity = 0;
        
        // Bounce off walls
        if (obj.x < 0) {
            obj.x = 0;
            obj.vx = -obj.vx * 0.5;
        } else if (obj.x + obj.width > canvasWidth) {
            obj.x = canvasWidth - obj.width;
            obj.vx = -obj.vx * 0.5;
        }
        
        if (obj.y < 0) {
            obj.y = 0;
            obj.vy = -obj.vy * 0.5;
        } else if (obj.y + obj.height > canvasHeight) {
            obj.y = canvasHeight - obj.height;
            obj.vy = -obj.vy * 0.5;
        }
    });
    
    // Process furniture collisions
    handleFurnitureCollisions(furniture);
}

export function handleFurnitureCollisions(furniture) {
    // Check for collisions between all pairs of objects
    for (let i = 0; i < furniture.length; i++) {
        for (let j = i + 1; j < furniture.length; j++) {
            if (furniture[i].collidesWith(furniture[j])) {
                furniture[i].handleCollision(furniture[j]);
            }
        }
    }
}