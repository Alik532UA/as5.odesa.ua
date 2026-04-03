class SEOService {
	title = $state("Одеська школа мистецтв №5");
	description = $state("Одеська школа мистецтв №5 — фортепіано, вокал, інструментальні ансамблі. Класична музична освіта для дітей та молоді в Одесі.");
	ogImage = $state("/ods-as5-logo-full_AlphaChannel.png");

	update(config: { title?: string; description?: string; ogImage?: string }) {
		if (config.title) {
			this.title = `${config.title} | ОШМ №5`;
		} else {
			this.title = "Одеська школа мистецтв №5";
		}

		if (config.description) {
			this.description = config.description;
		}

		if (config.ogImage) {
			this.ogImage = config.ogImage;
		}
	}
}

export const seo = new SEOService();
