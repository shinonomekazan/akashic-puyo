export interface ButtonParams {
	scene: g.Scene;
	width: number;
	height: number;
	backgroundImage: g.ImageAsset;
	sliceBorder: { top: number; bottom: number; left: number; right: number };
	text: string;
	font: g.Font;
	textColor?: string;
	highlightColor?: string;
	onClick?: () => void;
	padding?: number;
	disabled?: boolean;
}

export class button9Patch extends g.E {
	private _label: g.Label;
	private _background: g.Sprite;
	private _normalColor: string;
	private _highlightColor: string;
	private _onClickHandler?: () => void;
	private _padding: number;
	private _isDisabled: boolean;

	constructor(params: ButtonParams) {
		super({
			scene: params.scene,
			width: params.width,
			height: params.height,
			touchable: true,
			local: true,
		});

		this._normalColor = params.textColor || "white";
		this._highlightColor = params.highlightColor || "#CCCCCC";
		this._onClickHandler = params.onClick;
		this._padding = params.padding !== undefined ? params.padding : 10;
		this._isDisabled = !!params.disabled; // [ADD] Khởi tạo giá trị

		// --- BACKGROUND ---
		const srcSurface = g.SurfaceUtil.asSurface(params.backgroundImage);

		const minSafeWidth = params.sliceBorder.left + params.sliceBorder.right;
		const minSafeHeight = params.sliceBorder.top + params.sliceBorder.bottom;

		const drawWidth = Math.max(params.width, minSafeWidth);
		const drawHeight = Math.max(params.height, minSafeHeight);

		const destSurface = g.game.resourceFactory.createSurface(drawWidth, drawHeight);
		g.SurfaceUtil.drawNinePatch(destSurface, srcSurface, params.sliceBorder);

		this._background = new g.Sprite({
			scene: params.scene,
			src: destSurface,
			width: drawWidth,
			height: drawHeight,
			touchable: false,
		});

		this.append(this._background);

		// --- LABEL ---
		this._label = new g.Label({
			scene: params.scene,
			text: params.text,
			font: params.font,
			fontSize: params.font.size - 20,
			textColor: this._normalColor,
			anchorX: 0.5,
			anchorY: 0.5,
			x: params.width / 2,
			y: params.height / 2,
			touchable: false
		});
		this.append(this._label);

		this.adjustTextScale();

		if (this._isDisabled) {
			this.setDisabled(true);
		}

		this.initEvents();
	}

	private initEvents(): void {
		this.onPointDown.add(() => {
			if (this._isDisabled) return;

			this._label.textColor = this._highlightColor;
			this._label.invalidate();
			this._label.y = (this.height / 2) + 2;
			this._label.modified();
		});

		this.onPointUp.add((ev: g.PointUpEvent) => {
			if (this._isDisabled) return;

			this.resetState();

			if (
				this._onClickHandler &&
				ev.point.x >= 0 &&
				ev.point.x <= this.width &&
				ev.point.y >= 0 &&
				ev.point.y <= this.height
			) {
				this._onClickHandler();
			}
		});
	}

	private adjustTextScale(): void {
		this._label.scaleX = 1;
		this._label.scaleY = 1;
		this._label.modified();

		const textWidth = this._label.font.measureText(this._label.text).width;
		const maxAvailableWidth = this.width - (this._padding * 2);

		if (textWidth > maxAvailableWidth) {
			const scale = maxAvailableWidth / textWidth;
			this._label.scaleX = scale;
			this._label.scaleY = scale;
		}
	}

	public resetState(): void {
		this._label.textColor = this._normalColor;
		this._label.y = this.height / 2;
		this._label.invalidate();
		this._label.modified();
	}

	public setText(text: string): void {
		this._label.text = text;
		this._label.invalidate();
		this.adjustTextScale();
	}

	public setDisabled(disabled: boolean): void {
		this._isDisabled = disabled;

		if (disabled) {
			this.opacity = 0.8;
			this.touchable = false;
			this.resetState();
		} else {
			this.opacity = 1.0;
			this.touchable = true;
		}
		this.modified();
	}
}