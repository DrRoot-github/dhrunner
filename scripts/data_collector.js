// 常時injectされるこっそり検証用コード いらないなら中身を空にする

const base = Module.findBaseAddress(
	'DreadHungerServer-Win64-Shipping.exe'
);

const table = [
	[0x008, 'int', 'NumPublicConnections'],
	[0x00c, 'int', 'NumPrivateConnections'],
	[0x010, 'bool', 'bShouldAdvertise'],
	[0x011, 'bool', 'bAllowJoinInProgress'],
	[0x012, 'bool', 'bIsLANMatch'],
	[0x013, 'bool', 'bIsDedicated'],
	[0x014, 'bool', 'bUsesStats'],
	[0x015, 'bool', 'bAllowInvites'],
	[0x016, 'bool', 'bUsesPresence'],
	[0x017, 'bool', 'bAllowJoinViaPresence'],
	[0x018, 'bool', 'bAllowJoinViaPresenceFriendsOnly'],
	[0x019, 'bool', 'bAntiCheatProtected'],
	[0x01a, 'bool', 'bUseLobbiesIfAvailable'],
	[0x01b, 'bool', 'bUseLobbiesVoiceChatIfAvailable'],
	[0x01c, 'int', 'BuildUniqueId'],
	[0x020, 'bool', 'bHasGameStarted']
];

// UDH_OnlineSession::UpdateOnlineSessionSettings
Interceptor.attach(base.add(0xe21640), {
	// UDH_OnlineSession *this,
	// FOnlineSessionSettings *OutSessionSettings
	onEnter(args) {
		console.log(
			'---------- !!! UpdateOnlineSessionSettings CALLED !!!----------'
		);
	}
});
