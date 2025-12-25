import { SceneObjectData, SceneJsonData } from "./LayoutTypes";

export class LayoutLoader {
	public entityMap: Map<string, g.E>;
	constructor() {
		this.entityMap = new Map<string, g.E>();
	}
	public build(
		scene: g.Scene,
		jsonData: SceneJsonData,
		rootContainer?: g.E
	): void {
		console.log(jsonData);
		this.entityMap.clear();
		const objects = jsonData.objects;
		console.log(objects);
		objects.forEach((objData) => {
			const entity = this.createEntity(scene, objData);
			if (entity) {
				this.entityMap.set(objData.id, entity);
			}
		});
		objects.forEach((objData) => {
			const childEntity = this.entityMap.get(objData.id);
			if (!childEntity) return;

			if (objData.parent) {
				const parentEntity = this.entityMap.get(objData.parent);
				if (parentEntity) {
					parentEntity.append(childEntity);
				} else {
					console.warn(
						`LayoutLoader: Không tìm thấy parent có ID '${objData.parent}' cho '${objData.id}'`
					);
				}
			} else {
				if (rootContainer) {
					rootContainer.append(childEntity);
				}
			}
		});
	}

	private createEntity(scene: g.Scene, data: SceneObjectData): g.E {
		let entity: g.E;
		const asset = scene.asset;
		const isVisible = data.visible !== undefined ? data.visible : true;
		console.log("loadd.... " + data.imagepath);
		if (!data.imagepath) {
			console.error("null path " + data.id);
			entity = new g.E({ scene: scene });
		} else {
			if (data.type === "image" && data.imagepath) {
				if (!asset) {
					console.error(
						`LayoutLoader: Không tìm thấy Asset ID '${data.imagepath}' (từ path: ${data.imagepath}) trong scene assets.`
					);
					entity = new g.E({ scene: scene }); //fallback to empty entity
				} else {
					let spr = new g.Sprite({
						scene: scene,
						src: asset.getImage(data.imagepath),
					});
					spr.width = data.width;
					spr.height = data.height;
					spr.invalidate();
					entity = spr;
				}
			} else {
				if (data.type === "layer") {
					entity = new g.E({
						scene: scene,
						width: 1280,
						height: 720,
					});
				} else {
					console.log("other " + data.type);
					//other types can be handled here
				}
			}
		}
		console.log("data ", data);
		console.log(entity);
		entity.x = data.x;
		entity.y = data.y;
		entity.scaleX = data.xscale !== undefined ? data.xscale : 1;
		entity.scaleY = data.yscale !== undefined ? data.yscale : 1;
		entity.anchorX = data.xpivot !== undefined ? data.xpivot : 0;
		entity.anchorY = data.ypivot !== undefined ? data.ypivot : 0;
		console.log("a");
		if (isVisible) {
			entity.show();
		} else {
			entity.hide();
		}
		console.log("b");
		entity.modified();
		return entity;
	}

	public getEntity(id: string): g.E | undefined {
		return this.entityMap.get(id);
	}
}
