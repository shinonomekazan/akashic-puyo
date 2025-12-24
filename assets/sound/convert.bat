@echo off
for %%a in (*.mp3) do (
    ffmpeg -i "%%a" "%%~na.m4a"
    ffmpeg -i "%%a" "%%~na.ogg"
)
