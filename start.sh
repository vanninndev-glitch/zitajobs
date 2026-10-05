#!/bin/bash
set -e
cd "$(dirname "$0")/backend"
if [ ! -f .env ]; then cp .env.example .env; fi
npm install
npm start
