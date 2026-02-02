import { Easing, Timeline } from "@akashic-extension/akashic-timeline";
import * as al from "@akashic-extension/akashic-label";
import { CommonRect, E, Sprite, TextAlign } from "@akashic/akashic-engine";
import { EasingType } from "@akashic-extension/akashic-timeline/lib/EasingType";

export class Helper {
	static font: g.DynamicFont;
	static get getFont() {
		if (Helper.font == undefined) {
			Helper.font = new g.DynamicFont({
				game: g.game,
				fontFamily: "sans-serif",
				size: 60,
				fontWeight: "bold",
			});
		}
		return Helper.font;
	}
	static get isMobile() {
		return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop|Fennec|BlackBerry|BB10|PlayBook|Silk/.test(
			navigator.userAgent
		);
	}
	static rectContain(rect: CommonRect, x: number, y: number) {
		return (
			x > rect.left && x < rect.right && y < rect.bottom && y > rect.top
		);
	}
	static animYCard(e: g.E, y: number) {
		let tl = new Timeline(g.game.scene());
		let tw = tl.create(e);
		tw.moveY(y, 300, Easing.easeInOutBack);
	}
	static delayCall(callback: () => void, delay: number): void {
		setTimeout(callback, delay);
	}
	static delayCallAsync(callback: () => void, delay: number): Promise<void> {
		return new Promise((resolve) => {
			setTimeout(() => {
				callback();
				resolve();
			}, delay);
		});
	}
	static moveToAsync(
		e: g.E,
		x: number,
		y: number,
		time: number,
		easing?: EasingType
	) {
		let tl = new Timeline(g.game.scene());
		let tw = tl.create(e);
		tw.moveTo(x, y, time, easing);
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(undefined);
			}, time);
		});
	}
	static crossSprite(newSprite: g.E, current: g.E, time = 1000) {
		let tl = new Timeline(g.game.scene());
		let tw = tl.create(newSprite);
		newSprite.show();
		tw.every((e, p) => {
			newSprite.opacity = p;
			current.opacity = 1 - p;
			current.modified();
			newSprite.modified();
		}, time);
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(undefined);
			}, time);
		});
	}
	static fadeInAsync(e: g.E, time: number) {
		let tl = new Timeline(g.game.scene());
		let tw = tl.create(e);
		tw.fadeOut(0);
		tw.fadeIn(time);
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(undefined);
			}, time);
		});
	}
	static fadeOutAsync(e: g.E, time: number) {
		let tl = new Timeline(g.game.scene());
		let tw = tl.create(e);
		tw.fadeOut(time);
		return new Promise((resolve) => {
			setTimeout(() => {
				resolve(undefined);
			}, time);
		});
	}
	static scalePingpong(e: g.E, value: number, time: number) {
		let tl = new Timeline(g.game.scene());
		let tw = tl.create(e);
		let curScale = e.scaleX;
		tw.scaleTo(value, value, time).call(() => {
			tw.scaleTo(curScale, curScale, time);
		});
	}
	static async waitUntil(
		condition: () => boolean | Promise<boolean>,
		checkInterval: number = 100,
		timeout?: number
	): Promise<void> {
		const startTime = Date.now();
		while (!(await condition())) {
			if (timeout && Date.now() - startTime > timeout) {
				throw new Error("waitUntil: timeout");
			}
			await new Promise((resolve) => setTimeout(resolve, checkInterval));
		}
	}
	static waitAsync(time: number) {
		return new Promise((resolve) => {
			g.game.scene().setTimeout(() => {
				resolve(undefined);
			}, time);
		});
	}
	static findNodesByTag(node: g.E, targetTag: string, result: g.E[]) {
		if (!node) return result;

		if (node.tag === targetTag) {
			result.push(node);
		}

		if (node.children && Array.isArray(node.children)) {
			node.children.forEach(child => {
				Helper.findNodesByTag(child, targetTag, result);
			});
		}

		return result;
	}
	static newSprite9Slice(
		path: string,
		width: number,
		height: number,
		borderWidth: any
	) {
		let scene = g.game.scene();
		var destSurface = g.game.resourceFactory.createSurface(width, height);
		var srcSurface = g.SurfaceUtil.asSurface(scene.asset.getImage(path));
		g.SurfaceUtil.drawNinePatch(destSurface, srcSurface, borderWidth);
		return new g.Sprite({
			scene: scene,
			src: destSurface,
		});
	}
	static midAlignWithX(all: g.E[], x: number, offset: number) {
		let totalWidth =
			all.reduce((acc, rect) => acc + rect.width, 0) +
			(all.length - 1) * offset;
		const startX = x - totalWidth / 2;
		let curX = startX;
		all.map((rect) => {
			const pos = { x: curX + rect.width / 2, y: 1 };
			curX += rect.width + offset;
			rect.x = pos.x;
			rect.modified();
		});
	}
	static newSprite(path: string) {
		let scene = g.game.scene();
		let spr = new g.Sprite({
			scene: scene,
			src: scene.asset.getImage(path),
		});
		return spr;
	}

	static newLable(text: string) {
		let scene = g.game.scene();
		let lab = new g.Label({
			scene: scene,
			font: Helper.getFont,
			fontSize: 30,
			textAlign: TextAlign.Left,
			widthAutoAdjust: true,
			text: text,
		});
		return lab;
	}
	static newalLable(text: string) {
		let scene = g.game.scene();
		let lab = new al.Label({
			scene: scene,
			font: Helper.getFont,
			fontSize: 30,
			width: 2000,
			textAlign: TextAlign.Left,
			lineBreak: true,
			widthAutoAdjust: true,
			text: text,
		});
		return lab;
	}
	static insertNewlines(str: string, everyN: number) {
		let result = "";
		for (let i = 0; i < str.length; i += everyN) {
			result += str.slice(i, i + everyN) + "\n";
		}
		return result;
	}
	static destroyObject(obj: g.E) {
		if (obj != undefined && obj.destroyed() == false) {
			if (obj.parent != undefined && obj.parent.destroyed() == false) {
				obj.parent.remove(obj);
			}
			obj.destroy();
		}
	}
	static lerp(start: number, end: number, t: number): number {
		return start + (end - start) * t;
	}
	static insertBefore(before: g.E, e: g.E) {
		let newChildren: g.E[] = [];
		let children = g.game.scene().children;
		for (var i = children.length - 1; i >= 0; i--) {
			if (children[i] == e) {
				continue;
			}
			newChildren.push(children[i]);
			if (children[i] == before) {
				newChildren.push(e);
			}
		}
		g.game.scene().children = newChildren.reverse();
	}
	//todo: not test!
	static insertAfter(after: g.E, e: g.E) {
		let newChildren: g.E[] = [];
		let children = g.game.scene().children;
		for (var i = 0; i < children.length; i++) {
			if (children[i] == e) {
				continue;
			}
			newChildren.push(children[i]);
			if (children[i] == after) {
				newChildren.push(e);
			}
		}
		g.game.scene().children = newChildren;
	}
	static findChild(parent: g.E, name: string): g.E {
		for (let i = 0; i < parent.children.length; i++) {
			if (parent.children[i].parent == parent) {
				return parent.children[i];
			}
		}
		return undefined;
	}
	static setFontsizeUptoTargetWidth(label: g.Label, targetWidth: number) {
		let fontsize = label.fontSize;
		while (true) {
			if (label.width < targetWidth) {
				fontsize++;
				label.fontSize = fontsize;
				label.invalidate();
			} else break;
		}
	}
	static setFontsizeLimitMaxWidth(label: g.Label, maxWidth: number) {
		let fontsize = label.fontSize;
		for (let i = fontsize - 1; i >= 0; i--) {
			if (label.width > maxWidth) {
				fontsize--;
				label.fontSize = fontsize;
				label.invalidate();
			} else break;
		}
	}
	static alignCenterScreen(e: g.E) {
		const w = g.game.width;
		const h = g.game.height;
		e.x = w / 2 - e.width / 2;
		e.y = h / 2 - e.height / 2;
		e.modified();
	}
}
