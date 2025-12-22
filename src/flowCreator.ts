import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { Flow } from "./flow/step";
import { GameStateStep, TransStep } from "./gameSteps";
import { UIManager } from "./uiManager";
import { UIStep } from "./uiSteps";
import { MainScene } from "./mainScene";

export class FlowCreator {
	constructor(manager: FlowManager, uiManager: UIManager, mainScene: MainScene) {
		manager.addFlow(new Flow(FlowEventName.GameLoad, [
			new UIStep(uiManager),
			new GameStateStep(mainScene)
		]));

		manager.addFlow(new Flow(FlowEventName.UpdateLobbyUI, [new UIStep(uiManager)]));
		manager.addFlow(new Flow(FlowEventName.HideLobbyUI, [new UIStep(uiManager)]));

		manager.addFlow(new Flow(FlowEventName.Move, [new TransStep()]));
		manager.addFlow(new Flow(FlowEventName.Rotate, [new TransStep()]));

		manager.addFlow(new Flow(FlowEventName.AddScore, [new UIStep(uiManager)]));

		manager.addFlow(new Flow(FlowEventName.GameOver, [
			new GameStateStep(mainScene),
			new UIStep(uiManager)
		]));

		manager.addFlow(new Flow(FlowEventName.ResetGame, [
			new UIStep(uiManager),
			new GameStateStep(mainScene),
			new UIStep(uiManager)
		]));
	}
}