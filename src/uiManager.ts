import { GameBoard } from "./gameBoard";
import { Localization } from "./localization";

export class UIManager {
	public layoutRoot: g.E;
	public gameLayer: g.E;
	public uiLayer: g.E;
	public onLobbyClick: g.Trigger<void> = new g.Trigger();
	public onRestartClick: g.Trigger<void> = new g.Trigger();

	private scene: g.Scene;
	private lobbyContainer: g.E;
	private lobbyBg: g.FilledRect;
	private lobbyLabel: g.Label;
	private lobbyReadySprite: g.E;
	private lobbyReadyLabel: g.Label;

	private scoreLabels: { [playerIdx: number]: g.Label } = {};

	private gameOverContainer: g.E;
	private gameOverLabel: g.Label;
	private restartButton: g.FilledRect;
	private restartLabel: g.Label;

	constructor(scene: g.Scene) {
		this.scene = scene;
		this.layoutRoot = new g.E({ scene: scene, parent: scene });

		this.gameLayer = new g.E({ scene: scene, parent: this.layoutRoot });
		this.uiLayer = new g.E({ scene: scene, parent: this.layoutRoot });

		this.createLobbyUI();
		this.createScoreUI();
		this.createGameOverUI();
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
			touchable: true
		});

		this.lobbyBg = new g.FilledRect({
			scene: this.scene,
			parent: this.lobbyContainer,
			width: width,
			height: height,
			cssColor: "gray",
			opacity: 0.5
		});

		this.lobbyLabel = new g.Label({
			scene: this.scene,
			parent: this.lobbyContainer,
			font: globalThis.font,
			text: Localization.getText("waiting_lbl"),
			fontSize: 30,
			textColor: "white",
			width: width,
			textAlign: "center",
			y: 10
		});

		this.lobbyReadySprite = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			x: (g.game.width - width) / 2,
			y: g.game.height / 2 + height + 20,
			width: width,
			height: 50,
			hidden: true
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.lobbyReadySprite,
			width: width,
			height: 50,
			cssColor: "#00FF00",
			opacity: 0.5
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
			y: 10
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
				hidden: true // Goal 1: Hide initially
			});
			this.scoreLabels[i] = label;
		}
	}

	private createGameOverUI() {
		this.gameOverContainer = new g.E({
			scene: this.scene,
			parent: this.uiLayer,
			width: g.game.width,
			height: g.game.height,
			hidden: true
		});

		new g.FilledRect({
			scene: this.scene,
			parent: this.gameOverContainer,
			width: g.game.width,
			height: g.game.height,
			cssColor: "black",
			opacity: 0.7
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
			y: g.game.height / 2 - 100
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
			touchable: true
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
			y: 12
		});
		this.restartLabel.x = (btnWidth - this.restartLabel.width) / 2;
		this.restartLabel.modified();

		this.restartButton.onPointDown.add(() => {
			this.onRestartClick.fire();
		});
	}

	public updateScore(playerIdx: number, score: number) {
		// console.log('update score ', score);
		if (this.scoreLabels[playerIdx]) {
			this.scoreLabels[playerIdx].text = score.toString();
			this.scoreLabels[playerIdx].invalidate();
		}
	}

	// Goal 1: Methods to control visibility
	public showScoreUI() {
		for (let key in this.scoreLabels) {
			this.scoreLabels[key].show();
		}
	}

	public hideScoreUI() {
		for (let key in this.scoreLabels) {
			this.scoreLabels[key].hide();
		}
	}

	public updateLobbyUI(textKey: string, enableButton: boolean, showWaitSprite: boolean) {
		const text = Localization.getText(textKey);
		this.lobbyLabel.text = text;
		this.lobbyLabel.invalidate();
		this.lobbyLabel.x = (this.lobbyContainer.width - this.lobbyLabel.width) / 2;
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
	}

	public hideGameOverUI() {
		this.gameOverContainer.hide();
	}
}