export class Carousel {
	current = $state(0);
	total = $state(0);
	visible = $state(1);

	constructor(total: number, visible: number = 1) {
		this.total = total;
		this.visible = visible;
	}

	get max() {
		return Math.max(0, this.total - this.visible);
	}

	get progress() {
		if (this.max === 0) return 0;
		return (this.current / this.max) * 100;
	}

	next = () => {
		if (this.current < this.max) {
			this.current++;
		} else {
			this.current = 0;
		}
	};

	prev = () => {
		if (this.current > 0) {
			this.current--;
		} else {
			this.current = this.max;
		}
	};

	goTo = (index: number) => {
		this.current = Math.min(Math.max(0, index), this.max);
	};
}
