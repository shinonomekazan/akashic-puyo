import { FlowEventName } from "./eventName";

export interface BaseStep {
	onStep(eventName: FlowEventName): Promise<void>;
}

export class StepHelper {
	public static async waitUntil(condition: () => boolean): Promise<void> {
		if (condition()) return;
		return new Promise<void>((resolve) => {
			const handler = () => {
				if (condition()) {
					g.game.scene().onUpdate.remove(handler);
					resolve();
				}
			};
			g.game.scene().onUpdate.add(handler);
		});
	}

	public static async waitFrames(frames: number): Promise<void> {
		let count = 0;
		return this.waitUntil(() => {
			count++;
			return count >= frames;
		});
	}

	public static async waitSeconds(seconds: number): Promise<void> {
		let current = 0;
		const target = seconds * g.game.fps;
		await this.waitUntil(() => {
			current++;
			return current >= target;
		});
	}
}

export class WaitFrameStep implements BaseStep {
	private _frames: number;
	constructor(frames: number) {
		this._frames = frames;
	}
	public async onStep(eventName: FlowEventName): Promise<void> {
		await StepHelper.waitFrames(this._frames);
	}
}

export class StepFireDebug {
	sprFire: g.Sprite;
	sprFireGray: g.Sprite;
	tag: string;
	private fireTimer = 0;
	active() {
		this.fireTimer = 25;
		this.sprFireGray.hide();
	}
	onUpdate() {
		if (this.fireTimer == 0) {
			this.sprFireGray.show();
		}
		this.fireTimer -= 1;
	}
	addDebug(fire: g.Sprite, sprGray: g.Sprite) {
		this.sprFire = fire;
		this.sprFireGray = sprGray;
	}
}

export class Flow {
	constructor(eventName: FlowEventName, steps: BaseStep[]) {
		this.eventName = eventName;
		this.steps = steps;
	}
	public stepIndex: number = 0;
	public eventName: FlowEventName;
	public steps: BaseStep[] = [];
	public fireDebugs: StepFireDebug[] = [];
}