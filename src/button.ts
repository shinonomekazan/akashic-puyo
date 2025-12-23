export class Button extends g.E {
	readonly onClick: g.Trigger = new g.Trigger();
	private actived = true;
	private body: g.FrameSprite;

	constructor(
		scene: g.Scene,
		src: g.ImageAsset | g.Surface,
		width: number,
		height: number,
		hitScale: number,
		hitDebug?: boolean
	) {
		const visualWidth = width / 2;
		const areaWidth = visualWidth * hitScale;
		const areaHeight = height * hitScale;

		super({
			scene: scene,
			width: areaWidth,
			height: areaHeight,
			touchable: true,
		});
		if (hitDebug) {
			let tmp = new g.FilledRect({
				scene: scene,
				width: areaWidth,
				height: areaHeight,
				cssColor: "rgba(255,0,0,0.5)",
				parent: this
			});
			tmp.x = (this.width - tmp.width) / 2;
			tmp.y = (this.height - tmp.height) / 2;
		}
		this.body = new g.FrameSprite({
			scene: scene,
			src: src,
			width: visualWidth,
			height: height,
			frameNumber: 0,
			frames: [0, 1, 2],
			touchable: false,
			parent: this
		});

		this.body.x = (this.width - this.body.width) / 2;
		this.body.y = (this.height - this.body.height) / 2;

		this.onPointUp.add((ev) => {
			if (this.actived == false) {
				return;
			}
			this.body.frameNumber = 0;
			this.body.modified();
			if (ev.player && ev.player.id === g.game.selfId) this.onClick.fire();
		});
		this.onPointDown.add(() => {
			if (this.actived == false) {
				return;
			}
			this.body.frameNumber = 1;
			this.body.modified();
		});
	}
	setActive(active: boolean) {
		this.actived = active;
		if (this.actived) {
			this.body.frames = [0];
			this.body.modified();
		} else {
			this.body.frames = [1];
			this.body.modified();
		}
	}
}