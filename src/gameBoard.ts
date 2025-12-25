import { FlowEventName } from "./flow/eventName";
import { FlowManager } from "./flow/flowManager";
import { addScore_sender, gameOver_sender } from "./sender";

export class GameBoard {
	public static readonly ROWS = 12;
	public static readonly COLS = 6;
	public static puyoSize: number = 30;
	public static instances: { [id: string]: GameBoard } = {};

	public board: number[][] = [];
	public currentPuyo: {
		x: number;
		y: number;
		colorMain: number;
		colorSub: number;
		rot: number;
	} = null;
	public boardNode: g.E = null;
	public ghostPuyoNode: g.E = null;
	public currentPuyoNode: g.E = null;

	public score: number = 0;

	public isAnimating: boolean = false;
	public isPaused: boolean = false;
	public playerIndex: number;
	public id: string;

	private rootParent: g.E;
	private pendingSpawn: boolean = false;
	private backgroundNode: g.FilledRect = null;

	private static colorBackground: string[] = [
		"red",
		"blue",
		"green",
		"yellow",
		"purple",
	];
	private rng: g.RandomGenerator;
	private flowManager: FlowManager;

	constructor(
		id: string,
		playerIndex: number,
		rng: g.RandomGenerator,
		flowManager: FlowManager
	) {
		this.id = id;
		this.playerIndex = playerIndex;
		this.rng = rng;
		this.flowManager = flowManager;
	}

	public static createPlayerBoard(
		id: string,
		playerIndex: number,
		scene: g.Scene,
		parent: g.E,
		flowManager: FlowManager
	): GameBoard {
		const seed = g.game.random.generate();
		const rng = new g.XorshiftRandomGenerator(Math.floor(seed * 1000000));
		const state = new GameBoard(id, playerIndex, rng, flowManager);
		state.init(scene, parent);
		this.instances[id] = state;
		return state;
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

	private getVisualIndex(): number {
		let localPlayerIndex = 0;
		if (GameBoard.instances[g.game.selfId]) {
			localPlayerIndex = GameBoard.instances[g.game.selfId].playerIndex;
		}
		return (this.playerIndex - localPlayerIndex + 2) % 2;
	}

	public init(scene: g.Scene, parent: g.E) {
		this.rootParent = parent;

		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = 50;
		const totalWidth = 2 * boardWidth + gap;
		const startX = (g.game.width - totalWidth) / 2;
		const offsetX = startX + this.getVisualIndex() * (boardWidth + gap);

		this.board = Array.from({ length: GameBoard.ROWS }, () =>
			Array(GameBoard.COLS).fill(0)
		);

		this.boardNode = new g.E({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: 50,
		});
		this.ghostPuyoNode = new g.E({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: 50,
		});
		this.currentPuyoNode = new g.E({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: 50,
		});
	}

	public reset() {
		this.board = Array.from({ length: GameBoard.ROWS }, () =>
			Array(GameBoard.COLS).fill(0)
		);
		this.score = 0;
		this.isAnimating = false;
		this.isPaused = false;
		this.currentPuyo = null;
		this.renderBoard();
		if (this.ghostPuyoNode) this.ghostPuyoNode.destroy();
		if (this.currentPuyoNode) this.currentPuyoNode.destroy();

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
		const gap = 50;
		const totalWidth = 2 * boardWidth + gap;
		const startX = (g.game.width - totalWidth) / 2;
		const offsetX = startX + this.getVisualIndex() * (boardWidth + gap);

		if (this.backgroundNode && !this.backgroundNode.destroyed()) return;

		this.backgroundNode = new g.FilledRect({
			scene: scene,
			parent: this.rootParent,
			x: offsetX,
			y: 50,
			opacity: 0.1,
			width: GameBoard.puyoSize * GameBoard.COLS,
			height: GameBoard.puyoSize * GameBoard.ROWS,
			cssColor:
				GameBoard.colorBackground[
					this.playerIndex % GameBoard.colorBackground.length
				],
		});
	}

	public spawnPuyo() {
		if (this.isAnimating) {
			this.pendingSpawn = true;
			return;
		}

		const nextPuyo = {
			x: 2,
			y: 1,
			colorMain: Math.floor(this.rng.generate() * 3) + 1,
			colorSub: Math.floor(this.rng.generate() * 3) + 1,
			rot: 0,
		};

		if (!this.isValid(nextPuyo.x, nextPuyo.y, nextPuyo.rot)) {
			this.flowManager.fireAsync(
				FlowEventName.GameOver,
				new gameOver_sender(this.playerIndex, "blocked")
			);
			return;
		}

		this.currentPuyo = nextPuyo;
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
		this.renderBoard();
		this.resolveBoard();
	}

	private async resolveBoard() {
		let causedClear = false;
		do {
			causedClear = await this.checkAndClearMatches();
			if (causedClear) {
				this.applyGravity();
				this.renderBoard();
				await new Promise<void>((resolve) =>
					g.game.scene().setTimeout(resolve, 300)
				);
			}
		} while (causedClear);

		this.isAnimating = false;

		if (this.pendingSpawn) {
			this.pendingSpawn = false;
			this.spawnPuyo();
		}
	}

	private async checkAndClearMatches(): Promise<boolean> {
		let visited = Array.from({ length: GameBoard.ROWS }, () =>
			Array(GameBoard.COLS).fill(false)
		);
		let toRemove: { x: number; y: number }[] = [];

		for (let r = 0; r < GameBoard.ROWS; r++) {
			for (let c = 0; c < GameBoard.COLS; c++) {
				if (this.board[r][c] !== 0 && !visited[r][c]) {
					let matches: { x: number; y: number }[] = [];
					this.findConnected(
						c,
						r,
						this.board[r][c],
						visited,
						matches
					);
					if (matches.length >= 4) toRemove.push(...matches);
				}
			}
		}

		if (toRemove.length > 0) {
			this.isAnimating = true;

			const addedScore = toRemove.length * 100;
			this.flowManager.fireAsync(
				FlowEventName.AddScore,
				new addScore_sender(this.playerIndex, addedScore)
			);

			await new Promise<void>((resolve) =>
				g.game.scene().setTimeout(resolve, 300)
			);
			const scene = g.game.scene();
			const blinkers: g.FilledRect[] = [];
			toRemove.forEach((p) => {
				const rect = new g.FilledRect({
					scene: scene,
					parent: this.boardNode,
					x: p.x * GameBoard.puyoSize,
					y: p.y * GameBoard.puyoSize,
					width: GameBoard.puyoSize - 2,
					height: GameBoard.puyoSize - 2,
					cssColor: "white",
					opacity: 0,
				});
				blinkers.push(rect);
			});

			await new Promise<void>((resolve) => {
				let elapsed = 0;
				const duration = 1000;
				const blinkSpeed = 100;
				let visible = false;
				const interval = scene.setInterval(() => {
					elapsed += blinkSpeed;
					visible = !visible;
					blinkers.forEach((b) => {
						b.opacity = visible ? 0.7 : 0;
						b.modified();
					});
					if (elapsed >= duration) {
						scene.clearInterval(interval);
						resolve();
					}
				}, blinkSpeed);
			});

			blinkers.forEach((b) => b.destroy());
			toRemove.forEach((p) => {
				this.board[p.y][p.x] = 0;
			});

			this.isAnimating = false;
			return true;
		}
		return false;
	}

	private findConnected(
		x: number,
		y: number,
		color: number,
		visited: boolean[][],
		matches: { x: number; y: number }[]
	) {
		if (x < 0 || x >= GameBoard.COLS || y < 0 || y >= GameBoard.ROWS)
			return;
		if (visited[y][x] || this.board[y][x] !== color) return;
		visited[y][x] = true;
		matches.push({ x, y });
		const dirs = [
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 },
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
		];
		for (let d of dirs)
			this.findConnected(x + d.dx, y + d.dy, color, visited, matches);
	}

	private applyGravity() {
		for (let c = 0; c < GameBoard.COLS; c++) {
			let validBlocks: number[] = [];
			for (let r = GameBoard.ROWS - 1; r >= 0; r--) {
				if (this.board[r][c] !== 0) validBlocks.push(this.board[r][c]);
			}
			for (let r = 0; r < GameBoard.ROWS; r++) this.board[r][c] = 0;
			for (let i = 0; i < validBlocks.length; i++)
				this.board[GameBoard.ROWS - 1 - i][c] = validBlocks[i];
		}
	}

	public renderBoard() {
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = 50;
		const totalWidth = 2 * boardWidth + gap;
		const startX = (g.game.width - totalWidth) / 2;
		const offsetX = startX + this.getVisualIndex() * (boardWidth + gap);

		if (this.boardNode && !this.boardNode.destroyed())
			this.boardNode.destroy();

		this.boardNode = new g.E({
			scene: g.game.scene(),
			parent: this.rootParent,
			x: offsetX,
			y: 50,
		});

		for (let r = 0; r < GameBoard.ROWS; r++) {
			for (let c = 0; c < GameBoard.COLS; c++) {
				const colorIdx = this.board[r][c];
				if (colorIdx !== 0) {
					new g.FilledRect({
						scene: g.game.scene(),
						parent: this.boardNode,
						x: c * GameBoard.puyoSize,
						y: r * GameBoard.puyoSize,
						width: GameBoard.puyoSize - 2,
						height: GameBoard.puyoSize - 2,
						cssColor: this.getColor(colorIdx),
					});
				}
			}
		}
		if (this.ghostPuyoNode && !this.ghostPuyoNode.destroyed()) {
			this.ghostPuyoNode.remove();
			if (this.boardNode.parent)
				this.boardNode.parent.append(this.ghostPuyoNode);
		}
		if (this.currentPuyoNode && !this.currentPuyoNode.destroyed()) {
			this.currentPuyoNode.remove();
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
			y: 50,
		});
		this.currentPuyoNode = new g.E({
			scene: g.game.scene(),
			parent: this.boardNode.parent,
			x: offsetX,
			y: 50,
		});
		const createPuyo = (
			x: number,
			y: number,
			color: string,
			isGhost: boolean
		) => {
			const size = isGhost
				? GameBoard.puyoSize / 4
				: GameBoard.puyoSize - 2;
			const offset = (GameBoard.puyoSize - size) / 2;
			const targetParent = isGhost
				? this.ghostPuyoNode
				: this.currentPuyoNode;
			new g.FilledRect({
				scene: g.game.scene(),
				parent: targetParent,
				x: x * GameBoard.puyoSize + (isGhost ? offset : 0),
				y: y * GameBoard.puyoSize + (isGhost ? offset : 0),
				width: size,
				height: size,
				cssColor: color,
			});
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

	public getColor(idx: number): string {
		const colors = ["black", "red", "blue", "green", "yellow", "purple"];
		return colors[idx] || "white";
	}
}
