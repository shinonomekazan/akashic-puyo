import { Button, ButtonMargin } from "./button";
export type controlID = "Unknow" | "ArrowLeft" | "ArrowRight" | "ArrowUp" | "ArrowDown" | "ArrowUpCCW";

export class controller {
	private controllerLayer: g.E;
	public onControlClick: g.Trigger<controlID> = new g.Trigger();
	constructor(public layoutRoot: g.E) {
		this.createUIController();
	}
	private createUIController() {
		const scene = g.game.scene();
		this.controllerLayer = new g.E({
			scene: scene,
			parent: this.layoutRoot,
		});
		let left = this.createButton(
			"ArrowLeft",
			"/assets/ui/arrow-left.png",
			100,
			100,
			{ left: 7, right: 0, top: 7, bottom: 7 },
			2
		);
		let right = this.createButton(
			"ArrowRight",
			"/assets/ui/arrow-right.png",
			100,
			150,
			{ left: 0, right: 7, top: 7, bottom: 7 },
			2
		);
		let up = this.createButton(
			"ArrowUp",
			"/assets/ui/arrow-up.png",
			100,
			155,
			{ left: 7, right: 7, top: 7, bottom: 1 },
			2
		);
		let down = this.createButton(
			"ArrowDown",
			"/assets/ui/arrow-down.png",
			100,
			160,
			{ left: 7, right: 7, top: 0, bottom: 7 },
			2
		);
		this.placeEntitiesAroundCenter(
			scene,
			{ x: 130, y: g.game.height - 150 },
			[up, down, left, right]
		);
		let rotateCw = this.createButton(
			"ArrowUp",
			"/assets/ui/rotate-cw.png",
			g.game.width - 200,
			right.y - right.height / 2,
			undefined,
			1
		);
		this.controllerLayer.append(rotateCw);
		let rotateCCw = this.createButton(
			"ArrowUpCCW",
			"/assets/ui/rotate-ccw.png",
			g.game.width - 200 - 150,
			right.y - right.height / 2,
			undefined,
			1
		);
		this.controllerLayer.append(rotateCCw);
		//this.controllerLayer.hide();
	}
	private createButton(
		keyClick: string,
		imgPath: string,
		x: number,
		y: number,
		margin: ButtonMargin,
		scale: number = 1
	) {
		const scene = g.game.scene();
		const img = scene.asset.getImage(imgPath);
		let btn = new Button(
			scene,
			img,
			img.width,
			img.height,
			margin,
			[0, 1],
			false
		);
		this.controllerLayer.append(btn);
		btn.x = x;
		btn.y = y;
		btn.scale(scale);
		btn.modified();
		btn.onClick.add(() => {
			this.onControlClick.fire(keyClick as controlID);
		});
		return btn;
	}
	private placeEntitiesAroundCenter(
		scene: g.Scene,
		center: g.CommonOffset,
		img: g.E[]
	) {
		const offset = 80;
		const positions: g.CommonOffset[] = [
			{ x: center.x, y: center.y - offset }, // up
			{ x: center.x, y: center.y + offset }, // down
			{ x: center.x - offset, y: center.y }, // left
			{ x: center.x + offset, y: center.y }, // right
		];

		for (let i = 0; i < 4; i++) {
			const entity = img[i];
			if (!entity) continue;
			entity.x = positions[i].x - entity.width;
			entity.y = positions[i].y - entity.height;
			entity.modified();
		}
	}
}