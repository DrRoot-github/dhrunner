cmake_minimum_required(VERSION 3.10.0)
project(runner VERSION 0.1.0 LANGUAGES C CXX)

# add frida-core.lib
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

include_directories("${CMAKE_SOURCE_DIR}/frida")
link_directories("${CMAKE_SOURCE_DIR}/frida")

# add_executableの前にこれ挟まないとファイルをSjis読みして死ぬ
add_compile_options("$<$<CXX_COMPILER_ID:MSVC>:/utf-8>")

add_executable(runner main.cpp utils.cpp)

# setupapiと/NODEFAULTLIBを追加しないとビルド通らない
target_link_libraries(runner frida-core setupapi)
add_link_options(/NODEFAULTLIB:libcmt.lib)