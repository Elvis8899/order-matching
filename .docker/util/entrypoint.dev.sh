#!/bin/bash

cd /usr/src/app
if [ ! -f '.env.dev' ]; then
  cp .env.example .env.dev
fi

yarn
yarn migrate:init
yarn start:dev
