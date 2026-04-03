import { CanvasEngine } from "./CanvasEngine";

interface FloatingShape {
	x: number;
	y: number;
	size: number;
	rotation: number;
	rotationSpeed: number;
	vx: number;
	vy: number;
	pathIndex: number;
	alpha: number;
}

const MUSIC_LUCIDE_PATHS = [
	"M18.5 8c-1.4 0-2.6-.8-3.2-2A6.87 6.87 0 0 0 2 9v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-8.5C22 9.6 20.4 8 18.5 8M2 14h20M6 14v4M10 14v4M14 14v4M18 14v4",
	"m11.9 12.1 4.514-4.514M20.1 2.3a1 1 0 0 0-1.4 0l-1.114 1.114A2 2 0 0 0 17 4.828v1.344a2 2 0 0 1-.586 1.414A2 2 0 0 1 17.828 7h1.344a2 2 0 0 0 1.414-.586L21.7 5.3a1 1 0 0 0 0-1.4zM6 16l2 2M8.23 9.85A3 3 0 0 1 11 8a5 5 0 0 1 5 5 3 3 0 0 1-1.85 2.77l-.92.38A2 2 0 0 0 12 18a4 4 0 0 1-4 4 6 6 0 0 1-6-6 4 4 0 0 1 4-4 2 2 0 0 0 1.85-1.23z",
	"M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z",
	"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 10v2a7 7 0 0 1-14 0v-2 M12 19v4 M8 22h8",
	"M12 18a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM12 18V2l7 4"
];

const pathCache = new Map<number, Path2D>();

function getPath2D(index: number): Path2D {
	if (!pathCache.has(index)) {
		pathCache.set(index, new Path2D(MUSIC_LUCIDE_PATHS[index]));
	}
	return pathCache.get(index)!;
}

export class FloatingShapesEngine extends CanvasEngine {
	private shapes: FloatingShape[] = [];

	protected init() {
		const count = 15;
		this.shapes = [];
		for (let i = 0; i < count; i++) {
			this.shapes.push({
				x: Math.random() * this.width,
				y: Math.random() * this.height,
				size: 45 + Math.random() * 55,
				rotation: Math.random() * Math.PI * 2,
				rotationSpeed: (Math.random() - 0.5) * 0.012,
				vx: (Math.random() - 0.5) * 0.7,
				vy: (Math.random() - 0.5) * 0.7,
				pathIndex: Math.floor(Math.random() * MUSIC_LUCIDE_PATHS.length),
				alpha: 0.25 + Math.random() * 0.2,
			});
		}
	}

	protected draw() {
		if (!this.ctx) return;
		const colors = this.getColors();
		const time = Date.now() * 0.001;
		const scrollRotation = this.scrollY * 0.0005;

		this.ctx.clearRect(0, 0, this.width, this.height);

		this.shapes.forEach((shape) => {
			shape.x += shape.vx;
			shape.y += shape.vy;
			shape.rotation += shape.rotationSpeed;

			if (shape.x < -shape.size) shape.x = this.width + shape.size;
			if (shape.x > this.width + shape.size) shape.x = -shape.size;
			if (shape.y < -shape.size) shape.y = this.height + shape.size;
			if (shape.y > this.height + shape.size) shape.y = -shape.size;

			const pulse = Math.sin(time * 0.8 + shape.rotation) * 0.2 + 0.8;
			const currentAlpha = shape.alpha * pulse;

			this.ctx!.save();
			this.ctx!.translate(shape.x, shape.y);
			this.ctx!.rotate(shape.rotation + scrollRotation);

			this.ctx!.shadowBlur = 20;
			this.ctx!.shadowColor = colors.primary + (currentAlpha * 0.8) + ")";
			this.ctx!.fillStyle = colors.primary + (currentAlpha * 0.12) + ")";
			this.ctx!.strokeStyle = colors.primary + currentAlpha + ")";
			this.ctx!.lineWidth = 1.8;
			this.ctx!.lineJoin = "round";
			this.ctx!.lineCap = "round";

			const scale = shape.size / 24;
			this.ctx!.scale(scale, scale);
			this.ctx!.translate(-12, -12);
			const path = getPath2D(shape.pathIndex);
			this.ctx!.fill(path);
			this.ctx!.stroke(path);

			this.ctx!.restore();
		});
	}
}
