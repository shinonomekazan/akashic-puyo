export class layout {
	public readonly root: g.E;

	public readonly gameGroup: g.E;
	public readonly uiGroup: g.E;

	public readonly gameBgLayer: g.E;
	public readonly gameLayer: g.E;

	public readonly uiBgLayer: g.E;
	public readonly uiLayer: g.E;

	constructor(scene: g.Scene) {
		this.root = new g.E({ scene: scene, parent: scene, local: true });

		this.gameGroup = new g.E({ scene: scene, local: true });
		this.uiGroup = new g.E({ scene: scene, local: true });

		this.gameBgLayer = new g.E({ scene: scene, local: true });
		this.gameLayer = new g.E({ scene: scene, local: true });

		this.uiBgLayer = new g.E({ scene: scene, local: true });
		this.uiLayer = new g.E({ scene: scene, local: true });

		this.gameGroup.append(this.gameBgLayer);
		this.gameGroup.append(this.gameLayer);

		this.uiGroup.append(this.uiBgLayer);
		this.uiGroup.append(this.uiLayer);

		this.root.append(this.gameGroup);
		this.root.append(this.uiGroup);
	}

	public appendToScene(scene: g.Scene): void {
		scene.append(this.root);
	}
}