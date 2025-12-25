export enum alignMode {
	top_left,
	bottom_mid,
	bottom_right,
}
export class aligner {
	static align(e: g.E, mode: alignMode, xOffset: number, yOffset: number) {
		let h = 0;
		let w = 0;
		if (e.parent instanceof g.Scene) {
			h = g.game.height;
			w = g.game.width;
		} else {
			let parent = e.parent as g.E;
			h = parent.height;
			w = parent.width;
		}
		if (h == 0 || w == 0) {
			h = g.game.height;
			w = g.game.width;
		}
		switch (mode) {
			case alignMode.top_left:
				e.anchorY = 0;
				e.anchorX = 0;
				e.x = 0 + xOffset;
				e.y = 0 + yOffset;
				break;
			case alignMode.bottom_right:
				e.anchorY = 1;
				e.anchorX = 1;
				e.x = w + xOffset;
				e.y = h + yOffset;
				break;
			case alignMode.bottom_mid:
				e.anchorY = 1;
				e.anchorX = 0.5;
				e.x = w / 2 + xOffset;
				e.y = h + yOffset;
				break;
		}
		e.modified();
	}
}
