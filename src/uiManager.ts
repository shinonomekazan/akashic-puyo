import { Button, ButtonMargin } from "./button";
import { GameBoard } from "./gameBoard";
import { Localization } from "./localization";
import { SoundManager } from "./soundManager";
import { Helper } from "./helper";

export class UIManager {
	public layoutRoot: g.E;
	public gameLayer: g.E;
	public uiLayer: g.E;
	public controllerLayer: g.E;
	public onLobbyClick: g.Trigger<void> = new g.Trigger();
	public onRestartClick: g.Trigger<void> = new g.Trigger();
	public onControlClick: g.Trigger<string> = new g.Trigger();
	public onSelectMode: g.Trigger<"SOLO" | "NPC" | "PVP"> = new g.Trigger();

	private scene: g.Scene;
	private lobbyContainer: g.E;
	private lobbyBg: g.FilledRect;
	private lobbyLabel: g.Label;
	private lobbyReadySprite: g.E;
	private lobbyReadyLabel: g.Label;

	private scoreLabels: { [playerIdx: number]: g.Label } = {};

	private nextPuyoContainers: { [playerIdx: number]: g.E } = {};
	private nextPuyoMainNodes: { [playerIdx: number]: g.Sprite } = {};
	private nextPuyoSubNodes: { [playerIdx: number]: g.Sprite } = {};

	private garbageContainers: { [playerIdx: number]: g.E } = {};
	private garbageLabels: { [playerIdx: number]: g.Label } = {};

	private gameOverContainer: g.E;
	private gameOverLabel: g.Label;
	private restartButton: g.FilledRect;
	private restartLabel: g.Label;

	private loadingContainer: g.E;
	private loadingLabel: g.Label;

	private soundButton: g.FilledRect;
	private soundLabel: g.Label;
	private soundManager: SoundManager;

	private modeSelectionContainer: g.E;
	private modeButtons: { [mode: string]: { btn: g.FilledRect, lbl: g.Label } } = {};

	private pvpLobbyContainer: g.E;
	private pvpSlots: { bg: g.FilledRect, label: g.Label, button: g.FilledRect, btnLabel: g.Label }[] = [];

	private modeLabel: g.Label;

	constructor(scene: g.Scene, soundManager?: SoundManager) {
		this.scene = scene;
		this.soundManager = soundManager;
		this.layoutRoot = new g.E({ scene: scene, parent: scene });
		let bg = Helper.newSprite("/assets/background.png");
		this.layoutRoot.append(bg)

		this.gameLayer = new g.E({ scene: scene, parent: this.layoutRoot });
		this.uiLayer = new g.E({ scene: scene, parent: this.layoutRoot });

		this.createLobbyUI();
		this.createScoreUI();
		this.createNextPuyoUI();
		this.createGarbage();
		this.createGameOverUI();
		this.createLoadingUI();
		this.createUIController();
		this.createModeSelectionUI();
		this.createPvPLobbyUI();
		this.createModeLabel();
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

	private createModeLabel() {
		this.modeLabel = new g.Label({
			scene: this.scene,
			parent: this.uiLayer,
			font: globalThis.font,
			text: "",
			fontSize: 16,
			textColor: "black",
			x: 10,
			y: 10,
			touchable: false
		});
	}

	public updateModeLabel(mode: string) {
		if (mode === "NONE") {
			this.modeLabel.text = "";
		} else {
			this.modeLabel.text = "MODE: " + mode;
		}
		this.modeLabel.invalidate();
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
			hidden: true
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

	private createModeSelectionUI() {
		this.modeSelectionContainer = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			width: g.game.width,
			height: g.game.height,
			hidden: true
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.modeSelectionContainer,
			width: g.game.width,
			height: g.game.height,
			cssColor: "black",
			opacity: 0.8
		});

		const title = new g.Label({
			scene: this.scene,
			parent: this.modeSelectionContainer,
			font: globalThis.font,
			text: "Select Game Mode",
			fontSize: 40,
			textColor: "white",
			width: g.game.width,
			textAlign: "center",
			y: 100
		});

		const modes: ("SOLO" | "NPC" | "PVP")[] = ["SOLO", "NPC", "PVP"];
		modes.forEach((mode, i) => {
			const btn = new g.FilledRect({
				scene: this.scene,
				parent: this.modeSelectionContainer,
				x: g.game.width / 2 - 150,
				y: 200 + i * 120,
				width: 300,
				height: 80,
				cssColor: "white",
				touchable: true
			});

			const lbl = new g.Label({
				scene: this.scene,
				parent: btn,
				font: globalThis.font,
				text: mode,
				fontSize: 35,
				textColor: "black",
				width: 300,
				textAlign: "center",
				y: 20
			});

			this.modeButtons[mode] = { btn, lbl };

			btn.onPointDown.add(() => {
				this.onSelectMode.fire(mode);
			});
		});
	}

	private createPvPLobbyUI() {
		this.pvpLobbyContainer = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			width: g.game.width,
			height: g.game.height,
			hidden: true
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.pvpLobbyContainer,
			width: g.game.width,
			height: g.game.height,
			cssColor: "black",
			opacity: 0.6
		});

		const labels = ["Player 1 (You)", "Player 2"];
		const slotWidth = 300;
		const gap = 100;
		const startX = (g.game.width - (slotWidth * 2 + gap)) / 2;

		for (let i = 0; i < 2; i++) {
			const x = startX + i * (slotWidth + gap);
			const bg = new g.FilledRect({
				scene: this.scene,
				parent: this.pvpLobbyContainer,
				x: x,
				y: g.game.height / 2 - 150,
				width: slotWidth,
				height: 300,
				cssColor: "#333",
				opacity: 0.8
			});

			const lbl = new g.Label({
				scene: this.scene,
				parent: bg,
				font: globalThis.font,
				text: labels[i],
				fontSize: 25,
				textColor: "white",
				width: slotWidth,
				textAlign: "center",
				y: 20
			});

			const btn = new g.FilledRect({
				scene: this.scene,
				parent: bg,
				x: 50,
				y: 200,
				width: 200,
				height: 60,
				cssColor: "gray",
				touchable: false
			});

			const btnLbl = new g.Label({
				scene: this.scene,
				parent: btn,
				font: globalThis.font,
				text: "Click Ready",
				fontSize: 20,
				textColor: "black",
				width: 200,
				textAlign: "center",
				y: 15
			});

			this.pvpSlots.push({ bg, label: lbl, button: btn, btnLabel: btnLbl });

			btn.onPointDown.add(() => {
				if (this.onLobbyClick) {
					this.onLobbyClick.fire();
				}
			});
		}
	}

	public showModeSelection(isHost: boolean) {
		this.modeSelectionContainer.show();

		// Enable all modes for everyone
		for (const mode in this.modeButtons) {
			const { btn, lbl } = this.modeButtons[mode];

			btn.touchable = true;
			btn.cssColor = "white";
			lbl.text = mode;

			lbl.invalidate();
			btn.modified();
		}
	}

	public hideModeSelection() {
		this.modeSelectionContainer.hide();
	}

	public showPvPLobby(myPIdx: number, p1Ready: boolean, p2Ready: boolean) {
		this.pvpLobbyContainer.show();
		this.pvpSlots.forEach((slot, i) => {
			const isMe = (i === myPIdx);
			const isReady = (i === 0 ? p1Ready : p2Ready);

			if (isMe) {
				slot.label.text = "You";
				slot.button.touchable = !isReady;
				slot.button.cssColor = isReady ? "green" : "white";
			} else {
				slot.label.text = i === 0 ? "Player 1" : "Player 2";
				slot.button.touchable = false;
				slot.button.cssColor = isReady ? "green" : "gray";
			}

			slot.btnLabel.text = isReady ? "READY!" : "Click Ready";
			slot.label.invalidate();
			slot.btnLabel.invalidate();
			slot.button.modified();
		});
	}

	public hidePvPLobby() {
		this.pvpLobbyContainer.hide();
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
				x: offsetX + boardWidth + 50,
				y: 60,
				width: GameBoard.puyoSize,
				height: GameBoard.puyoSize * 2,
				hidden: true,
			});

			// Create Sub Puyo
			const sub = Helper.newSprite("/assets/red.png");
			container.append(sub);
			sub.x = 0;
			sub.y = 0;
			// Calculate Scale
			const targetSize = GameBoard.puyoSize - 2;
			sub.scaleX = targetSize / sub.width;
			sub.scaleY = targetSize / sub.height;
			sub.modified();

			// Create Main Puyo
			const main = Helper.newSprite("/assets/red.png");
			container.append(main);
			main.x = 0;
			main.y = GameBoard.puyoSize;
			// Calculate Scale
			main.scaleX = targetSize / main.width;
			main.scaleY = targetSize / main.height;
			main.modified();

			this.nextPuyoContainers[i] = container;
			this.nextPuyoSubNodes[i] = sub;
			this.nextPuyoMainNodes[i] = main;
		}
	}

	private createGarbage() {
		for (let i = 0; i < 2; i++) {
			const container = new g.E({
				scene: this.scene,
				parent: this.uiLayer,
				hidden: true
			});

			const size = 30;
			const icon = Helper.newSprite("/assets/garbage.png");
			icon.scaleX = size / icon.width;
			icon.scaleY = size / icon.height;
			icon.modified();
			container.append(icon);

			const label = new g.Label({
				scene: this.scene,
				parent: container,
				font: globalThis.font,
				text: "x0",
				fontSize: 20,
				textColor: "white",
				x: size + 5,
				y: (size - 20) / 2 - 0
			});

			this.garbageContainers[i] = container;
			this.garbageLabels[i] = label;
		}
	}

	public setGarbageCount(playerIdx: number, count: number) {
		if (this.garbageLabels[playerIdx]) {
			this.garbageLabels[playerIdx].text = "x" + count;
			this.garbageLabels[playerIdx].invalidate();
		}
	}

	public refreshScoreLayout() {
		const totalBoards = GameBoard.totalBoardsInGame;
		const boardWidth = GameBoard.COLS * GameBoard.puyoSize;
		const gap = 50;
		const totalWidth = totalBoards * boardWidth + (totalBoards - 1) * gap;
		const startX = (g.game.width - totalWidth) / 2;

		let localPIndex = 0;
		const myBoard = GameBoard.get(g.game.selfId);
		if (myBoard) localPIndex = myBoard.playerIndex;

		for (let i = 0; i < 2; i++) {
			let visualIndex = i;
			if (totalBoards === 2) {
				visualIndex = (i - localPIndex + 2) % 2;
			} else {
				visualIndex = 0;
			}

			const offsetX = startX + visualIndex * (boardWidth + gap);

			if (this.scoreLabels[i]) {
				this.scoreLabels[i].x = offsetX;
				this.scoreLabels[i].modified();
				if (i >= totalBoards) this.scoreLabels[i].hide();
			}
			if (this.nextPuyoContainers[i]) {
				this.nextPuyoContainers[i].x = offsetX + boardWidth + 5;
				this.nextPuyoContainers[i].modified();
				if (i >= totalBoards) this.nextPuyoContainers[i].hide();
			}

			if (this.garbageContainers[i]) {
				this.garbageContainers[i].x = offsetX;
				this.garbageContainers[i].y = 55;
				this.garbageContainers[i].modified();
				if (i >= totalBoards || totalBoards === 1) {
					this.garbageContainers[i].hide();
				}
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

	private createLoadingUI() {
		this.loadingContainer = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			width: g.game.width,
			height: g.game.height,
			hidden: true,
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.loadingContainer,
			width: g.game.width,
			height: g.game.height,
			cssColor: "black",
			opacity: 0.5,
		});

		this.loadingLabel = new g.Label({
			scene: this.scene,
			parent: this.loadingContainer,
			font: globalThis.font,
			text: "Loading...",
			fontSize: 40,
			textColor: "white",
			width: g.game.width,
			textAlign: "center",
			y: g.game.height / 2 - 20,
		});
	}

	public showLoadingUI() {
		this.loadingContainer.show();
	}

	public hideLoadingUI() {
		this.loadingContainer.hide();
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
			const targetSize = GameBoard.puyoSize - 2;

			// Update Main
			const assetMain = GameBoard.getAssetPath(colorMain);
			const imgMain = this.scene.asset.getImage(assetMain);
			const mainSprite = this.nextPuyoMainNodes[playerIdx];
			mainSprite.src = imgMain;
			mainSprite.scaleX = targetSize / imgMain.width;
			mainSprite.scaleY = targetSize / imgMain.height;
			mainSprite.invalidate();
			mainSprite.modified();

			// Update Sub
			const assetSub = GameBoard.getAssetPath(colorSub);
			const imgSub = this.scene.asset.getImage(assetSub);
			const subSprite = this.nextPuyoSubNodes[playerIdx];
			subSprite.src = imgSub;
			subSprite.scaleX = targetSize / imgSub.width;
			subSprite.scaleY = targetSize / imgSub.height;
			subSprite.invalidate();
			subSprite.modified();

			if (this.nextPuyoContainers[playerIdx]) {
				this.nextPuyoContainers[playerIdx].show();
			}
		}
	}

	public showScoreUI() {
		this.controllerLayer.show();
		const totalBoards = GameBoard.totalBoardsInGame;
		for (let i = 0; i < totalBoards; i++) {
			if (this.scoreLabels[i]) this.scoreLabels[i].show();
			if (this.garbageContainers[i] && totalBoards > 1) {
				this.garbageContainers[i].show();
			}
		}
	}

	public hideScoreUI() {
		for (let key in this.scoreLabels) {
			this.scoreLabels[key].hide();
		}
		for (let key in this.nextPuyoContainers) {
			this.nextPuyoContainers[key].hide();
		}
		for (let key in this.garbageContainers) {
			this.garbageContainers[key].hide();
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