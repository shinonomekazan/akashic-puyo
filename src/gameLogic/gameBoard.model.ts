import { controlID } from "../layout/controller";
export interface Point {
	x: number;
	y: number;
}

export interface GarbageDropInfo {
	count: number;
	distribution: number[];
	boardSnapshot: number[][];
}

export interface ResolutionStep {
	type: "clear" | "drop";
	matches?: Point[];
	scoreGained?: number;
	garbageToSend?: number;
	boardSnapshot: number[][];
}

export interface ExecutionResult {
	steps: ResolutionStep[];
	garbageDrop?: GarbageDropInfo;
}

export class GameBoardModel {
	public static readonly ROWS = 12;
	public static readonly COLS = 6;
	public static readonly MAX_GARBAGE: number = 30;
	public static readonly GARBAGE_ID: number = 9;

	public board: number[][] = [];

	public currentPuyo: {
		x: number;
		y: number;
		colorMain: number;
		colorSub: number;
		rot: number;
	} | null = null;

	public nextPuyo: {
		colorMain: number;
		colorSub: number;
	} | null = null;

	public score: number = 0;
	public nuisanceQueue: number = 0;

	public playerIndex: number;
	public id: string;

	private rng: g.RandomGenerator;
	private garbageRng: g.RandomGenerator;
	private rngSeed: number;
	public rngIterationCount: number = 0;
	public garbageRngIterationCount: number = 0;

	constructor(
		id: string,
		playerIndex: number,
		rngSeed?: number
	) {
		this.id = id;
		this.playerIndex = playerIndex;
		this.rngSeed = rngSeed !== undefined ? rngSeed : Math.floor(g.game.random.generate() * 1000000);

		this.rng = new g.XorshiftRandomGenerator(this.rngSeed);
		this.garbageRng = new g.XorshiftRandomGenerator(this.rngSeed + 9999);

		this.reset();
	}

	public reset() {
		this.board = Array.from({ length: GameBoardModel.ROWS }, () =>
			Array(GameBoardModel.COLS).fill(0)
		);
		this.score = 0;
		this.nuisanceQueue = 0;
		this.currentPuyo = null;
		this.nextPuyo = null;
	}

	public getSnapshot() {
		return {
			id: this.id,
			playerIndex: this.playerIndex,
			board: this.board.map(row => [...row]),
			score: this.score,
			nuisanceQueue: this.nuisanceQueue,
			currentPuyo: this.currentPuyo ? { ...this.currentPuyo } : null,
			nextPuyo: this.nextPuyo ? { ...this.nextPuyo } : null,
			rngSeed: this.rngSeed,
			rngIterationCount: this.rngIterationCount,
			garbageRngIterationCount: this.garbageRngIterationCount,
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
	}

	// --- LOGIC ACTIONS ---

	/**
	 * Receives Nuisance (Garbage) from opponent.
	 * This adds to the queue which will drop later.
	 */
	public addNuisance(amount: number) {
		this.nuisanceQueue += amount;
	}

	public hardDrop(): void {
		if (!this.currentPuyo) return;
		while (this.isValid(this.currentPuyo.x, this.currentPuyo.y + 1, this.currentPuyo.rot)) {
			this.currentPuyo.y++;
		}
	}
	public tryRotate(clockwise: boolean): boolean {
		if (!this.currentPuyo) return false;

		const currentRot = this.currentPuyo.rot;
		const delta = clockwise ? 1 : 3;
		const nextRot = (currentRot + delta) % 4;

		if (this.isValid(this.currentPuyo.x, this.currentPuyo.y, nextRot)) {
			this.currentPuyo.rot = nextRot;
			return true;
		}
		if (this.isValid(this.currentPuyo.x - 1, this.currentPuyo.y, nextRot)) {
			this.currentPuyo.x -= 1;
			this.currentPuyo.rot = nextRot;
			return true;
		}
		if (this.isValid(this.currentPuyo.x + 1, this.currentPuyo.y, nextRot)) {
			this.currentPuyo.x += 1;
			this.currentPuyo.rot = nextRot;
			return true;
		}
		return false;
	}

	public moveWithControlInput(controlID: controlID) {
		console.log('id: ', this.id, ' => ', controlID);
		switch (controlID) {
			case "ArrowLeft":
				this.move(-1);
				break;
			case "ArrowRight":
				this.move(1);
				break;
			case "ArrowUp":
				this.tryRotate(true);
				break;
			case "ArrowUpCCW":
				this.tryRotate(false);
				break;
			case "ArrowDown":
				this.hardDrop();
				break;
			default:
				console.error("Unknown controlID:", controlID);
		}
	}
	public move(dx: number) {
		if (!this.currentPuyo) return;
		if (this.isValid(this.currentPuyo.x + dx, this.currentPuyo.y, this.currentPuyo.rot)) {
			this.currentPuyo.x += dx;
		}
	}

	public dropDown() {
		if (!this.currentPuyo) return;
		if (this.isValid(this.currentPuyo.x, this.currentPuyo.y + 1, this.currentPuyo.rot)) {
			this.currentPuyo.y += 1;
		}
	}

	public generateRandomColors(): { colorMain: number; colorSub: number } {
		const main = Math.floor(this.rng.generate() * 2) + 1;
		const sub = Math.floor(this.rng.generate() * 2) + 1;
		this.rngIterationCount += 2;
		return { colorMain: main, colorSub: sub };
	}

	public spawnPuyo(
		nextColors: { colorMain: number; colorSub: number },
		currentColors: { colorMain: number; colorSub: number }
	): boolean {
		if (this.currentPuyo) return false;

		const spawnX = 2;
		const spawnY = 1;
		if (this.board[spawnY][spawnX] !== 0) {
			return false;
		}

		this.currentPuyo = {
			x: spawnX,
			y: spawnY,
			colorMain: currentColors.colorMain,
			colorSub: currentColors.colorSub,
			rot: 0,
		};

		if (!this.isValid(this.currentPuyo.x, this.currentPuyo.y, this.currentPuyo.rot)) {
			return false;
		}

		this.nextPuyo = {
			colorMain: nextColors.colorMain,
			colorSub: nextColors.colorSub,
		};

		return true;
	}

	public lockPuyo(): ExecutionResult {
		if (!this.currentPuyo) return { steps: [] };

		const { x, y, rot, colorMain, colorSub } = this.currentPuyo;
		const sub = this.getSubPos(x, y, rot);

		this.board[y][x] = colorMain;
		this.board[sub.y][sub.x] = colorSub;
		this.currentPuyo = null;

		const steps: ResolutionStep[] = [];
		let workingBoard = this.board.map(row => [...row]);
		let causedClear = false;
		let chainCount = 0;

		do {
			causedClear = false;

			const boardBeforeGravity = workingBoard.map(r => [...r]);
			this.applyGravity(workingBoard);

			if (chainCount > 0) {
				steps.push({
					type: "drop",
					boardSnapshot: workingBoard.map(r => [...r])
				});
			}

			let visited = Array.from({ length: GameBoardModel.ROWS }, () =>
				Array(GameBoardModel.COLS).fill(false)
			);
			let toRemove: Point[] = [];

			for (let r = 0; r < GameBoardModel.ROWS; r++) {
				for (let c = 0; c < GameBoardModel.COLS; c++) {
					if (workingBoard[r][c] !== 0 && !visited[r][c] && workingBoard[r][c] !== GameBoardModel.GARBAGE_ID) {
						let matches: Point[] = [];
						this.findConnectedInBoard(
							workingBoard,
							c,
							r,
							workingBoard[r][c],
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
				const scoreGain = this.calculateScore(toRemove.length, chainCount);
				this.score += scoreGain;

				const rawGarbage = this.calculateGarbageGenerated(toRemove.length, chainCount, scoreGain);
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

				let garbageToRemove: Point[] = [];
				const dirs = [
					{ dx: 0, dy: 1 }, { dx: 0, dy: -1 },
					{ dx: 1, dy: 0 }, { dx: -1, dy: 0 },
				];

				toRemove.forEach((p) => {
					dirs.forEach((d) => {
						const nx = p.x + d.dx;
						const ny = p.y + d.dy;
						if (nx >= 0 && nx < GameBoardModel.COLS && ny >= 0 && ny < GameBoardModel.ROWS) {
							if (workingBoard[ny][nx] === GameBoardModel.GARBAGE_ID) {
								const alreadyAdded = garbageToRemove.some((g) => g.x === nx && g.y === ny);
								if (!alreadyAdded) {
									garbageToRemove.push({ x: nx, y: ny });
								}
							}
						}
					});
				});

				const totalCleared = [...toRemove, ...garbageToRemove];

				totalCleared.forEach(p => {
					workingBoard[p.y][p.x] = 0;
				});

				steps.push({
					type: "clear",
					matches: totalCleared,
					scoreGained: scoreGain,
					garbageToSend: garbageToSend,
					boardSnapshot: workingBoard.map(r => [...r])
				});
			}

		} while (causedClear);

		let garbageDropInfo: GarbageDropInfo | undefined;

		// Garbage drop logic happens at end of turn if nuisance exists
		if (this.nuisanceQueue > 0) {
			const dropAmount = Math.min(this.nuisanceQueue, GameBoardModel.MAX_GARBAGE);
			this.nuisanceQueue -= dropAmount;

			const fullRows = Math.floor(dropAmount / GameBoardModel.COLS);
			const remainder = dropAmount % GameBoardModel.COLS;
			let garbageCounts = new Array(GameBoardModel.COLS).fill(0);

			for (let c = 0; c < GameBoardModel.COLS; c++) {
				garbageCounts[c] += fullRows;
			}

			if (remainder > 0) {
				const cols = Array.from({ length: GameBoardModel.COLS }, (_, i) => i);
				for (let i = cols.length - 1; i > 0; i--) {
					const j = Math.floor(this.garbageRng.generate() * (i + 1));
					this.garbageRngIterationCount++;
					[cols[i], cols[j]] = [cols[j], cols[i]];
				}
				for (let i = 0; i < remainder; i++) {
					garbageCounts[cols[i]]++;
				}
			}

			for (let c = 0; c < GameBoardModel.COLS; c++) {
				const count = garbageCounts[c];
				let placed = 0;
				for (let r = 0; r < GameBoardModel.ROWS && placed < count; r++) {
					if (workingBoard[r][c] === 0) {
						workingBoard[r][c] = GameBoardModel.GARBAGE_ID;
						placed++;
					}
				}
			}

			this.applyGravity(workingBoard);

			garbageDropInfo = {
				count: dropAmount,
				distribution: garbageCounts,
				boardSnapshot: workingBoard.map(r => [...r])
			};
		}

		this.board = workingBoard;

		return {
			steps: steps,
			garbageDrop: garbageDropInfo
		};
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
		if (x < 0 || x >= GameBoardModel.COLS || y < 0 || y >= GameBoardModel.ROWS)
			return false;
		if (this.board[y][x] !== 0) return false;
		const sub = this.getSubPos(x, y, rot);
		if (
			sub.x < 0 ||
			sub.x >= GameBoardModel.COLS ||
			sub.y < 0 ||
			sub.y >= GameBoardModel.ROWS
		)
			return false;
		if (this.board[sub.y][sub.x] !== 0) return false;
		return true;
	}

	private findConnectedInBoard(
		board: number[][],
		x: number,
		y: number,
		color: number,
		visited: boolean[][],
		matches: Point[]
	) {
		if (color === GameBoardModel.GARBAGE_ID) return;

		if (x < 0 || x >= GameBoardModel.COLS || y < 0 || y >= GameBoardModel.ROWS)
			return;
		if (visited[y][x] || board[y][x] !== color) return;
		visited[y][x] = true;
		matches.push({ x, y });
		const dirs = [
			{ dx: 0, dy: 1 }, { dx: 0, dy: -1 },
			{ dx: 1, dy: 0 }, { dx: -1, dy: 0 },
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
		for (let c = 0; c < GameBoardModel.COLS; c++) {
			let validBlocks: number[] = [];
			for (let r = GameBoardModel.ROWS - 1; r >= 0; r--) {
				if (board[r][c] !== 0) validBlocks.push(board[r][c]);
			}
			for (let r = 0; r < GameBoardModel.ROWS; r++) board[r][c] = 0;
			for (let i = 0; i < validBlocks.length; i++)
				board[GameBoardModel.ROWS - 1 - i][c] = validBlocks[i];
		}
	}

	private calculateScore(clearedCount: number, chainCount: number): number {
		return clearedCount * (chainCount * 10);
	}

	private calculateGarbageGenerated(clearedCount: number, chainCount: number, score: number): number {
		let baseGarbage = Math.max(1, clearedCount - 3);
		let chainBonus = (chainCount - 1) * 3;
		return baseGarbage + chainBonus;
	}
}