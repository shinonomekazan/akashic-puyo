import { BaseStep } from "./flow/step";
import { FlowEventName } from "./flow/eventName";
import { SoundManager } from "./soundManager";
import { addScore_sender, gameOver_sender, getSender, move_sender, rotate_sender } from "./sender";
import { GameBoard } from "./gameBoard";

export class SoundStep extends BaseStep {
	private soundManager: SoundManager;

	constructor(soundManager: SoundManager) {
		super();
		this.soundManager = soundManager;
	}

	public async onStep(eventName: FlowEventName): Promise<void> {
		const sender = getSender();
		const myBoard = GameBoard.get(g.game.selfId);

		switch (eventName) {
			case FlowEventName.Rotate:
				if (myBoard && sender instanceof rotate_sender && sender.playerIdx === myBoard.playerIndex) {
					this.soundManager.play("assets/sound/se_click");
				}
				break;

			case FlowEventName.Move:
				if (sender instanceof move_sender) {
					if (myBoard && sender.playerIdx === myBoard.playerIndex) {
						if (sender.isHardDrop) {
							this.soundManager.play("assets/sound/se_harddrop");
						} else {
							if (sender.xy.y == 0) {
								this.soundManager.play("assets/sound/se_click");
							}
						}
					}
				}
				break;

			case FlowEventName.AddScore:
				if (myBoard && sender instanceof addScore_sender && sender.playerIdx === myBoard.playerIndex) {
					this.soundManager.play("assets/sound/se_score");
				}
				break;

			case FlowEventName.GameOver:
				if (sender instanceof gameOver_sender) {
					if (myBoard) {
						if (sender.loserPlayerIdx === myBoard.playerIndex) {
							this.soundManager.play("assets/sound/se_gameover");
						} else {
							this.soundManager.play("assets/sound/se_win");
						}
					} else {
						this.soundManager.play("assets/sound/se_gameover");
					}
				}
				break;
		}
	}
}