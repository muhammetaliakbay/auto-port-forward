#!/usr/bin/env ts-node-script

import {readFileSync} from "fs"

import yaml = require("yaml");
let Validator = require('validatorjs');
import { randomPort, forward } from "./forwarding";
import { spawn } from "child_process";
import { getSecret } from "./secrets";
import {interpolate} from "./interpolation";

const argv = process.argv.slice(2);

const dashIndex = Math.min(
    ...[
        argv.indexOf('---'),
        argv.indexOf('--'),
        argv.indexOf('-'),
        Infinity
    ].filter(i => i > -1)
);
if (dashIndex == Infinity) {
    throw new Error("No command specified");
}

const cmd = argv.slice(dashIndex + 1);
if (cmd.length == 0) {
    throw new Error("Empty command");
}

let configPathArg: string = null;
for (let i = 0; i < dashIndex; i ++) {
    const arg = argv[i];
    if (arg.startsWith("-")) {
        throw new Error("No flag supported");
    } else {
        if (configPathArg == null) {
            configPathArg = arg;
        } else {
            throw new Error("Config path argument must be passed maximum once");
        }
    }
}
let configPath = configPathArg ?? "./auto-port-forward.yml";

const configText = readFileSync(configPath, {encoding: "utf-8"});
const config = yaml.parse(configText) as {
    forwards?: {
        selector: string,
        port: number,
        environment?: {
            [key: string]: string
        }
    }[],
    secrets?: {
        selector: string,
        environment?: {
            [key: string]: string
        }
    }[]
};

const validation = new Validator(
    config,
    {
        "forwards": "array",
        "forwards.*": {
            "selector": "required|string",
            "port": "required|min:1|max:65535",
            "environment.*": "string"
        },
        "secrets": "array",
        "secrets.*": {
            "selector": "required|string",
            "environment.*": "string"
        }
    }
);
if (!validation.passes()) {
    throw new Error("Not valid config");
}

(async () => {
    const env: {
        [key:string]: string
    } = {}

    for (const secretDef of config.secrets ?? []) {
        const selector = secretDef.selector;

        const data = getSecret(
            selector
        );

        const variables = {
            'DATA': data
        }

        for (const [name, val] of Object.entries(secretDef.environment ?? {})) {
            env[interpolate(name, variables)] = interpolate(val, variables);
        }
    }

    for (const forwarding of config.forwards ?? []) {
        const selector = forwarding.selector;
        const port = forwarding.port;
        const localPort = await randomPort();

        forward(
            selector, port, localPort
        );

        const variables = {
            'LOCAL_PORT': localPort,
            'LOCAL_ADDRESS': `127.0.0.1:${localPort}`
        }

        for (const [name, val] of Object.entries(forwarding.environment ?? {})) {
            env[interpolate(name, variables)] = interpolate(val, variables);
        }
    }

    const child = spawn(
        cmd[0],
        cmd.slice(1), {
            env: {
                ...process.env,
                ...env
            },
            stdio: "inherit"
        }
    );

    child.once('error', err => {
        console.error(err);
        process.exit(1);
    });

    child.once('exit', code => {
        process.exit(code)
    });

}) ().catch(
    err => {
        console.error(err);
        process.exit(1);
    }
);