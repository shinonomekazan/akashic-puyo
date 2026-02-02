import { FlowCreator } from "../flow/flowCreator";
import { FlowManager } from "../flow/flowManager";
import { FlowEventName } from "../flow/eventName";
import { BaseStep } from "../flow/step";
import { assetPaths } from "../assetPaths";
import { render } from "../layout/render";
import { controlSender, gameOverSender, getSender, initSender, startPvPSender } from "../flow/sender";
import { GameController } from "../gameLogic/gameController";

export interface MainSceneParameterObject extends g.SceneParameterObject {
	snapshot?: any;
}

export class clientScene extends g.Scene implements BaseStep {
	private _initialSnapshot: any;
	private player1: GameController;
	private player2: GameController;
	constructor(param: MainSceneParameterObject) {
		console.clear();
		param.assetPaths = assetPaths;
		super(param);
		this._initialSnapshot = param.snapshot;
		this.onStateChange.add(e => {
			if (e == 'before-destroyed') {
				globalThis.flowManager.fireAsync(FlowEventName.SceneDestroy);
			}
		});
		this.onLoad.add(this.onGameLoad, this);
	}

	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				console.log("Init complete.");
				break;
			case FlowEventName.StartPvsP:
				let sender = getSender(FlowEventName.StartPvsP) as startPvPSender;
				console.log("StartPvsP sender:", sender);
				const thisId = g.game.selfId;
				const otherId = thisId == sender.id1 ? sender.id2 : sender.id1;
				const isPlayer1 = thisId === sender.id1;
				const thisSeed = isPlayer1 ? sender.seed1 : sender.seed2;
				const otherSeed = isPlayer1 ? sender.seed2 : sender.seed1;
				this.player1 = new GameController(this, thisId, 0, thisSeed, sender.gameLayer);
				this.player2 = new GameController(this, otherId, 1, otherSeed, sender.gameLayer);

				// --- Garbage Wiring ---
				this.player1.onGarbageSent.add((amount) => {
					console.log(`P1 attacked P2 with ${amount} garbage`);
					this.player2.model.addNuisance(amount);
					if (this.player2.view) this.player2.view.updateNuisanceBar();
				});

				this.player2.onGarbageSent.add((amount) => {
					console.log(`P2 attacked P1 with ${amount} garbage`);
					this.player1.model.addNuisance(amount);
					if (this.player1.view) this.player1.view.updateNuisanceBar();
				});
				// ----------------------
				this.player1.onGameOver.add((id) => {
					globalThis.flowManager.fireAsync(FlowEventName.GameOver, new gameOverSender(id, false));

				});
				this.player2.onGameOver.add((id) => {
					globalThis.flowManager.fireAsync(FlowEventName.GameOver, new gameOverSender(id, true));
				});
				// ----------------------

				this.player1.start();
				this.player2.start();
				g.game.onUpdate.add(() => {
					const currentTime = g.game.age * (1000 / g.game.fps);
					this.player1.update(currentTime);
					this.player2.update(currentTime);
				});
				break;
			case FlowEventName.Control:
				{
					let sen = getSender(FlowEventName.Control) as controlSender;
					this.player1.handleInput(sen.controlID);

				}
				break;
			case FlowEventName.OtherControl:
				{
					var sen = getSender(FlowEventName.OtherControl) as controlSender;
					if (sen.playerId == g.game.selfId) {
						console.log('skip control ', sen.playerId);
						return
					}
					const targetPlayer = (sen.playerId == this.player1.model.id) ? this.player1 : this.player2;
					targetPlayer.handleInput(sen.controlID);
					console.log('xxx ', sen);
				}
				break;
			case FlowEventName.GameOver:
				{
					this.player1.stop();
					this.player2.stop();
				}
				break;
			case FlowEventName.CleanAndGotoMainMenu:
				{
					console.log('client clean');
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