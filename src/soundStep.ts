import { BaseStep } from "./flow/step";
import { FlowEventName } from "./flow/eventName";
import { SoundManager } from "./soundManager";
import { gameOver_sender, getSender, move_sender } from "./sender";
import { GameBoard } from "./gameBoard";

export class SoundStep extends BaseStep {
	private soundManager: SoundManager;

	constructor(soundManager: SoundManager) {
		super();
		this.soundManager = soundManager;
	}

	public async onStep(eventName: FlowEventName): Promise<void> {
		const sender = getSender();

		switch (eventName) {
			case FlowEventName.Rotate:
				this.soundManager.play("assets/sound/se_rotate");
				break;

			case FlowEventName.Move:
				if (sender instanceof move_sender) {
					if (sender.isHardDrop) {
						this.soundManager.play("assets/sound/se_harddrop");
					}
				}
				break;

			case FlowEventName.AddScore:
				this.soundManager.play("assets/sound/se_score");
				break;

			case FlowEventName.GameOver:
				if (sender instanceof gameOver_sender) {
					const myBoard = GameBoard.get(g.game.selfId);
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