import { BaseStep } from "./flow/step";
import { FlowEventName } from "./flow/eventName";
import { UIManager } from "./uiManager";
import {
	addScore_sender,
	gameOver_sender,
	getSender,
	nextPuyo_sender,
} from "./sender";
import { GameBoard } from "./gameBoard";

export class UIStep extends BaseStep {
	constructor(private uiManager: UIManager) {
		super();
	}

	public async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.UpdateLobbyUI:
				const sender = getSender() as {
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
				} else {
					this.uiManager.updateLobbyUI("wait_p2", false, false);
				}
				break;

			case FlowEventName.HideLobbyUI:
			case FlowEventName.GameLoad:
				this.uiManager.hideLobbyUI();
				this.uiManager.showScoreUI();
				break;

			case FlowEventName.UpdateNextPuyo:
				const nextSender = getSender() as nextPuyo_sender;
				if (nextSender) {
					this.uiManager.updateNextPuyo(
						nextSender.playerIdx,
						nextSender.colorMain,
						nextSender.colorSub
					);
				}
				break;

			case FlowEventName.AddScore:
				const scoreSender = getSender() as addScore_sender;
				const board = GameBoard.getByIndex(scoreSender.playerIdx);
				if (board) {
					board.score += scoreSender.score;
					this.uiManager.updateScore(
						scoreSender.playerIdx,
						board.score
					);
				}
				break;

			case FlowEventName.GameOver:
				console.log("game over");
				const goSender = getSender() as gameOver_sender;
				let myIdx = -1;
				const myBoard = GameBoard.get(g.game.selfId);
				if (myBoard) {
					myIdx = myBoard.playerIndex;
				}

				let msgKey = "";
				let args: any[] = [];

				if (goSender.reason === "disconnect") {
					if (myIdx !== -1 && goSender.loserPlayerIdx === myIdx) {
						msgKey = "you_lose";
					} else {
						msgKey = "opp_left_win";
					}
				} else {
					if (myIdx === -1) {
						msgKey = "p_lose";
						args = [goSender.loserPlayerIdx + 1];
					} else {
						if (goSender.loserPlayerIdx === myIdx) {
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
				for (let id in GameBoard.instances) {
					this.uiManager.updateScore(
						GameBoard.get(id).playerIndex,
						0
					);
				}
				break;
		}
	}
}
