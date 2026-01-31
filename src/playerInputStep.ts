import { FlowEventName } from "./flow/eventName";
import { controlSender, getSender, initSender, playerGameModeSender, startPvPSender } from "./flow/sender";
import { BaseStep } from "./flow/step";
import { ISelectMode, buttonID } from "./layout/render";
import { controlID } from "./layout/controller";
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
						let sender = new startPvPSender();
						sender.cancel = false;
						console.log('...', sender)
						globalThis.flowManager.fireAsync(FlowEventName.StartPvsP, sender);

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
				this.render.controller.onControlClick.add((controlID: controlID) => {
					let control = new controlSender();
					control.controlID = controlID;
					globalThis.flowManager.fire(FlowEventName.Control, control);
				});
				this.playerInput();
				break;
			case FlowEventName.StartPvsP:
				{

				}
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