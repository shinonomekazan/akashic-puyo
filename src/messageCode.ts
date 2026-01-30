export type MessageType =
	"selectGameMode"
	| "readyClicked"
	| "startGamePvP"
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
	constructor(public id1: string, public id2: string) { }
}