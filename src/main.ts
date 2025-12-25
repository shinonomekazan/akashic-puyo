import { Scene } from "@akashic/akashic-engine";
import { TestScene } from "./testScene";
import { MainScene } from "./mainScene";

declare global {
	var apiKey: string;
	var font: g.DynamicFont;
	var gameLayer: g.E;
	var debugLayer: g.E;
	var debugMode: boolean;
	var gotoSheetName: string;
}
async function main(param: g.GameParameterObject): Promise<void> {
	globalThis.debugMode = true;
	//console.log(param);
	//const urlParams = new URLSearchParams(window.location.search);
	//globalThis.debugMode = urlParams.get("debugf") != null;
	//globalThis.apiKey = urlParams.get("ggogleapi");
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
	});
	g.game.pushScene(mainScene);
}
export = main;
