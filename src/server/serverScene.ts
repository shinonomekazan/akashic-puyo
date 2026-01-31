import { FlowEventName } from "../flow/eventName";
import { BaseStep } from "../flow/step";
import { GameBoardModel } from "../gameLogic/gameBoard.model";
import { gameState } from "../gamesStateType";
import { Helper } from "../helper";
import { controlID } from "../layout/controller";
import { gameMessage, gameMode, gameStart, playerControl, readyClicked, selectMode } from "../messageCode";
export class serverScene extends g.Scene implements BaseStep {
	gameState: gameState = "wait-select-mode"
	playerId1: string;
	playerId2: string;
	private p1Model: GameBoardModel;
	private p2Model: GameBoardModel;
	constructor(param: g.SceneParameterObject) {
		super(param);
		this.onLoad.add(this.onGameLoad, this);
	}
	private onGameLoad() {
		console.clear();
		console.log('server scene loaded, playID: ', g.game.playId);
		g.game.scene().onMessage.add(this._handleMessage, this);
	}
	async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.Init:
				console.log("[MainSceneStep] Init complete.");
				break;
		}
	}
	private _handleMessage(ev: g.MessageEvent): void {
		if (!ev.data || ev.player.id == null) {
			return;
		}
		//console.log('[serve] recive message ', ev, ', id = ', ev.player.id);
		const data = ev.data as gameMessage;
		switch (this.gameState) {
			case "wait-select-mode":
				switch (data.type) {
					case "selectGameMode":
						this.selectMode(data.data as gameMode);
						this.gameState = "playing";
						break;
					case "readyClicked":
						this.clientReadyClicked(ev.player.id);
						break;
					case "control":
						this.playerControl(ev.player.id, data.data as controlID);
						break;
					default:
						console.error('unknown message type in select-mode ', data.type);
						break;
				}
				break;
		}


	}
	private selectMode(mode: gameMode): void {
		//console.log("recive mgs select mode -> raise all client to mode: ", mode);
		g.game.raiseEvent(new g.MessageEvent(
			new selectMode(mode)
		));
	}
	private clientReadyClicked(idClicked: string) {
		if (this.playerId1 == undefined) {
			this.playerId1 = idClicked;
		} else {
			if (this.playerId2 == undefined) {
				this.playerId2 = idClicked;
			}
		}
		this.raiseWithDelay(
			new gameMessage(
				"readyClicked",
				new readyClicked(idClicked)),
			300)
		console.log('p1: ', this.playerId1, ', p2: ', this.playerId2);
		if (this.playerId1 != undefined && this.playerId2 != undefined) {
			console.log('start game');
			let seed1 = 12345;
			let seed2 = 67890;
			this.p1Model = new GameBoardModel(this.playerId1, 0, seed1);
			this.p2Model = new GameBoardModel(this.playerId2, 1, seed2);
			this.raiseWithDelay(
				new gameMessage(
					"startGamePvP",
					new gameStart(this.playerId1, this.playerId2, seed1, seed2)),
				1000)
		}
	}
	private playerControl(idPlayer: string, controlID: controlID) {
		const targetModel = (idPlayer === this.playerId1) ? this.p1Model : this.p2Model;
		targetModel.moveWithControlInput(controlID);
		g.game.raiseEvent(new g.MessageEvent(
			new gameMessage("control", new playerControl(idPlayer, controlID))
		));
	}
	private async raiseWithDelay(data: any, time: number) {
		if (time > 0) {
			await Helper.waitAsync(time)
		}
		g.game.raiseEvent(new g.MessageEvent(data));
	}
}