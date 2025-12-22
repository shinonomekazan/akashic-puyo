import { assetPaths } from "./assetPaths";
import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { FlowCreator } from "./flowCreator";
import { GameBoard } from "./gameBoard";
import { Player } from "./Player";
import { UIManager } from "./uiManager";
import { gameOver_sender, move_sender } from "./sender";

export class MainScene extends g.Scene {
	flowManager: FlowManager;
	flowCreator: FlowCreator;
	uiManager: UIManager;

	private dropTimers: number[] = [0, 0];
	private readonly DROP_INTERVAL = 1.0;

	private players: { [id: string]: Player } = {};
	private isGameStarted: boolean = false;

	private onKeyDownHandler: (ev: any) => void;

	constructor(param: g.SceneParameterObject) {
		param.assetPaths = assetPaths;
		super(param);
		this.flowManager = new FlowManager();

		this.onKeyDownHandler = (ev: any) => {
			if (!this.isGameStarted) return;
			this.game.raiseEvent(new g.MessageEvent({ type: "input", key: ev.key, id: this.game.selfId }));
		};

		this.onLoad.add(this.onGameLoad, this);
		this.onMessage.add(this.handleMessage, this);
	};

	private onGameLoad() {
		this.uiManager = new UIManager(this);
		this.flowCreator = new FlowCreator(this.flowManager, this.uiManager, this);

		this.uiManager.onLobbyClick.add(() => {
			const myPlayer = this.players[g.game.selfId];
			if (myPlayer && !myPlayer.ready) {
				g.game.raiseEvent(new g.MessageEvent({ type: "ready" }));
			}
		});

		this.uiManager.onRestartClick.add(() => {
			g.game.raiseEvent(new g.MessageEvent({ type: "restart" }));
		});

		g.game.onJoin.add((player) => {
			console.log('count join ', g.game.joinedPlayerIds.length);

			if (!this.players[player.player.id]) {
				if (Object.keys(this.players).length < 2) {
					this.createPlayer(player.player.id);
				}
			}

			this.refreshLobbyState();
		});

		g.game.onLeave.add((player) => {
			const leftId = player.player.id;
			if (this.players[leftId]) {
				const leftPlayer = this.players[leftId];
				delete this.players[leftId];

				if (Object.keys(this.players).length === 0) {
					this.isGameStarted = false;
					this.dropTimers = [0, 0];
					this.flowManager.fireAsync(FlowEventName.ResetGame);
				} else {
					if (this.isGameStarted) {
						this.flowManager.fireAsync(FlowEventName.GameOver, new gameOver_sender(leftPlayer.pIdx, "disconnect"));
					} else {
						this.refreshLobbyState();
					}
				}
			}
		});

		if (typeof window !== "undefined") {
			window.addEventListener('keydown', this.onKeyDownHandler);
		}

		this.onUpdate.add(() => {
			if (!this.isGameStarted) return;
			Object.keys(this.players).forEach(id => {
				const player = this.players[id];
				const board = player.board;
				if (!board || board.isPaused || board.isAnimating) return;

				this.dropTimers[player.pIdx] += 1 / g.game.fps;
				if (this.dropTimers[player.pIdx] >= this.DROP_INTERVAL) {
					this.dropTimers[player.pIdx] = 0;
					let sen = new move_sender(player.pIdx);
					sen.xy = { x: 0, y: 1 }
					sen.isHardDrop = false;
					this.flowManager.fireAsync(FlowEventName.Move, sen);
				}
			});
		});
	}

	//override
	destroy(): void {
		if (typeof window !== "undefined") {
			window.removeEventListener('keydown', this.onKeyDownHandler);
		}
		super.destroy();
	}

	public setGameStarted(started: boolean) {
		this.isGameStarted = started;
	}

	private refreshLobbyState() {
		if (this.isGameStarted) return;

		const playerCount = Object.keys(this.players).length;
		const myId = g.game.selfId;
		const myPlayer = this.players[myId];
		const amIPlayer = (myPlayer !== undefined);

		let textKey = "";
		let enableButton = false;
		let showWaitSprite = false;

		if (amIPlayer) {
			if (playerCount === 1) {
				textKey = "wait_p2";
				enableButton = false;
			} else {
				if (myPlayer.ready) {
					textKey = "wait_opp_action";
					enableButton = false;
					showWaitSprite = true;
				} else {
					textKey = "click_ready";
					enableButton = true;
				}
			}
		} else {
			if (playerCount >= 2) {
				textKey = "room_full";
				enableButton = false;
			} else {
				textKey = "join_room";
				enableButton = false;
			}
		}

		this.flowManager.fireAsync(FlowEventName.UpdateLobbyUI, { textKey: textKey, enableButton: enableButton, showWaitSprite: showWaitSprite });
	}

	private createPlayer(id: string) {
		if (this.players[id]) return this.players[id];

		const currentCount = Object.keys(this.players).length;
		if (currentCount >= 2) return null;

		const board = GameBoard.createPlayerBoard(id, currentCount, this, this.uiManager.gameLayer, this.flowManager);
		const player = new Player(id, currentCount, board, this.flowManager);
		this.players[id] = player;

		return player;
	}

	private handleMessage(ev: g.MessageEvent) {
		if (!ev.data) return;

		if (ev.data.type === "restart") {
			Object.values(this.players).forEach(p => p.ready = false);
			this.flowManager.fireAsync(FlowEventName.ResetGame);
			this.refreshLobbyState();
			return;
		}

		if (!ev.player || !ev.player.id) return;

		const idOfPlayerSend = ev.player.id;
		const player = this.players[idOfPlayerSend];

		if (this.isGameStarted) {
			if (player) {
				this.handleGameplayMessage(player, ev.data);
			}
		} else {
			this.handleLobbyMessage(idOfPlayerSend, ev.data);
		}
	}

	private handleLobbyMessage(senderId: string, data: any) {
		if (data.type === "ready") {
			if (this.players[senderId]) {
				this.players[senderId].ready = true;
			}
			this.checkAndStartGame();

			if (!this.isGameStarted) {
				this.refreshLobbyState();
			}
		}
	}

	private handleGameplayMessage(player: Player, data: any) {
		if (data.type === "input") {
			player.handleInput(data.key, () => {
				this.dropTimers[player.pIdx] = 0;
			});
		}
	}

	private checkAndStartGame() {
		const allPlayers = Object.values(this.players);
		const isEnoughPlayers = allPlayers.length === 2;
		const allReady = allPlayers.every(p => p.ready);

		if (isEnoughPlayers && allReady) {
			if (!this.isGameStarted) {
				this.isGameStarted = true;
				this.flowManager.fireAsync(FlowEventName.GameLoad);
			}
		}
	}
}