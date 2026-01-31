import { FlowManager } from "./flowManager";
import { FlowEventName } from "./eventName";
import { Vec2Like } from "@akashic-extension/collision-js";
import { render } from "../layout/render";
import { gameMode } from "../messageCode";
import { controlID } from "../layout/controller";
var senders: Map<FlowEventName, object>;
export function initialSender() {
	senders = new Map<FlowEventName, object>();
}
export function setSender(value: any, eventName?: FlowEventName) {
	if (eventName !== undefined) {
		senders.set(eventName, value);
	} else {
		senders.set(FlowManager.eventName, value);
	}
}
export function getSender(eventName?: FlowEventName): any {
	if (eventName !== undefined) {
		return senders.get(eventName);
	}
	return senders.get(FlowManager.eventName);
}
export class playerGameModeSender {
	public uiPassed = false;
	constructor(public mode: gameMode) { }
}
export class initSender {
	constructor(public render: render) { }
}
export class startPvPSender {
	cancel: boolean;
	id1: string;
	id2: string;
	seed1: number;
	seed2: number;
	scene: g.Scene;
	backgroundLayer: g.E;
	gameLayer: g.E;
	constructor() { }
	setSeed(seed1: number, seed2: number) {
		this.seed1 = seed1;
		this.seed2 = seed2;
	}
}
export class controlSender {
	playerId: string;
	controlID: controlID = "Unknow";
}
