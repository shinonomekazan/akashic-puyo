export enum FlowEventName {
	Init,          
	SomeClientSelectMode,    
	ShowDialogJoinPvP,
	SomeClientReadyClicked,
	WaitServerResponeReadyPvsP,
	StartPvsP,
	LobbyWait,     
	StartSolo,     // Start Single Player
	StartVsCom,    // Start VS COM
	PreparePvP,    // Start PvP (Sync Handshake)
	Gaming,        // In-game loop
	GameOver,       // Show result
	// --- Sync Flow Events (Incoming from Network) ---
	SyncSelectMode,
	SyncPlayerReady,
	SyncGameStart,
	SyncPlayerInput,
	SyncUpdateBoard,

	// --- Broadcast Events (Outgoing to Network) ---
	// These events represent the GameLogic's intent to send data to clients.
	BroadcastSelectMode,
	BroadcastPlayerReady,
	BroadcastGameStart,
	BroadcastPlayerInput,
	BroadcastUpdateBoard
}