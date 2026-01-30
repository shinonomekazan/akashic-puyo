import { FlowEventName } from "./flow/eventName";
import { BaseStep } from "./flow/step";
import { getSender, playerGameModeSender } from "./flow/sender";
import { gameMessage, gameMode, readyClicked, selectMode } from "./messageCode";
import { gameState } from "./gamesStateType";
import { Helper } from "./helper";

export class syncStep implements BaseStep {
	private gameState: gameState = "wait-select-mode";
	private waitReadyResponse: boolean = false;
	private waitGameStart: boolean = false;
	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				g.game.scene().onMessage.add(this._handleMessage, this);
				break;
			case FlowEventName.SomeClientSelectMode:
				{
					switch (this.gameState) {
						case "wait-select-mode":
							const x = getSender() as playerGameModeSender;
							console.log('selected mode ', x.mode);
							if (x.uiPassed) {
								this.gameState = "wait-select-mode";
								g.game.raiseEvent(new g.MessageEvent(
									new gameMessage("selectGameMode", x.mode)
								));
								this.gameState = "wait-serve-respone-sel";
							}
							break;
						default:
							console.log("ignoring select mode in wait state ", this.gameState);
							break;
					}
				}
				break;
			case FlowEventName.SomeClientReadyClicked:
				console.log('ready clicked event');
				this.waitReadyResponse = true;
				this.waitGameStart = true;
				if (this.gameState == "wait-select-mode") {
					g.game.raiseEvent(new g.MessageEvent(
						new gameMessage("readyClicked", undefined)
					));
					console.log('xxx');
				}
				break;
			case FlowEventName.WaitServerResponeReadyPvsP:
				console.log('1')
				await Helper.waitUntil(() => this.waitReadyResponse == false)
				console.log('2')
				break;
			case FlowEventName.StartPvsP:
				console.log('1 game start!')
				await Helper.waitUntil(() => this.waitGameStart == false)
				console.log('2 game start!')
				break;
			default:
		}
	}

	private _handleMessage(ev: g.MessageEvent): void {
		if (ev.player.id != null) {//received from serve
			return
		}
		console.log('recive message ', ev);
		var msg = ev.data as gameMessage;
		if (msg.type == "readyClicked") {
			let x = msg.data as readyClicked;
			if (x.idClicked == g.game.selfId) {
				this.gameState = "ready-wait-other";
				this.waitReadyResponse = false;
			} else {
				console.log('other ready!');
			}
		} else {
			if (msg.type == "startGamePvP") {
				this.waitGameStart = false;

			} else {
				switch (this.gameState) {
					case "wait-select-mode":
					case "wait-serve-respone-sel":
						let data = ev.data as gameMessage;
						if (data.type === "selectGameMode") {
							const mode = data.data as gameMode;
							console.log('ok switch to mode ', mode);
							this.gameState = "playing";
						}
						break;
					case "playing":

						break;
					default:
						console.error('unknown wait state: ', this.gameState);
				}
			}
		}
	}
}