import { Trigger } from "@akashic/trigger";
import { Helper } from "../helper";
import { button9Patch } from "./button9Patch";
import { layout } from "./layout";
import * as al from "@akashic-extension/akashic-label";
import { E, TextAlign } from "@akashic/akashic-engine";
import { controller } from "./controller";

export type buttonID = "btnSolo" | "btnPC" | "btnPvP" | "readyCliked";

export interface ISelectMode {
	onButtonClick: g.Trigger<buttonID>;
	controller: controller;
}
export interface IUIInGame {
	getLayer(): { gameLayer: g.E, backgroundLayer: g.E };
}
export interface IUILobby {
	showDialogJoinPvP(): void;
	setShowLoading(isShow: boolean): void;
	setShowReadySuccessAndWaitOther(isShow: boolean): void;
	startGamePvP(): void;
}
export class render implements ISelectMode, IUILobby, IUIInGame {
	onButtonClick: Trigger<buttonID> = new Trigger;
	controller: controller;
	private layout: layout;
	private loadingContainer: g.E | undefined;
	private loadingWaitOtherContainer: g.E | undefined;
	private controllerContainer: g.E | undefined;
	private selectModeContainer: g.E | undefined;
	constructor(scene: g.Scene) {
		this.layout = new layout(scene);
		this.layout.appendToScene(scene);
		this.createController();
		let bg = Helper.newSprite("/assets/background.png");
		this.layout.gameBgLayer.append(bg);

	}
	getLayer(): { gameLayer: E; backgroundLayer: E; } {
		return {
			backgroundLayer: this.layout.gameBgLayer,
			gameLayer: this.layout.gameLayer
		}
	}
	setShowReadySuccessAndWaitOther(isShow: boolean): void {
		this.setShowLoading(false);
		if (this.loadingWaitOtherContainer == undefined) {
			const scene = this.layout.root.scene;
			let container = new g.E({
				scene: scene,
			});
			this.loadingWaitOtherContainer = container;
			let background = new g.FilledRect({
				scene: scene,
				parent: container,
				height: scene.game.height,
				width: scene.game.width,
				cssColor: "black",
				opacity: 0.85,
				touchable: true
			});
			let t = new al.Label({
				scene: scene,
				font: globalThis.font,
				fontSize: 40,
				width: 2000,
				x: scene.game.width / 2,
				y: scene.game.height / 2,
				textAlign: TextAlign.Left,
				lineBreak: true,
				widthAutoAdjust: true,
				parent: background,
				text: 'WAIT OTHER PLAYER.....',
				textColor: 'white',
				anchorX: 0.5
			});
			let btnCancel = this.createButtonJoinPvP("Cancel", () => { });
			btnCancel.y = scene.game.height / 2 + 100;
			btnCancel.setDisabled(true);
			container.append(btnCancel);
			this.layout.uiLayer.append(container);
		}
		if (isShow) {
			this.selectModeContainer.hide();
			this.loadingWaitOtherContainer.show();
		} else {
			this.selectModeContainer.show();
			this.loadingWaitOtherContainer.hide();
		}
	}
	startGamePvP(): void {
		console.log('ui start...');
		this.setShowLoading(false);
		this.setShowReadySuccessAndWaitOther(false);
		this.selectModeContainer.hide();
		this.controller.layoutRoot.show();
	}
	setShowLoading(isShow: boolean): void {
		if (this.loadingContainer == undefined) {
			const scene = this.layout.root.scene;
			let container = new g.E({
				scene: scene,
			});
			this.loadingContainer = container;
			let background = new g.FilledRect({
				scene: scene,
				parent: container,
				height: scene.game.height,
				width: scene.game.width,
				cssColor: "black",
				opacity: 0.85,
				touchable: true
			});
			let t = new al.Label({
				scene: scene,
				font: globalThis.font,
				fontSize: 40,
				width: 2000,
				x: scene.game.width / 2,
				y: scene.game.height / 2,
				textAlign: TextAlign.Left,
				lineBreak: true,
				widthAutoAdjust: true,
				parent: background,
				text: 'LOADING.....',
				textColor: 'white',
				anchorX: 0.5
			});
			this.layout.uiLayer.append(container);
		}
		if (isShow) {
			this.loadingContainer.show();
		} else {
			this.loadingContainer.hide();
		}
	}
	private createController() {
		this.controllerContainer = new g.E({
			scene: this.layout.root.scene,
		});
		this.controller = new controller(this.controllerContainer);
		this.layout.uiLayer.append(this.controllerContainer);
		this.controller.layoutRoot.hide();
	}
	public selectMode() {
		if (this.selectModeContainer == undefined) {
			const scene = this.layout.root.scene;
			let container = new g.E({
				scene: scene,
			});
			let label = new g.Label({
				scene: scene,
				text: "select game mode:",
				font: new g.DynamicFont({
					game: g.game,
					fontFamily: "sans-serif",
					size: 24
				}),
			});
			container.append(label);
			let btnSolo = this.createButtonMode("SOLO", () => {
				this.onButtonClick?.fire("btnSolo");
			});
			btnSolo.y = 150;
			container.append(btnSolo);
			let btnPC = this.createButtonMode("PC", () => {
				this.onButtonClick?.fire("btnPC");
			});
			btnPC.y = 250;
			container.append(btnPC);
			let btnPvP = this.createButtonMode("P vs P", () => {
				this.onButtonClick?.fire("btnPvP");
			});
			btnPvP.y = 350;
			container.append(btnPvP);
			this.layout.uiLayer.append(container);
			this.selectModeContainer = container;
		}
	}
	private createButtonMode(text: string, onclick: () => void) {
		const scene = g.game.scene();
		const bgAsset = scene.asset.getImage("/assets/ui/background-button.png");

		const myButton = new button9Patch({
			scene: scene,
			width: 400,
			height: 68,
			backgroundImage: bgAsset,
			sliceBorder: { top: 16, bottom: 16, left: 25, right: 55 },
			text: text,
			font: globalThis.font,
			textColor: "#FFFFFF",
			highlightColor: "#FFD700", //gold
			onClick: onclick
		});

		myButton.x = (g.game.width - myButton.width) / 2;
		myButton.y = 100;
		return myButton;
	}
	private createButtonJoinPvP(text: string, onclick: () => void) {
		const scene = g.game.scene();
		const bgAsset = scene.asset.getImage("/assets/ui/background-button.png");

		const myButton = new button9Patch({
			scene: scene,
			width: 250,
			height: 68,
			backgroundImage: bgAsset,
			sliceBorder: { top: 16, bottom: 16, left: 25, right: 55 },
			text: text,
			font: globalThis.font,
			textColor: "#FFFFFF",
			highlightColor: "#FFD700", //gold
			onClick: onclick
		});

		myButton.x = (g.game.width - myButton.width) / 2;
		myButton.y = 100;
		return myButton;
	}
	public showDialogJoinPvP() {
		const scene = this.layout.root.scene;
		let container = new g.E({
			scene: scene,
		});
		let background = new g.FilledRect({
			scene: scene,
			parent: container,
			height: scene.game.height,
			width: scene.game.width,
			cssColor: "black",
			opacity: 0.85,
			touchable: true
		});
		let t = new al.Label({
			scene: scene,
			font: globalThis.font,
			fontSize: 28,
			width: 2000,
			x: scene.game.width / 2,
			y: 100,
			textAlign: TextAlign.Left,
			lineBreak: true,
			widthAutoAdjust: true,
			parent: background,
			text: 'Please wait other player....',
			textColor: 'white',
			anchorX: 0.5
		});
		this.onButtonClick?.fire("readyCliked");

		this.layout.uiLayer.append(container);

	}
	public test() {


	}
}