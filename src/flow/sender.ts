import { FlowManager } from "./flowManager";
import { FlowEventName } from "./eventName";
import { Vec2Like } from "@akashic-extension/collision-js";
import { render } from "../layout/render";
import { gameMode } from "../messageCode";
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
export class playerGameModeSender {
	public uiPassed = false;
	constructor(public mode:gameMode) { }
}
export class initSender {
	constructor(public render:render) { }
}