import { BaseStep } from "./flow/step";
import { FlowEventName } from "./flow/eventName";
import { GameBoard } from "./gameBoard";
import { gameOver_sender, getSender, move_sender, rotate_sender } from "./sender";
import { MainScene } from "./mainScene";

export class GameStateStep extends BaseStep {
	constructor(private mainScene: MainScene) {
		super();
	}
	public async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.GameLoad:
				for (let id in GameBoard.instances) {
					const board = GameBoard.get(id);
					board.fillBackground();

					if (board.nextPuyo) {
						this.mainScene.uiManager.updateNextPuyo(
							board.playerIndex,
							board.nextPuyo.colorMain,
							board.nextPuyo.colorSub
						);
					}
				}
				break;
			case FlowEventName.GameOver:
				const sender = getSender(eventName) as gameOver_sender;
				if (sender) {
					this.mainScene.setGameOver(sender.loserPlayerIdx, sender.reason);
				}
				// Removed invalid call to setGameStarted(false)
				break;
			case FlowEventName.ResetGame:
				for (let id in GameBoard.instances) {
					const board = GameBoard.get(id);
					board.reset();
				}
				break;
			case FlowEventName.UpdateNextPuyo:
				this.mainScene.saveGameSnapshot();
				break;
		}
	}
}

export class TransStep extends BaseStep {
	public async onStep(eventName: FlowEventName): Promise<void> {
		if (eventName === FlowEventName.Move) {
			const sender = getSender(eventName) as move_sender;
			if (!sender) return;
			const board = GameBoard.getByIndex(sender.playerIdx);

			if (!board || !board.currentPuyo) return;

			if (sender.isHardDrop) {
				while (
					board.isValid(
						board.currentPuyo.x,
						board.currentPuyo.y + 1,
						board.currentPuyo.rot
					)
				) {
					board.currentPuyo.y += 1;
				}
				board.updatePuyoView();
				await board.lockPuyo();
				return;
			}
			const nextX = board.currentPuyo.x + sender.xy.x;
			const nextY = board.currentPuyo.y + sender.xy.y;

			if (board.isValid(nextX, nextY, board.currentPuyo.rot)) {
				board.currentPuyo.x = nextX;
				board.currentPuyo.y = nextY;
				board.updatePuyoView();
			} else {
				if (sender.xy.y > 0) {
					await board.lockPuyo();
				}
			}
		} else if (eventName === FlowEventName.Rotate) {
			const sender = getSender(eventName) as rotate_sender;
			if (!sender) return;
			const board = GameBoard.getByIndex(sender.playerIdx);
			if (!board || !board.currentPuyo) return;
			board.tryRotate(sender.clockwise);
		}
	}
}