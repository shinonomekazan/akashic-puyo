import { Scene } from "@akashic/akashic-engine";
import { TestScene } from "./testScene";
import { MainScene } from "./mainScene";

declare global {
	var font: g.DynamicFont;
	var gameLayer: g.E;
	var debugLayer: g.E;
	var debugMode: boolean;
	var gotoSheetName: string;
}

async function main(param: g.GameMainParameterObject): Promise<void> {
	globalThis.debugMode = true;

	globalThis.font = new g.DynamicFont({
		game: g.game,
		fontFamily: "M PLUS 1",
		size: 60,
		fontWeight: "bold",
	});

	let testScene = new TestScene({
		game: g.game,
		name: "testscene",
	});

	let mainScene = new MainScene({
		game: g.game,
		name: "main scene",
		snapshot: param.snapshot
	});

	g.game.pushScene(mainScene);
}
export = main;