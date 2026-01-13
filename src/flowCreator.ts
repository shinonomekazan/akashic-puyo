import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { Flow } from "./flow/step";
import { GameStateStep, TransStep } from "./gameSteps";
import { UIManager } from "./uiManager";
import { UIStep } from "./uiSteps";
import { MainScene } from "./mainScene";
import { SoundManager } from "./soundManager";
import { SoundStep } from "./soundStep";
import { SaveStep } from "./saveStep";

export class FlowCreator {
	constructor(
		manager: FlowManager,
		uiManager: UIManager,
		mainScene: MainScene,
		soundManager: SoundManager
	) {
		const soundStep = new SoundStep(soundManager);
		const uiStep = new UIStep(uiManager);
		const gameStateStep = new GameStateStep(mainScene);
		const transStep = new TransStep();
		const saveStep = new SaveStep();

		manager.addFlow(
			new Flow(FlowEventName.GameLoad, [uiStep, gameStateStep, saveStep])
		);

		manager.addFlow(new Flow(FlowEventName.UpdateLobbyUI, [uiStep]));
		manager.addFlow(new Flow(FlowEventName.HideLobbyUI, [uiStep]));
		manager.addFlow(new Flow(FlowEventName.SelectMode, [uiStep]));

		manager.addFlow(
			new Flow(FlowEventName.UpdateNextPuyo, [uiStep, gameStateStep])
		);

		manager.addFlow(
			new Flow(FlowEventName.Move, [soundStep, transStep, saveStep])
		);

		manager.addFlow(
			new Flow(FlowEventName.Rotate, [soundStep, transStep, saveStep])
		);

		manager.addFlow(
			new Flow(FlowEventName.AddScore, [soundStep, uiStep, saveStep])
		);

		manager.addFlow(
			new Flow(FlowEventName.GameOver, [soundStep, gameStateStep, uiStep])
		);

		manager.addFlow(
			new Flow(FlowEventName.ResetGame, [uiStep, gameStateStep, uiStep])
		);

		manager.addFlow(new Flow(FlowEventName.AddGarbage, [gameStateStep]));
		manager.addFlow(new Flow(FlowEventName.UpdateGarbageCount, [uiStep]));
	}
}