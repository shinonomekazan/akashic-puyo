import { FlowEventName } from "./flow/eventName";
import { BaseStep } from "./flow/step";
import { controlSender, gameOverSender, getSender, playerGameModeSender, setSender, startPvPSender } from "./flow/sender";
import { gameMessage, gameMode, gameOver, gameStart, playerControl, readyClicked, selectMode } from "./messageCode";
import { gameState } from "./gamesStateType";
import { Helper } from "./helper";

export class syncStep implements BaseStep {
	private gameState: gameState = "wait-select-mode";
	private waitReadyResponse: boolean = false;
	private waitGameStart: boolean = false;
	private otherPlayerGameOver: boolean = false;
	private startPvPSender: startPvPSender;
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
				this.waitReadyResponse = true;
				this.waitGameStart = true;
				if (this.gameState == "wait-select-mode") {
					g.game.raiseEvent(new g.MessageEvent(
						new gameMessage("readyClicked", undefined)
					));
				}
				break;
			case FlowEventName.WaitServerResponeReadyPvsP:
				await Helper.waitUntil(() => this.waitReadyResponse == false)
				break;
			case FlowEventName.StartPvsP:
				await Helper.waitUntil(() => this.waitGameStart == false)
				this.otherPlayerGameOver = false;
				setSender(this.startPvPSender, FlowEventName.StartPvsP);
				break;
			case FlowEventName.Control:
				{
					let sen = getSender(FlowEventName.Control) as controlSender;
					//console.log('sennn ', sen.controlID);
					g.game.raiseEvent(new g.MessageEvent(
						new gameMessage("control", sen.controlID)
					));
				}
				break;
			case FlowEventName.OtherControl:
				{
					await Helper.waitUntil(() => this.waitGameStart == false)

				}
				break;
			case FlowEventName.GameOver:
				{
					let sen = getSender(FlowEventName.GameOver) as gameOverSender;
					g.game.raiseEvent(new g.MessageEvent(
						new gameMessage("gameOver", new gameOver(sen.id))
					));
				}
				break;
			case FlowEventName.CleanAndGotoMainMenu:
				{
					console.log('sync clean');

				}
				break;
			case FlowEventName.ServerNotiOtherPlayerGameOver:
				{
					console.log('1 sync step wati game over');
					await Helper.waitUntil(() => this.otherPlayerGameOver == true)
					console.log('2 sync step wati game over');

				}
				break;
			default:
		}
	}

	private _handleMessage(ev: g.MessageEvent): void {
		if (ev.player.id != null) {
			return
		}
		console.log('recive message ', ev);
		var msg = ev.data as gameMessage;
		if (msg.type == "gameOver") {
			let other = msg.data as gameOver;
			if (g.game.selfId != other.id) {
				this.otherPlayerGameOver = true;
			}
		} else {
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
					let x = msg.data as gameStart;
					this.startPvPSender = new startPvPSender();
					this.startPvPSender.cancel = false;
					this.startPvPSender.seed1 = x.seed1;
					this.startPvPSender.seed2 = x.seed2;
					this.startPvPSender.id1 = x.id1;
					this.startPvPSender.id2 = x.id2;
					this.waitGameStart = false;
					this.gameState = "playing";
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
							{
								let data = ev.data as gameMessage;
								if (data.type === "control") {
									let c = data.data as playerControl;
									console.log('consotrllll ', c.playerId);
									let sen = new controlSender();
									sen.controlID = c.controlID;
									sen.playerId = c.playerId;
									globalThis.flowManager.fire(FlowEventName.OtherControl, sen);

								}
							}
							break;
						default:
							console.error('unknown wait state: ', this.gameState);
					}
				}
			}
		}
	}
}