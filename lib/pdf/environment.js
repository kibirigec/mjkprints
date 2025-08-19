import { Canvas, Image, DOMMatrix, DOMPoint, ImageData } from 'canvas';

// Simple Path2D polyfill for PDF.js compatibility in Node.js
class Path2D {
  constructor(path) { this.path = path || ''; }
  addPath(path) { if (path && path.path) { this.path += path.path; } }
  closePath() { this.path += 'Z'; }
  moveTo(x, y) { this.path += `M${x},${y}`; }
  lineTo(x, y) { this.path += `L${x},${y}`; }
  bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) { this.path += `C${cp1x},${cp1y} ${cp2x},${cp2y} ${x},${y}`; }
  quadraticCurveTo(cpx, cpy, x, y) { this.path += `Q${cpx},${cpy} ${x},${y}`; }
  arc(x, y, radius, startAngle, endAngle, anticlockwise) { this.path += `A${radius},${radius} 0 0,${anticlockwise ? 1 : 0} ${x + Math.cos(endAngle) * radius},${y + Math.sin(endAngle) * radius}`; }
  ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle, anticlockwise) { this.path += `A${radiusX},${radiusY} ${rotation} 0,${anticlockwise ? 1 : 0} ${x + Math.cos(endAngle) * radiusX},${y + Math.sin(endAngle) * radiusY}`; }
}

export function setupNodeCanvas() {
  try {
    if (typeof global !== 'undefined' && !global.Canvas) {
      global.Canvas = Canvas;
      global.Image = Image;
      global.DOMMatrix = DOMMatrix;
      global.DOMPoint = DOMPoint;
      global.ImageData = ImageData;
      global.Path2D = Path2D;
      global.createCanvas = (width, height) => new Canvas(width, height);
      global.loadImage = Image.loadImage || Image.from;
    }
  } catch (error) {
    console.error('[PDF-ENV] Failed to set up Node Canvas globals:', error);
    throw new Error('Failed to set up Node Canvas environment.');
  }
}

export class NodeCanvasFactory {
  create(width, height) {
    const canvas = new Canvas(Math.ceil(width), Math.ceil(height));
    const context = canvas.getContext('2d');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    this._patchCanvasContext(context);
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = Math.ceil(width);
    canvasAndContext.canvas.height = Math.ceil(height);
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }

  _patchCanvasContext(context) {
    if (context.clip && !context.clip.rect) {
      const originalClip = context.clip.bind(context);
      context.clip = (pathOrFillRule, fillRule) => originalClip(pathOrFillRule, fillRule);
      context.clip.rect = (x, y, width, height) => {
        context.beginPath();
        context.rect(x, y, width, height);
        context.clip();
      };
    }
    if (!context.createImageData) {
      context.createImageData = function(width, height) {
        return typeof ImageData !== 'undefined' ? new ImageData(width, height) : { data: new Uint8ClampedArray(width * height * 4), width, height };
      };
    }
    return context;
  }
}
