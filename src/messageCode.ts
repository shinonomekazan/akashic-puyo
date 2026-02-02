import { controlID } from "./layout/controller";

export type MessageType =
	"selectGameMode" |
	"readyClicked" |
	"startGamePvP" |
	"control" |
	"gameOver";
export class gameMessage {
	constructor(public type: MessageType, public data: any) { }
}

export type gameMode = "pc" | "pp" | "solo" | "readyClicked";
export class selectMode {
	constructor(public mode: gameMode) {
	}
}
export class readyClicked {
	constructor(public idClicked: string) { }
}
export class gameStart {
	constructor(public id1: string, public id2: string, public seed1: number, public seed2: number) { }
}
export class playerControl {
	constructor(public playerId: string, public controlID: controlID) { }
}
export class gameOver {
	constructor(public id: string) { }
}