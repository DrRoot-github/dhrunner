#pragma once

#include <string>
#include <unordered_map>
#include <filesystem>
#include <fstream>
#include <sstream>
#include <iostream>
#include <chrono>
#include <iomanip>
#include <vector>
#include <algorithm>
#include <windows.h>
#include <tlhelp32.h>
#include <any>

struct JsFileData {
    std::string body;
    std::unordered_map<std::string, std::any> variables;
};

std::unordered_map<std::string, JsFileData> load_scripts(
    const std::vector<std::string> &script_queries,
    const std::string &dir="scripts");


// logファイル吐くやつ作るだけ作ったけど微妙だったから使わなかった
void write_log(const char* message, std::string filename);
void ensure_log_dir_exists();
std::string get_log_filename();
void trim_old_logs();

// 絶対子供殺すマン
bool assign_relationship(DWORD pid);
void cleanupHandle();

std::string exeDir();