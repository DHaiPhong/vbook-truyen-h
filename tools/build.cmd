@echo off
rem Dong goi extension thanh plugin.zip (plugin.json + icon.png + src/) de cai vao vBook.
cd /d "%~dp0.."
if exist plugin.zip del plugin.zip
python -m zipfile -c plugin.zip plugin.json icon.png src
if errorlevel 1 exit /b 1
python -m zipfile -l plugin.zip
