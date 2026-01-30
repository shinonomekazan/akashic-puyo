import { FlowCreator } from "./flowCreator";
import { FlowManager } from "./flowManager";
import { FlowEventName } from "./eventName";
import { BaseStep } from "./step";
import { assetPaths } from "../assetPaths";
import { layout } from "../layout/layout";
import { render } from "../layout/render";
import { initSender, initialSender } from "./sender";

export interface MainSceneParameterObject extends g.SceneParameterObject {
	snapshot?: any;
}

export class clientScene extends g.Scene implements BaseStep {
	private _initialSnapshot: any;

	constructor(param: MainSceneParameterObject) {
		console.clear();
		param.assetPaths = assetPaths;
		super(param);
		this._initialSnapshot = param.snapshot;
		this.onLoad.add(this.onGameLoad, this);
	}

	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				console.log("[clientScene] Init complete.");
				break;
		}
	}

	private onGameLoad() {
		globalThis.flowManager = new FlowManager();
		new FlowCreator(globalThis.flowManager, this);

		let myRender = new render(this);
		myRender.selectMode()
		//myRender.test()



		globalThis.flowManager.fireAsync(FlowEventName.Init, new initSender(myRender));
	}
}