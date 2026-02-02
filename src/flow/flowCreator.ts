import { renderLogicStep } from "../layout/renderLogicStep";
import { playerInputStep } from "../playerInputStep";
import { syncStep } from "../syncStep";
import { FlowEventName } from "./eventName";
import { FlowManager } from "./flowManager";
import { Flow, WaitFrameStep, BaseStep } from "./step";

export class FlowCreator {
	private _manager: FlowManager;
	constructor(
		manager: FlowManager,
		clientSceneStep: BaseStep,
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
		]));
		this._manager.addFlow(new Flow(FlowEventName.WaitServerResponeReadyPvsP, [
			_syncStep,
			_renderStep,

		]));
		this._manager.addFlow(new Flow(FlowEventName.StartPvsP, [
			_syncStep,
			_renderStep,
			_playerInputStep,
			clientSceneStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.Control, [
			//_playerInputStep,
			clientSceneStep,
			_syncStep,
			//_renderStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.OtherControl, [
			//_playerInputStep,
			clientSceneStep,
			//_syncStep,
			//_renderStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.SceneDestroy, [
			_playerInputStep,
			//clientSceneStep,
			//_syncStep,
			//_renderStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.GameOver, [
			clientSceneStep,
			_syncStep,
			_renderStep,
		]));
		this._manager.addFlow(new Flow(FlowEventName.CleanAndGotoMainMenu, [
			_renderStep,
			clientSceneStep,
			_syncStep,
		]));
	}
}