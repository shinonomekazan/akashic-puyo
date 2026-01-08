import { FlowEventName } from "./flow/eventName";
import { FlowManager } from "./flow/flowManager";
import { addScore_sender, gameOver_sender, nextPuyo_sender } from "./sender";
import { Helper } from "./helper";

interface ResolveStep {
	type: "clear" | "drop";
	matches?: { x: number; y: number }[];
	score?: number;
	garbageToSend?: number;
}

export class GameBoard {
	public static readonly ROWS = 12;
	public static readonly COLS = 6;
	public static puyoSize: number = 30;
	public static instances: { [id: string]: GameBoard } = {};
	public static totalBoardsInGame: number = 2;
	public static readonly GARBAGE_ID: number = 9;

	public board: number[][] = [];
	public currentPuyo: {
		x: number;
		y: number;
		colorMain: number;
		colorSub: number;
		rot: number;
	} = null;
	public nextPuyo: {
		colorMain: number;
		colorSub: number;
	} = null;
	public boardNode: g.E = null;
	public ghostPuyoNode: g.E = null;
	public currentPuyoNode: g.E = null;

	public score: number = 0;
	public nuisanceQueue: number = 0;

	public isAnimating: boolean = false;
	public isPaused: boolean = false;
	public playerIndex: number;
	public id: string;

	public busyUntil: number = 0;
	private snapshotBoard: number[][] = null;

	private rootParent: g.E;
	private backgroundNode: g.FilledRect = null;
	private readonly yLocation: number = 80;

	private static colorBackground: string[] = [
		"gray",
		"blue",
		"green",
		"yellow",
		"purple",
	];
	private rng: g.RandomGenerator;
	private garbageRng: g.RandomGenerator;
	private flowManager: FlowManager;
	private rngSeed: number;
	public rngIterationCount: number = 0;
	public garbageRngIterationCount: number = 0;

	constructor(
		id: string,
		playerIndex: number,
		rng: g.RandomGenerator,
		flowManager: FlowManager,
		rngSeed?: number
	) {
		this.id = id;
		this.playerIndex = playerIndex;
		this.rng = rng;
		this.flowManager = flowManager;
		this.rngSeed = rngSeed;
		this.garbageRng = new g.XorshiftRandomGenerator(rngSeed ? rngSeed + 9999 : 0);
	}

	public static createPlayerBoard(
		id: string,
		playerIndex: number,
		scene: g.Scene,
		parent: g.E,
		flowManager: FlowManager,
		forceSeed?: number
	): GameBoard {
		if (this.instances[id]) {
			this.instances[id].destroy();
			delete this.instances[id];
		}

		let rngSeed: number;
		if (forceSeed !== undefined) {
			rngSeed = forceSeed;
		} else {
			const seed = g.game.random.generate();
			rngSeed = Math.floor(seed * 1000000);
		}

		const rng = new g.XorshiftRandomGenerator(rngSeed);
		const state = new GameBoard(id, playerIndex, rng, flowManager, rngSeed);
		this.instances[id] = state;
		state.init(scene, parent);
		return state;
	}

	public destroy() {
		if (this.boardNode && !this.boardNode.destroyed()) this.boardNode.destroy();
		if (this.backgroundNode && !this.backgroundNode.destroyed()) this.backgroundNode.destroy();
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) this.currentPuyoNode.destroy();

		this.boardNode = null;
		this.backgroundNode = null;
		this.ghostPuyoNode = null;
		this.currentPuyoNode = null;
	}

	public static get(id: string): GameBoard {
		return this.instances[id];
	}

	public static getByIndex(index: number): GameBoard {
		for (let id in this.instances) {
			if (this.instances[id].playerIndex === index) {
				return this.instances[id];
			}
		}
		return null;
	}

	public getSnapshot() {
		return {
			id: this.id,
			playerIndex: this.playerIndex,
			board: this.board,
			score: this.score,
			nuisanceQueue: this.nuisanceQueue,
			currentPuyo: this.currentPuyo,
			nextPuyo: this.nextPuyo,
			rngSeed: this.rngSeed,
			rngIterationCount: this.rngIterationCount,
			garbageRngIterationCount: this.garbageRngIterationCount,
			busyUntil: this.busyUntil
		};
	}

	public initFromSnapshot(data: any) {
		this.board = data.board;
		this.score = data.score;
		this.nuisanceQueue = data.nuisanceQueue || 0;
		this.currentPuyo = data.currentPuyo;
		this.nextPuyo = data.nextPuyo;
		this.rngSeed = data.rngSeed;
		this.rngIterationCount = data.rngIterationCount || 0;
		this.garbageRngIterationCount = data.garbageRngIterationCount || 0;

		this.busyUntil = 0;
		this.isAnimating = false;

		this.applyGravity(this.board);

		if (this.rngSeed !== undefined) {
			this.rng = new g.XorshiftRandomGenerator(this.rngSeed);
			for (let i = 0; i < this.rngIterationCount; i++) {
				this.rng.generate();
			}

			this.garbageRng = new g.XorshiftRandomGenerator(this.rngSeed + 9999);
			for (let i = 0; i < this.garbageRngIterationCount; i++) {
				this.garbageRng.generate();
			}
		}

		this.fillBackground();
		this.renderBoard();
		this.updatePuyoView();
	}

	private getVisualIndex(): number {
		if (GameBoard.totalBoardsInGame === 1) return 0;

		let localPlayerIndex = 0;
		if (GameBoard.instances[g.game.selfId]) {
			localPlayerIndex = GameBoard.instances[g.game.selfId].playerIndex;
		}
		return (this.playerIndex - localPlayerIndex + 2) % 2;
	}

	public init(scene: g.Scene, parent: g.E) {
		this.rootParent = parent;
		this.recalculatePosition(scene);
	}

	private recalculatePosition(scene: g.Scene) {
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = this.yLocation;
		const totalWidth = GameBoard.totalBoardsInGame * boardWidth + (GameBoard.totalBoardsInGame - 1) * gap;
		const startX = (g.game.width - totalWidth) / 2;

		const visualIndex = this.getVisualIndex();
		const offsetX = startX + visualIndex * (boardWidth + gap);

		this.board = Array.from({ length: GameBoard.ROWS }, () =>
			Array(GameBoard.COLS).fill(0)
		);

		if (this.boardNode && !this.boardNode.destroyed()) this.boardNode.destroy();
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) this.currentPuyoNode.destroy();

		this.boardNode = new g.E({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: this.yLocation,
		});
		this.ghostPuyoNode = new g.E({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: this.yLocation,
		});
		this.currentPuyoNode = new g.E({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: this.yLocation,
		});
	}

	public reset() {
		this.board = Array.from({ length: GameBoard.ROWS }, () =>
			Array(GameBoard.COLS).fill(0)
		);
		this.score = 0;
		this.nuisanceQueue = 0;
		this.isAnimating = false;
		this.isPaused = false;
		this.currentPuyo = null;
		this.nextPuyo = null;
		this.busyUntil = 0;
		this.snapshotBoard = null;
		this.renderBoard();

		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) this.currentPuyoNode.destroy();

		this.updatePuyoView();

		if (this.backgroundNode && !this.backgroundNode.destroyed()) {
			this.backgroundNode.destroy();
			this.backgroundNode = null;
		}
	}

	public tryRotate(clockwise: boolean) {
		if (!this.currentPuyo) return;

		const currentRot = this.currentPuyo.rot;
		const delta = clockwise ? 1 : 3;
		const nextRot = (currentRot + delta) % 4;
		if (this.isValid(this.currentPuyo.x, this.currentPuyo.y, nextRot)) {
			this.currentPuyo.rot = nextRot;
			this.updatePuyoView();
			return;
		}
		if (this.isValid(this.currentPuyo.x - 1, this.currentPuyo.y, nextRot)) {
			this.currentPuyo.x -= 1;
			this.currentPuyo.rot = nextRot;
			this.updatePuyoView();
			return;
		}
		if (this.isValid(this.currentPuyo.x + 1, this.currentPuyo.y, nextRot)) {
			this.currentPuyo.x += 1;
			this.currentPuyo.rot = nextRot;
			this.updatePuyoView();
			return;
		}
	}
	public fillBackground() {
		const scene = g.game.scene();
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = this.yLocation;
		const totalWidth = GameBoard.totalBoardsInGame * boardWidth + (GameBoard.totalBoardsInGame - 1) * gap;
		const startX = (g.game.width - totalWidth) / 2;
		const offsetX = startX + this.getVisualIndex() * (boardWidth + gap);

		if (this.backgroundNode && !this.backgroundNode.destroyed()) this.backgroundNode.destroy();

		this.backgroundNode = new g.FilledRect({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: this.yLocation,
			opacity: 0.45,
			width: GameBoard.puyoSize * GameBoard.COLS,
			height: GameBoard.puyoSize * GameBoard.ROWS,
			cssColor:
				GameBoard.colorBackground[
				this.playerIndex % GameBoard.colorBackground.length
				],
		});
		Helper.insertBefore(this.rootParent.children[0], this.backgroundNode);
	}

	public generateRandomColors(): { colorMain: number; colorSub: number } {
		const main = Math.floor(this.rng.generate() * 2) + 1;
		const sub = Math.floor(this.rng.generate() * 2) + 1;
		return { colorMain: main, colorSub: sub };
	}

	public spawnPuyo(
		nextColors: { colorMain: number; colorSub: number },
		currentColors: { colorMain: number; colorSub: number }
	) {
		if (this.isAnimating) {
			return;
		}

		if (this.currentPuyo) return;

		this.currentPuyo = {
			x: 2,
			y: 1,
			colorMain: currentColors.colorMain,
			colorSub: currentColors.colorSub,
			rot: 0,
		};

		if (!this.isValid(this.currentPuyo.x, this.currentPuyo.y, this.currentPuyo.rot)) {
			this.flowManager.fireAsync(
				FlowEventName.GameOver,
				new gameOver_sender(this.playerIndex, "blocked")
			);
			return;
		}

		this.nextPuyo = {
			colorMain: nextColors.colorMain,
			colorSub: nextColors.colorSub
		};

		this.rngIterationCount += 2;

		this.flowManager.fireAsync(
			FlowEventName.UpdateNextPuyo,
			new nextPuyo_sender(
				this.playerIndex,
				this.nextPuyo.colorMain,
				this.nextPuyo.colorSub
			)
		);

		this.updatePuyoView();
	}
	public getSubPos(x: number, y: number, rot: number) {
		let sx = x;
		let sy = y;
		if (rot === 0) sy -= 1;
		else if (rot === 1) sx += 1;
		else if (rot === 2) sy += 1;
		else if (rot === 3) sx -= 1;
		return { x: sx, y: sy };
	}

	public isValid(x: number, y: number, rot: number): boolean {
		if (x < 0 || x >= GameBoard.COLS || y < 0 || y >= GameBoard.ROWS)
			return false;
		if (this.board[y][x] !== 0) return false;
		const sub = this.getSubPos(x, y, rot);
		if (
			sub.x < 0 ||
			sub.x >= GameBoard.COLS ||
			sub.y < 0 ||
			sub.y >= GameBoard.ROWS
		)
			return false;
		if (this.board[sub.y][sub.x] !== 0) return false;
		return true;
	}

	public async lockPuyo() {
		if (!this.currentPuyo) return;

		const { x, y, rot, colorMain, colorSub } = this.currentPuyo;
		const sub = this.getSubPos(x, y, rot);

		this.board[y][x] = colorMain;
		this.board[sub.y][sub.x] = colorSub;
		this.currentPuyo = null;
		this.updatePuyoView();

		const startVisualBoard = this.board.map((row) => [...row]);
		const steps = this.calculateResolveSteps();

		await this.animateResolveSteps(startVisualBoard, steps);
		this.renderBoard();

		if (steps.length === 0 && this.nuisanceQueue > 0) {
			this.dropPendingGarbage();
		}
	}

	private calculateResolveSteps(): ResolveStep[] {
		const steps: ResolveStep[] = [];
		let causedClear = false;
		let tempBoard = this.board.map(row => [...row]);
		let chainCount = 0;

		do {
			causedClear = false;
			let visited = Array.from({ length: GameBoard.ROWS }, () =>
				Array(GameBoard.COLS).fill(false)
			);
			let toRemove: { x: number; y: number }[] = [];

			for (let r = 0; r < GameBoard.ROWS; r++) {
				for (let c = 0; c < GameBoard.COLS; c++) {
					if (tempBoard[r][c] !== 0 && !visited[r][c]) {
						let matches: { x: number; y: number }[] = [];
						this.findConnectedInBoard(
							tempBoard,
							c,
							r,
							tempBoard[r][c],
							visited,
							matches
						);
						if (matches.length >= 4) toRemove.push(...matches);
					}
				}
			}

			if (toRemove.length > 0) {
				causedClear = true;
				chainCount++;
				const scoreGain = toRemove.length;
				this.score += scoreGain;
				let baseGarbage = Math.max(1, scoreGain - 3);
				let chainBonus = (chainCount - 1) * 3;
				const rawGarbage = baseGarbage + chainBonus;

				let garbageToSend = 0;

				if (this.nuisanceQueue > 0) {
					if (rawGarbage >= this.nuisanceQueue) {
						garbageToSend = rawGarbage - this.nuisanceQueue;
						this.nuisanceQueue = 0;
					} else {
						this.nuisanceQueue -= rawGarbage;
						garbageToSend = 0;
					}
				} else {
					garbageToSend = rawGarbage;
				}

				let garbageToRemove: { x: number; y: number }[] = [];
				const dirs = [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: -1, dy: 0 }];

				toRemove.forEach(p => {
					dirs.forEach(d => {
						const nx = p.x + d.dx;
						const ny = p.y + d.dy;
						if (nx >= 0 && nx < GameBoard.COLS && ny >= 0 && ny < GameBoard.ROWS) {
							if (tempBoard[ny][nx] === GameBoard.GARBAGE_ID) {
								const alreadyAdded = garbageToRemove.some(g => g.x === nx && g.y === ny);
								if (!alreadyAdded) {
									garbageToRemove.push({ x: nx, y: ny });
								}
							}
						}
					});
				});

				const totalCleared = [...toRemove, ...garbageToRemove];

				steps.push({
					type: "clear",
					matches: totalCleared,
					score: scoreGain,
					garbageToSend: garbageToSend
				});

				totalCleared.forEach((p) => {
					tempBoard[p.y][p.x] = 0;
					this.board[p.y][p.x] = 0;
				});

				steps.push({
					type: "drop",
				});

				this.applyGravity(tempBoard);
				this.applyGravity(this.board);
			}
		} while (causedClear);

		return steps;
	}

	private async animateResolveSteps(
		visualBoard: number[][],
		steps: ResolveStep[]
	) {
		if (steps.length === 0) return;

		this.isAnimating = true;
		this.renderBoard(visualBoard);
		for (const step of steps) {
			const STEP_DELAY = 15;
			const BLINK_DURATION = 40;
			const BLINK_INTERVAL = 8;

			this.busyUntil = g.game.age + (step.type === "clear" ? BLINK_DURATION + STEP_DELAY : STEP_DELAY);

			if (step.type === "clear") {
				this.flowManager.fireAsync(
					FlowEventName.AddScore,
					new addScore_sender(this.playerIndex, step.score, step.garbageToSend)
				);

				if (!g.game.isSkipping) {
					await this.waitFrames(STEP_DELAY);
					const blinkers: g.E[] = [];
					step.matches.forEach((p) => {
						let blinkSpr = Helper.newSprite("/assets/blink.png");
						this.boardNode.append(blinkSpr);
						blinkSpr.x = p.x * GameBoard.puyoSize;
						blinkSpr.y = p.y * GameBoard.puyoSize;
						blinkSpr.scaleX = (GameBoard.puyoSize - 2) / blinkSpr.width;
						blinkSpr.scaleY = (GameBoard.puyoSize - 2) / blinkSpr.height;
						blinkSpr.modified();
						blinkers.push(blinkSpr);
					});

					let elapsed = 0;
					let visible = true;
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

				step.matches.forEach((p) => {
					visualBoard[p.y][p.x] = 0;
				});
				this.renderBoard(visualBoard);

			} else if (step.type === "drop") {
				this.applyGravity(visualBoard);
				this.renderBoard(visualBoard);

				if (!g.game.isSkipping) {
					await this.waitFrames(STEP_DELAY);
				}
			}
		}

		this.isAnimating = false;
		this.busyUntil = 0;
	}

	private async waitFrames(frames: number): Promise<void> {
		if (frames <= 0) return;
		return new Promise<void>((resolve) => {
			let remaining = frames;
			const handler = () => {
				remaining--;
				if (remaining <= 0) {
					g.game.scene().onUpdate.remove(handler);
					resolve();
				}
			};
			g.game.scene().onUpdate.add(handler);
		});
	}

	private findConnectedInBoard(
		board: number[][],
		x: number,
		y: number,
		color: number,
		visited: boolean[][],
		matches: { x: number; y: number }[]
	) {
		if (color === GameBoard.GARBAGE_ID) return;

		if (x < 0 || x >= GameBoard.COLS || y < 0 || y >= GameBoard.ROWS)
			return;
		if (visited[y][x] || board[y][x] !== color) return;
		visited[y][x] = true;
		matches.push({ x, y });
		const dirs = [
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 },
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
		];
		for (let d of dirs)
			this.findConnectedInBoard(
				board,
				x + d.dx,
				y + d.dy,
				color,
				visited,
				matches
			);
	}

	private applyGravity(board: number[][]) {
		for (let c = 0; c < GameBoard.COLS; c++) {
			let validBlocks: number[] = [];
			for (let r = GameBoard.ROWS - 1; r >= 0; r--) {
				if (board[r][c] !== 0) validBlocks.push(board[r][c]);
			}
			for (let r = 0; r < GameBoard.ROWS; r++) board[r][c] = 0;
			for (let i = 0; i < validBlocks.length; i++)
				board[GameBoard.ROWS - 1 - i][c] = validBlocks[i];
		}
	}

	public receiveGarbage(amount: number) {
		this.nuisanceQueue += amount;
	}

	public dropPendingGarbage() {
		if (this.nuisanceQueue <= 0) return;

		const dropAmount = Math.min(this.nuisanceQueue, 30);
		this.nuisanceQueue -= dropAmount;

		const fullRows = Math.floor(dropAmount / GameBoard.COLS);
		const remainder = dropAmount % GameBoard.COLS;

		for (let r = 0; r < fullRows; r++) {
			for (let c = 0; c < GameBoard.COLS; c++) {
				if (this.board[r][c] === 0) {
					this.board[r][c] = GameBoard.GARBAGE_ID;
				}
			}
		}

		if (remainder > 0) {
			const cols = Array.from({ length: GameBoard.COLS }, (_, i) => i);
			for (let i = cols.length - 1; i > 0; i--) {
				const j = Math.floor(this.garbageRng.generate() * (i + 1));
				this.garbageRngIterationCount++;
				[cols[i], cols[j]] = [cols[j], cols[i]];
			}

			const targetRow = fullRows;
			if (targetRow < GameBoard.ROWS) {
				for (let i = 0; i < remainder; i++) {
					if (this.board[targetRow][cols[i]] === 0) {
						this.board[targetRow][cols[i]] = GameBoard.GARBAGE_ID;
					}
				}
			}
		}

		this.applyGravity(this.board);
		this.renderBoard();
	}

	public renderBoard(renderData?: number[][]) {
		const targetBoard = renderData || this.board;
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = this.yLocation;
		const totalWidth = GameBoard.totalBoardsInGame * boardWidth + (GameBoard.totalBoardsInGame - 1) * gap;
		const startX = (g.game.width - totalWidth) / 2;
		const offsetX = startX + this.getVisualIndex() * (boardWidth + gap);

		if (this.boardNode && !this.boardNode.destroyed())
			this.boardNode.destroy();

		this.boardNode = new g.E({
			scene: g.game.scene(),
			parent: this.rootParent,
			x: offsetX,
			y: this.yLocation,
		});

		for (let r = 0; r < GameBoard.ROWS; r++) {
			for (let c = 0; c < GameBoard.COLS; c++) {
				const colorIdx = targetBoard[r][c];
				if (colorIdx !== 0) {
					const spr = Helper.newSprite(this.getColor(colorIdx));
					this.boardNode.append(spr);
					spr.x = c * GameBoard.puyoSize;
					spr.y = r * GameBoard.puyoSize;
					const targetSize = GameBoard.puyoSize - 2;
					spr.scaleX = targetSize / spr.width;
					spr.scaleY = targetSize / spr.height;
					spr.modified();
				}
			}
		}
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) {
			this.ghostPuyoNode.remove();
			this.ghostPuyoNode.x = offsetX;
			this.ghostPuyoNode.y = this.yLocation;
			this.ghostPuyoNode.modified();
			if (this.boardNode.parent)
				this.boardNode.parent.append(this.ghostPuyoNode);
		}
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) {
			this.currentPuyoNode.remove();
			this.currentPuyoNode.x = offsetX;
			this.currentPuyoNode.y = this.yLocation;
			this.currentPuyoNode.modified();
			if (this.boardNode.parent)
				this.boardNode.parent.append(this.currentPuyoNode);
		}
	}

	public updatePuyoView() {
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed())
			this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed())
			this.currentPuyoNode.destroy();
		if (!this.boardNode || this.boardNode.destroyed()) return;

		const offsetX = this.boardNode.x;
		this.ghostPuyoNode = new g.E({
			scene: g.game.scene(),
			parent: this.boardNode.parent,
			x: offsetX,
			y: this.yLocation,
		});
		this.currentPuyoNode = new g.E({
			scene: g.game.scene(),
			parent: this.boardNode.parent,
			x: offsetX,
			y: this.yLocation,
		});
		const createPuyo = (
			x: number,
			y: number,
			assetPath: string,
			isGhost: boolean
		) => {
			const size = isGhost
				? GameBoard.puyoSize / 4
				: GameBoard.puyoSize - 2;
			const offset = (GameBoard.puyoSize - size) / 2;
			const targetParent = isGhost
				? this.ghostPuyoNode
				: this.currentPuyoNode;

			const spr = Helper.newSprite(assetPath);
			targetParent.append(spr);
			spr.x = x * GameBoard.puyoSize + (isGhost ? offset : 0);
			spr.y = y * GameBoard.puyoSize + (isGhost ? offset : 0);
			spr.opacity = isGhost ? 0.0 : 1;

			spr.scaleX = size / spr.width;
			spr.scaleY = size / spr.height;
			spr.modified();
		};
		if (this.currentPuyo) {
			let ghostY = this.currentPuyo.y;
			while (
				this.isValid(
					this.currentPuyo.x,
					ghostY + 1,
					this.currentPuyo.rot
				)
			)
				ghostY++;
			const ghostSub = this.getSubPos(
				this.currentPuyo.x,
				ghostY,
				this.currentPuyo.rot
			);
			createPuyo(
				this.currentPuyo.x,
				ghostY,
				this.getColor(this.currentPuyo.colorMain),
				true
			);
			createPuyo(
				ghostSub.x,
				ghostSub.y,
				this.getColor(this.currentPuyo.colorSub),
				true
			);
			createPuyo(
				this.currentPuyo.x,
				this.currentPuyo.y,
				this.getColor(this.currentPuyo.colorMain),
				false
			);
			const sub = this.getSubPos(
				this.currentPuyo.x,
				this.currentPuyo.y,
				this.currentPuyo.rot
			);
			createPuyo(
				sub.x,
				sub.y,
				this.getColor(this.currentPuyo.colorSub),
				false
			);
		}
	}

	public static getAssetPath(idx: number): string {
		if (idx === GameBoard.GARBAGE_ID) return "/assets/garbage.png";
		const assets = ["", "/assets/red.png", "/assets/yellow.png"];
		return assets[idx];
	}

	public getColor(idx: number): string {
		return GameBoard.getAssetPath(idx);
	}
}