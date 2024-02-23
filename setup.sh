#!/bin/bash

apt-get update
apt install unzip
curl -fsSL https://bun.sh/install | bash
bun install
