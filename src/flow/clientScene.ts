import { FlowCreator } from "./flowCreator";
import { FlowManager } from "./flowManager";
import { FlowEventName } from "./eventName";
import { BaseStep } from "./step";
import { assetPaths } from "../assetPaths";
import { layout } from "../layout/layout";
import { render } from "../layout/render";
import { controlSender, getSender, initSender, initialSender, startPvPSender } from "./sender";
import { GameBoardModel } from "../gameLogic/gameBoard.model";
import { GameBoardView } from "../gameLogic/gameBoard.view";

export interface MainSceneParameterObject extends g.SceneParameterObject {
	snapshot?: any;
}

export class clientScene extends g.Scene implements BaseStep {
	private _initialSnapshot: any;
	private p1Model: GameBoardModel;
	private p2Model: GameBoardModel;
	private p1View: GameBoardView;
	private p2View: GameBoardView;
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
			case FlowEventName.StartPvsP:
				let sender = getSender(FlowEventName.StartPvsP) as startPvPSender;
				console.log("StartPvsP sender:", sender);
				const thisId = g.game.selfId;
				const otherId = thisId == sender.id1 ? sender.id2 : sender.id1;
				this.p1Model = new GameBoardModel(thisId, 0, sender.seed1);
				this.p2Model = new GameBoardModel(otherId, 1, sender.seed2);
				const p1Colors = this.p1Model.generateRandomColors();
				const p1Next = this.p1Model.generateRandomColors();
				this.p1Model.spawnPuyo(p1Next, p1Colors);
				const p2Colors = this.p2Model.generateRandomColors();
				const p2Next = this.p2Model.generateRandomColors();
				this.p2Model.spawnPuyo(p2Next, p2Colors);

				//this.p1Model.move(1)


				this.p1View = new GameBoardView(sender.scene, sender.backgroundLayer, sender.gameLayer, this.p1Model);
				this.p2View = new GameBoardView(sender.scene, sender.backgroundLayer, sender.gameLayer, this.p2Model);
				this.p1View.updatePuyoView();
				this.p2View.updatePuyoView();
				break;
			case FlowEventName.Control:
				{
					let sen = getSender(FlowEventName.Control) as controlSender;
					this.p1Model.moveWithControlInput(sen.controlID)
					console.log('control ', sen.controlID);
					//const result = this.p1Model.lockPuyo(); 
					//this.p1View.animateExecutionResult(result);
					this.p1View.updatePuyoView();

				}
				break;
			case FlowEventName.OtherControl:
				{
					var sen = getSender(FlowEventName.OtherControl) as controlSender;
					if (sen.playerId == g.game.selfId) {
						console.log('skip control ', sen.playerId);
						return
					}
					const targetModel = (sen.playerId === this.p1Model.id) ? this.p1Model : this.p2Model;
					const targetView = (sen.playerId === this.p1Model.id) ? this.p1View : this.p2View;

					targetModel.moveWithControlInput(sen.controlID);
					targetView.updatePuyoView();
					console.log('xxx ', sen);
				}
				break;
			default:
				console.error("clientScene: unknown event: ", FlowEventName[eventName]);
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