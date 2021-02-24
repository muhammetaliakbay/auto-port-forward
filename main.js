#!/usr/bin/env node

const {
    readFileSync
} = require("fs");

const yaml = require("yaml");
let Validator = require('validatorjs');
const { randomPort, forward } = require("./forwarding");
const { spawn } = require("child_process");

const configText = readFileSync("./auto-port-forward.yml", {encoding: "utf-8"});
const config = yaml.parse(configText);

const validation = new Validator(
    config,
    {
        "forwards": "array",
        "forwards.*": {
            "selector": "required|string",
            "port": "required|min:1|max:65535",
            "environment.*": "string"
        }
    }
);
if (!validation.passes()) {
    throw new Error("Not valid config");
}

function interp(template, vars) {
    for (const [key, val] of Object.entries(vars)) {
        template = template.replace(
            '${' + key + '}', val
        );
    }

    return template
}

(async () => {
    const env = {}

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
            env[interp(name, variables)] = interp(val, variables);
        }
    }

    const dashIndex = Math.min(
        ...[
            process.argv.indexOf('---'),
            process.argv.indexOf('--'),
            process.argv.indexOf('-'),
            Infinity
        ].filter(i => i > -1)
    );
    if (dashIndex == Infinity) {
        throw new Error("No command specified");
    }

    const cmd = process.argv.slice(dashIndex + 1);
    if (cmd.length == 0) {
        throw new Error("Empty command");
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