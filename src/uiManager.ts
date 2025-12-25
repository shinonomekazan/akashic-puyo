import { Button, ButtonMargin } from "./button";
import { GameBoard } from "./gameBoard";
import { Localization } from "./localization";
import { SoundManager } from "./soundManager";

export class UIManager {
	public layoutRoot: g.E;
	public gameLayer: g.E;
	public uiLayer: g.E;
	public controllerLayer: g.E;
	public onLobbyClick: g.Trigger<void> = new g.Trigger();
	public onRestartClick: g.Trigger<void> = new g.Trigger();
	public onControlClick: g.Trigger<string> = new g.Trigger();

	private scene: g.Scene;
	private lobbyContainer: g.E;
	private lobbyBg: g.FilledRect;
	private lobbyLabel: g.Label;
	private lobbyReadySprite: g.E;
	private lobbyReadyLabel: g.Label;

	private scoreLabels: { [playerIdx: number]: g.Label } = {};

	private nextPuyoContainers: { [playerIdx: number]: g.E } = {};
	private nextPuyoMainNodes: { [playerIdx: number]: g.FilledRect } = {};
	private nextPuyoSubNodes: { [playerIdx: number]: g.FilledRect } = {};

	private gameOverContainer: g.E;
	private gameOverLabel: g.Label;
	private restartButton: g.FilledRect;
	private restartLabel: g.Label;

	private soundButton: g.FilledRect;
	private soundLabel: g.Label;
	private soundManager: SoundManager;

	constructor(scene: g.Scene, soundManager?: SoundManager) {
		this.scene = scene;
		this.soundManager = soundManager;
		this.layoutRoot = new g.E({ scene: scene, parent: scene });

		this.gameLayer = new g.E({ scene: scene, parent: this.layoutRoot });
		this.uiLayer = new g.E({ scene: scene, parent: this.layoutRoot });

		this.createLobbyUI();
		this.createScoreUI();
		this.createNextPuyoUI();
		this.createGameOverUI();
		this.createUIController();

		if (this.soundManager) {
			this.createSoundButton();
		}
	}
	private createUIController() {
		const scene = this.scene;
		this.controllerLayer = new g.E({
			scene: scene,
			parent: this.layoutRoot,
		});
		let left = this.createButton(
			"ArrowLeft",
			"/assets/ui/arrow-left.png",
			100,
			100,
			{ left: 7, right: 0, top: 7, bottom: 7 },
			2
		);
		let right = this.createButton(
			"ArrowRight",
			"/assets/ui/arrow-right.png",
			100,
			150,
			{ left: 0, right: 7, top: 7, bottom: 7 },
			2
		);
		let up = this.createButton(
			"ArrowUp",
			"/assets/ui/arrow-up.png",
			100,
			155,
			{ left: 7, right: 7, top: 7, bottom: 1 },
			2
		);
		let down = this.createButton(
			"ArrowDown",
			"/assets/ui/arrow-down.png",
			100,
			160,
			{ left: 7, right: 7, top: 0, bottom: 7 },
			2
		);
		this.placeEntitiesAroundCenter(
			scene,
			{ x: 130, y: g.game.height - 150 },
			[up, down, left, right]
		);
		let rotateCw = this.createButton(
			"ArrowUp",
			"/assets/ui/rotate-cw.png",
			g.game.width - 200,
			right.y - right.height / 2,
			undefined,
			1
		);
		this.controllerLayer.append(rotateCw);
		let rotateCCw = this.createButton(
			"ArrowUpCCW",
			"/assets/ui/rotate-ccw.png",
			g.game.width - 200 - 150,
			right.y - right.height / 2,
			undefined,
			1
		);
		this.controllerLayer.append(rotateCCw);
		this.controllerLayer.hide();
	}
	private placeEntitiesAroundCenter(
		scene: g.Scene,
		center: g.CommonOffset,
		img: g.E[]
	) {
		const offset = 80;
		const positions: g.CommonOffset[] = [
			{ x: center.x, y: center.y - offset }, // up
			{ x: center.x, y: center.y + offset }, // down
			{ x: center.x - offset, y: center.y }, // left
			{ x: center.x + offset, y: center.y }, // right
		];

		for (let i = 0; i < 4; i++) {
			const entity = img[i];
			if (!entity) continue;
			entity.x = positions[i].x - entity.width;
			entity.y = positions[i].y - entity.height;
			entity.modified();
		}
	}

	private createButton(
		keyClick: string,
		imgPath: string,
		x: number,
		y: number,
		margin: ButtonMargin,
		scale: number = 1
	) {
		const img = this.scene.asset.getImage(imgPath);
		let btn = new Button(
			this.scene,
			img,
			img.width,
			img.height,
			margin,
			[0, 1],
			false
		);
		this.controllerLayer.append(btn);
		btn.x = x;
		btn.y = y;
		btn.scale(scale);
		btn.modified();
		btn.onClick.add(() => {
			this.onControlClick.fire(keyClick);
		});
		return btn;
	}

	private createSoundButton() {
		const width = 120;
		const height = 40;

		this.soundButton = new g.FilledRect({
			scene: this.scene,
			parent: this.controllerLayer,
			x: g.game.width - width - 10,
			y: 10,
			width: width,
			height: height,
			cssColor: "gray",
			opacity: 0.8,
			touchable: true,
		});

		this.soundLabel = new g.Label({
			scene: this.scene,
			parent: this.soundButton,
			font: globalThis.font,
			text: "Sound: ON",
			fontSize: 20,
			textColor: "white",
			width: width,
			textAlign: "center",
			y: 8,
		});

		this.soundButton.onPointDown.add((ev) => {
			if (ev.player && ev.player.id === g.game.selfId) {
				this.soundManager.toggleMute();
				this.updateSoundButtonState();
			}
		});
	}

	private updateSoundButtonState() {
		if (this.soundManager.isMuted) {
			this.soundLabel.text = "Sound: OFF";
			this.soundButton.cssColor = "#444444";
		} else {
			this.soundLabel.text = "Sound: ON";
			this.soundButton.cssColor = "gray";
		}
		this.soundLabel.invalidate();
		this.soundButton.modified();
	}

	private createLobbyUI() {
		const width = 400;
		const height = 60;

		this.lobbyContainer = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			x: (g.game.width - width) / 2,
			y: g.game.height / 2 - height / 2,
			width: width,
			height: height,
			touchable: true,
		});

		this.lobbyBg = new g.FilledRect({
			scene: this.scene,
			parent: this.lobbyContainer,
			width: width,
			height: height,
			cssColor: "gray",
			opacity: 0.5,
		});

		this.lobbyLabel = new g.Label({
			scene: this.scene,
			parent: this.lobbyContainer,
			font: globalThis.font,
			text: Localization.getText("waiting_lbl"),
			fontSize: 30,
			textColor: "blue",
			width: width,
			textAlign: "center",
			y: 10,
		});

		this.lobbyReadySprite = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			x: (g.game.width - width) / 2,
			y: g.game.height / 2 + height + 20,
			width: width,
			height: 50,
			hidden: true,
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.lobbyReadySprite,
			width: width,
			height: 50,
			cssColor: "#00FF00",
			opacity: 0.5,
		});

		this.lobbyReadyLabel = new g.Label({
			scene: this.scene,
			parent: this.lobbyReadySprite,
			font: globalThis.font,
			text: Localization.getText("ready_waiting"),
			fontSize: 25,
			textColor: "white",
			width: width,
			textAlign: "center",
			y: 10,
		});

		this.lobbyContainer.onPointDown.add(() => {
			this.onLobbyClick.fire();
		});
	}

	public createScoreUI() {
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = 50;
		const totalWidth = 2 * boardWidth + gap;
		const startX = (g.game.width - totalWidth) / 2;

		for (let i = 0; i < 2; i++) {
			const offsetX = startX + i * (boardWidth + gap);

			const label = new g.Label({
				scene: this.scene,
				parent: this.uiLayer,
				font: globalThis.font,
				text: "0",
				fontSize: 25,
				textColor: "red",
				x: offsetX,
				y: 20,
				width: boardWidth,
				textAlign: "center",
				hidden: true,
			});
			this.scoreLabels[i] = label;
		}
	}

	private createNextPuyoUI() {
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = 50;
		const totalWidth = 2 * boardWidth + gap;
		const startX = (g.game.width - totalWidth) / 2;

		for (let i = 0; i < 2; i++) {
			const offsetX = startX + i * (boardWidth + gap);

			const container = new g.E({
				scene: this.scene,
				parent: this.uiLayer,
				x: offsetX + boardWidth + 5,
				y: 60,
				width: GameBoard.puyoSize,
				height: GameBoard.puyoSize * 2,
				hidden: true,
			});

			const sub = new g.FilledRect({
				scene: this.scene,
				parent: container,
				x: 0,
				y: 0,
				width: GameBoard.puyoSize - 2,
				height: GameBoard.puyoSize - 2,
				cssColor: "white",
			});

			const main = new g.FilledRect({
				scene: this.scene,
				parent: container,
				x: 0,
				y: GameBoard.puyoSize,
				width: GameBoard.puyoSize - 2,
				height: GameBoard.puyoSize - 2,
				cssColor: "white",
			});

			this.nextPuyoContainers[i] = container;
			this.nextPuyoSubNodes[i] = sub;
			this.nextPuyoMainNodes[i] = main;
		}
	}

	public refreshScoreLayout() {
		let localPIndex = 0;
		const myBoard = GameBoard.get(g.game.selfId);
		if (myBoard) localPIndex = myBoard.playerIndex;

		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = 50;
		const totalWidth = 2 * boardWidth + gap;
		const startX = (g.game.width - totalWidth) / 2;

		for (let i = 0; i < 2; i++) {
			const visualIndex = (i - localPIndex + 2) % 2;
			const offsetX = startX + visualIndex * (boardWidth + gap);
			if (this.scoreLabels[i]) {
				this.scoreLabels[i].x = offsetX;
				this.scoreLabels[i].modified();
			}
			if (this.nextPuyoContainers[i]) {
				this.nextPuyoContainers[i].x = offsetX + boardWidth + 5;
				this.nextPuyoContainers[i].modified();
			}
		}
	}

	private createGameOverUI() {
		this.gameOverContainer = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			width: g.game.width,
			height: g.game.height,
			hidden: true,
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.gameOverContainer,
			width: g.game.width,
			height: g.game.height,
			cssColor: "black",
			opacity: 0.7,
		});

		this.gameOverLabel = new g.Label({
			scene: this.scene,
			parent: this.gameOverContainer,
			font: globalThis.font,
			text: "",
			fontSize: 40,
			textColor: "white",
			width: g.game.width,
			textAlign: "center",
			y: g.game.height / 2 - 100,
		});

		const btnWidth = 200;
		const btnHeight = 60;
		this.restartButton = new g.FilledRect({
			scene: this.scene,
			parent: this.gameOverContainer,
			x: (g.game.width - btnWidth) / 2,
			y: g.game.height / 2 + 20,
			width: btnWidth,
			height: btnHeight,
			cssColor: "orange",
			touchable: true,
		});

		this.restartLabel = new g.Label({
			scene: this.scene,
			parent: this.restartButton,
			font: globalThis.font,
			text: Localization.getText("play_again"),
			fontSize: 25,
			textColor: "black",
			width: btnWidth,
			textAlign: "center",
			y: 12,
		});
		this.restartLabel.x = (btnWidth - this.restartLabel.width) / 2;
		this.restartLabel.modified();

		this.restartButton.onPointDown.add(() => {
			this.onRestartClick.fire();
		});
	}

	public updateScore(playerIdx: number, score: number) {
		if (this.scoreLabels[playerIdx]) {
			this.scoreLabels[playerIdx].text = score.toString();
			this.scoreLabels[playerIdx].invalidate();
		}
	}

	public updateNextPuyo(
		playerIdx: number,
		colorMain: number,
		colorSub: number
	) {
		if (
			this.nextPuyoMainNodes[playerIdx] &&
			this.nextPuyoSubNodes[playerIdx]
		) {
			const colors = [
				"black",
				"red",
				"blue",
				"green",
				"yellow",
				"purple",
			];
			this.nextPuyoMainNodes[playerIdx].cssColor =
				colors[colorMain] || "white";
			this.nextPuyoMainNodes[playerIdx].modified();
			this.nextPuyoSubNodes[playerIdx].cssColor =
				colors[colorSub] || "white";
			this.nextPuyoSubNodes[playerIdx].modified();

			if (this.nextPuyoContainers[playerIdx]) {
				this.nextPuyoContainers[playerIdx].show();
			}
		}
	}

	public showScoreUI() {
		this.controllerLayer.show();
		for (let key in this.scoreLabels) {
			this.scoreLabels[key].show();
		}
	}

	public hideScoreUI() {
		for (let key in this.scoreLabels) {
			this.scoreLabels[key].hide();
		}
		for (let key in this.nextPuyoContainers) {
			this.nextPuyoContainers[key].hide();
		}
	}

	public updateLobbyUI(
		textKey: string,
		enableButton: boolean,
		showWaitSprite: boolean
	) {
		const text = Localization.getText(textKey);
		this.lobbyLabel.text = text;
		this.lobbyLabel.invalidate();
		this.lobbyLabel.x =
			(this.lobbyContainer.width - this.lobbyLabel.width) / 2;
		this.lobbyLabel.modified();

		if (enableButton) {
			this.lobbyBg.cssColor = "green";
			this.lobbyContainer.touchable = true;
			this.lobbyContainer.opacity = 1;
		} else {
			this.lobbyBg.cssColor = "gray";
			this.lobbyContainer.touchable = false;
			this.lobbyContainer.opacity = 0.5;
		}
		this.lobbyBg.modified();
		this.lobbyContainer.show();

		if (showWaitSprite) {
			this.lobbyReadyLabel.text = Localization.getText("ready_waiting");
			this.lobbyReadyLabel.invalidate();
			this.lobbyReadySprite.show();
		} else {
			this.lobbyReadySprite.hide();
		}
	}

	public hideLobbyUI() {
		this.lobbyContainer.hide();
		this.lobbyReadySprite.hide();
	}

	public showGameOverUI(textKey: string, args: any[] = []) {
		this.gameOverLabel.text = Localization.getText(textKey, ...args);
		this.gameOverLabel.invalidate();
		this.gameOverLabel.x = (g.game.width - this.gameOverLabel.width) / 2;
		this.gameOverLabel.modified();

		this.restartLabel.text = Localization.getText("play_again");
		this.restartLabel.invalidate();
		this.restartLabel.modified();

		this.gameOverContainer.show();
		this.controllerLayer.hide();
	}

	public hideGameOverUI() {
		this.gameOverContainer.hide();
	}
}
