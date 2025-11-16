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

	/**
	 * クルーリーダー有り 0なら無し
	 */
	leader: 1,

	// test flag なんかあった時こまるし普段からONでいいなこれ
	test: 1
};

rpc.exports = {
	setValue(key, value) {
		console.log(`set ${key} to ${value}`);
		const param = +value;
		configs[key] = param;
	}
};

function log(msg) {
	if (configs.test) {
		console.log(':::MOD LOG::: ' + msg);
	}
}

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
 * @type {Array<{
 *  roleName: string,
 *  thrall: null | "primary"|"secondary",
 *  additionalRole: null | "mad" | "leader",
 *  playerName: string,
 *  playerController: any
 *  playerId: string
 *  spells: any
 * }>}
 */
const playerData = [];
let playerNum = 0;

// *UWorld
const GWorld = base.add(0x46ed420);

// UDH_GameplayStatics::GetDHPlayerController(UObject const *,int)	0000000000E8F020
const GetDHPlayerController = new NativeFunction(
	base.add(0xe8f020),
	'pointer',
	['pointer', 'int']
);
const UDH_InventoryManager_SetStorageLimit = new NativeFunction(
	base.add(0xde3da0),
	'void',
	['pointer', 'int32']
);
const ADH_GameMode_HandleMatchHasStarted = base.add(0xd98a50);

// ADH_GameState *__fastcall UWorld::GetGameState<ADH_GameState>(UWorld *this)
const UWorld_GetGameState = new NativeFunction(
	base.add(0xe263b0),
	'pointer',
	['pointer']
);

// ADH_PlayerController::ReceiveThrallMessage(FText const &,USoundBase *)	0000000000EE7810
const ReceiveThrallMessage = new NativeFunction(
	base.add(0xee7810),
	'void',
	['pointer', 'pointer', 'pointer']
);

// FText::FromString(FString &&)	00000000010963B0
const FTextFromFString = new NativeFunction(
	base.add(0x10964e0),
	'pointer',
	['pointer', 'pointer']
);

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

// E80390 ; void __fastcall ADH_SpellManager::ResetSpellCooldown(ADH_SpellManager *this, const TSubclassOf<UDH_TotemSpell> SpellType)
const ResetSpellCooldown = new NativeFunction(
	base.add(0xe80390),
	'void',
	['pointer', 'pointer']
);
// 2人外(primary,secondary) + 狂人 + リーダー
// 実質的には傀儡二人にp,s クルー二人に狂・長の追加ロールみたいなもんを付与する
const additionalThrallRole = ['primary'];
if (Math.random() < 0.5) {
	additionalThrallRole.push('secondary');
} else {
	additionalThrallRole.unshift('secondary');
}

// 試合開始時（キャラクターが動けるようになった時）に1発呼ばれる
Interceptor.attach(ADH_GameMode_HandleMatchHasStarted, {
	onLeave() {
		log('Left ADH_GameMode_HandleMatchHasStarted');
		const crews = [];
		for (let i = 0; i < 8; i++) {
			const pcon = GetDHPlayerController(GWorld.readPointer(), i);
			if (!pcon.isNull()) {
				const ADH_PlayerState = pcon.add(0x658).readPointer();
				const isThrall = ADH_PlayerState.add(0x572).readU8();
				const playerId = ADH_PlayerState.add(0x224).readInt();
				const roleName = FStringToString(
					ADH_PlayerState.add(0x590).readPointer().add(0x48)
				);
				const playerName = FStringToString(
					ADH_PlayerState.add(0x300)
				);
				log(
					`player ${i} iterate. ${playerName}: Thrall=${isThrall}, Role=${roleName}`
				);

				let thrall = null;
				let spells = null;
				if (isThrall) {
					thrall = additionalThrallRole.shift();
					if (thrall === 'primary') {
						sendMessageContinuously(
							pcon,
							messages().primaryThrallDealed
						);
						if (configs.thrallsType === 0) {
							spells = [
								CANNIBAL_ATTACK,
								HUSH,
								SPIRIT_WALK,
								WHITEOUT,
								DOPPELGANGER
							];
						} else {
							spells = [CANNIBAL_ATTACK, SPIRIT_WALK, WHITEOUT];
						}
					} else {
						sendMessageContinuously(
							pcon,
							messages().secondaryThrallDealed
						);
						if (configs.thrallsType === 0) {
							// 謎だけど、サボが1個だけしか設定されてないと選べなくなる
							// しかたないので幽体2個セットする
							spells = [SPIRIT_WALK, SPIRIT_WALK];
						} else {
							spells = [DOPPELGANGER, SPIRIT_WALK, HUSH];
						}
					}
					log(`setSpells:${playerName} = ${spells}`);
					setSpells(pcon, spells);
				} else {
					crews.push(i);
				}
				playerData[i] = {
					additionalRole: null,
					playerController: pcon,
					playerId,
					playerName,
					roleName,
					thrall,
					spells
				};
				playerNum++;
			}
		}

		// 追加役職の割り振り
		for (let i = crews.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[crews[i], crews[j]] = [crews[j], crews[i]];
		}
		const roles = ['mad'];
		if (configs.leader) {
			roles.push("leader")
		}

		for (let i = 0; i < crews.length; i++) {
			const role = roles.shift();
			const targetPlayer = playerData[crews[i]];
			targetPlayer.additionalRole = role;
			if (role === 'mad') {
				sendMessageContinuously(
					targetPlayer.playerController,
					messages().madDealed
				);
			} else if (role === 'leader') {
				const human = targetPlayer.playerController
					.add(0x588)
					.readPointer();
				const storage = human.add(0x808).readPointer();
				UDH_InventoryManager_SetStorageLimit(storage, 10);
				sendMessageContinuously(
					targetPlayer.playerController,
					messages().leaderDealed
				);
			}
		}

		log(JSON.stringify(playerData, null, 2));
	}
});

// E4D950 ADH_PlayerState::SetDeathCount(ADH_PlayerState *this, int NewDeathCount)
Interceptor.attach(base.add(0xe4d950), {
	onEnter(args) {
		const death = args[1].toInt32();

		if (configs.thrallsType === 0) {
			// 親の死んだ回数で子の呪文を解禁
			// TODO 再接続した時にもとに戻っちゃう
			const playerId = args[0].add(0x224).readU32();
			const player = playerData.find((x) => x.playerId === playerId);

			if (player.thrall === 'primary') {
				const child = playerData.find(
					(x) => x.thrall === 'secondary'
				);
				if (!child) return;

				if (death === 1) {
					child.spells = [DOPPELGANGER, SPIRIT_WALK, HUSH];
				} else if (death === 2) {
					child.spells = [
						CANNIBAL_ATTACK,
						HUSH,
						SPIRIT_WALK,
						WHITEOUT,
						DOPPELGANGER
					];
				}
				setSpells(child.playerController, child.spells);
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
				const mad = playerData.find(
					(x) => x.additionalRole === 'mad'
				);
				if (mad?.playerId === this.playerId) {
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

// サーバー起動した瞬間と1日が変わった時に呼ばれる
// DA1680 ; void __fastcall ADH_GameState::OnNewDayStarted(ADH_GameState *this)
Interceptor.attach(base.add(0xda1680), {
	onEnter(args) {
		this.self = args[0]
	},
	onLeave() {
		const DaysUntilBlizzard = this.self.add(0x484).readU32();
		if (DaysUntilBlizzard === 0) {
			// leaderに役職をメッセージで投げる
			const leader = playerData.find(
				(x) => x.additionalRole === 'leader'
			);
			if (leader) {
				const messages = [];
				const mad = playerData.find((x) => x.additionalRole === 'mad');
				const primary = playerData.find((x) => x.thrall === 'primary');
				const secondary = playerData.find(
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
				sendMessageContinuously(
					leader.playerController,
					messages.join('\n')
				);
				log(`sent message to leader\n${messages}`);
				log(`details: ${primary} ${secondary} ${mad}`);
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



/**
 * 自作setInterval
 * 
 * ナマのsetIntervalを使うとFridaのスレッドから予期しないタイミングで関数を叩くので
 * 同期関係がぶっ壊れてゲームが破綻する（インタラクトバグとか）
 */

/**
 * @typedef {Object} IntervalTask
 * @property {number} nextFireTime  second
 * @property {number} interval    second
 * @property {number} remaining     残り発火回数 0になると自殺
 * @property {Function} callback    
 */

/** @type {IntervalTask[]} */
const tasks = [];

let indexForTest = 0
// DAD420; void __fastcall ADH_GameState:: Tick(ADH_GameState * this, float DeltaSeconds)
Interceptor.attach(base.add(0xDAD420), {
	onEnter(args) {
		const totalTime = args[0].add(0x5b0).readDouble()

		// いらんくなったタスク消去の為に逆順で列挙する
		for (let i = tasks.length - 1; i >= 0; i--) {
			const task = tasks[i]
			if (task.nextFireTime < totalTime) {
				task.callback()
				task.remaining--

				if (task.remaining <= 0) {
					tasks.splice(i, 1)
				}
				else {
					task.nextFireTime = totalTime + task.interval
				}
			}
		}
	}
})


function sendMessageContinuously(playerController, message) {
	// /** @type {IntervalTask} */
	const task = {
		callback: () => {
			sendThrallMessage(playerController, message)
		},
		interval: configs.messageInterval,
		remaining: 5,
		nextFireTime: 0
	}
	tasks.push(task)
	// sendThrallMessage(playerController, message)
}

function setSpells(ADH_PlayerController, spells) {
	const ADH_SpellManager = ADH_PlayerController.add(0x658)
		.readPointer()
		.add(0x488)
		.readPointer();

	const gameInstance = UDH_GameInstance_GetInstance(ADH_SpellManager);
	const thrallSpells = gameInstance.add(0x440);

	const ownedSpells = [];
	const equippedSpells = ADH_SpellManager.add(0x288);
	for (let i = 0; i < equippedSpells.add(0x8).readInt(); i++) {
		const spell = equippedSpells
			.readPointer()
			.add(0x8 * i)
			.readPointer();
		ownedSpells.push(spell);
	}

	// 理屈の上ではTArrayが16バイト、TArrayの中身が8*5で合計56バイトあればいい
	const tmp = Memory.alloc(64);
	tmp.writePointer(tmp.add(0x10));
	tmp.add(0x8).writeU32(spells.length);
	tmp.add(0xc).writeU32(spells.length);
	ADH_SpellManager.add(0x228).writeU32(spells.length);
	spells.forEach((v, i) => {
		const spell = thrallSpells
			.readPointer()
			.add(0x8 * v)
			.readPointer();
		tmp.add(16 + 8 * i).writePointer(spell);
	});
	ADH_PlayerController_SetEquippedSpells(ADH_PlayerController, tmp);

	// もし牢屋内で生成した場合は手動でクールをリセットする
	const ADH_PlayerState =
		ADH_PlayerController.add(0x658).readPointer();
	const isDead = ADH_PlayerState.add(0x570).readU8();
	if (!!isDead) {
		// SpellManager:2a8 SpellCooldownsを弄れば特定の時間に設定できるんだけどめんどい
		// 需要あんま無さそうだから新規追加されたスペルはとにかくリセットという事で…
		log(`ownedSpalls:${ownedSpells}`);
		const len = equippedSpells.add(0x8).readInt();
		for (let i = 0; i < len; i++) {
			const spell = equippedSpells
				.readPointer()
				.add(0x8 * i)
				.readPointer();
			if (
				!ownedSpells.find((x) => x.toString() === spell.toString())
			) {
				ResetSpellCooldown(ADH_SpellManager, spell);
			}
		}
	}
}
