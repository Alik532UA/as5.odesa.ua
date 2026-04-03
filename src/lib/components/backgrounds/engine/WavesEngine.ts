import { CanvasEngine } from "./CanvasEngine";

export class WavesEngine extends CanvasEngine {
	private waveTime = 0;
	private waveBaseHeight = 0.9;
	private waveScrollSpeed = 0.25;

	protected init() {
		// No specific init needed for waves
	}

	protected draw() {
		if (!this.ctx) return;
		const colors = this.getColors();
		this.waveTime += 0.005;
		const scrollInfluence = this.scrollY * 0.002;

		this.ctx.clearRect(0, 0, this.width, this.height);

		for (let layer = 0; layer < 3; layer++) {
			this.ctx.beginPath();
			this.ctx.moveTo(0, this.height);

			for (let x = 0; x <= this.width; x += 5) {
				const wave1 =
					Math.sin(x * 0.003 + this.waveTime + layer + scrollInfluence) * 50;
				const wave2 =
					Math.sin(x * 0.005 - this.waveTime * 0.7 + layer * 2) * 30;
				const wave3 =
					Math.cos(x * 0.002 + this.waveTime * 0.5 + scrollInfluence) * 40;

				const y =
					this.height * this.waveBaseHeight +
					wave1 +
					wave2 +
					wave3 +
					layer * 60 -
					this.scrollY * this.waveScrollSpeed;
				this.ctx.lineTo(x, y);
			}

			this.ctx.lineTo(this.width, this.height);
			this.ctx.closePath();

			const gradient = this.ctx.createLinearGradient(
				0,
				this.height * this.waveBaseHeight,
				0,
				this.height,
			);
			const alpha = 0.2 - layer * 0.05;
			gradient.addColorStop(0, colors.primary + alpha + ")");
			gradient.addColorStop(1, colors.secondary + "0)");
			this.ctx.fillStyle = gradient;
			this.ctx.fill();
		}
	}
}
