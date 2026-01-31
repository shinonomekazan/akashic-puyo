import { clientScene } from "./client/clientScene";
import { FlowManager } from "./flow/flowManager";
import { serverScene } from "./server/serverScene";

declare global {
	var flowManager: FlowManager;
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

	//let testScene = new TestLobbyScene({
	//	game: g.game,
	//	name: "testscene",
	//});
	//g.game.pushScene(testScene);

	//let lobbySync = new lobbySyncClientTest({
	//	game: g.game,
	//	name: "lobbySync",
	//});
	//g.game.pushScene(lobbySync);
	let scene: g.Scene;
	if (g.game.isActiveInstance()) {
		scene = new serverScene({
			game: g.game,
			name: "server scene",
		});
	} else {
		scene = new clientScene({
			game: g.game,
			name: "client scene",
			snapshot: param.snapshot
		});
	}
	g.game.pushScene(scene);
}
export = main;