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

export function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh, angle = 0) {
    if (angle === 0) {
        // Check if line intersects with any of the four sides of the rectangle
        return (
            lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||          // Top
            lineIntersectsLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) || // Bottom
            lineIntersectsLine(x1, y1, x2, y2, rx, ry, rx, ry + rh) ||          // Left
            lineIntersectsLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh)   // Right
        );
    } else {
        // For rotated rectangles, get the four corners and check if line intersects any side
        const centerX = rx + rw/2;
        const centerY = ry + rh/2;
        const corners = [
            rotatePoint(rx, ry, centerX, centerY, angle),
            rotatePoint(rx + rw, ry, centerX, centerY, angle),
            rotatePoint(rx + rw, ry + rh, centerX, centerY, angle),
            rotatePoint(rx, ry + rh, centerX, centerY, angle)
        ];
        
        // Check each side of the rotated rectangle
        return (
            lineIntersectsLine(x1, y1, x2, y2, corners[0].x, corners[0].y, corners[1].x, corners[1].y) ||
            lineIntersectsLine(x1, y1, x2, y2, corners[1].x, corners[1].y, corners[2].x, corners[2].y) ||
            lineIntersectsLine(x1, y1, x2, y2, corners[2].x, corners[2].y, corners[3].x, corners[3].y) ||
            lineIntersectsLine(x1, y1, x2, y2, corners[3].x, corners[3].y, corners[0].x, corners[0].y)
        );
    }
}

// Helper function to rotate a point around a center
function rotatePoint(x, y, centerX, centerY, angle) {
    const translatedX = x - centerX;
    const translatedY = y - centerY;
    
    const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle);
    const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle);
    
    return {
        x: rotatedX + centerX,
        y: rotatedY + centerY
    };
}

export function lineIntersectsLine(x1, y1, x2, y2, x3, y3, x4, y4) {
    // Calculate the direction of the lines
    const uA = ((x4-x3)*(y1-y3) - (y4-y3)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    const uB = ((x2-x1)*(y1-y3) - (y2-y1)*(x1-x3)) / ((y4-y3)*(x2-x1) - (x4-x3)*(y2-y1));
    
    // If uA and uB are between 0-1, lines are colliding
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

export function calculateVisionRay(startX, startY, angle, maxDistance, roomObjects) {
    const endX = startX + Math.cos(angle) * maxDistance;
    const endY = startY + Math.sin(angle) * maxDistance;
    
    let closestIntersection = { x: endX, y: endY, t: 1 };
    
    // Check each object for intersection
    for (const obj of roomObjects) {
        // Check all four sides of the object
        const sides = [
            { x1: obj.x, y1: obj.y, x2: obj.x + obj.width, y2: obj.y }, // Top
            { x1: obj.x, y1: obj.y + obj.height, x2: obj.x + obj.width, y2: obj.y + obj.height }, // Bottom
            { x1: obj.x, y1: obj.y, x2: obj.x, y2: obj.y + obj.height }, // Left
            { x1: obj.x + obj.width, y1: obj.y, x2: obj.x + obj.width, y2: obj.y + obj.height }  // Right
        ];
        
        for (const side of sides) {
            const intersection = rayLineIntersection(
                startX, startY, endX, endY,
                side.x1, side.y1, side.x2, side.y2
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