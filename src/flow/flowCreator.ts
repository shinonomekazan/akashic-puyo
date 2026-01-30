import { renderLogicStep } from "../layout/renderLogicStep";
import { playerInputStep } from "../playerInputStep";
import { syncStep } from "../syncStep";
import { FlowEventName } from "./eventName";
import { FlowManager } from "./flowManager";
import { Flow, WaitFrameStep, BaseStep } from "./step";

export class FlowCreator {
	private _manager: FlowManager;


	// New typed steps
	//private _gameLogicStep: GameLogicStep;
	//private _clientRenderStep: ClientRenderStep | null = null;

	//private _clientLogic: ClientGameLogic | null;

	constructor(
		manager: FlowManager,
		clientSceneStep: BaseStep,
		//lobbyStep: BaseStep | null,
		//soundStep: BaseStep | null,
		//syncStep: BaseStep,
		//syncRegistryStep: BaseStep,
		//serverLogic: ServerGameLogic | null,
		//clientLogic: ClientGameLogic | null
	) {
		this._manager = manager;
		let _syncStep = new syncStep();
		let _playerInputStep = new playerInputStep();
		let _renderStep = new renderLogicStep();

		this._manager.addFlow(new Flow(FlowEventName.Init, [
			clientSceneStep,
			_playerInputStep,
			_syncStep,
			_renderStep,
			//new WaitFrameStep(30),
		]));
		this._manager.addFlow(new Flow(FlowEventName.SomeClientSelectMode, [
			_playerInputStep,
			_renderStep,
			_syncStep,
			clientSceneStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.SomeClientReadyClicked, [
			_playerInputStep,
			_renderStep,
			_syncStep,
			clientSceneStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.WaitServerResponeReadyPvsP, [
			_syncStep,
			_renderStep,

		]));
		this._manager.addFlow(new Flow(FlowEventName.StartPvsP, [
			_syncStep,
			_renderStep,

		]));
	}

	// Helper to filter out null steps (e.g., SoundStep on Server)
	private buildSteps(...steps: (BaseStep | null)[]): BaseStep[] {
		return steps.filter(s => s !== null) as BaseStep[];
	}




}