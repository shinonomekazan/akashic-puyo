import { Helper } from "../helper";
import { GameBoardModel, ExecutionResult, ResolutionStep } from "./gameBoard.model";

export class GameBoardView {
	public static puyoSize: number = 30;
	public static totalBoardsInGame: number = 2;

	// Visual Nodes
	public boardNode: g.E;
	public ghostPuyoNode: g.E;
	public currentPuyoNode: g.E;
	private backgroundNode: g.FilledRect;
	public nextPuyoDisplayNode: g.E;

	private parentBackground: g.E;
	private parentGame: g.E;

	// State Refs
	private model: GameBoardModel;
	private scene: g.Scene;
	private readonly yLocation: number = 80;

	// Flags
	public isAnimating: boolean = false;
	public busyUntil: number = 0; // Defines when animation finishes in game age

	private static colorBackground: string[] = [
		"gray",
		"blue",
		"green",
		"yellow",
		"purple",
	];

	constructor(
		scene: g.Scene,
		parentBg: g.E,
		parentGame: g.E,
		model: GameBoardModel
	) {
		this.scene = scene;
		this.parentBackground = parentBg;
		this.parentGame = parentGame;
		this.model = model;

		this.initVisuals();
	}

	public destroy() {
		if (this.boardNode && !this.boardNode.destroyed()) this.boardNode.destroy();
		if (this.backgroundNode && !this.backgroundNode.destroyed()) this.backgroundNode.destroy();
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) this.currentPuyoNode.destroy();
	}

	private getVisualIndex(): number {
		if (GameBoardView.totalBoardsInGame === 1) return 0;
		// Determine visual position (left or right) based on selfId logic
		// You might need to pass selfId or handle this logic externally
		const localPlayerIndex = 0; // Default or fetch from global game state
		return (this.model.playerIndex - localPlayerIndex + 2) % 2;
	}

	private initVisuals() {
		const boardWidth = GameBoardModel.COLS * GameBoardView.puyoSize;
		const gap = this.yLocation;
		const totalWidth =
			GameBoardView.totalBoardsInGame * boardWidth +
			(GameBoardView.totalBoardsInGame - 1) * gap;
		const startX = (g.game.width - totalWidth) / 2;

		const visualIndex = this.getVisualIndex();
		const offsetX = startX + visualIndex * (boardWidth + gap);

		// Background
		this.backgroundNode = new g.FilledRect({
			scene: this.scene,
			parent: this.parentBackground,
			x: offsetX,
			y: this.yLocation,
			opacity: 0.6,
			width: GameBoardView.puyoSize * GameBoardModel.COLS,
			height: GameBoardView.puyoSize * GameBoardModel.ROWS,
			cssColor: GameBoardView.colorBackground[this.model.playerIndex % GameBoardView.colorBackground.length],
		});

		// Board Container
		this.boardNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation,
		});

		// Puyo Containers
		this.ghostPuyoNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation,
		});
		this.currentPuyoNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation,
		});
		// Next
		this.nextPuyoDisplayNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX + GameBoardModel.COLS * GameBoardView.puyoSize + 10,
			y: this.yLocation
		});
		this.renderBoard();
	}

	public updateNextPuyoView() {
		if (this.nextPuyoDisplayNode && !this.nextPuyoDisplayNode.destroyed()) {
			this.nextPuyoDisplayNode.destroy();
		}

		this.nextPuyoDisplayNode = new g.E({
			scene: this.scene,
			parent: this.parentGame, 
			x: this.boardNode.x + GameBoardModel.COLS * GameBoardView.puyoSize + 20,
			y: this.yLocation
		});

		if (!this.model.nextPuyo) return;

		const colors = [this.model.nextPuyo.colorSub, this.model.nextPuyo.colorMain];

		for (let i = 0; i < 2; i++) {
			const spr = Helper.newSprite(this.getColor(colors[i]));
			this.nextPuyoDisplayNode.append(spr);

			spr.y = i * GameBoardView.puyoSize;

			const targetSize = GameBoardView.puyoSize - 2;
			spr.scaleX = targetSize / spr.width;
			spr.scaleY = targetSize / spr.height;
			spr.modified();
		}
	}
	/**
	 * Full re-render of the board based on Model state
	 */
	public renderBoard(overrideBoard?: number[][]) {
		if (this.boardNode.destroyed()) return;

		// Clear existing children
		this.boardNode.destroy();
		// Recreate container (simpler than managing children pool for this example)
		const offsetX = this.backgroundNode.x;
		this.boardNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation,
		});

		const targetBoard = overrideBoard || this.model.board;

		for (let r = 0; r < GameBoardModel.ROWS; r++) {
			for (let c = 0; c < GameBoardModel.COLS; c++) {
				const colorIdx = targetBoard[r][c];
				if (colorIdx !== 0) {
					const spr = Helper.newSprite(this.getColor(colorIdx));
					this.boardNode.append(spr);
					spr.x = c * GameBoardView.puyoSize;
					spr.y = r * GameBoardView.puyoSize;
					const targetSize = GameBoardView.puyoSize - 2;
					spr.scaleX = targetSize / spr.width;
					spr.scaleY = targetSize / spr.height;
					spr.modified();
				}
			}
		}

		// Ensure overlay nodes stay on top
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) {
			this.parentGame.append(this.ghostPuyoNode);
		}
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) {
			this.parentGame.append(this.currentPuyoNode);
		}
	}

	public updatePuyoView() {
		this.ghostPuyoNode.destroy();
		this.currentPuyoNode.destroy();

		const offsetX = this.backgroundNode.x;

		this.ghostPuyoNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation,
		});
		this.currentPuyoNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation,
		});

		if (!this.model.currentPuyo) return;

		const createPuyo = (x: number, y: number, assetPath: string, isGhost: boolean) => {
			const size = isGhost ? GameBoardView.puyoSize / 4 : GameBoardView.puyoSize - 2;
			const offset = (GameBoardView.puyoSize - size) / 2;
			const targetParent = isGhost ? this.ghostPuyoNode : this.currentPuyoNode;

			const spr = Helper.newSprite(assetPath);
			targetParent.append(spr);
			spr.x = x * GameBoardView.puyoSize + (isGhost ? offset : 0);
			spr.y = y * GameBoardView.puyoSize + (isGhost ? offset : 0);
			spr.opacity = isGhost ? 0.0 : 1; // Assuming ghost hidden for now based on opacity 0 in original

			spr.scaleX = size / spr.width;
			spr.scaleY = size / spr.height;
			spr.modified();
		};

		const puyo = this.model.currentPuyo;

		// Calculate Ghost Y
		let ghostY = puyo.y;
		while (this.model.isValid(puyo.x, ghostY + 1, puyo.rot)) {
			ghostY++;
		}

		const ghostSub = this.model.getSubPos(puyo.x, ghostY, puyo.rot);

		createPuyo(puyo.x, ghostY, this.getColor(puyo.colorMain), true);
		createPuyo(ghostSub.x, ghostSub.y, this.getColor(puyo.colorSub), true);

		const sub = this.model.getSubPos(puyo.x, puyo.y, puyo.rot);
		createPuyo(puyo.x, puyo.y, this.getColor(puyo.colorMain), false);
		createPuyo(sub.x, sub.y, this.getColor(puyo.colorSub), false);
	}

	public async animateExecutionResult(result: ExecutionResult) {
		if (result.steps.length === 0 && !result.garbageDrop) {
			this.renderBoard(); // Just sync
			return;
		}

		this.isAnimating = true;

		// 1. Animate Chain Steps
		for (const step of result.steps) {
			const STEP_DELAY = 15;
			const BLINK_DURATION = 40;

			// Update busy timer for external logic checks
			this.busyUntil = g.game.age + (step.type === "clear" ? BLINK_DURATION + STEP_DELAY : STEP_DELAY);

			if (step.type === "clear") {
				if (!g.game.isSkipping) {
					// Add Score UI effect here if needed

					await this.waitFrames(STEP_DELAY);

					// Blinking effect
					const blinkers: g.E[] = [];
					step.matches!.forEach((p) => {
						let blinkSpr = Helper.newSprite("/assets/blink.png");
						this.parentGame.append(blinkSpr);
						blinkSpr.x = this.boardNode.x + p.x * GameBoardView.puyoSize;
						blinkSpr.y = this.boardNode.y + p.y * GameBoardView.puyoSize;

						blinkSpr.scaleX = (GameBoardView.puyoSize - 2) / blinkSpr.width;
						blinkSpr.scaleY = (GameBoardView.puyoSize - 2) / blinkSpr.height;
						blinkSpr.modified();
						blinkers.push(blinkSpr);
					});

					// Blink Animation Loop
					let elapsed = 0;
					let visible = true;
					const BLINK_INTERVAL = 8;
					while (elapsed < BLINK_DURATION) {
						visible = !visible;
						blinkers.forEach((b) => {
							b.opacity = visible ? 1 : 0;
							b.modified();
						});
						await this.waitFrames(BLINK_INTERVAL);
						elapsed += BLINK_INTERVAL;
					}
					blinkers.forEach((b) => b.destroy());
				}
				this.updatePuyoView();
				this.renderBoard(step.boardSnapshot);

			} else if (step.type === "drop") {
				this.renderBoard(step.boardSnapshot);

				if (!g.game.isSkipping) {
					await this.waitFrames(STEP_DELAY);
				}
			}
		}

		// 2. Animate Garbage Drop
		if (result.garbageDrop) {
			await this.animateGarbageFall(result.garbageDrop.distribution);
			this.renderBoard(result.garbageDrop.boardSnapshot);
		} else {
			// Final sync just in case
			this.renderBoard();
		}

		this.isAnimating = false;
		this.busyUntil = 0;
	}

	private async animateGarbageFall(garbageCounts: number[]): Promise<void> {
		if (g.game.isSkipping) return;

		const sprites: { sprite: g.E; targetY: number; dy: number }[] = [];
		const activeSprites: { sprite: g.E; targetY: number; dy: number }[] = [];
		for (let c = 0; c < GameBoardModel.COLS; c++) {
			const count = garbageCounts[c];
			if (count === 0) continue;

			let droppedCount = 0;
			for (let r = 0; r < GameBoardModel.ROWS; r++) {
				if (this.model.board[r][c] === GameBoardModel.GARBAGE_ID && droppedCount < count) {
					const targetY = r * GameBoardView.puyoSize;

					// Random start Y
					const rand = g.game.random.generate(); // Visual RNG only
					const startY = -40 - droppedCount * 35 - rand * 20;

					const spr = Helper.newSprite("/assets/garbage.png");
					this.boardNode.append(spr);
					spr.x = c * GameBoardView.puyoSize;
					spr.y = startY;

					const targetSize = GameBoardView.puyoSize - 2;
					spr.scaleX = targetSize / spr.width;
					spr.scaleY = targetSize / spr.height;
					spr.modified();

					const item = { sprite: spr, targetY: targetY, dy: 0 };
					sprites.push(item);
					activeSprites.push(item);

					droppedCount++;
				}
			}
		}

		if (sprites.length === 0) return;

		this.busyUntil = g.game.age + 60;

		return new Promise<void>((resolve) => {
			const GRAVITY = 1.5;
			const BOUNCE_DAMP = -0.1;

			const handler = () => {
				let allFinished = true;

				activeSprites.forEach((item) => {
					if (item.dy === 0 && item.sprite.y === item.targetY) return;

					item.dy += GRAVITY;
					item.sprite.y += item.dy;

					if (item.sprite.y >= item.targetY) {
						item.sprite.y = item.targetY;
						if (Math.abs(item.dy) > 2) {
							item.dy *= BOUNCE_DAMP;
							allFinished = false;
						} else {
							item.dy = 0;
							item.sprite.y = item.targetY;
						}
					} else {
						allFinished = false;
					}
					item.sprite.modified();
				});

				if (allFinished) {
					this.scene.onUpdate.remove(handler);
					// Remove temp sprites, the final renderBoard will place the permanent ones
					sprites.forEach(s => s.sprite.destroy());
					resolve();
				}
			};

			this.scene.onUpdate.add(handler);
		});
	}

	private async waitFrames(frames: number): Promise<void> {
		if (frames <= 0) return;
		return new Promise<void>((resolve) => {
			let remaining = frames;
			const handler = () => {
				remaining--;
				if (remaining <= 0) {
					this.scene.onUpdate.remove(handler);
					resolve();
				}
			};
			this.scene.onUpdate.add(handler);
		});
	}

	private getColor(idx: number): string {
		if (idx === GameBoardModel.GARBAGE_ID) return "/assets/garbage.png";
		// Map logic IDs to Assets
		const assets = ["", "/assets/red.png", "/assets/yellow.png", "/assets/blue.png", "/assets/green.png", "/assets/purple.png"];
		return assets[idx] || "/assets/red.png";
	}
}