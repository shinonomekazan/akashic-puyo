import { BaseStep } from "./flow/step";
import { FlowEventName } from "./flow/eventName";
import { UIManager } from "./uiManager";
import {
	addScore_sender,
	gameOver_sender,
	getSender,
	nextPuyo_sender,
	client_sender,
} from "./sender";
import { GameBoard } from "./gameBoard";

export class UIStep extends BaseStep {
	constructor(private uiManager: UIManager) {
		super();
	}

	public async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.SelectMode:
				const scene = g.game.scene() as any;
				let isHost = false;
				if (scene.syncFramework && scene.syncFramework.state && scene.syncFramework.state.players) {
					const p = scene.syncFramework.state.players[g.game.selfId];
					if (p && p.pIdx === 0) isHost = true;
					if (!p && Object.keys(scene.syncFramework.state.players).length === 0) isHost = true;
				}
				this.uiManager.showModeSelection(isHost);
				break;
			case FlowEventName.UpdateLobbyUI:
				const sender = getSender(eventName) as {
					textKey: string;
					enableButton: boolean;
					showWaitSprite: boolean;
				};
				if (sender) {
					this.uiManager.updateLobbyUI(
						sender.textKey,
						sender.enableButton,
						sender.showWaitSprite
					);
				}
				break;

			case FlowEventName.HideLobbyUI:
			case FlowEventName.GameLoad:
				this.uiManager.hideLobbyUI();
				this.uiManager.hideModeSelection();
				this.uiManager.hidePvPLobby();
				this.uiManager.showScoreUI();
				this.uiManager.refreshScoreLayout();

				const sceneLoad = g.game.scene() as any;
				if (sceneLoad.syncFramework && sceneLoad.syncFramework.state && sceneLoad.syncFramework.state.players) {
					const myP = sceneLoad.syncFramework.state.players[g.game.selfId];
					if (myP) {
						this.uiManager.updateModeLabel(myP.mode);
					}
				}
				break;

			case FlowEventName.UpdateNextPuyo:
				const nextSender = getSender(eventName) as nextPuyo_sender;
				if (nextSender) {
					this.uiManager.updateNextPuyo(
						nextSender.playerIdx,
						nextSender.colorMain,
						nextSender.colorSub
					);
				}
				break;

			case FlowEventName.AddScore:
				const scoreSender = getSender(eventName) as addScore_sender;
				const board = GameBoard.getByIndex(scoreSender.playerIdx);
				if (board) {
					this.uiManager.updateScore(
						scoreSender.playerIdx,
						board.score
					);
					this.uiManager.setGarbageCount(board.playerIndex, board.nuisanceQueue);

					const currentScene = g.game.scene() as any;
					if (currentScene.syncFramework && scoreSender.garbageToSend > 0) {
						let isMyAction = false;
						if (board.id === g.game.selfId) isMyAction = true;
						if (board.id === "BOT_" + g.game.selfId) isMyAction = true;

						if (isMyAction) {
							const allIds = Object.keys(GameBoard.instances);
							const enemyId = allIds.find(id => id !== board.id);
							if (enemyId) {
								currentScene.syncFramework.dispatch("garbage", { targetId: enemyId, amount: scoreSender.garbageToSend });
							}
						}
					}
				}
				break;

			case FlowEventName.GameOver:
				const currentScene = g.game.scene() as any;
				const syncState = currentScene.syncFramework ? currentScene.syncFramework.state : null;

				const goSender = getSender(eventName) as gameOver_sender;

				let loserId: string = null;
				if (goSender) {
					for (let id in GameBoard.instances) {
						if (GameBoard.instances[id].playerIndex === goSender.loserPlayerIdx) {
							loserId = id;
							break;
						}
					}
				} else if (syncState) {
					for (let id in syncState.players) {
						if (syncState.players[id].status === "GAMEOVER") {
							loserId = id;
							break;
						}
					}
				}

				if (!loserId) return;

				const myP = syncState ? syncState.players[g.game.selfId] : null;
				if (myP) {
					if (myP.mode === "SOLO" || myP.mode === "NPC") {
						if (loserId !== g.game.selfId && loserId !== "BOT_" + g.game.selfId) {
							return;
						}
					}
				}

				let loserPlayerIdx = -1;
				let reason = goSender ? goSender.reason : "";

				if (GameBoard.instances[loserId]) {
					loserPlayerIdx = GameBoard.instances[loserId].playerIndex;
				}

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
				} else if (reason === "solo_end") {
					msgKey = "p_lose";
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
				break;

			case FlowEventName.ResetGame:
				this.uiManager.hideGameOverUI();
				this.uiManager.hideScoreUI();
				this.uiManager.updateModeLabel("NONE");
				for (let id in GameBoard.instances) {
					this.uiManager.updateScore(
						GameBoard.get(id).playerIndex,
						0
					);
					this.uiManager.setGarbageCount(GameBoard.get(id).playerIndex, 0);
				}
				break;
			case FlowEventName.UpdateGarbageCount:
				const uSender = getSender(eventName) as client_sender;
				if (uSender) {
					const board = GameBoard.getByIndex(uSender.playerIdx);
					if (board) {
						this.uiManager.setGarbageCount(board.playerIndex, board.nuisanceQueue);
					}
				}
				break;
		}
	}
}