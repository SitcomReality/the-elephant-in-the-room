// UI rendering utilities

export function renderSpeechBubble(ctx, x, y, radius, text) {
    // Measure the text to calculate bubble size
    ctx.font = '12px Arial';
    
    // Split the text into words and find optimal line breaks
    const words = text.split(' ');
    const bubblePadding = 10;
    const maxBubbleWidth = 150; // Maximum width before wrapping
    const maxLineWidth = maxBubbleWidth - 2 * bubblePadding;
    const arrowSize = 10;
    const lineHeight = 16;
    
    let lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxLineWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    
    // Calculate bubble dimensions based on text
    const bubbleWidth = Math.min(maxBubbleWidth, Math.max(...lines.map(line => ctx.measureText(line).width)) + 2 * bubblePadding);
    const bubbleHeight = lines.length * lineHeight + 2 * bubblePadding;
    
    // Get canvas dimensions
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    
    // Position bubble above human, ensuring it stays within canvas
    let bubbleX = x - bubbleWidth / 2;
    let bubbleY = y - radius - bubbleHeight - arrowSize - 5;
    
    // Ensure bubble stays within canvas bounds
    bubbleX = Math.max(5, Math.min(canvasWidth - bubbleWidth - 5, bubbleX));
    bubbleY = Math.max(5, bubbleY);
    
    // Adjust arrow position if bubble had to be repositioned
    const arrowX = x;
    const arrowBaseX = Math.max(bubbleX + arrowSize, Math.min(bubbleX + bubbleWidth - arrowSize, arrowX));
    
    // Draw bubble background
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    
    // Bubble rectangle
    ctx.beginPath();
    ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 8);
    ctx.fill();
    ctx.stroke();
    
    // Bubble arrow
    ctx.beginPath();
    if (bubbleY + bubbleHeight < y - radius - 5) {
        // Normal arrow pointing down
        ctx.moveTo(arrowX, y - radius - 5);
        ctx.lineTo(arrowBaseX - arrowSize, bubbleY + bubbleHeight);
        ctx.lineTo(arrowBaseX + arrowSize, bubbleY + bubbleHeight);
    } else {
        // If bubble is at top of screen, draw arrow on the side
        const arrowY = y;
        const sideX = (x < canvasWidth / 2) ? bubbleX + bubbleWidth : bubbleX;
        const arrowDir = (x < canvasWidth / 2) ? 1 : -1;
        
        ctx.moveTo(sideX, arrowY);
        ctx.lineTo(sideX - arrowDir * arrowSize, arrowY - arrowSize);
        ctx.lineTo(sideX - arrowDir * arrowSize, arrowY + arrowSize);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    lines.forEach((line, index) => {
        ctx.fillText(line, bubbleX + bubblePadding, bubbleY + bubblePadding + index * lineHeight);
    });
}

export function renderScoreMultiplier(ctx, multiplier, maxMultiplier, x, y, recentlyIncreased) {
    // If no multiplier, nothing to render
    if (multiplier <= 0) return;
    
    // Calculate color based on multiplier value
    const alpha = multiplier / maxMultiplier;
    const baseColor = recentlyIncreased ? "#FFCC00" : "#FFFFFF"; // Gold when increased, white otherwise
    
    // Set default font
    const fontSize = Math.min(24 + (multiplier * 2), 40); // Grow font with multiplier, max at 40px
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    
    // Create gradient 
    const textGradient = ctx.createLinearGradient(x, y, x, y + fontSize);
    textGradient.addColorStop(0, baseColor);
    textGradient.addColorStop(1, `rgba(150, 150, 150, ${alpha})`);
    
    // Text shadow for emphasis
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    // Scale effect for recently increased multipliers
    let scale = 1;
    if (recentlyIncreased) {
        scale = 1.2; // Bulge effect
    }
    
    // Apply scale transformation
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    
    // Draw text with gradient
    ctx.fillStyle = textGradient;
    const text = `×${multiplier.toFixed(1)}`;
    ctx.fillText(text, 0, 0);
    
    // Restore context
    ctx.restore();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}