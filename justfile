say *args:
    NODE_OPTIONS="--import=./src/node/register.mjs" node {{ args }}
