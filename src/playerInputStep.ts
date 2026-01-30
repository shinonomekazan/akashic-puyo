import { FlowEventName } from "./flow/eventName";
import { getSender, initSender, playerGameModeSender } from "./flow/sender";
import { BaseStep } from "./flow/step";
import { ISelectMode, buttonID } from "./layout/render";
import { gameMode } from "./messageCode";

export class playerInputStep implements BaseStep {
	private render: ISelectMode;
	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				var sender = getSender() as initSender;
				this.render = sender.render;
				this.render.onButtonClick.add((buttonID: buttonID) => {
					//skip pvsp => ready cliecked
					if (buttonID == "btnPvP") {
						buttonID = "readyCliked";
					}
					console.log('a ', buttonID);
					if (buttonID == "readyCliked") {
						globalThis.flowManager.fire(FlowEventName.SomeClientReadyClicked);
						globalThis.flowManager.fireAsync(FlowEventName.WaitServerResponeReadyPvsP);
						globalThis.flowManager.fireAsync(FlowEventName.StartPvsP);

					} else {
						const modeMap: Partial<Record<buttonID, gameMode>> = {
							btnSolo: "solo",
							btnPC: "pc",
							btnPvP: "pp",
							readyCliked: "readyClicked"
						};
						if (modeMap[buttonID] != "pp") {

						globalThis.flowManager.fireAsync(FlowEventName.SomeClientSelectMode,
							new playerGameModeSender(modeMap[buttonID]));
						}
					}
				});
				this.playerInput();
				break;
			default:
		}
	}
	private playerInput(): void {
		window.addEventListener("keydown", (ev) => {
			let mode = "";
			switch (ev.key) {
				case "1":
					mode = "solo"
					break;
				case "2":
					mode = "pc"
					break;
				case "3":
					mode = "pp"
					break;
				default:
			}
			globalThis.flowManager.fireAsync(FlowEventName.SomeClientSelectMode, { mode: mode });
		});
	}
}