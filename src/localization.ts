export class Localization {
	public static language: "vi" | "en" = "vi";

	private static strings: { [key: string]: { vi: string; en: string } } = {
		wait_p2: { vi: "Chờ player thứ 2", en: "Waiting for Player 2" },
		wait_opp_action: {
			vi: "Đang chờ đối thủ...",
			en: "Waiting for opponent...",
		},
		click_ready: { vi: " TOUCH TO START", en: " TOUCH TO START" },
		room_full: { vi: "Phòng đã đủ người!", en: "Room is full!" },
		join_room: { vi: "Hãy click tham gia phòng", en: "Click to join room" },
		opp_left_win: {
			vi: "Đối thủ đã rời phòng! Bạn thắng!",
			en: "Opponent left! You win!",
		},
		p_lose: { vi: "Player {0} thua!", en: "Player {0} lost!" },
		you_lose: { vi: "Game Over!", en: "Game Over!" },
		you_win: {
			vi: "Chúc mừng! Bạn đã thắng.",
			en: "Congratulations! You won.",
		},
		play_again: { vi: "Chơi lại", en: "Play Again" },
		waiting_lbl: { vi: "Đang chờ...", en: "Waiting..." },
		ready_waiting: { vi: "Đã Sẵn Sàng", en: "Ready!" },
	};

	public static getText(key: string, ...args: any[]): string {
		const entry = this.strings[key];
		if (!entry) return key;
		let text = entry[this.language];
		args.forEach((arg, index) => {
			text = text.replace(`{${index}}`, arg);
		});
		return text;
	}
}
