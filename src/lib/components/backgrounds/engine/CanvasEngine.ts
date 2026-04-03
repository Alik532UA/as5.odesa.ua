import { browser } from "$app/environment";

export abstract class CanvasEngine {
	protected canvas: HTMLCanvasElement | null = null;
	protected ctx: CanvasRenderingContext2D | null = null;
	protected width = 0;
	protected height = 0;
	protected scrollY = 0;
	protected theme: "light" | "dark" = "light";
	protected color: string = "#0071e3";

	private animationId: number = 0;
	private lastWidth = 0;

	constructor(initialTheme: "light" | "dark", initialColor: string = "#0071e3") {
		this.theme = initialTheme;
		this.color = initialColor;
	}

	public mount(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.ctx = canvas.getContext("2d");

		if (browser) {
			this.width = this.canvas.clientWidth;
			this.height = this.canvas.clientHeight;
			this.canvas.width = this.width;
			this.canvas.height = this.height;
			this.lastWidth = this.width;

			this.init();
			this.startLoop();

			window.addEventListener("resize", this.handleResizeBound);
			window.addEventListener("scroll", this.handleScrollBound);
		}
	}

	public unmount() {
		this.stopLoop();
		if (browser) {
			window.removeEventListener("resize", this.handleResizeBound);
			window.removeEventListener("scroll", this.handleScrollBound);
		}
		this.canvas = null;
		this.ctx = null;
	}

	public setTheme(theme: "light" | "dark", color?: string) {
		this.theme = theme;
		if (color) {
			this.color = color;
		}
	}

	private startLoop() {
		const loop = () => {
			if (!this.canvas || !this.ctx) return;
			this.draw();
			this.animationId = requestAnimationFrame(loop);
		};
		loop();
	}

	private stopLoop() {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = 0;
		}
	}

	private handleResizeBound = () => this.handleResize();
	private handleScrollBound = () => this.handleScroll();

	private handleResize() {
		if (!this.canvas) return;

		const newWidth = this.canvas.clientWidth;

		if (newWidth === this.lastWidth) return;

		this.lastWidth = newWidth;
		this.width = newWidth;
		this.height = this.canvas.clientHeight;

		this.canvas.width = this.width;
		this.canvas.height = this.height;

		this.init();
	}

	private handleScroll() {
		if (browser) {
			this.scrollY = window.scrollY;
		}
	}

	protected abstract init(): void;
	protected abstract draw(): void;

	protected hexToRgb(hex: string): string {
		if (!hex) return "0, 113, 227";
		let r = 0,
			g = 0,
			b = 0;
		try {
			if (hex.length === 4) {
				r = parseInt(hex[1] + hex[1], 16);
				g = parseInt(hex[2] + hex[2], 16);
				b = parseInt(hex[3] + hex[3], 16);
			} else if (hex.length === 7) {
				r = parseInt(hex.substring(1, 3), 16);
				g = parseInt(hex.substring(3, 5), 16);
				b = parseInt(hex.substring(5, 7), 16);
			}
		} catch (e) {
			return "0, 113, 227";
		}
		return `${r}, ${g}, ${b}`;
	}

	protected getColors() {
		const rgb = this.hexToRgb(this.color);
		const primary = `rgba(${rgb}, `;

		return {
			primary: primary,
			secondary: primary,
		};
	}
}
