// Collision detection utilities

export function circleRectangleCollision(circleX, circleY, circleRadius, rectX, rectY, rectWidth, rectHeight, rectAngle = 0) {
    // For rotated rectangles, use corner-based detection
    if (rectAngle !== 0) {
        // Get the corners of the rotated rectangle
        const centerRectX = rectX + rectWidth / 2;
        const centerRectY = rectY + rectHeight / 2;
        
        const corners = [
            // Top-left
            {
                x: centerRectX + (-rectWidth/2 * Math.cos(rectAngle) - -rectHeight/2 * Math.sin(rectAngle)),
                y: centerRectY + (-rectWidth/2 * Math.sin(rectAngle) + -rectHeight/2 * Math.cos(rectAngle))
            },
            // Top-right
            {
                x: centerRectX + (rectWidth/2 * Math.cos(rectAngle) - -rectHeight/2 * Math.sin(rectAngle)),
                y: centerRectY + (rectWidth/2 * Math.sin(rectAngle) + -rectHeight/2 * Math.cos(rectAngle))
            },
            // Bottom-right
            {
                x: centerRectX + (rectWidth/2 * Math.cos(rectAngle) - rectHeight/2 * Math.sin(rectAngle)),
                y: centerRectY + (rectWidth/2 * Math.sin(rectAngle) + rectHeight/2 * Math.cos(rectAngle))
            },
            // Bottom-left
            {
                x: centerRectX + (-rectWidth/2 * Math.cos(rectAngle) - rectHeight/2 * Math.sin(rectAngle)),
                y: centerRectY + (-rectWidth/2 * Math.sin(rectAngle) + rectHeight/2 * Math.cos(rectAngle))
            }
        ];
        
        // Check if circle is inside the polygon using ray casting
        let inside = false;
        
        // First, check if the circle center is inside the polygon
        for (let i = 0, j = corners.length - 1; i < corners.length; j = i++) {
            if (((corners[i].y > circleY) !== (corners[j].y > circleY)) &&
                (circleX < (corners[j].x - corners[i].x) * (circleY - corners[i].y) / (corners[j].y - corners[i].y) + corners[i].x)) {
                inside = !inside;
            }
        }
        
        // If inside, collision is true
        if (inside) return true;
        
        // If not inside, check distance to each edge
        for (let i = 0; i < corners.length; i++) {
            const j = (i + 1) % corners.length;
            const dist = pointToLineDistance(circleX, circleY, corners[i].x, corners[i].y, corners[j].x, corners[j].y);
            if (dist < circleRadius) {
                return true;
            }
        }
        
        return false;
    } else {
        // Use existing collision for non-rotated rectangles
        const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
        const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));
        
        const distanceX = circleX - closestX;
        const distanceY = circleY - closestY;
        const distanceSquared = distanceX * distanceX + distanceY * distanceY;
        
        return distanceSquared < (circleRadius * circleRadius);
    }
}

// Helper function for point-to-line distance
function pointToLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    
    if (len_sq !== 0) {
        param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
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

export function calculateVisionRay(startX, startY, angle, maxDistance, roomObjects) {
    const endX = startX + Math.cos(angle) * maxDistance;
    const endY = startY + Math.sin(angle) * maxDistance;
    
    let closestIntersection = { x: endX, y: endY, t: 1 };
    
    // Check each object for intersection
    for (const obj of roomObjects) {
        // If object is rotated, check against each edge of the rotated rectangle
        if (obj.angle !== 0) {
            const corners = obj.getCorners();
            
            // Check all four sides of the rotated object
            for (let i = 0; i < 4; i++) {
                const nextIndex = (i + 1) % 4;
                const intersection = rayLineIntersection(
                    startX, startY, endX, endY,
                    corners[i].x, corners[i].y, 
                    corners[nextIndex].x, corners[nextIndex].y
                );
                
                if (intersection && intersection.t < closestIntersection.t && intersection.t > 0) {
                    closestIntersection = intersection;
                }
            }
        } else {
            // Original code for non-rotated objects
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