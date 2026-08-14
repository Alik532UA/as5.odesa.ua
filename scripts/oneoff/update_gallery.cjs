const fs = require('fs');

const path = 'src/routes/test/+page.svelte';
const content = fs.readFileSync(path, 'utf8');

const htmlParts = content.split('<!-- Gallery Section -->');
if (htmlParts.length < 2) {
    console.error("Could not find <!-- Gallery Section -->");
    process.exit(1);
}
const topHtml = htmlParts[0];

const cssParts = htmlParts[1].split('/* === Gallery Section Styles === */');
if (cssParts.length < 2) {
    console.error("Could not find /* === Gallery Section Styles === */");
    process.exit(1);
}
const newsCss = cssParts[0];

const newHtml = `<!-- Gallery Section -->
<section class="g-showcase" id="gallery-section">
	<div class="container">
		<h2 class="g-showcase__title">Галерея</h2>
		<p class="g-showcase__subtitle">Сучасні та стильні шаблони</p>

		<!-- 1. Modern Bento Grid -->
		<div class="g-block">
			<h3 class="g-block__title">1. Bento Grid (Адаптивна сітка)</h3>
			<div class="g-bento">
				{#each galleryImages as img, i}
					<div class="g-bento__item g-bento__item--{i}">
						<img src={img.src} alt={img.alt} />

					</div>
				{/each}
			</div>
		</div>

		<!-- 2. Flex Accordion -->
		<div class="g-block">
			<h3 class="g-block__title">2. Flex-Акордеон (Інтерактивний)</h3>
			<div class="g-accordion">
				{#each galleryImages.slice(0, 5) as img}
					<div class="g-accordion__item">
						<img src={img.src} alt={img.alt} />
						<div class="g-accordion__content">
							<span class="g-accordion__title">{img.title}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 3. Soft Cards Grid (News Style) -->
		<div class="g-block">
			<h3 class="g-block__title">3. Soft Cards (У стилі секції Новин)</h3>
			<div class="g-cards">
				{#each galleryImages as img}
					<div class="g-card">
						<div class="g-card__img-wrap">
							<img src={img.src} alt={img.alt} />
						</div>
						<div class="g-card__info">
							<span class="g-card__tag">Відділ</span>
							<h4 class="g-card__title">{img.title}</h4>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 4. Asymmetric Focus -->
		<div class="g-block">
			<h3 class="g-block__title">4. Асиметричний Фокус</h3>
			<div class="g-asym">
				{#each galleryImages.slice(0, 3) as img, i}
					<div class="g-asym__item g-asym__item--{i}">
						<img src={img.src} alt={img.alt} />
						<div class="g-asym__label">{img.title}</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 5. Horizontal Snap Scroll -->
		<div class="g-block">
			<h3 class="g-block__title">5. Свайп-карусель (Snap Scroll)</h3>
			<div class="g-scroll">
				{#each [...galleryImages, ...galleryImages] as img}
					<div class="g-scroll__item">
						<img src={img.src} alt={img.alt} />
						<div class="g-scroll__overlay">
							<span class="g-scroll__title">{img.title}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- 6. Featured Hero Stack -->
		<div class="g-block">
			<h3 class="g-block__title">6. Hero Stack (Акцентна Галерея)</h3>
			<div class="g-feat">
				<div class="g-feat__main">
					<img src={galleryImages[0].src} alt={galleryImages[0].alt} />
					<div class="g-feat__main-info">
						<span class="g-feat__tag">Популярне</span>
						<h2>{galleryImages[0].title}</h2>
					</div>
				</div>
				<div class="g-feat__side">
					{#each galleryImages.slice(1, 4) as img}
						<div class="g-feat__side-item">
							<img src={img.src} alt={img.alt} />
						</div>
					{/each}
				</div>
			</div>
		</div>

	</div>
</section>

`;

const newCss = `/* === Gallery Section Styles (Modern) === */
	.g-showcase {
		padding: 6rem 0;
		background-color: var(--color-light-blue);
		text-align: center;
	}

	.g-showcase__title {
		font-family: var(--font-heading);
		font-size: 3.5rem;
		font-weight: 900;
		color: var(--color-deep-ocean);
		margin-bottom: 1rem;
	}

	.g-showcase__subtitle {
		font-size: 1.2rem;
		color: var(--color-body-text);
		opacity: 0.7;
		margin-bottom: 4rem;
	}

	.g-block {
		margin-bottom: 8rem;
		text-align: left;
	}

	.g-block__title {
		font-family: var(--font-heading);
		font-size: 2.2rem;
		color: var(--color-deep-ocean);
		margin-bottom: 2.5rem;
		padding-left: 1.5rem;
		border-left: 6px solid var(--color-deep-ocean);
		border-radius: 3px;
	}

	/* 1. Bento Grid */
	.g-bento {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		grid-auto-rows: 240px;
		gap: 24px;
	}
	.g-bento__item {
		position: relative;
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 0 15px 35px rgba(0,0,0,0.05);
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
		cursor: pointer;
	}
	.g-bento__item:hover {
		transform: translateY(-8px);
		box-shadow: 0 30px 60px rgba(0,0,0,0.12);
		z-index: 2;
	}
	.g-bento__item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-bento__item:hover img {
		transform: scale(1.08);
	}
	.g-bento__item--0 { grid-column: span 2; grid-row: span 2; }
	.g-bento__item--1 { grid-column: span 2; grid-row: span 1; }
	.g-bento__item--2 { grid-column: span 1; grid-row: span 1; }
	.g-bento__item--3 { grid-column: span 1; grid-row: span 1; }
	.g-bento__item--4 { grid-column: span 2; grid-row: span 1; }
	.g-bento__item--5 { grid-column: span 2; grid-row: span 1; }

	/* 2. Flex Accordion */
	.g-accordion {
		display: flex;
		gap: 20px;
		height: 500px;
	}
	.g-accordion__item {
		flex: 1;
		position: relative;
		border-radius: 40px;
		overflow: hidden;
		transition: flex 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s;
		cursor: pointer;
		box-shadow: 0 15px 35px rgba(0,0,0,0.06);
	}
	.g-accordion__item:hover {
		flex: 3;
	}
	.g-accordion__item img {
		position: absolute;
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-accordion__item:hover img {
		transform: scale(1.05);
	}
	.g-accordion__content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 2.5rem;
		background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
		color: white;
		opacity: 0;
		transform: translateY(20px);
		transition: all 0.5s 0.1s ease;
	}
	.g-accordion__item:hover .g-accordion__content {
		opacity: 1;
		transform: translateY(0);
	}
	.g-accordion__title {
		font-family: var(--font-heading);
		font-size: 1.8rem;
		font-weight: 800;
		white-space: nowrap;
	}

	/* 3. Soft Cards Grid (News Style) */
	.g-cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 30px;
	}
	.g-card {
		background: white;
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
		border: 1px solid rgba(0, 0, 0, 0.03);
		transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
		cursor: pointer;
	}
	.g-card:hover {
		transform: translateY(-12px);
		box-shadow: 0 40px 80px rgba(0, 0, 0, 0.12);
	}
	.g-card__img-wrap {
		height: 260px;
		overflow: hidden;
		position: relative;
	}
	.g-card__img-wrap img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-card:hover .g-card__img-wrap img {
		transform: scale(1.08);
	}
	.g-card__info {
		padding: 2.5rem;
	}
	.g-card__tag {
		display: inline-block;
		background: var(--color-deep-ocean);
		color: white;
		padding: 0.5rem 1.5rem;
		border-radius: 100px;
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		margin-bottom: 1.2rem;
		letter-spacing: 0.05em;
	}
	.g-card__title {
		font-family: var(--font-heading);
		font-size: 1.6rem;
		font-weight: 800;
		color: var(--color-deep-ocean);
		margin: 0;
	}

	/* 4. Asymmetric Focus */
	.g-asym {
		display: flex;
		gap: 30px;
		align-items: center;
	}
	.g-asym__item {
		border-radius: 40px;
		overflow: hidden;
		box-shadow: 0 20px 40px rgba(0,0,0,0.08);
		position: relative;
		cursor: pointer;
	}
	.g-asym__item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-asym__item:hover img {
		transform: scale(1.08);
	}
	.g-asym__item--0 {
		flex: 5;
		height: 550px;
	}
	.g-asym__item--1 {
		flex: 3;
		height: 380px;
		margin-top: -120px;
	}
	.g-asym__item--2 {
		flex: 4;
		height: 450px;
		margin-top: 120px;
	}
	.g-asym__label {
		position: absolute;
		bottom: 30px;
		left: 30px;
		background: rgba(255,255,255,0.95);
		padding: 15px 30px;
		border-radius: 20px;
		font-family: var(--font-heading);
		font-weight: 800;
		font-size: 1.2rem;
		color: var(--color-deep-ocean);
		backdrop-filter: blur(10px);
		box-shadow: 0 10px 25px rgba(0,0,0,0.08);
	}

	/* 5. Horizontal Snap Scroll */
	.g-scroll {
		display: flex;
		gap: 30px;
		overflow-x: auto;
		padding: 1rem 0 4rem;
		scroll-snap-type: x mandatory;
		scrollbar-width: none; /* Firefox */
	}
	.g-scroll::-webkit-scrollbar {
		display: none; /* Safari and Chrome */
	}
	.g-scroll__item {
		flex: 0 0 420px;
		height: 520px;
		scroll-snap-align: center;
		border-radius: 40px;
		overflow: hidden;
		position: relative;
		box-shadow: 0 20px 40px rgba(0,0,0,0.08);
		cursor: grab;
	}
	.g-scroll__item:active {
		cursor: grabbing;
	}
	.g-scroll__item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-scroll__item:hover img {
		transform: scale(1.05);
	}
	.g-scroll__overlay {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,95,174,0.85), transparent 50%);
		display: flex;
		align-items: flex-end;
		padding: 3rem;
		opacity: 0;
		transition: opacity 0.4s ease;
	}
	.g-scroll__item:hover .g-scroll__overlay {
		opacity: 1;
	}
	.g-scroll__title {
		color: white;
		font-family: var(--font-heading);
		font-size: 1.6rem;
		font-weight: 800;
		transform: translateY(20px);
		transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-scroll__item:hover .g-scroll__title {
		transform: translateY(0);
	}

	/* 6. Featured Hero Stack */
	.g-feat {
		display: flex;
		gap: 30px;
		height: 600px;
	}
	.g-feat__main {
		flex: 2;
		border-radius: 40px;
		overflow: hidden;
		position: relative;
		box-shadow: 0 25px 50px rgba(0,0,0,0.12);
		cursor: pointer;
	}
	.g-feat__main img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-feat__main:hover img {
		transform: scale(1.05);
	}
	.g-feat__main-info {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		padding: 4rem;
		background: linear-gradient(to top, rgba(0,0,0,0.85), transparent);
		color: white;
	}
	.g-feat__tag {
		background: #FF6B6B;
		padding: 0.5rem 1.5rem;
		border-radius: 100px;
		font-weight: 800;
		text-transform: uppercase;
		font-size: 0.85rem;
		margin-bottom: 1.5rem;
		display: inline-block;
		letter-spacing: 0.05em;
	}
	.g-feat__main-info h2 {
		font-family: var(--font-heading);
		font-size: 3rem;
		margin: 0;
		font-weight: 900;
		text-shadow: 0 5px 20px rgba(0,0,0,0.3);
	}
	.g-feat__side {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.g-feat__side-item {
		flex: 1;
		border-radius: 30px;
		overflow: hidden;
		box-shadow: 0 15px 30px rgba(0,0,0,0.08);
		position: relative;
		cursor: pointer;
	}
	.g-feat__side-item img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.g-feat__side-item:hover img {
		transform: scale(1.1);
	}

	/* Responsive */
	@media (max-width: 1024px) {
		.g-bento { grid-template-columns: repeat(2, 1fr); }
		.g-bento__item--0 { grid-column: span 2; }
		.g-bento__item--1 { grid-column: span 2; }
		.g-bento__item--2, .g-bento__item--3 { grid-column: span 1; }
		.g-bento__item--4, .g-bento__item--5 { grid-column: span 1; }

		.g-asym { flex-direction: column; }
		.g-asym__item { width: 100%; height: 400px !important; margin: 0 !important; }
		
		.g-feat { flex-direction: column; height: auto; }
		.g-feat__main { height: 500px; }
		.g-feat__side { flex-direction: row; height: 250px; }
	}

	@media (max-width: 768px) {
		.g-showcase__title { font-size: 2.5rem; }
		.g-block__title { font-size: 1.8rem; }
		
		.g-bento { grid-auto-rows: 200px; }
		.g-bento__item { border-radius: 32px; }
		
		.g-accordion { flex-direction: column; height: 800px; }
		.g-accordion__item { flex: 1; border-radius: 32px; }
		.g-accordion__item:hover { flex: 2; }
		
		.g-cards { grid-template-columns: 1fr; }
		.g-card { border-radius: 32px; }
		
		.g-scroll__item { flex: 0 0 300px; height: 420px; border-radius: 32px; }
		
		.g-feat__main { height: 400px; border-radius: 32px; }
		.g-feat__main-info h2 { font-size: 2rem; }
		.g-feat__side { flex-direction: column; height: auto; }
		.g-feat__side-item { height: 250px; border-radius: 32px; }
	}
</style>
`;

const finalFile = topHtml + newHtml + newsCss + newCss;
fs.writeFileSync(path, finalFile, 'utf8');
console.log('Update successful');
