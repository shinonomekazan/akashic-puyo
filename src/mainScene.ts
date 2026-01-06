import { assetPaths } from "./assetPaths";
import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { FlowCreator } from "./flowCreator";
import { GameBoard } from "./gameBoard";
import { Player } from "./Player";
import { UIManager } from "./uiManager";
import { move_sender } from "./sender";
import { SoundManager } from "./soundManager";
import { SyncFramework } from "./SyncFramework";

export interface GameState {
	isGameStarted: boolean;
	players: { [id: string]: any };
	boards: { [id: string]: any };
	dropTimers: number[];
	gameOverInfo?: { loserPlayerIdx: number; reason: string };
}

export class MainScene extends g.Scene {
	flowManager: FlowManager;
	flowCreator: FlowCreator;
	uiManager: UIManager;
	soundManager: SoundManager;
	syncFramework: SyncFramework<GameState>;

	private dropTimers: number[] = [0, 0];
	private readonly DROP_INTERVAL = 1.0;

	private players: { [id: string]: Player } = {};
	private isGameStarted: boolean = false;

	private waitingForSync: boolean = false;

	private onKeyDownHandler: (ev: any) => void;
	private initialSnapshot: any;

	constructor(param: g.SceneParameterObject, snapshot?: any) {
		param.assetPaths = assetPaths;
		super(param);
		this.initialSnapshot = snapshot;
		this.flowManager = new FlowManager();

		this.onKeyDownHandler = (ev: any) => {
			if (!this.isGameStarted) return;
			if (this.syncFramework) {
				this.syncFramework.dispatch("input", { key: ev.key });
			}
		};

		this.onLoad.add(this.onGameLoad, this);
	}

	private onGameLoad() {
		GameBoard.instances = {};

		const initialState: GameState = {
			isGameStarted: false,
			players: {},
			boards: {},
			dropTimers: [0, 0],
			gameOverInfo: null
		};
		this.syncFramework = new SyncFramework<GameState>(initialState);

		this.registerSyncActions();

		this.soundManager = new SoundManager(this);
		this.uiManager = new UIManager(this, this.soundManager);
		this.uiManager.onControlClick.add((key) => {
			if (!this.isGameStarted) return;
			this.syncFramework.dispatch("input", { key: key });
		});
		this.flowCreator = new FlowCreator(
			this.flowManager,
			this.uiManager,
			this,
			this.soundManager
		);
		this.uiManager.onLobbyClick.add(() => {
			const myPlayer = this.players[g.game.selfId];
			if (!myPlayer) {
				const seed = Math.floor(g.game.random.generate() * 1000000);
				this.syncFramework.dispatch("join", { seed: seed });
			} else if (!myPlayer.ready) {
				this.syncFramework.dispatch("ready", {});
			}
		});

		this.uiManager.onRestartClick.add(() => {
			this.syncFramework.dispatch("restart", {});
		});

		g.game.onSkipChange.add((skipping) => {
			if (!skipping) {
				for (let id in GameBoard.instances) {
					GameBoard.get(id).renderBoard();
				}
			}
		});

		this.syncFramework.init(this, this.initialSnapshot, (state) => {
			this.restoreGame(state);
		});

		if (!this.initialSnapshot) {
			this.refreshLobbyState();
		}

		if (typeof window !== "undefined") {
			window.addEventListener("keydown", this.onKeyDownHandler);
		}

		this.onUpdate.add(() => {
			this.syncStateFromGame();

			const myBoard = GameBoard.get(g.game.selfId);
			if (this.waitingForSync) {
				if (myBoard && myBoard.busyUntil > g.game.age) {
					this.uiManager.showLoadingUI();
				} else {
					this.waitingForSync = false;
					this.uiManager.hideLoadingUI();
				}
			} else {
				this.uiManager.hideLoadingUI();
			}

			if (!this.isGameStarted) return;

			const hostId = Object.keys(this.players).find(pid => this.players[pid].pIdx === 0);
			if (g.game.selfId !== hostId) return;

			Object.keys(this.players).forEach((id) => {
				const player = this.players[id];
				const board = GameBoard.get(id);

				if (!board || board.isPaused || board.isAnimating || board.busyUntil > g.game.age) {
					return;
				}

				if (!board.currentPuyo) {
					// HOST LOGIC:
					// We must generate colors using the BOARD's RNG to ensure it's tied to the synced seed.
					// 1. Determine Current Colors
					let currentColors = null;
					if (board.nextPuyo) {
						currentColors = {
							colorMain: board.nextPuyo.colorMain,
							colorSub: board.nextPuyo.colorSub
						};
					} else {
						// First turn: generate current colors
						currentColors = board.generateRandomColors();
					}

					// 2. Generate NEW Next Colors
					const nextColors = board.generateRandomColors();

					this.syncFramework.dispatch("spawn", {
						pIdx: player.pIdx,
						nextColors: nextColors,
						currentColors: currentColors
					});
					return;
				}

				if (this.dropTimers[player.pIdx] === undefined) {
					this.dropTimers[player.pIdx] = player.pIdx * 0.1;
				}

				this.dropTimers[player.pIdx] += 1 / g.game.fps;
				if (this.dropTimers[player.pIdx] >= this.DROP_INTERVAL) {
					this.dropTimers[player.pIdx] = 0;
					this.syncFramework.dispatch("autoDrop", { pIdx: player.pIdx });
				}
			});
		});
	}

	private registerSyncActions() {
		this.syncFramework.register(
			"join",
			(state, payload, senderId) => {
				if (!state.players[senderId] && Object.keys(state.players).length < 2) {
					const pIdx = Object.keys(state.players).length;
					const seed = payload.seed;
					state.players[senderId] = { id: senderId, pIdx: pIdx, ready: false, rngSeed: seed };
				}
			},
			(_, __, state) => {
				for (const id in state.players) {
					this.createPlayer(id, state.players[id].rngSeed);
					if (state.players[id].ready && this.players[id]) {
						this.players[id].ready = true;
					}
				}
				this.checkAndStartGame();
				if (!this.isGameStarted) this.refreshLobbyState();
			}
		);

		this.syncFramework.register(
			"ready",
			(state, _, senderId) => {
				if (state.players[senderId]) {
					state.players[senderId].ready = true;
				}
			},
			(_, __, state) => {
				for (const id in state.players) {
					if (this.players[id]) {
						this.players[id].ready = state.players[id].ready;
					}
				}
				this.checkAndStartGame();
				if (!this.isGameStarted) this.refreshLobbyState();
			}
		);

		this.syncFramework.register(
			"restart",
			(state, _) => {
				state.isGameStarted = false;
				state.gameOverInfo = null;
				for (const id in state.players) {
					state.players[id].ready = false;
				}
				state.dropTimers = [0, 0];
			},
			() => {
				Object.values(this.players).forEach((p) => (p.ready = false));
				this.dropTimers = [0, 0];
				this.flowManager.fireAsync(FlowEventName.ResetGame);
				this.refreshLobbyState();
			}
		);

		this.syncFramework.register(
			"input",
			(state, payload, senderId) => {
				payload._senderId = senderId;
			},
			(payload, isLocal, state) => {
				const senderId = payload._senderId;
				let targetPlayerId = senderId;

				if (!this.players[targetPlayerId]) {
					return;
				}

				if (this.players[targetPlayerId]) {
					const board = GameBoard.get(targetPlayerId);
					if (board && board.busyUntil > g.game.age) return;
					this.handleGameplayMessage(this.players[targetPlayerId], payload);
				}
			}
		);

		this.syncFramework.register(
			"spawn",
			(state, payload) => {
			},
			(payload, isLocal, state) => {
				const board = GameBoard.getByIndex(payload.pIdx);
				if (board) {
					board.spawnPuyo(payload.nextColors, payload.currentColors);
				}
			}
		);

		this.syncFramework.register(
			"autoDrop",
			(state, payload) => {
				if (state.dropTimers[payload.pIdx] !== undefined) {
					state.dropTimers[payload.pIdx] = 0;
				}
			},
			(payload, isLocal, state) => {
				this.dropTimers[payload.pIdx] = 0;

				const board = GameBoard.getByIndex(payload.pIdx);
				if (!board || !board.currentPuyo) return;

				if (board.isValid(board.currentPuyo.x, board.currentPuyo.y + 1, board.currentPuyo.rot)) {
					board.currentPuyo.y += 1;
					board.updatePuyoView();
				} else {
					let sen = new move_sender(payload.pIdx);
					sen.xy = { x: 0, y: 1 };
					sen.isHardDrop = false;
					this.flowManager.fireAsync(FlowEventName.Move, sen);
				}
			}
		);
	}

	private syncStateFromGame() {
		if (!this.syncFramework) return;

		const state = this.syncFramework.state;
		state.isGameStarted = this.isGameStarted;
		state.dropTimers = this.dropTimers;

		for (const id in this.players) {
			if (!state.players[id]) state.players[id] = { id: id, pIdx: this.players[id].pIdx };
			state.players[id].ready = this.players[id].ready;
		}

		for (const id in GameBoard.instances) {
			state.boards[id] = GameBoard.instances[id].getSnapshot();
		}
	}

	public saveGameSnapshot() {
		if (!this.syncFramework) return;
		this.syncStateFromGame();
		g.game.saveSnapshot(this.syncFramework.state);
	}

	public setGameOver(loserPlayerIdx: number, reason: string) {
		this.isGameStarted = false;
		if (this.syncFramework) {
			this.syncFramework.state.gameOverInfo = {
				loserPlayerIdx: loserPlayerIdx,
				reason: reason
			};
		}
		this.saveGameSnapshot();
	}

	private restoreGame(state: GameState) {
		if (!state) return;

		if (state.isGameStarted) {
			this.waitingForSync = true;
		}

		GameBoard.instances = {};
		this.players = {};

		this.isGameStarted = state.isGameStarted;
		this.dropTimers = state.dropTimers || [0, 0];
		this.uiManager.hideLobbyUI();

		const snapshotPlayerIds = Object.keys(state.players);
		const selfId = g.game.selfId;
		const amIInSnapshot = snapshotPlayerIds.includes(selfId);

		let idMap: { [snapshotId: string]: string } = {};

		if (!amIInSnapshot && snapshotPlayerIds.length > 0) {
			const hostSnapshotId = snapshotPlayerIds.find(pid => state.players[pid].pIdx === 0);
			if (hostSnapshotId) {
				idMap[hostSnapshotId] = selfId;
			}

			const p2SnapshotId = snapshotPlayerIds.find(pid => state.players[pid].pIdx === 1);
			if (p2SnapshotId && !idMap[hostSnapshotId]) {
				idMap[p2SnapshotId] = selfId;
			}
		}

		for (const oldId in state.players) {
			const pData = state.players[oldId];
			const liveId = idMap[oldId] || oldId;

			const player = new Player(liveId, pData.pIdx, this.flowManager);
			player.initFromSnapshot(pData);
			this.players[liveId] = player;
		}

		const boardIds = Object.keys(state.boards || {}).sort((a, b) => {
			return 0;
		});

		for (const oldId of boardIds) {
			const bData = state.boards[oldId];
			const liveId = idMap[oldId] || oldId;

			GameBoard.createPlayerBoard(
				liveId,
				bData.playerIndex,
				this,
				this.uiManager.gameLayer,
				this.flowManager,
				bData.rngSeed
			);
		}

		for (const oldId of boardIds) {
			const bData = state.boards[oldId];
			const liveId = idMap[oldId] || oldId;
			const board = GameBoard.get(liveId);

			if (board) {
				board.initFromSnapshot(bData);

				this.uiManager.updateScore(board.playerIndex, board.score);
				if (board.nextPuyo) {
					this.uiManager.updateNextPuyo(
						board.playerIndex,
						board.nextPuyo.colorMain,
						board.nextPuyo.colorSub
					);
				}
			}
		}

		if (state.gameOverInfo) {
			this.uiManager.showScoreUI();
			this.uiManager.refreshScoreLayout();

			const { loserPlayerIdx, reason } = state.gameOverInfo;
			let myIdx = -1;
			const myBoard = GameBoard.get(g.game.selfId);
			if (myBoard) {
				myIdx = myBoard.playerIndex;
			}

			let msgKey = "";
			let args: any[] = [];

			if (reason === "disconnect") {
				if (myIdx !== -1 && loserPlayerIdx === myIdx) {
					msgKey = "you_lose";
				} else {
					msgKey = "opp_left_win";
				}
			} else {
				if (myIdx === -1) {
					msgKey = "p_lose";
					args = [loserPlayerIdx + 1];
				} else {
					if (loserPlayerIdx === myIdx) {
						msgKey = "you_lose";
					} else {
						msgKey = "you_win";
					}
				}
			}
			this.uiManager.showGameOverUI(msgKey, args);
		} else if (this.isGameStarted) {
			this.uiManager.showScoreUI();
			this.uiManager.refreshScoreLayout();
			FlowManager.eventName = FlowEventName.Move;
		} else {
			this.refreshLobbyState();
		}
	}

	destroy(): void {
		if (typeof window !== "undefined") {
			window.removeEventListener("keydown", this.onKeyDownHandler);
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
		const amIPlayer = myPlayer !== undefined;

		let textKey = "";
		let enableButton = false;
		let showWaitSprite = false;

		const hasOpponentReady = Object.values(this.players).some(p => p.id !== myId && p.ready);

		if (amIPlayer) {
			if (playerCount === 1) {
				textKey = "wait_p2";
				enableButton = false;
			} else {
				if (myPlayer.ready) {
					textKey = "wait_opp_action";
					enableButton = false;
				} else {
					textKey = "click_ready";
					enableButton = true;
					if (hasOpponentReady) {
						showWaitSprite = true;
					}
				}
			}
		} else {
			if (playerCount >= 2) {
				textKey = "room_full";
				enableButton = false;
			} else {
				textKey = "click_ready";
				enableButton = true;
			}
		}

		this.flowManager.fireAsync(FlowEventName.UpdateLobbyUI, {
			textKey: textKey,
			enableButton: enableButton,
			showWaitSprite: showWaitSprite,
		});
	}

	private createPlayer(id: string, rngSeed?: number) {
		if (this.players[id]) return this.players[id];

		const currentCount = Object.keys(this.players).length;
		if (currentCount >= 2) return null;

		GameBoard.createPlayerBoard(
			id,
			currentCount,
			this,
			this.uiManager.gameLayer,
			this.flowManager,
			rngSeed
		);
		const player = new Player(id, currentCount, this.flowManager);
		this.players[id] = player;

		if (id === g.game.selfId) {
			for (let pid in this.players) {
				GameBoard.get(pid).renderBoard();
			}
			this.uiManager.refreshScoreLayout();
		}

		return player;
	}

	private handleGameplayMessage(player: Player, data: any) {
		if (data.key) {
			player.handleInput(data.key, () => {

			});
		}
	}

	private checkAndStartGame() {
		const allPlayers = Object.values(this.players);
		const isEnoughPlayers = allPlayers.length === 2;
		const allReady = allPlayers.every((p) => p.ready);

		if (isEnoughPlayers && allReady) {
			if (!this.isGameStarted) {
				this.isGameStarted = true;
				this.flowManager.fireAsync(FlowEventName.GameLoad);
			}
		}
	}
}