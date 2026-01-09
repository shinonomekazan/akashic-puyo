export class SoundManager {
	public isMuted: boolean = false;
	private scene: g.Scene;

	constructor(scene: g.Scene) {
		this.scene = scene;
	}

	public play(assetId: string) {
		if (this.isMuted || g.game.isSkipping) return;
		try {
			this.scene.asset.getAudioById(assetId).play();
		} catch (e) {
			console.error("Audio asset not found or play failed: " + assetId);
		}
	}

	public toggleMute() {
		this.isMuted = !this.isMuted;
	}
}
