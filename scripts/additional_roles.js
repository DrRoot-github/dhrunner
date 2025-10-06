const base = Module.findBaseAddress(
	'DreadHungerServer-Win64-Shipping.exe'
);

const configs = {
	/**
	 * type 0なら「親（5サボ）/子（1/3/5サボ）」
	 * type 1ならprimary(3サボ)/secondary(3サボ)
	 */
	thrallsType: 0,

	/**
	 * プレイヤー向けメッセージが表示される秒数
	 */
	messageInterval: 7.68,

	// test flag なんかあった時こまるし普段からONでいいなこれ
	test: 1
};

rpc.exports = {
	setValue(key, value) {
		console.log(`set ${key} to ${value}`);
		const param = +value;
		configs[key] = param;
		if (!(configs.thrallsType === 0 || configs.thrallsType === 1)) {
			console.error('[additional_roles.js] Invalid Param:', value);
		}
	}
};

const messages = () => {
	return {
		primaryThrallDealed:
			configs.thrallsType === 0
				? '傀儡の親としていつも通りにやればいい'
				: '第一の傀儡として探検を妨害しろ',
		secondaryThrallDealed:
			configs.thrallsType === 0
				? '傀儡の子として親の背中を追え'
				: '第二の傀儡として探検を撹乱しろ',
		leaderDealed: '仲間を先導し闇の傀儡を暴け',
		madDealed: '狂人として探検家を惑わせろ'
	};
};

const rolesText = {
	Captain: '船長',
	Chaplain: '牧師',
	Cook: '料理人',
	Doctor: '医師',
	Engineer: '技師',
	Hunter: '猟師',
	Marine: '海兵',
	Navigator: '航海士'
};

const CANNIBAL_ATTACK = 0;
const WHITEOUT = 1;
const DOPPELGANGER = 2;
const SPIRIT_WALK = 3;
const HUSH = 4;

/**
 * @type {{ [playerId: number]: {
 *  roleName: string,
 *  thrall: null | "primary"|"secondary",
 *  additionalRole: null | "mad" | "leader",
 *  playerName: string,
 *  playerController: any
 * } }}
 */
const playerData = {};

// 2人外(primary,secondary) + 狂人 + リーダー
// 実質的には傀儡二人にp,s クルー二人に狂・長の追加ロールみたいなもんを付与する
const additionalThrallRole = ['primary'];
if (Math.random() < 0.5) {
	additionalThrallRole.push('secondary');
} else {
	additionalThrallRole.unshift('secondary');
}

// 人外の割り振り時に呼ばれる SetPlayerRole_Implementationとどっちが先か怪しい
const ADH_PlayerState_SetIsThrall = base.add(0xe4e880);
Interceptor.attach(ADH_PlayerState_SetIsThrall, {
	onEnter(args) {
		this.self = args[0];
	},

	onLeave() {
		const playerId = this.self.add(0x224).readU32();
		const role = additionalThrallRole.shift();
		if (role) {
			if (!playerData[playerId]) {
				playerData[playerId] = {};
			}
			playerData[playerId] = {
				...playerData[playerId],
				thrall: role
			};
		} else {
			console.error('error: Additional Role is undefined.');
		}

		if (configs.test) {
			console.log('ADH_PlayerState_SetIsThrall');
			console.log(JSON.stringify(playerData[playerId]));
		}
	}
});

// 基本役職の割り振り時に呼ばれる ADH_PlayerState_SetIsThrallとの順番は謎
// ADH_PlayerController::SetPlayerRole_Implementation(ADH_PlayerController *this, UDH_PlayerRoleData *NewRole)
Interceptor.attach(base.add(0xe50050), {
	onEnter(args) {
		this.playerController = args[0];
	},

	onLeave() {
		// ADH_PlayerController+0x658 *ADH_PlayerState
		const playerState = this.playerController
			.add(0x658)
			.readPointer();
		// ADH_PlayerState => APlayerState

		// ADH_PlayerState:0x590 = UDH_PlayerRoleData *SelectedRole;
		// UDH_PlayerRoleData:0x48 = FString OnlineName;
		// OnlineName -> Captain, Chaplain, Cook, Doctor, Engineer, Hunter, Marine, Navigator
		const onlineName = FStringToString(
			playerState.add(0x590).readPointer().add(0x48)
		);

		// e.g.256
		const playerId = playerState.add(0x224).readU32();

		// steam player name
		const playerNamePrivate = FStringToString(playerState.add(0x300));

		if (!playerData[playerId]) {
			playerData[playerId] = {};
		}
		playerData[playerId] = {
			playerName: playerNamePrivate,
			playerController: this.playerController,
			roleName: onlineName,
			thrall: null,
			additionalRole: null,
			...playerData[playerId]
		};

		if (configs.test) {
			console.log('SetPlayerRole_Implementation');
			console.log(JSON.stringify(playerData[playerId]));
		}
	}
});

// 試合開始時（キャラクターが動けるようになった時）に呼ばれる
const ADH_GameMode_HandleMatchHasStarted = base.add(0xd98a50);
Interceptor.attach(ADH_GameMode_HandleMatchHasStarted, {
	onEnter() {
		// 素村からランダムに二人ピックして狂人・リーダー付与
		const crews = Object.entries(playerData).filter(
			([, val]) => !val.thrall
		);
		const madIdx = Math.floor(Math.random() * crews.length);

		if (crews.length >= 1) {
			crews[madIdx][1].additionalRole = 'mad';
		}
		if (crews.length >= 2) {
			let leaderIdx;
			do {
				leaderIdx = Math.floor(Math.random() * crews.length);
			} while (leaderIdx === madIdx);
			crews[leaderIdx][1].additionalRole = 'leader';
		}

		if (configs.test) {
			console.log('ADH_GameMode_HandleMatchHasStarted');
			console.log(JSON.stringify(playerData));
		}
	}
});

// 開始(動けるようになった時)と同時にプレイヤーごとに呼ばれる
const ADH_HumanCharacter_AddStartingInventory = base.add(0xd46f10);
const UDH_InventoryManager_SetStorageLimit = new NativeFunction(
	base.add(0xde3da0),
	'void',
	['pointer', 'int32']
);
Interceptor.attach(ADH_HumanCharacter_AddStartingInventory, {
	onEnter(args) {
		const playerState = args[0].add(0x240).readPointer();
		const inventoryComponent = args[0].add(0x808).readPointer();
		const playerId = playerState.add(0x224).readU32();
		const adhPlayerController = args[0].add(0xa08).readPointer();

		const additionalRole = playerData[playerId].additionalRole;
		const thrall = playerData[playerId].thrall;
		if (additionalRole === 'leader') {
			UDH_InventoryManager_SetStorageLimit(inventoryComponent, 10);
			sendMessages(adhPlayerController, messages().leaderDealed);
		} else if (additionalRole === 'mad') {
			sendMessages(adhPlayerController, messages().madDealed);
		} else if (thrall === 'primary') {
			sendMessages(
				adhPlayerController,
				messages().primaryThrallDealed
			);
			if (configs.thrallsType === 0) {
				setSpells(adhPlayerController, [
					CANNIBAL_ATTACK,
					HUSH,
					SPIRIT_WALK,
					WHITEOUT,
					DOPPELGANGER
				]);
			} else {
				setSpells(adhPlayerController, [
					CANNIBAL_ATTACK,
					SPIRIT_WALK,
					WHITEOUT
				]);
			}
		} else if (thrall === 'secondary') {
			sendMessages(
				adhPlayerController,
				messages().secondaryThrallDealed
			);
			if (configs.thrallsType === 0) {
				// 謎だけど、サボが1個だけしか設定されてないと選べなくなる
				// しかたないので幽体2個セットする
				setSpells(adhPlayerController, [SPIRIT_WALK, SPIRIT_WALK]);
			} else {
				setSpells(adhPlayerController, [
					DOPPELGANGER,
					SPIRIT_WALK,
					HUSH
				]);
			}
		}
	}
});

// E4D950 ADH_PlayerState::SetDeathCount(ADH_PlayerState *this, int NewDeathCount)
Interceptor.attach(base.add(0xe4d950), {
	onEnter(args) {
		const death = args[1].toInt32();
		if (configs.test) {
			console.log('ADH_PlayerState::SetDeathCount', death);
		}

		if (configs.thrallsType === 0) {
			// 親の死んだ回数で子の呪文を解禁
			const playerId = args[0].add(0x224).readU32();
			if (configs.test) {
				console.log(JSON.stringify({ playerId, playerData }));
			}
			if (playerData[playerId].thrall === 'primary') {
				const child = Object.values(playerData).find(
					(x) => x.thrall === 'secondary'
				);
				if (!child) return;

				if (death === 1) {
					setSpells(child.playerController, [
						DOPPELGANGER,
						SPIRIT_WALK,
						HUSH
					]);
				} else if (death === 2) {
					setSpells(child.playerController, [
						CANNIBAL_ATTACK,
						HUSH,
						SPIRIT_WALK,
						WHITEOUT,
						DOPPELGANGER
					]);
				}
			}
		}
	}
});

// char ADH_GameState::IsAnyExplorerAlive(ADH_GameState *this)
Interceptor.attach(base.add(0xd9d1b0), {
	onEnter() {
		// IsAnyExplorerAliveから呼ばれた時だけ、狂人の扱いを人外にしたい
		// EnterのタイミングでIsThrallをフックして、抜ける時にdetachすれば良さそう
		// bool ADH_HumanCharacter::IsThrall(ADH_HumanCharacter *this)
		this.attached = Interceptor.attach(base.add(0xd5d280), {
			onEnter(args) {
				// 0x240の方のplayerStateはぬるぽ
				// 0xc40 *LastDHPlayerStateを見る
				const playerState = args[0].add(0xc40).readPointer();
				this.playerId = playerState.add(0x224).readU32();

				// 0x238 TArray<*APlayerState> PlayerArray
			},
			onLeave(retval) {
				if (playerData[this.playerId]?.additionalRole === 'mad') {
					retval.replace(1);
				}
			}
		});
	},
	onLeave() {
		// console.log("detached");
		this.attached.detach();
	}
});

// *UWorld
const GWorld = base.add(0x46ed420);

// ADH_GameState *__fastcall UWorld::GetGameState<ADH_GameState>(UWorld *this)
const UWorld_GetGameState = new NativeFunction(
	base.add(0xe263b0),
	'pointer',
	['pointer']
);

// サーバー起動した瞬間と1日が変わった時に呼ばれる 何故かonLeaveが呼ばれない
// その上thisに触れると例外になるのでGameStateを直接参照できない
// void __fastcall ADH_GameState::OnNewDayStarted(ADH_GameState *this)
Interceptor.attach(base.add(0xda16b8), {
	onEnter() {
		const ADH_GameState = UWorld_GetGameState(GWorld.readPointer());
		const DaysUntilBlizzard = ADH_GameState.add(0x484).readU32();
		if (DaysUntilBlizzard === 0) {
			// leaderに役職をメッセージで投げる
			const players = Object.values(playerData);
			const leader = players.find(
				(x) => x.additionalRole === 'leader'
			);
			if (leader) {
				const messages = [];
				const mad = players.find((x) => x.additionalRole === 'mad');
				const primary = players.find((x) => x.thrall === 'primary');
				const secondary = players.find(
					(x) => x.thrall === 'secondary'
				);

				if (primary) {
					let tmp;
					if (configs.thrallsType === 0) tmp = '親傀儡';
					else {
						tmp = '第一の傀儡';
					}
					tmp += `: ${rolesText[primary.roleName]}`;
					messages.push(tmp);
				}
				if (secondary) {
					let tmp;
					if (configs.thrallsType === 0) tmp = '子傀儡';
					else {
						tmp = '第二の傀儡';
					}
					tmp += `: ${rolesText[secondary.roleName]}`;
					messages.push(tmp);
				}
				if (mad) {
					messages.push(`狂人: ${rolesText[mad.roleName]}`);
				}
				sendMessages(leader.playerController, messages);
			}
		}
	}
});

///////////////////////////////////////////////////////////////////////////////
////////////////// ----------------- utils ----------------- //////////////////
///////////////////////////////////////////////////////////////////////////////

function FStringToString(FString) {
	const size = FString.add(0x8).readInt();
	return FString.readPointer().readUtf16String(size);
}

/// ----------- send thrall message ----------
// FText::FromString(FString &&)	00000000010963B0
const FTextFromFString = new NativeFunction(
	base.add(0x10964e0),
	'pointer',
	['pointer', 'pointer']
);

// ADH_PlayerController::ReceiveThrallMessage(FText const &,USoundBase *)	0000000000EE7810
const ReceiveThrallMessage = new NativeFunction(
	base.add(0xee7810),
	'void',
	['pointer', 'pointer', 'pointer']
);

function sendThrallMessage(pController, message) {
	// build FString
	const utf16buf = Memory.alloc((message.length + 1) * 2);
	utf16buf.writeUtf16String(message);

	// FString = TArray<wchar_t>だから個数は元の文字列の長さを入れる
	const FStringBuffer = Memory.alloc(0x10);
	FStringBuffer.writePointer(utf16buf);
	FStringBuffer.add(0x8).writeInt(message.length);
	FStringBuffer.add(0xc).writeInt(message.length);

	const FTextBuffer = Memory.alloc(0x8);
	FTextFromFString(FTextBuffer, FStringBuffer);

	ReceiveThrallMessage(pController, FTextBuffer, ptr(0));
}

function sendMessages(playerController, messageOrMessageList) {
	if (playerController.isNull()) {
		console.log('sendThrallMessage: PlayerController is null');
		return;
	}
	let count = 0;
	let timer = null;

	const messages = Array.isArray(messageOrMessageList)
		? messageOrMessageList
		: [messageOrMessageList];

	// 素直に正順でReceiveThrallMessageすると下から出ちゃうので逆で出す
	function _sendMessages() {
		for (let i = messages.length - 1; i >= 0; i--) {
			sendThrallMessage(playerController, messages[i]);
		}
		count++;
		if (count == 5) {
			clearInterval(timer);
		}
	}
	_sendMessages();
	timer = setInterval(_sendMessages, configs.messageInterval * 1000);
}

function setSpells(ADH_PlayerController, spells) {
	const ADH_SpellManager = ADH_PlayerController.add(0x658)
		.readPointer()
		.add(0x488)
		.readPointer();

	const gameInstance = UDH_GameInstance_GetInstance(ADH_SpellManager);
	const thrallSpells = gameInstance.add(0x440);

	// 理屈の上ではTArrayが16バイト、TArrayの中身が8*5で合計56バイトあればいい
	const tmp = Memory.alloc(64);
	tmp.writePointer(tmp.add(0x10));
	tmp.add(0x8).writeU32(spells.length);
	tmp.add(0xc).writeU32(spells.length);
	ADH_SpellManager.add(0x228).writeU32(spells.length);
	spells.forEach((v, i) => {
		const spell = thrallSpells.readPointer().add(8 * v);
		tmp.add(16 + 8 * i).writePointer(spell.readPointer());
	});
	ADH_PlayerController_SetEquippedSpells(ADH_PlayerController, tmp);
}

// SetEquippedSpellsは複数あるうち反映されるのはADH_PlayerController::のみ
const ADH_PlayerController_SetEquippedSpells = new NativeFunction(
	base.add(0xee7cf0),
	'void',
	['pointer', 'pointer']
);

const UDH_GameInstance_GetInstance = new NativeFunction(
	base.add(0xd93240),
	'pointer',
	['pointer']
);
