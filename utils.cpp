#include "utils.hpp"

namespace fs = std::filesystem;

// script_query(filename || filename?NAME1=VAR1?NAME2=VAR2...)
std::unordered_map<std::string, std::string> load_scripts(
	const std::vector<std::string>& script_queries,
	const std::string& dir)
{
	std::unordered_map<std::string, std::string> scripts;

	for (const auto& query : script_queries)
	{
		// parse query
		auto qpos = query.find('?');
		auto filename = query.substr(0, qpos);

		// load file
		auto fullpath = std::filesystem::path(dir) / filename;
		std::ifstream ifs(fullpath);
		if (!ifs)
		{
			std::cerr << "could not open file:" << filename << std::endl;
			continue;
		}

		std::ostringstream buf;
		buf << ifs.rdbuf();
		auto content = buf.str();

		// replace必要なら置き換え実行する
		while (qpos != std::string::npos)
		{
			auto next = query.find('?', qpos + 1);
			auto pair = query.substr(qpos + 1, next - qpos - 1);
			auto eq = pair.find('=');
			if (eq != std::string::npos)
			{
				auto key = pair.substr(0, eq);
				auto val = pair.substr(eq + 1);

				// replace
				size_t pos = 0;
				while ((pos = content.find(key, pos)) != std::string::npos)
				{
					content.replace(pos, key.length(), val);

					// あんま無いけどKEY=KEYみたいな文字列を投げられた時スタックしないようにする
					pos += val.length();
				}
			}
			qpos = next;
		}
		scripts[filename] = content;
	}

	return scripts;
}

const std::string LOG_DIR = "log";
const size_t MAX_LOG_FILES = 64;

// yyyy-mm-dd_HH-MM-SS形式のファイル名を作る
std::string get_log_filename()
{
	auto now = std::chrono::system_clock::now();
	std::time_t t_now = std::chrono::system_clock::to_time_t(now);
	std::tm tm_now{};
	localtime_s(&tm_now, &t_now);

	std::ostringstream oss;
	oss << std::put_time(&tm_now, "%Y-%m-%d_%H-%M-%S") << ".log";
	return (fs::path(LOG_DIR) / oss.str()).string();
}

// logディレクトリがなければ作成
void ensure_log_dir_exists()
{
	if (!fs::exists(LOG_DIR))
	{
		fs::create_directory(LOG_DIR);
	}
}

// 古いファイルを削除（64個以上あるなら最古の1つだけ削除）
void trim_old_logs()
{
	std::vector<fs::directory_entry> entries;

	for (const auto& entry : fs::directory_iterator(LOG_DIR))
	{
		if (entry.is_regular_file())
		{
			entries.push_back(entry);
		}
	}

	if (entries.size() >= MAX_LOG_FILES)
	{
		std::sort(entries.begin(), entries.end(),
			[](const auto& a, const auto& b)
			{
				return a.last_write_time() < b.last_write_time();
			});
		fs::remove(entries.front());
	}
}

// ログに書き込む
void write_log(const char* message, std::string filename)
{
#ifdef NDEBUG
	std::ofstream ofs(filename);
	if (ofs)
	{
		ofs << message << std::endl;
	}
#else
	std::cout << message << std::endl;
#endif
}

HANDLE job;
HANDLE proc;

// Job ObjectにPIDでプロセスを登録して、一緒に死ぬようにする
bool assign_relationship(DWORD pid) {
	job = CreateJobObject(NULL, NULL);
	if (!job) {
		std::cerr << "CreateJobObject failed\n";
		return false;
	}

	// 子プロセスを親と心中させる設定
	JOBOBJECT_EXTENDED_LIMIT_INFORMATION info = {};
	info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
	if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, &info, sizeof(info))) {
		std::cerr << "SetInformationJobObject failed\n";
		CloseHandle(job);
		return false;
	}

	// PID からプロセスハンドルを開く
	proc = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
	if (!proc) {
		std::cerr << "OpenProcess failed for PID " << pid << "\n";
		CloseHandle(job);
		return false;
	}

	// Job に子プロセスを追加
	if (!AssignProcessToJobObject(job, proc)) {
		std::cerr << "AssignProcessToJobObject failed\n";
		CloseHandle(proc);
		CloseHandle(job);
		return false;
	}

	return true;
}

void cleanupHandle() {
	CloseHandle(job);
	CloseHandle(proc);
}