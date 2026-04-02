export class CarouselController {
	currentIndex = $state(1);
	isTransitioning = $state(true);
	itemsCount = $state(0);
	
	constructor(itemsCount: number, initialIndex = 1) {
		this.itemsCount = itemsCount;
		this.currentIndex = initialIndex;
	}
	
	next = () => {
		if (!this.isTransitioning) return;
		this.currentIndex++;
		if (this.currentIndex >= this.itemsCount - 1) {
			setTimeout(() => {
				this.isTransitioning = false;
				this.currentIndex = 1;
				setTimeout(() => (this.isTransitioning = true), 50);
			}, 700);
		}
	}
	
	prev = () => {
		if (!this.isTransitioning) return;
		this.currentIndex--;
		if (this.currentIndex <= 0) {
			setTimeout(() => {
				this.isTransitioning = false;
				this.currentIndex = this.itemsCount - 2;
				setTimeout(() => (this.isTransitioning = true), 50);
			}, 700);
		}
	}
	
	goTo = (index: number) => {
		if (!this.isTransitioning) return;
		this.currentIndex = index + 1;
	}
}
