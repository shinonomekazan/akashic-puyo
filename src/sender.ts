import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { Vec2Like } from "@akashic-extension/collision-js";
var senders: Map<FlowEventName, object>;
export function initialSender() {
	senders = new Map<FlowEventName, object>();
}
export function setSender(value: any) {
	senders.set(FlowManager.eventName, value);
}
export function getSender(): any {
	return senders.get(FlowManager.eventName);
}
//sender:
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
	constructor(playerIdx: number, score: number) {
		super(playerIdx);
		this.score = score;
	}
	score: number;
}
export class gameLoad_sender {
	//layout: layout;
	//buttonLoadSheet: buttonAndSheet[] = [];
	//triggerLoadSheet: g.Trigger<string> = new g.Trigger<string>()
}

export class gameOver_sender {
	constructor(loserPlayerIdx: number, reason: string) {
		this.loserPlayerIdx = loserPlayerIdx;
		this.reason = reason;
	}
	loserPlayerIdx: number;
	reason: string;
}
