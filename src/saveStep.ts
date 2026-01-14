import { BaseStep } from "./flow/step";
import { FlowEventName } from "./flow/eventName";
import { GameBoard } from "./gameBoard";
import { gameLoad_sender, getSender } from "./sender";
import { SyncFramework } from "./SyncFramework";
import { GameState } from "./mainScene";

export class SaveStep extends BaseStep {
	private syncFramework: SyncFramework<GameState>;
	public async onStep(eventName: FlowEventName): Promise<void> {
		switch (eventName) {
			case FlowEventName.GameLoad:
				this.syncFramework = (getSender(eventName) as gameLoad_sender).syncFramework;
				this.syncFramework.register("saveSnapshot",
					(state, payload, senderI) => {
						if (g.game.isActiveInstance()) {
							g.game.requestSaveSnapshot(() => {
								return { snapshot: payload };
							});
						}
					})
				break;
			case FlowEventName.Move:
			case FlowEventName.Rotate:
			case FlowEventName.AddScore:
				const snapshots: any[] = [];
				for (let id in GameBoard.instances) {
					const board = GameBoard.get(id);
					snapshots.push(board.getSnapshot());
				}
				this.syncFramework.dispatch("saveSnapshot", snapshots);
			default:
		}

	}
}