import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { Vec2Like } from "@akashic-extension/collision-js";
import { SyncFramework } from "./SyncFramework";
import { GameState } from "./mainScene";
var senders: Map<FlowEventName, object>;
export function initialSender() {
	senders = new Map<FlowEventName, object>();
}
export function setSender(value: any) {
	senders.set(FlowManager.eventName, value);
}
export function getSender(eventName?: FlowEventName): any {
	if (eventName !== undefined) {
		return senders.get(eventName);
	}
	return senders.get(FlowManager.eventName);
}
export class gameLoad_sender {
	syncFramework: SyncFramework<GameState>;
}
export class client_sender {
	constructor(playerIdx: number) {
		this.playerIdx = playerIdx;
	}
	playerIdx: number;
}
export class rotate_sender extends client_sender {
	constructor(playerIdx: number) {
		super(playerIdx);
	}
	clockwise?: boolean;
}
export class move_sender extends client_sender {
	constructor(playerIdx: number) {
		super(playerIdx);
	}
	isHardDrop?: boolean;
	xy: Vec2Like;
}
export class addScore_sender extends client_sender {
	constructor(playerIdx: number, score: number, garbageToSend: number = 0) {
		super(playerIdx);
		this.score = score;
		this.garbageToSend = garbageToSend;
	}
	score: number;
	garbageToSend: number;
}
export class nextPuyo_sender extends client_sender {
	constructor(playerIdx: number, colorMain: number, colorSub: number) {
		super(playerIdx);
		this.colorMain = colorMain;
		this.colorSub = colorSub;
	}
	colorMain: number;
	colorSub: number;
}

export class gameOver_sender {
	constructor(loserPlayerIdx: number, reason: string) {
		this.loserPlayerIdx = loserPlayerIdx;
		this.reason = reason;
	}
	loserPlayerIdx: number;
	reason: string;
}

export class selectMode_sender {
	constructor(mode: "SOLO" | "NPC" | "PVP") {
		this.mode = mode;
	}
	mode: "SOLO" | "NPC" | "PVP";
}

export class addGarbage_sender extends client_sender {
	constructor(playerIdx: number, amount: number) {
		super(playerIdx);
		this.amount = amount;
	}
	amount: number;
}
