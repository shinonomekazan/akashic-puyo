export interface SceneObjectData {
	id: string;
	parent?: string;
	type?: "image" | "layer" | string;
	imagepath?: string;
	visible?: boolean;
	x: number;
	y: number;
	width?: number;
	height?: number;
	xpivot?: number; // anchorX
	ypivot?: number; // anchorY
	xscale?: number;
	yscale?: number;
}

export interface SceneJsonData {
	"export-time": string;
	objects: SceneObjectData[];
}
