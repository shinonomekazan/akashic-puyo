import { assetPaths } from "./assetPaths";
import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { FlowCreator } from "./flowCreator";
import { GameBoard } from "./gameBoard";
import { Player } from "./Player";
import { UIManager } from "./uiManager";
import { addGarbage_sender, gameLoad_sender, move_sender, selectMode_sender } from "./sender";
import { SoundManager } from "./soundManager";
import { SyncFramework } from "./SyncFramework";

export type GameMode = "SOLO" | "NPC" | "PVP" | "NONE";
export type PlayerStatus = "LOBBY" | "PLAYING" | "GAMEOVER";

export interface GameState {
	players: {
		[id: string]: {
			id: string;
			pIdx: number;
			ready: boolean;
			isBot: boolean;
			rngSeed: number;
			mode: GameMode;
			status: PlayerStatus;
		};
	};
	boards: { [id: string]: any };
	dropTimers: { [id: string]: number };
}

export interface MainSceneParameterObject extends g.SceneParameterObject {
	snapshot?: any;
}

export class MainScene extends g.Scene {
	flowManager: FlowManager;
	flowCreator: FlowCreator;
	uiManager: UIManager;
	soundManager: SoundManager;
	syncFramework: SyncFramework<GameState>;

	public layerBackground: g.E;
	public layerGame: g.E;

	private dropTimers: { [id: string]: number } = {};
	private botActionTimer: number = 0;
	private readonly DROP_INTERVAL = 1.0;

	private players: { [id: string]: Player } = {};
	private waitingForSync: boolean = false;

	private onKeyDownHandler: (ev: any) => void;
	private localMode: GameMode = "NONE";
	private snapshot: any;

	constructor(param: MainSceneParameterObject) {
		param.assetPaths = assetPaths;
		super(param);
		this.snapshot = param.snapshot;
		this.flowManager = new FlowManager();

		this.onKeyDownHandler = (ev: any) => {
			const myP = this.syncFramework?.state.players[g.game.selfId];
			if (!myP || myP.status !== "PLAYING") return;

			if (ev.key === "g") {
				this.syncFramework.dispatch("garbage", {
					targetId: g.game.selfId,
					amount: 12,
				});
				return;
			}

			if (this.syncFramework) {
				this.syncFramework.dispatch("input", { key: ev.key });
			}
		};
		this.onLoad.add(this.onGameLoad, this);
	}

	private onGameLoad() {
		console.log('g.game.playId =  ', g.game.playId, ", player id = ", g.game.selfId);
		GameBoard.instances = {};

		this.layerBackground = new g.E({ scene: this });
		this.append(this.layerBackground);

		this.layerGame = new g.E({ scene: this });
		this.append(this.layerGame);

		this.soundManager = new SoundManager(this);

		this.uiManager = new UIManager(this, this.soundManager);

		if ((this.uiManager as any).layoutRoot) {
			(this.uiManager as any).layoutRoot.remove();
			this.layerBackground.append((this.uiManager as any).layoutRoot);
		}

		this.uiManager.onControlClick.add((key) => {
			const myP = this.syncFramework?.state.players[g.game.selfId];
			if (!myP || myP.status !== "PLAYING") return;

			this.syncFramework.dispatch("input", { key: key });
		});
		this.flowCreator = new FlowCreator(
			this.flowManager,
			this.uiManager,
			this,
			this.soundManager
		);
		this.uiManager.onLobbyClick.add(() => {
			if (this.localMode === "PVP") {
				this.syncFramework.dispatch("ready", {});
			}
		});

		this.uiManager.onSelectMode.add((mode) => {
			if (this.localMode === "NONE") {
				this.syncFramework.dispatch("selectMode", { mode: mode });
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
			this.refreshLobbyState();
		});

		if (this.snapshot) {
			this.syncFramework = new SyncFramework<GameState>(this.snapshot);
			this.registerSyncActions();
			this.syncFramework.init(this, (state) => { });
			this.restoreFromSnapshot();
		} else {
			const initialState: GameState = {
				players: {},
				boards: {},
				dropTimers: {},
			};
			this.syncFramework = new SyncFramework<GameState>(initialState);
			this.registerSyncActions();
			this.syncFramework.init(this, (state) => { });

			const seed = Math.floor(g.game.random.generate() * 1000000);
			this.syncFramework.dispatch("join", { seed: seed });
		}

		if (typeof window !== "undefined") {
			window.addEventListener("keydown", this.onKeyDownHandler);
		}

		this.onUpdate.add(() => {
			this.syncStateFromGame();
			this.updateBotLogic();

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

			const statePlayers = this.syncFramework.state.players;
			Object.keys(statePlayers).forEach((id) => {
				const pState = statePlayers[id];

				if (pState.status !== "PLAYING") return;

				let isAuthority = false;

				if (pState.mode === "SOLO") {
					isAuthority = id === g.game.selfId;
				} else if (pState.mode === "NPC") {
					if (id === g.game.selfId) isAuthority = true;
					if (pState.isBot && id.indexOf(g.game.selfId) !== -1)
						isAuthority = true;
				} else {
					isAuthority =
						g.game.selfId === Object.keys(statePlayers)[0];
				}

				if (!isAuthority) return;

				const board = GameBoard.get(id);
				const playerObj = this.players[id];

				if (
					!board ||
					!playerObj ||
					board.isPaused ||
					board.isAnimating ||
					board.busyUntil > g.game.age
				) {
					return;
				}

				if (!board.currentPuyo) {
					let currentColors = null;
					if (board.nextPuyo) {
						currentColors = {
							colorMain: board.nextPuyo.colorMain,
							colorSub: board.nextPuyo.colorSub,
						};
					} else {
						currentColors = board.generateRandomColors();
					}

					const nextColors = board.generateRandomColors();

					this.syncFramework.dispatch("spawn", {
						pIdx: playerObj.pIdx,
						targetId: id,
						nextColors: nextColors,
						currentColors: currentColors,
					});
					return;
				}

				if (this.dropTimers[id] === undefined) {
					this.dropTimers[id] = 0;
				}

				this.dropTimers[id] += 1 / g.game.fps;
				if (this.dropTimers[id] >= this.DROP_INTERVAL) {
					this.dropTimers[id] = 0;
					this.syncFramework.dispatch("autoDrop", {
						pIdx: playerObj.pIdx,
						targetId: id,
					});
				}
			});
		});
	}

	private restoreFromSnapshot() {
		let currentState: any = this.syncFramework.state;
		if (Array.isArray(currentState)) {
			const boardList = currentState;
			const reconstructedState: GameState = {
				players: {},
				boards: {},
				dropTimers: {}
			};
			let inferredMode: GameMode = "SOLO";
			if (boardList.length > 1) {
				const hasBot = boardList.some((b: any) => b.id && typeof b.id === "string" && b.id.indexOf("BOT") !== -1);
				inferredMode = hasBot ? "NPC" : "PVP";
			}
			boardList.forEach((boardData: any) => {
				const pId = boardData.id;
				reconstructedState.boards[pId] = boardData;
				reconstructedState.players[pId] = {
					id: pId,
					pIdx: boardData.playerIndex,
					ready: true,
					isBot: (typeof pId === "string" && pId.indexOf("BOT") !== -1),
					rngSeed: boardData.rngSeed,
					mode: inferredMode,
					status: "PLAYING"
				};
			});

			this.syncFramework.state = reconstructedState;
			currentState = reconstructedState;
			this.FireGameLoad();
		}

		const state = this.syncFramework.state;

		if (!state.players) state.players = {};
		if (!state.boards) state.boards = {};
		if (!state.dropTimers) state.dropTimers = {};

		console.log("Restoring state:", state);
		this.dropTimers = state.dropTimers;

		const myP = state.players[g.game.selfId];

		if (myP) {
			this.localMode = myP.mode;
		} else {
			const firstPId = Object.keys(state.players)[0];
			if (firstPId) {
				this.localMode = state.players[firstPId].mode;
			}
		}

		if (this.localMode === "SOLO") {
			GameBoard.totalBoardsInGame = 1;
		} else if (this.localMode === "NPC" || this.localMode === "PVP") {
			GameBoard.totalBoardsInGame = 2;
		}

		Object.keys(state.players).forEach((id) => {
			const pState = state.players[id];
			const player = this.createPlayer(id, pState.pIdx, pState.rngSeed, pState.isBot);
			player.initFromSnapshot(pState);

			if (state.boards[id]) {
				const board = GameBoard.get(id);
				board.initFromSnapshot(state.boards[id]);

				this.uiManager.updateScore(board.playerIndex, board.score);
				this.uiManager.setGarbageCount(board.playerIndex, board.nuisanceQueue);

				if (board.nextPuyo) {
					this.uiManager.updateNextPuyo(
						board.playerIndex,
						board.nextPuyo.colorMain,
						board.nextPuyo.colorSub
					);
				}
			}
		});

		if (myP) {
			this.uiManager.updateModeLabel(myP.mode);
			if (myP.status === "PLAYING") {
				this.uiManager.hideModeSelection();
				this.uiManager.hidePvPLobby();
				this.uiManager.showScoreUI();
				this.uiManager.refreshScoreLayout();
			} else if (myP.status === "LOBBY") {
				this.refreshLobbyState();
			} else if (myP.status === "GAMEOVER") {
				myP.status = "LOBBY";
				myP.mode = "NONE";
				myP.ready = false;
				this.handleLocalReset();
			}
		} else {
			const hasPlayers = Object.keys(state.players).length > 0;
			const isGameOver = Object.keys(state.players).some(key => state.players[key].status === "GAMEOVER");

			if (hasPlayers && !isGameOver) {
				this.uiManager.hideModeSelection();
				this.uiManager.hidePvPLobby();
				this.uiManager.showScoreUI();
				this.uiManager.refreshScoreLayout();
			} else {
				const isHost = Object.keys(state.players).length === 0;
				this.uiManager.showModeSelection(isHost);
			}
		}
	}

	private updateBotLogic() {
		const statePlayers = this.syncFramework?.state?.players;
		if (!statePlayers) return;

		const myP = statePlayers[g.game.selfId];
		if (!myP || myP.status !== "PLAYING") return;

		this.botActionTimer++;
		if (this.botActionTimer > 30) {
			this.botActionTimer = 0;
			for (const id in statePlayers) {
				const p = statePlayers[id];
				let isMyBot = p.isBot && id.indexOf(g.game.selfId) !== -1;

				if (isMyBot && p.status === "PLAYING") {
					const rand = g.game.random.generate();
					let key = "";
					if (rand < 0.2) key = "ArrowLeft";
					else if (rand < 0.4) key = "ArrowRight";
					else if (rand < 0.6) key = "ArrowUp";
					else if (rand < 0.8) key = "ArrowDown";

					if (key) {
						this.syncFramework.dispatch("input", {
							key: key,
							senderOverride: id,
						});
					}
				}
			}
		}
	}

	private registerSyncActions() {
		this.syncFramework.register(
			"join",
			(state, payload, senderId) => {
				if (!state.players[senderId]) {
					const pIdx = Object.keys(state.players).length;
					state.players[senderId] = {
						id: senderId,
						pIdx: pIdx,
						ready: false,
						rngSeed: payload.seed,
						isBot: false,
						mode: "NONE",
						status: "LOBBY",
					};
				}
			},
			(_, __, state) => {
				this.refreshLobbyState();
			}
		);

		this.syncFramework.register(
			"selectMode",
			(state, payload, senderId) => {
				if (state.players[senderId]) {
					state.players[senderId].mode = payload.mode;
					state.players[senderId].ready = false;

					if (payload.mode === "NPC") {
						const botId = "BOT_" + senderId;
						state.players[botId] = {
							id: botId,
							pIdx: 99,
							ready: true,
							rngSeed: Date.now(),
							isBot: true,
							mode: "NPC",
							status: "LOBBY",
						};
					}
				}
			},
			(payload, isLocal, state) => {
				const myP = state.players[g.game.selfId];
				if (!myP) return;

				if (isLocal) {
					this.localMode = myP.mode;

					if (myP.mode === "SOLO") {
						GameBoard.totalBoardsInGame = 1;
						this.syncFramework.dispatch("ready", { mode: "SOLO" });
					} else if (myP.mode === "NPC") {
						GameBoard.totalBoardsInGame = 2;
						this.syncFramework.dispatch("ready", { mode: "NPC" });
					} else if (myP.mode === "PVP") {
						GameBoard.totalBoardsInGame = 2;
						this.refreshLobbyState();
					}
				} else {
					if (myP.mode === "PVP" && payload.mode === "PVP") {
						this.refreshLobbyState();
					}
				}
			}
		);

		this.syncFramework.register(
			"ready",
			(state, payload, senderId) => {
				const p = state.players[senderId];
				if (p) {
					p.ready = true;
					if (payload.mode === "SOLO" || payload.mode === "NPC") {
						p.status = "PLAYING";
						if (payload.mode === "NPC") {
							const botId = "BOT_" + senderId;
							if (state.players[botId])
								state.players[botId].status = "PLAYING";
						}
					}
				}
			},
			(payload, _, state) => {
				const myP = state.players[g.game.selfId];
				if (!myP) return;

				if (myP.status === "PLAYING") {
					if (myP.mode === "SOLO") {
						this.startLocalGame([g.game.selfId]);
					} else if (myP.mode === "NPC") {
						this.startLocalGame([
							g.game.selfId,
							"BOT_" + g.game.selfId,
						]);
					} else if (myP.mode === "PVP") {
						const pvpPlayers = Object.values(state.players).filter(
							(p) => p.mode === "PVP"
						);
						if (
							pvpPlayers.length >= 2 &&
							pvpPlayers.every((p) => p.ready)
						) {
						}
					}
				} else {
					if (myP.mode === "PVP") {
						const pvpPlayers = Object.values(state.players).filter(
							(p) => p.mode === "PVP"
						);
						if (
							pvpPlayers.length >= 2 &&
							pvpPlayers.every((p) => p.ready)
						) {
							const hostPlayer =
								pvpPlayers.find((p) => p.pIdx === 0) ||
								pvpPlayers[0];
							if (hostPlayer.id === g.game.selfId) {
								this.syncFramework.dispatch("setPlaying", {});
							}
							this.refreshLobbyState();
						} else {
							this.refreshLobbyState();
						}
					}
				}
			}
		);

		this.syncFramework.register(
			"setPlaying",
			(state, _, senderId) => {
				Object.keys(state.players).forEach((id) => {
					if (state.players[id].mode === "PVP") {
						state.players[id].status = "PLAYING";
					}
				});
			},
			(_, __, state) => {
				const myP = state.players[g.game.selfId];
				if (myP && myP.mode === "PVP" && myP.status === "PLAYING") {
					const pvpIds = Object.keys(state.players).filter(
						(id) => state.players[id].mode === "PVP"
					);
					this.startLocalGame(pvpIds);
				}
			}
		);

		this.syncFramework.register(
			"gameOver",
			(state, payload, senderId) => {
				const loser = state.players[payload.loserIdx];
				if (loser) {
					loser.status = "GAMEOVER";

					if (loser.mode === "NPC") {
						const humanId = loser.isBot
							? loser.id.replace("BOT_", "")
							: loser.id;
						const botId = "BOT_" + humanId;

						if (state.players[humanId])
							state.players[humanId].status = "GAMEOVER";
						if (state.players[botId])
							state.players[botId].status = "GAMEOVER";
					}
				}

				if (
					state.players[senderId] &&
					state.players[senderId].mode === "PVP"
				) {
					const pvpPlayers = Object.values(state.players).filter(
						(p) => p.mode === "PVP"
					);
					pvpPlayers.forEach((p) => (p.status = "GAMEOVER"));
				}
			},
			(payload, isLocal, state) => {
				const myP = state.players[g.game.selfId];
				if (!myP) return;

				const loserId = payload.loserIdx;
				if (loserId === g.game.selfId) {
					this.flowManager.fireAsync(
						FlowEventName.GameOver,
						new selectMode_sender(this.localMode as any)
					);
					return;
				}

				if (myP.mode === "PVP" && myP.status === "GAMEOVER") {
					this.flowManager.fireAsync(
						FlowEventName.GameOver,
						new selectMode_sender(this.localMode as any)
					);
				}
			}
		);

		this.syncFramework.register(
			"restart",
			(state, _, senderId) => {
				const sender = state.players[senderId];
				if (!sender) return;

				const targets: string[] = [];
				if (sender.mode === "SOLO" || sender.mode === "NPC") {
					targets.push(senderId);
					if (sender.mode === "NPC") targets.push("BOT_" + senderId);
				} else if (sender.mode === "PVP") {
					Object.values(state.players)
						.filter((p) => p.mode === "PVP")
						.forEach((p) => targets.push(p.id));
				}

				targets.forEach((tid) => {
					if (state.players[tid]) {
						const p = state.players[tid];
						p.status = "LOBBY";
						p.mode = "NONE";
						p.ready = false;
						if (p.isBot) delete state.players[tid];
					}
					delete state.boards[tid];
					delete state.dropTimers[tid];
				});
			},
			(payload, isLocal, state) => {
				const myP = state.players[g.game.selfId];

				if (isLocal) {
					this.handleLocalReset();
					return;
				}

				if (myP && myP.mode === "NONE" && myP.status === "LOBBY") {
					if (GameBoard.instances[g.game.selfId]) {
						this.handleLocalReset();
					} else {
						this.refreshLobbyState();
					}
				}
			}
		);

		this.syncFramework.register(
			"input",
			(state, payload, senderId) => {
				payload._senderId = payload.senderOverride || senderId;
			},
			(payload, isLocal, state) => {
				const senderId = payload._senderId;
				if (!this.players[senderId]) return;

				if (
					state.players[senderId] &&
					state.players[senderId].status === "GAMEOVER"
				)
					return;

				const board = GameBoard.get(senderId);
				if (board && board.busyUntil > g.game.age) return;
				this.handleGameplayMessage(this.players[senderId], payload);
			}
		);

		this.syncFramework.register(
			"spawn",
			(state, payload) => { },
			(payload, isLocal, state) => {
				const targetId = payload.targetId;
				if (
					state.players[targetId] &&
					state.players[targetId].status === "GAMEOVER"
				)
					return;

				const myP = state.players[g.game.selfId];
				if (myP && (myP.mode === "SOLO" || myP.mode === "NPC")) {
					if (
						targetId !== g.game.selfId &&
						targetId !== "BOT_" + g.game.selfId
					)
						return;
				}

				const board = GameBoard.get(targetId);
				if (board) {
					board.spawnPuyo(payload.nextColors, payload.currentColors);
				}
			}
		);

		this.syncFramework.register(
			"autoDrop",
			(state, payload) => {
				if (state.dropTimers[payload.targetId] !== undefined) {
					state.dropTimers[payload.targetId] = 0;
				}
			},
			(payload, isLocal, state) => {
				const targetId = payload.targetId;
				if (
					state.players[targetId] &&
					state.players[targetId].status === "GAMEOVER"
				)
					return;

				const myP = state.players[g.game.selfId];
				if (myP && (myP.mode === "SOLO" || myP.mode === "NPC")) {
					if (
						targetId !== g.game.selfId &&
						targetId !== "BOT_" + g.game.selfId
					)
						return;
				}

				if (this.dropTimers[targetId] !== undefined)
					this.dropTimers[targetId] = 0;

				const board = GameBoard.get(targetId);
				if (!board || !board.currentPuyo) return;

				if (
					board.isValid(
						board.currentPuyo.x,
						board.currentPuyo.y + 1,
						board.currentPuyo.rot
					)
				) {
					board.currentPuyo.y += 1;
					board.updatePuyoView();
				} else {
					let sen = new move_sender(board.playerIndex);
					sen.xy = { x: 0, y: 1 };
					sen.isHardDrop = false;
					this.flowManager.fireAsync(FlowEventName.Move, sen);
				}
			}
		);

		this.syncFramework.register(
			"garbage",
			(state, payload) => { },
			(payload, isLocal, state) => {
				const targetId = payload.targetId;
				if (
					state.players[targetId] &&
					state.players[targetId].status === "GAMEOVER"
				)
					return;
				const board = GameBoard.get(targetId);
				const amount = payload.amount || 1;
				if (board) {
					this.flowManager.fireAsync(
						FlowEventName.AddGarbage,
						new addGarbage_sender(board.playerIndex, amount)
					);
				}
			}
		);
		this.syncFramework.register(
			"startgame",
			(state, payload, senderId) => {
				this.FireGameLoad();
			},
		);
	}
	private FireGameLoad() {
		let sender = new gameLoad_sender();
		sender.syncFramework = this.syncFramework;
		this.flowManager.fireAsync(FlowEventName.GameLoad, sender);
	}

	private handleLocalReset() {
		if (GameBoard.instances[g.game.selfId]) {
			GameBoard.instances[g.game.selfId].destroy();
			delete GameBoard.instances[g.game.selfId];
		}
		const botId = "BOT_" + g.game.selfId;
		if (GameBoard.instances[botId]) {
			GameBoard.instances[botId].destroy();
			delete GameBoard.instances[botId];
		}

		this.localMode = "NONE";
		this.dropTimers = {};
		this.uiManager.hideScoreUI();
		this.uiManager.hideGameOverUI();
		this.flowManager.fireAsync(FlowEventName.ResetGame);
		this.refreshLobbyState();
	}

	private syncStateFromGame() {
		if (!this.syncFramework) return;
		const state = this.syncFramework.state;
		state.dropTimers = this.dropTimers;
		for (const id in GameBoard.instances) {
			state.boards[id] = GameBoard.instances[id].getSnapshot();
		}
	}

	public setGameOver(loserPlayerIdx: number, reason: string) {
		const myP = this.syncFramework?.state.players[g.game.selfId];

		if (myP && myP.status === "GAMEOVER") return;

		let loserId: string = null;
		for (let id in GameBoard.instances) {
			if (GameBoard.instances[id].playerIndex === loserPlayerIdx) {
				loserId = id;
				break;
			}
		}

		if (loserId && this.syncFramework) {
			this.syncFramework.dispatch("gameOver", {
				loserIdx: loserId,
				reason: reason,
			});
		}
	}

	private refreshLobbyState() {
		const myP = this.syncFramework?.state.players[g.game.selfId];
		if (!myP || myP.status === "PLAYING") return;

		if (myP.mode === "NONE") {
			this.flowManager.fireAsync(
				FlowEventName.SelectMode,
				new selectMode_sender("SOLO")
			);
		} else if (myP.mode === "PVP") {
			const allP = this.syncFramework.state.players;
			const pvpPlayers = Object.values(allP).filter(
				(p) => p.mode === "PVP"
			);
			const p1 = pvpPlayers[0];
			const p2 = pvpPlayers[1];

			this.uiManager.showPvPLobby(
				p1 && p1.id === g.game.selfId ? 0 : 1,
				p1 ? p1.ready : false,
				p2 ? p2.ready : false
			);
		}
	}

	private createPlayer(
		id: string,
		visualIndex: number,
		rngSeed?: number,
		isBot: boolean = false
	) {
		if (this.players[id]) return this.players[id];

		GameBoard.createPlayerBoard(
			id,
			visualIndex,
			this,
			this.layerBackground,
			this.layerGame,
			this.flowManager,
			rngSeed
		);
		const player = new Player(id, visualIndex, this.flowManager, isBot);
		this.players[id] = player;
		return player;
	}

	private startLocalGame(playerIds: string[]) {
		this.uiManager.hideModeSelection();
		this.uiManager.hidePvPLobby();

		for (let id in GameBoard.instances) {
			if (!playerIds.includes(id)) {
				GameBoard.instances[id].destroy();
				delete GameBoard.instances[id];
			}
		}
		this.players = {};

		playerIds.forEach((id, idx) => {
			const pState = this.syncFramework.state.players[id];
			this.createPlayer(id, idx, pState.rngSeed, pState.isBot);
		});

		playerIds.forEach((id) => {
			GameBoard.get(id).fillBackground();
			GameBoard.get(id).renderBoard();
		});

		this.uiManager.refreshScoreLayout();
		this.syncFramework.dispatch("startgame", {});
	}

	private handleGameplayMessage(player: Player, data: any) {
		if (data.key) {
			player.handleInput(data.key, () => { });
		}
	}
}