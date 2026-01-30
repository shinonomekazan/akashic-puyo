export interface ButtonMargin {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

export class Button extends g.E {
	readonly onClick: g.Trigger = new g.Trigger();
	private actived = true;
	private fSprites: g.FrameSprite;

	constructor(
		scene: g.Scene,
		src: g.ImageAsset | g.Surface,
		width: number,
		height: number,
		margin: ButtonMargin,
		frames: number[],
		showAreaClick?: boolean
	) {
		if (margin == undefined) {
			margin = { bottom: 0, left: 0, right: 0, top: 0 };
		}
		const visualWidth = width / frames.length;
		const areaWidth = visualWidth + margin.left + margin.right;
		const areaHeight = height + margin.top + margin.bottom;

		super({
			scene: scene,
			width: areaWidth,
			height: areaHeight,
			touchable: true,
			local: true,
		});
		if (showAreaClick) {
			let rect = new g.FilledRect({
				scene: scene,
				width: areaWidth,
				height: areaHeight,
				cssColor: "rgba(255,0,0,0.5)",
				parent: this,
			});
			rect.x = (this.width - rect.width) / 2;
			rect.y = (this.height - rect.height) / 2;
		}
		this.fSprites = new g.FrameSprite({
			scene: scene,
			src: src,
			width: visualWidth,
			height: height,
			frameNumber: 0,
			frames: frames,
			touchable: false,
			parent: this,
		});

		this.fSprites.x = margin.left;
		this.fSprites.y = margin.top;

		this.onPointUp.add((ev) => {
			if (this.actived == false) {
				return;
			}
			this.fSprites.frameNumber = 0;
			this.fSprites.modified();
			this.onClick.fire();
		});
		this.onPointDown.add((ev) => {
			if (this.actived == false) {
				return;
			}
			this.fSprites.frameNumber = 1;
			this.fSprites.modified();
		});
	}
	setActive(active: boolean) {
		this.actived = active;
		if (this.actived) {
			this.fSprites.frameNumber = 0;
			this.fSprites.modified();
		} else {
			if (this.fSprites.frames.length == 3) {
				this.fSprites.frameNumber = 2;
				this.fSprites.modified();
			} else {
				console.error("Cannot disable, not found frame number index 2");
			}
		}
	}
}
