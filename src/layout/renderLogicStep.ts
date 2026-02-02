import { FlowEventName } from "../flow/eventName";
import { BaseStep } from "../flow/step";
import { gameOverSender, getSender, initSender, playerGameModeSender, startPvPSender } from "../flow/sender";
import { ISelectMode, IUIInGame, IUILobby } from "./render";

export class renderLogicStep implements BaseStep {
	private renderLobby: IUILobby;
	private renderInGame: IUIInGame;
	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				{
					const sender = getSender() as initSender;
					this.renderLobby = sender.render;
					this.renderInGame = sender.render;
				}
				break;
			case FlowEventName.SomeClientSelectMode:
				const x = getSender() as playerGameModeSender;
				if (x.mode == "pp") {
					this.renderLobby.showDialogJoinPvP();
				} else {
					x.uiPassed = true;
				}
				break;
			case FlowEventName.SomeClientReadyClicked:
				this.renderLobby.setShowLoading(true);

				break;
			case FlowEventName.WaitServerResponeReadyPvsP:
				this.renderLobby.setShowReadySuccessAndWaitOther(true);
				break;
			case FlowEventName.StartPvsP:
				{
					this.renderLobby.startGamePvP();
					let sender = getSender(FlowEventName.StartPvsP) as startPvPSender;
					let layerInGame = this.renderInGame.getLayer();
					sender.scene = g.game.scene();
					sender.backgroundLayer = layerInGame.backgroundLayer;
					sender.gameLayer = layerInGame.gameLayer;
				}
				break;
			case FlowEventName.GameOver:
				{
					let sen = getSender(FlowEventName.GameOver) as gameOverSender;
					this.renderInGame.setEndGame(sen.thisWin ? "win" : "gameOver");
				}
				break;
			case FlowEventName.CleanAndGotoMainMenu:
				{
					console.log('UI CLEAN');
				}
				break;

			default:
				console.error("renderLogicStep: unknown event: ", FlowEventName[eventName]);
		}
	}
}