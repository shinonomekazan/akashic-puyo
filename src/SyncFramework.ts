export type LogicCallback<TState> = (state: TState, payload: any, senderId: string) => void;
export type ViewCallback<TState> = (payload: any, isLocal: boolean, state: TState) => void;

interface Handler<TState> {
	logic: LogicCallback<TState>;
	view?: ViewCallback<TState>;
}

interface ActionData {
	type: string;
	payload: any;
}

export class SyncFramework<TState> {
	public state: TState;
	private handlers: { [key: string]: Handler<TState> };
	private onSyncView: ((state: TState) => void) | null;

	constructor(initialState: TState) {
		this.state = JSON.parse(JSON.stringify(initialState));
		this.handlers = {};
		this.onSyncView = null;
	}

	register(actionType: string, logicCallback: LogicCallback<TState>, viewCallback?: ViewCallback<TState>): void {
		this.handlers[actionType] = {
			logic: logicCallback,
			view: viewCallback
		};
	}

	init(scene: g.Scene, snapshot: any, onSyncViewCallback: (state: TState) => void): void {
		this.onSyncView = onSyncViewCallback;

		if (snapshot) {
			this.state = snapshot as TState;
			if (this.onSyncView) {
				this.onSyncView(this.state);
			}
		}

		scene.onMessage.add(this._handleMessage, this);
	}

	dispatch(actionType: string, payload: any): void {
		const data: ActionData = {
			type: actionType,
			payload: payload
		};
		g.game.raiseEvent(new g.MessageEvent(data));
	}

	private _handleMessage(ev: g.MessageEvent): void {
		const data = ev.data as ActionData;
		if (!data || !data.type) return;

		const actionType = data.type;
		const payload = data.payload;

		const senderId = ev.player ? ev.player.id : null;
		if (!senderId) return;

		const handler = this.handlers[actionType];
		if (!handler) return;

		handler.logic(this.state, payload, senderId);

		if (!g.game.isSkipping && handler.view) {
			const isLocal = (senderId === g.game.selfId);
			handler.view(payload, isLocal, this.state);
		}
	}
}