import { CanvasEngine } from "./CanvasEngine";

interface Particle {
	x: number;
	y: number;
	baseY: number;
	vx: number;
	vy: number;
	size: number;
	pulseOffset: number;
}

export class ParticlesEngine extends CanvasEngine {
	private particles: Particle[] = [];
	private currentScrollOffset = 0;
	private targetScrollOffset = 0;

	protected init() {
		this.particles = [];
		const count = Math.min(80, Math.floor((this.width * this.height) / 15000));
		for (let i = 0; i < count; i++) {
			const y = Math.random() * this.height;
			this.particles.push({
				x: Math.random() * this.width,
				y: y,
				baseY: y,
				vx: (Math.random() - 0.5) * 0.4,
				vy: (Math.random() - 0.5) * 0.4,
				size: Math.random() * 2 + 1.5,
				pulseOffset: Math.random() * Math.PI * 2,
			});
		}
	}

	protected draw() {
		if (!this.ctx) return;
		const colors = this.getColors();
		const time = Date.now() * 0.001;

		this.currentScrollOffset += (this.scrollY - this.currentScrollOffset) * 0.08;

		this.ctx.clearRect(0, 0, this.width, this.height);

		this.particles.forEach((p) => {
			p.x += p.vx;
			p.baseY += p.vy;

			if (p.x < 0) p.x = this.width;
			if (p.x > this.width) p.x = 0;
			if (p.baseY < 0) p.baseY = this.height;
			if (p.baseY > this.height) p.baseY = 0;

			p.y = p.baseY - this.currentScrollOffset * 0.15;

			if (p.y < -50) p.y += this.height + 100;
			if (p.y > this.height + 50) p.y -= this.height + 100;

			const pulse = Math.sin(time * 1.2 + p.pulseOffset) * 0.3;
			const alpha = (0.4 + pulse * 0.2) * 0.5;
			const dynamicSize = p.size * (1 + pulse * 0.15);

			const gradient = this.ctx!.createRadialGradient(
				p.x,
				p.y,
				0,
				p.x,
				p.y,
				dynamicSize * 4,
			);
			gradient.addColorStop(0, colors.primary + Math.min(0.6, alpha) + ")");
			gradient.addColorStop(0.4, colors.primary + alpha * 0.3 + ")");
			gradient.addColorStop(1, colors.primary + "0)");

			this.ctx!.beginPath();
			this.ctx!.arc(p.x, p.y, dynamicSize * 4, 0, Math.PI * 2);
			this.ctx!.fillStyle = gradient;
			this.ctx!.fill();

			this.ctx!.beginPath();
			this.ctx!.arc(p.x, p.y, dynamicSize, 0, Math.PI * 2);
			this.ctx!.fillStyle = colors.primary + Math.min(0.8, alpha + 0.3) + ")";
			this.ctx!.fill();
		});
	}
}
