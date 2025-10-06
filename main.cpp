#include <iostream>
#include <string>
#include <ostream>
#include <cstdio>


#include "frida/frida-core.h"
#include "utils.hpp"

static GMainLoop* loop = NULL;
guint pid = 0;
static FridaDevice* local_device = NULL;
static FridaSession* session = NULL;
std::vector<FridaScript*> scriptList;
int msgId = 0;

// cwdが違うだけでスクリプト探せなくなるのでexeの位置から参照する
auto scriptPath = exeDir() + "/scripts";


// callbacks
static gboolean stop(gpointer user_data)
{
	g_main_loop_quit(loop);

	return FALSE;
}

static void on_signal(int signo)
{
	g_print("signal received and aborted.\n");
	g_idle_add(stop, NULL);
}

static void on_detached(
	FridaSession* _session,
	FridaSessionDetachReason reason,
	FridaCrash* crash,
	gpointer user_data)
{
	gchar* reason_str;

	reason_str = g_enum_to_string(FRIDA_TYPE_SESSION_DETACH_REASON, reason);
	g_print("on_detached: reason=%s crash=%p\n", reason_str, crash);
	g_free(reason_str);

	g_idle_add(stop, NULL);
}

static void on_message(FridaScript* script,
	const gchar* message,
	GBytes* data,
	gpointer user_data)
{
	// js側でconsole.log("hello")とかやると、
	// {"type":"log","level":"info","payload":"hello"} とかで飛んでくる
	JsonParser* parser;
	JsonObject* root;
	const gchar* type;

	parser = json_parser_new();
	json_parser_load_from_data(parser, message, -1, NULL);
	root = json_node_get_object(json_parser_get_root(parser));

	type = json_object_get_string_member(root, "type");
	if (strcmp(type, "log") == 0)
	{
		const gchar* log_message;

		log_message = json_object_get_string_member(root, "payload");
		g_print("%s\n", log_message);
	}
	else
	{
		g_print("%s\n", message);
	}

	g_object_unref(parser);
}

// いらんくなったので使わない
static void on_output(FridaDevice* sender, guint pid, gint fd,
	GBytes* data, gpointer user_data)
{
	gsize size = 0;
	gconstpointer buf = g_bytes_get_data(data, &size);

	fwrite(buf, 1, size, stdout);
	fflush(stdout);
}

static void injectScript(
	std::string scriptName,
	JsResource scriptBody) {

	GError* error = NULL;
	FridaScript* script;

	if (auto* res = std::get_if<QJSByteCodeData>(&scriptBody)) {
		GBytes* bytes = g_bytes_new(res->body.data(), res->body.size());
		script = frida_session_create_script_from_bytes_sync(
			session, bytes, NULL, NULL, &error
		);
		g_bytes_unref(bytes);
	}
	else if (auto* res = std::get_if<JsFileData>(&scriptBody)) {
		script = frida_session_create_script_sync(
			session, res->body.c_str(), NULL, NULL, &error);

		// 変数を反映
		for (auto& [k, v] : res->variables) {
			// https://github.com/frida/frida-core/issues/296
			char buf[1024];
			std::snprintf(buf, sizeof(buf),
				"[\"frida:rpc\", %d, \"call\", \"setValue\",[\"%s\", \"%s\"]]",
				msgId++, k.c_str(), std::any_cast<std::string>(v).c_str());
			frida_script_post(script, buf, nullptr);
		}
	}

	g_assert(error == NULL);
	g_signal_connect(script, "message", G_CALLBACK(on_message), NULL);
	frida_script_load_sync(script, NULL, &error);
	
	g_assert(error == NULL);
	g_print("injected: %s\n", scriptName.c_str());
	scriptList.push_back(script);

}

// stdin受ける
static gboolean stdin_cb(GIOChannel* source, GIOCondition condition, gpointer data) {
	if (condition & (G_IO_HUP | G_IO_ERR)) {
		return FALSE;
	}

	gchar* line = NULL;
	gsize len = 0;
	GError* err = NULL;

	// ややこしいのでエンコード切る
	g_io_channel_set_encoding(source, NULL, NULL);
	GIOStatus status = g_io_channel_read_line(source, &line, &len, NULL, &err);
	if (status == G_IO_STATUS_NORMAL && line != NULL) {
		// 改行を消す
		g_strstrip(line);

		// lineはscript_queryと同仕様 filename.js ないし filename.js?key=value?key2=val2
		std::vector query = { std::string(line) };
		auto jsmap = load_scripts(query, scriptPath);

		for (const auto& [fname, js] : jsmap) {
			injectScript(fname, js);
		}

		g_print("--- STDIN: %s\n", line);
		g_free(line);
	}
	else if (err) {
		g_warning("--- STDIN ERROR OCCURED: %s", err->message);
		g_error_free(err);
	}

	// TRUE返すと監視を継続
	return TRUE;
}

// ------------------ main ----------------
int main(int argc, char* argv[])
{

	// parse args
	std::vector<std::string> script_queries;


#ifdef NDEBUG
	// argv[0]...runner.exe
	// argv[1]...DreadHungerServer-Win64-Shipping.exe
	// argv[2]...Expanse_Persistent?maxplayers=1?...
	// argv[3...N]...scriptA.js?param=...
	if (argc < 3)
	{
		std::cerr << "required game option" << std::endl;
		return 1;
	}

	std::string program_path = argv[1];
	std::string game_option = argv[2];
	for (int i = 3; i < argc; i++)
	{
		// script_file_name
		// script_file_name?REPLACE_VARIABLE=VALUE
		script_queries.emplace_back(argv[i]);

		//std::cout << i << ":" << argv[i] << std::endl;
	}
#else
	std::string program_path = "E:/SteamLibrary/steamapps/common/Dread Hunger/WindowsServer/DreadHunger/Binaries/Win64/DreadHungerServer-Win64-Shipping.exe";
	std::string game_option = "Expanse_Persistent?maxplayers=1?daysbeforeblizzard=7?dayminutes=16?predatordamage=0.25?coldintensity=0.25?hungerrate=0.25?coalburnrate=0.1?thralls=1";
	//script_queries.emplace_back("test.js?msg=インジェクトできたぽよなあ");
	//script_queries.emplace_back("consolePipe.js");
	script_queries.emplace_back("fix_reconnect_compiled.qjs");
	
#endif

	// setup
	frida_init();

	loop = g_main_loop_new(NULL, TRUE);

	signal(SIGINT, on_signal);
	signal(SIGTERM, on_signal);

	// stdinで後から注入もできるようにする
	GIOChannel* stdin_channel = g_io_channel_unix_new(fileno(stdin));
	g_io_add_watch(stdin_channel, G_IO_IN, stdin_cb, NULL);

	// std::cout << "script basePath set to " << basePath << "\n";
	auto scripts = load_scripts(script_queries, scriptPath);
	GError* error = NULL;
	auto manager = frida_device_manager_new();
	local_device = frida_device_manager_get_device_by_type_sync(
		manager, FridaDeviceType::FRIDA_DEVICE_TYPE_LOCAL,
		0, NULL, &error);

	g_assert(local_device != NULL);

	// spawn process
	FridaSpawnOptions* spawn = frida_spawn_options_new();

	// 実行ファイルを叩くコマンド自身も含んでやらないとオプションがうまく渡らない
	gchar* launch_argv[] = {
		g_strdup(program_path.c_str()),
		g_strdup(game_option.c_str()),
		NULL };
	int len = 0;
	while (launch_argv[len] != NULL)
		len++;
	frida_spawn_options_set_argv(spawn, launch_argv, len);
	frida_spawn_options_set_stdio(spawn, FridaStdio::FRIDA_STDIO_PIPE);

	pid = frida_device_spawn_sync(
		local_device, program_path.c_str(), spawn, NULL, &error);
	if (error != NULL)
	{
		g_print("Failed to spawn: %s\n", error->message);
		g_error_free(error);
		goto CLEANUP;
	}

	if (!assign_relationship(pid)) {
		goto CLEANUP;
	}

	// g_signal_connect(local_device, "output", G_CALLBACK(on_output), NULL);

	// attach device and session
	session = frida_device_attach_sync(local_device, pid, NULL, NULL, &error);
	if (error != NULL)
	{
		g_print("Failed to attach: %s\n", error->message);
		g_error_free(error);
		goto CLEANUP;
	}
	g_signal_connect(session, "detached", G_CALLBACK(on_detached), NULL);

	for (const auto& [name, js] : scripts)
	{
		injectScript(name, js);
	}

	frida_device_resume_sync(local_device, pid, NULL, &error);

	if (g_main_loop_is_running(loop))
	{
		g_main_loop_run(loop);
	}

	// closing
CLEANUP:
	cleanupHandle();

	for (auto itr : scriptList) {
		frida_script_unload_sync(itr, NULL, NULL);
		frida_unref(itr);
	}
	frida_session_detach_sync(session, NULL, NULL);
	frida_unref(session);
	frida_device_kill_sync(local_device, pid, NULL, NULL);
	frida_unref(local_device);
	frida_device_manager_close_sync(manager, NULL, NULL);
	frida_unref(manager);
	g_print("closing\n");
	g_main_loop_unref(loop);
	return 0;
}
