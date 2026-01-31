import { Helper } from "../helper";
import { GameBoardModel, ExecutionResult } from "./gameBoard.model";

export class GameBoardView {
	public static puyoSize: number = 30;
	public static totalBoardsInGame: number = 2;

	// Visual Nodes
	public boardNode: g.E;
	public ghostPuyoNode: g.E;
	public currentPuyoNode: g.E;
	private backgroundNode: g.FilledRect;
	public nextPuyoDisplayNode: g.E;

	// New Node for Garbage UI
	public nuisanceNode: g.E;

	private parentBackground: g.E;
	private parentGame: g.E;

	// State Refs
	private model: GameBoardModel;
	private scene: g.Scene;
	private readonly yLocation: number = 80;

	// Flags
	public isAnimating: boolean = false;
	public busyUntil: number = 0;

	// Font for Nuisance Counter
	private font: g.DynamicFont;

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

		// Initialize Font for the garbage counter
		this.font = new g.DynamicFont({
			game: g.game,
			fontFamily: g.FontFamily.SansSerif,
			size: 20
		});

		this.initVisuals();
	}

	public destroy() {
		if (this.boardNode && !this.boardNode.destroyed()) this.boardNode.destroy();
		if (this.backgroundNode && !this.backgroundNode.destroyed()) this.backgroundNode.destroy();
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) this.currentPuyoNode.destroy();
		if (this.nuisanceNode && !this.nuisanceNode.destroyed()) this.nuisanceNode.destroy();
	}

	private getVisualIndex(): number {
		if (GameBoardView.totalBoardsInGame === 1) return 0;
		const localPlayerIndex = 0;
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

		// Nuisance Bar (Garbage Pending UI)
		// Placed above the board
		this.nuisanceNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: offsetX,
			y: this.yLocation - 35,
			width: boardWidth,
			height: 30
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
		this.updateNuisanceBar();
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
	 * Updates the UI above the board to show pending garbage
	 */
	public updateNuisanceBar() {
		if (!this.nuisanceNode || this.nuisanceNode.destroyed()) return;

		// Clear previous contents
		this.nuisanceNode.destroy();

		// Recreate container to keep position correct
		this.nuisanceNode = new g.E({
			scene: this.scene,
			parent: this.parentGame,
			x: this.backgroundNode.x,
			y: this.yLocation - 35,
			width: GameBoardModel.COLS * GameBoardView.puyoSize,
			height: 30
		});

		const count = this.model.nuisanceQueue;
		if (count <= 0) return;

		// 1. Icon
		const iconSize = 24;
		const icon = Helper.newSprite("/assets/garbage.png");
		this.nuisanceNode.append(icon);

		// Scale icon
		const scale = iconSize / (icon.width || 30); // fallback if width not loaded yet
		icon.scaleX = scale;
		icon.scaleY = scale;
		icon.modified();

		// 2. Text Counter (e.g., "x5")
		const label = new g.Label({
			scene: this.scene,
			font: this.font,
			text: `x${count}`,
			fontSize: 20,
			textColor: "red",
			x: iconSize + 5,
			y: 0
		});
		this.nuisanceNode.append(label);
	}

	public renderBoard(overrideBoard?: number[][]) {
		if (this.boardNode.destroyed()) return;

		this.boardNode.destroy();
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
			spr.opacity = isGhost ? 0.0 : 1;

			spr.scaleX = size / spr.width;
			spr.scaleY = size / spr.height;
			spr.modified();
		};

		const puyo = this.model.currentPuyo;

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
		// Update Nuisance Bar first to show current state (e.g. if we countered some garbage)
		this.updateNuisanceBar();

		if (result.steps.length === 0 && !result.garbageDrop) {
			this.renderBoard();
			return;
		}

		this.isAnimating = true;

		// 1. Animate Chain Steps
		for (const step of result.steps) {
			const STEP_DELAY = 15;
			const BLINK_DURATION = 40;

			this.busyUntil = g.game.age + (step.type === "clear" ? BLINK_DURATION + STEP_DELAY : STEP_DELAY);

			if (step.type === "clear") {
				if (!g.game.isSkipping) {
					await this.waitFrames(STEP_DELAY);

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

			// Update bar again after drop (should be 0 or reduced)
			this.updateNuisanceBar();
		} else {
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
					const rand = g.game.random.generate();
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
		const assets = ["", "/assets/red.png", "/assets/yellow.png", "/assets/blue.png", "/assets/green.png", "/assets/purple.png"];
		return assets[idx] || "/assets/red.png";
	}
}