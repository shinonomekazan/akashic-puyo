import { BaseStep, Flow, StepFireDebug } from "./step";
import { FlowEventName } from "./eventName";
import { Helper } from "../helper";
import { initialSender, setSender } from "./sender";

export class FlowManager {
	public static eventName: FlowEventName;
	public flows: Flow[] = [];
	public currentFlows: Flow[] = [];

	public constructor() {
		initialSender();
		g.game.scene().onUpdate.add(() => {
			for (let i = 0; i < this.currentFlows.length; i++) {
				if (globalThis.debugMode) {
					this.currentFlows[i].fireDebugs.forEach((debug) =>
						debug.onUpdate()
					);
				}
			}
		});
	}

	public ativeDebug() {
		if (globalThis.debugMode == false) {
			return;
		}
		const scene = g.game.scene();
		const parent = globalThis.debugLayer;
		let y = 100;
		this.currentFlows.forEach((flow) => {
			flow.fireDebugs = [];
			let line = new g.FilledRect({
				scene: scene,
				parent: parent,
				x: 0,
				y: y,
				width: 1500,
				height: 5,
				cssColor: "gray",
			});
			let label = Helper.newLable(FlowEventName[flow.eventName]);
			parent.append(label);
			label.fontSize = 17;
			label.invalidate();
			label.y = y;
			label.angle = -60;
			label.modified();
			let xlocalStep = 100;
			flow.steps.forEach((step) => {
				let lab = Helper.newLable(step.constructor.name);
				lab.fontSize = 15;
				lab.angle = -15;
				lab.x = xlocalStep;
				lab.y = y;
				parent.append(lab);
				let spr = Helper.newSprite("/assets/fire.png");
				spr.anchorY = 1;
				spr.width = 30;
				spr.height = 38;
				spr.invalidate();
				spr.x = xlocalStep;
				spr.y = y;
				spr.modified();
				parent.append(spr);
				let sprGray = Helper.newSprite("/assets/fire-gray.png");
				sprGray.anchorY = 1;
				sprGray.width = 30;
				sprGray.height = 38;
				sprGray.invalidate();
				sprGray.x = xlocalStep;
				sprGray.y = y;
				sprGray.modified();
				parent.append(sprGray);
				let fireDebug = new StepFireDebug();
				fireDebug.addDebug(spr, sprGray);
				flow.fireDebugs.push(fireDebug);
				xlocalStep += 100;
			});
			y += 100;
		});
	}

	public isRunning(eventName: FlowEventName): boolean {
		for (let i = 0; i < this.currentFlows.length; i++) {
			if (this.currentFlows[i].eventName == eventName) {
				return true;
			}
		}
		return false;
	}

	public fire(eventName: FlowEventName, sender: object = undefined): void {
		const targetFlow = this.prepareFlow(eventName, sender);
		if (!targetFlow) return;

		try {
			for (let i = 0; i < targetFlow.steps.length; i++) {
				targetFlow.stepIndex = i;
				if (globalThis.debugMode && targetFlow.fireDebugs[i]) {
					targetFlow.fireDebugs[i].active();
				}
				targetFlow.steps[i].onStep(targetFlow.eventName);
			}
		} catch (e) {
			console.error(e);
		} finally {
			this.finalizeFlow(targetFlow);
		}
	}

	public async fireAsync(
		eventName: FlowEventName,
		sender: object = undefined
	) {
		const targetFlow = this.prepareFlow(eventName, sender);
		if (!targetFlow) return;

		try {
			for (let i = 0; i < targetFlow.steps.length; i++) {
				targetFlow.stepIndex = i;
				if (globalThis.debugMode && targetFlow.fireDebugs[i]) {
					targetFlow.fireDebugs[i].active();
				}
				await targetFlow.steps[i].onStep(targetFlow.eventName);
			}
		} catch (e) {
			console.error(e);
		} finally {
			this.finalizeFlow(targetFlow);
		}
	}

	public addFlow(flow: Flow) {
		this.flows.push(flow);
	}

	private prepareFlow(eventName: FlowEventName, sender: object): Flow | null {
		let targetFlow: Flow = null;
		for (let i = 0; i < this.flows.length; i++) {
			if (this.flows[i].eventName == eventName) {
				if (!this.currentFlows.includes(this.flows[i])) {
					targetFlow = this.flows[i];
					break;
				}
			}
		}

		if (!targetFlow) return null;

		targetFlow.stepIndex = 0;
		this.currentFlows.push(targetFlow);
		FlowManager.eventName = targetFlow.eventName;
		setSender(sender);

		return targetFlow;
	}

	private finalizeFlow(targetFlow: Flow): void {
		const index = this.currentFlows.indexOf(targetFlow);
		if (index !== -1) {
			this.currentFlows.splice(index, 1);
		}
		targetFlow.stepIndex = -1;
	}
}