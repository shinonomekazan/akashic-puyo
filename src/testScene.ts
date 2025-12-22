import { LayoutLoader } from "./LayoutLoader";
import { SceneJsonData } from "./LayoutTypes";
import { Helper } from "./helper";
import { assetPaths } from "./assetPaths";
import { FlowManager } from "./flow/flowManager";
import { FlowEventName } from "./flow/eventName";
import { FlowCreator } from "./flowCreator";

export class TestScene extends g.Scene {
	flowManager: FlowManager;
	flowCreator: FlowCreator;
	constructor(param: g.SceneParameterObject) {
		param.assetPaths = assetPaths;
		super(param);
		this.flowManager = new FlowManager();
		this.onLoad.add(this.onGameLoad, this);
		//new FlowCreator(this.flowManager);
	};
	private onGameLoad() {
		console.log('test loaded');
		const json = this.asset.getText("/assets/test.json").data;
		console.log('2');
		//let spr = Helper.newSprite("/assets/fire.png")
		//spr.x = 100;
		//spr.y = 100;
		//spr.modified();

		//this.append(spr);

		// 1. Tạo instance Loader
		const loader = new LayoutLoader();

		// 2. Tạo một container gốc của Scene để chứa layout
		const layoutRoot = new g.E({ scene: this });
		this.append(layoutRoot);

		// 3. Build layout
		// Ép kiểu rawJson sang SceneJsonData
		loader.build(this, JSON.parse(json), layoutRoot);
		const mamcay = loader.getEntity("dotnet_bot.scale-400");
		mamcay.touchable = true;
		mamcay.onPointDown.add(() => {
			console.log('CLICKKK');
			this.flowManager.fireAsync(FlowEventName.Test);
		});

		// 4. (Tùy chọn) Truy xuất các phần tử để lập trình game logic
		const sun = loader.getEntity("mat troi"); // Lấy theo ID trong JSON
		if (sun) {
			// Ví dụ: Làm mặt trời xoay
			sun.onUpdate.add(() => {
				sun.angle += 1;
				sun.modified();
			});
		}

		// Ví dụ: Ẩn group hệ thống
		const sysRoot = loader.getEntity("H\u1EC7 th\u1ED1ng (Root)");
		if (sysRoot) {
			sysRoot.hide();
		}
	}
}