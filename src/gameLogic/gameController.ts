import { controlID } from "../layout/controller";
import { GameBoardModel } from "./gameBoard.model";
import { GameBoardView } from "./gameBoard.view";

export class GameController {
	public model: GameBoardModel;
	public view: GameBoardView | null = null;

	private scene: g.Scene;
	private lastDropTime: number = 0;
	private readonly DROP_INTERVAL = 1000;
	private isLocked: boolean = false;

	constructor(scene: g.Scene, id: string, playerIndex: number, rngSeed: number, parentGame: g.E) {
		this.scene = scene;
		this.model = new GameBoardModel(id, playerIndex, rngSeed);
		if (parentGame) {
			this.view = new GameBoardView(scene, parentGame, parentGame, this.model);
		}
	}

	public start() {
		this.spawnNewPuyo();
	}

	public update(currentTime: number) {
		if (this.isLocked) return;
		if (!this.model.currentPuyo) return;

		if (currentTime - this.lastDropTime >= this.DROP_INTERVAL) {
			this.lastDropTime = currentTime;
			this.applyGravityOrLock();
		}
	}

	private spawnNewPuyo() {
		let currentColors: { colorMain: number; colorSub: number };

		if (this.model.nextPuyo) {
			currentColors = {
				colorMain: this.model.nextPuyo.colorMain,
				colorSub: this.model.nextPuyo.colorSub
			};
		} else {
			currentColors = this.model.generateRandomColors();
		}

		const nextColors = this.model.generateRandomColors();

		const success = this.model.spawnPuyo(nextColors, currentColors);

		if (!success) {
			console.log("GAME OVER");
			this.isLocked = true;
			return;
		}

		if (this.view) {
			this.view.updatePuyoView();
			this.view.updateNextPuyoView();
		}

		this.lastDropTime = g.game.age * (1000 / g.game.fps);
	}

	private applyGravityOrLock() {
		if (this.model.isValid(this.model.currentPuyo!.x, this.model.currentPuyo!.y + 1, this.model.currentPuyo!.rot)) {
			this.model.dropDown();
			if (this.view) this.view.updatePuyoView();
		} else {
			this.handleLock();
		}
	}

	public handleInput(action: controlID) {
		if (this.isLocked || !this.model.currentPuyo) return;

		let changed = false;
		if (action === "ArrowLeft") {
			this.model.move(-1);
			changed = true;
		} else if (action === "ArrowRight") {
			this.model.move(1);
			changed = true;
		} else if (action === "ArrowUp") {
			changed = this.model.tryRotate(true);
		} else if (action === "ArrowDown") {
			this.model.hardDrop();
			if (this.view) this.view.updatePuyoView();
			this.handleLock();
			return;
		}

		if (changed && this.view) {
			this.view.updatePuyoView();
		}
	}

	private async handleLock() {
		this.isLocked = true;

		const result = this.model.lockPuyo();
		if (this.view) {
			await this.view.animateExecutionResult(result);
		} else {

			const estimatedDuration = result.steps.length * 500;
			// await dummyWait(estimatedDuration); 
		}

		this.isLocked = false;
		this.spawnNewPuyo();
	}
}