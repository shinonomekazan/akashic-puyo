import { FlowEventName } from "../flow/eventName";
import { BaseStep } from "../flow/step";
import { GameController } from "../gameLogic/gameController";
import { gameState } from "../gamesStateType";
import { Helper } from "../helper";
import { controlID } from "../layout/controller";
import { gameMessage, gameMode, gameOver, gameStart, playerControl, readyClicked, selectMode } from "../messageCode";

export class serverScene extends g.Scene implements BaseStep {
	gameState: gameState = "wait-select-mode";
	playerId1: string;
	playerId2: string;

	private player1: GameController;
	private player2: GameController;

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
					case "gameOver":
						this.gameOver(data.data as gameOver);
						this.cleanGame();
						break;
					default:
						console.error('unknown message type in select-mode ', data.type);
						break;
				}
				break;
			case "gameOver":

				break;
		}
	}

	private gameOver(go: gameOver) {
		console.log('game over, id: ', go.id);
		this.gameState = "gameOver";
		if (this.player1) this.player1.stop();
		if (this.player2) this.player2.stop();
		g.game.raiseEvent(new g.MessageEvent(
			new gameMessage("gameOver", new gameOver(go.id))
		));
	}

	private cleanGame() {
		if (this.player1) {
			this.player1.clean();
			this.player1 = undefined;
		}
		if (this.player2) {
			this.player2.clean();
			this.player2 = undefined;
		}
		this.playerId1 = undefined;
		this.playerId2 = undefined;
		this.gameState = "wait-select-mode";
	}

	private selectMode(mode: gameMode): void {
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
			300
		);

		console.log('p1: ', this.playerId1, ', p2: ', this.playerId2);

		if (this.playerId1 != undefined && this.playerId2 != undefined) {
			console.log('start game');
			let seed1 = 12345;
			let seed2 = 67890;

			// Initialize Controllers in Headless mode (pass undefined/null as parentGame)
			this.player1 = new GameController(this, this.playerId1, 0, seed1, undefined);
			this.player2 = new GameController(this, this.playerId2, 1, seed2, undefined);

			// --- Wiring Logic (Mirrors ClientScene) ---

			// Player 1 attacks Player 2
			this.player1.onGarbageSent.add((amount) => {
				// We do not check for 'view' here since this is headless
				this.player2.model.addNuisance(amount);
			});

			// Player 2 attacks Player 1
			this.player2.onGarbageSent.add((amount) => {
				this.player1.model.addNuisance(amount);
			});

			// Game Over Wiring
			this.player1.onGameOver.add((id) => {
				// Broadcast Game Over logic if needed, or handle internal state
				//this.gameOver();
				// Note: The clientScene sends the GameOver message, so the server 
				// typically receives it via _handleMessage. However, if the server 
				// detects it first via simulation, we might need to broadcast it.
				// For now, we update local state.
			});

			this.player2.onGameOver.add((id) => {
				//this.gameOver();
			});

			// Start Logic
			this.player1.start();
			this.player2.start();

			// Notify Clients
			this.raiseWithDelay(
				new gameMessage(
					"startGamePvP",
					new gameStart(this.playerId1, this.playerId2, seed1, seed2)),
				1000
			);
		}
	}

	private playerControl(idPlayer: string, controlID: controlID) {
		// Use controller to handle input instead of model directly
		if (!this.player1 || !this.player2) return;

		const targetController = (idPlayer === this.playerId1) ? this.player1 : this.player2;
		targetController.handleInput(controlID);
		this.raiseWithDelay(new gameMessage("control", new playerControl(idPlayer, controlID)),1000);
		// Broadcast control to clients so they can mirror the move
		//g.game.raiseEvent(new g.MessageEvent(
		//	new gameMessage("control", new playerControl(idPlayer, controlID))
		//));
	}

	private async raiseWithDelay(data: any, time: number) {
		if (time > 0) {
			await Helper.waitAsync(time);
		}
		g.game.raiseEvent(new g.MessageEvent(data));
	}
}