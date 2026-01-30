import { FlowEventName } from "../flow/eventName";
import { BaseStep } from "../flow/step";
import { getSender, initSender, playerGameModeSender } from "../flow/sender";
//import { gameMessage, gameMode, selectMode } from "./messageCode";
//import { gameState } from "./gamesStateType";
import { ISelectMode, IUILobby } from "./render";

export class renderLogicStep implements BaseStep {
	private render: IUILobby;
	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				{
					const sender = getSender() as initSender;
					this.render = sender.render;
				}
				break;
			case FlowEventName.SomeClientSelectMode:
				const x = getSender() as playerGameModeSender;
				if (x.mode == "pp") {
					this.render.showDialogJoinPvP();
				} else {
					x.uiPassed = true;
				}
				break;
			case FlowEventName.SomeClientReadyClicked:
				this.render.setShowLoading(true);

				break;
			case FlowEventName.WaitServerResponeReadyPvsP:
				this.render.setShowReadySuccessAndWaitOther(true);
				break;
			case FlowEventName.StartPvsP:
				this.render.startGamePvP();

				break;

			default:
				console.error("renderLogicStep: unknown event: ", FlowEventName[eventName]);
		}
	}
}