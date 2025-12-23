import { GameBoard } from "./gameBoard";
import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { move_sender, rotate_sender } from "./sender";

export class Player {
	public id: string;
	public pIdx: number;
	public ready: boolean;
	private flowManager: FlowManager;

	constructor(id: string, pIdx: number, flowManager: FlowManager) {
		this.id = id;
		this.pIdx = pIdx;
		this.ready = false;
		this.flowManager = flowManager;
	}

	public handleInput(key: string, dropTimerReset: () => void) {
		const board = GameBoard.get(this.id);
		if (!board || board.isPaused || board.isAnimating) return;
		if (key === "ArrowUp") {
			let rotateSender = new rotate_sender(this.pIdx);
			this.flowManager.fireAsync(FlowEventName.Rotate, rotateSender);
		} else {
			const moveSender = new move_sender(this.pIdx);
			moveSender.isHardDrop = false;
			moveSender.playerIdx = this.pIdx;
			if (key === "ArrowLeft") {
				moveSender.xy = { x: -1, y: 0 };
			} else if (key === "ArrowRight") {
				moveSender.xy = { x: 1, y: 0 };
			} else if (key === "ArrowDown") {
				moveSender.xy = { x: 0, y: 1 };
				moveSender.isHardDrop = true;
				dropTimerReset();
			} else {
				return;
			}
			this.flowManager.fireAsync(FlowEventName.Move, moveSender);
		}
	}
}