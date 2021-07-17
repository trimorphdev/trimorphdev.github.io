@echo off

echo Building generator
call tsc -p generator

echo Building CSS
call sass src/scss/main.scss public/css/main.css --style compressed

echo Building website
call node dist/index