import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { Flow } from "./flow/step";
import { GameStateStep, TransStep } from "./gameSteps";
import { UIManager } from "./uiManager";
import { UIStep } from "./uiSteps";
import { MainScene } from "./mainScene";
import { SoundManager } from "./soundManager";
import { SoundStep } from "./soundStep";

export class FlowCreator {
	constructor(
		manager: FlowManager,
		uiManager: UIManager,
		mainScene: MainScene,
		soundManager: SoundManager
	) {
		const soundStep = new SoundStep(soundManager);

		manager.addFlow(
			new Flow(FlowEventName.GameLoad, [
				new UIStep(uiManager),
				new GameStateStep(mainScene),
			])
		);

		manager.addFlow(
			new Flow(FlowEventName.UpdateLobbyUI, [new UIStep(uiManager)])
		);
		manager.addFlow(
			new Flow(FlowEventName.HideLobbyUI, [new UIStep(uiManager)])
		);

		manager.addFlow(
			new Flow(FlowEventName.UpdateNextPuyo, [new UIStep(uiManager)])
		);

		manager.addFlow(
			new Flow(FlowEventName.Move, [soundStep, new TransStep()])
		);
		manager.addFlow(
			new Flow(FlowEventName.Rotate, [soundStep, new TransStep()])
		);

		manager.addFlow(
			new Flow(FlowEventName.AddScore, [soundStep, new UIStep(uiManager)])
		);

		manager.addFlow(
			new Flow(FlowEventName.GameOver, [
				soundStep,
				new GameStateStep(mainScene),
				new UIStep(uiManager),
			])
		);

		manager.addFlow(
			new Flow(FlowEventName.ResetGame, [
				new UIStep(uiManager),
				new GameStateStep(mainScene),
				new UIStep(uiManager),
			])
		);
	}
}
