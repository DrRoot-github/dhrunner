const base = Process.getModuleByName(
	'DreadHungerServer-Win64-Shipping.exe'
).base;

// not called
// void UVOIPTalker::RegisterWithPlayerState(APlayerState *) 0x29712F0
//FEOSVoiceChat::CreateUser(void) 0x2D40C10

const functions = [
	[0xe4f390, 'TEST/Roll Dealeng'],
	[0xa08140, 'FEOSPlusVoiceChatUser::JoinChannel'],
	[0x2d49f40, 'FEOSVoiceChat::Login'],
	[0x2d51310, 'FEOSVoiceChat::OnVoiceChatLoggedIn'],
	[0x2d512c0, 'FEOSVoiceChat::OnVoiceChatChannelJoined'],
	[0x2d477d0, 'FEOSVoiceChatUser::JoinChannel'],
	[0x2d4fa90, 'FEOSVoiceChatUser::OnJoinRoom'],
	[0x9cb070, 'FOnlineSubsystemEOSVoiceChatUserWrapper::JoinChannel'],
	[0xa0ba80, 'FEOSPlusVoiceChatUser::OnVoiceChatLoggedIn'],
	[0x9122e0, 'FOnlineVoiceImpl::RegisterRemoteTalker'],
	[0xe440d0, 'UDH_OnlineVoice::OnPlayerAddedToGame'],
	[0xe43fd0, 'UDH_OnlineVoice::OnOnlineSessionUpdateComplete'],
	[0x295d000, 'UVoiceChannel::AddVoicePacket'],
	[0x2b023c0, 'UVoiceChannel::Describe'],
	// ここまで全滅

	[0x93f190, 'FOnlineVoiceSteam::CreateVoiceEngine'],
	// [0x8fd700, "Online::GetVoiceInterface"],
	[0x8fe500, 'HandleVoiceCommands'],
	[0x910040, 'FVoicePacketBuffer::PushPacket'],
	[0x90ceb0, 'FVoicePacketBuffer::PopAudio'],
	[0x2d343d0, 'FVoiceModule::StartupModule'],
	[0x0911b60, 'FVoiceEngineImpl::RegisterLocalTalker'],
	[0x919b60, 'FOnlineVoiceImpl::StartNetworkedVoice'],
	[0x911d30, 'FOnlineVoiceImpl::RegisterLocalTalkers'],
	[0x90e6d0, 'FOnlineVoiceImpl::ProcessRemoteVoicePackets'],
	[0x8ff000, 'FOnlineVoiceImpl::Init'],

	//
	[0xeea2d0, 'UDH_OnlineSession::execOnPlayerLogout'],
	[0xe15280, 'UDH_OnlineSession::RejoinSameSession'],
	[0xe0fdb0, 'UDH_OnlineSession::OnSessionParticipantRemoved'],
	[0xe10aa0, 'UDH_OnlineSession::OnSessionParticipantsChange'],
	[0xe0d9e0, 'UDH_OnlineSession::OnOnlineSessionUpdateComplete'],
	[0xe056a0, 'UDH_OnlineSession::Init'],
	[0xe21640, 'UDH_OnlineSession::UpdateOnlineSessionSettings']
];

//
functions.forEach(([addr, name]) => {
	Interceptor.attach(base.add(addr), {
		onEnter(args) {
			console.log(`CALLED ${addr} :: ${name}`);
		},

		onLeave(ret) {
			console.log(`LEFT ${addr} :: ${name}`);
		}
	});
});
