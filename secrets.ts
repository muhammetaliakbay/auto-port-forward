import { spawnSync } from "child_process";

import { promisify } from "util";

import { createServer } from "net";
import { ObjectFlags } from "typescript";


export function getSecret(
    selector: string
): {[key:string]: string} {
    const child = spawnSync(
        'kubectl', [
            'get', 'secret', selector,
            '-o', 'json'
        ], {
            stdio: ["ignore", "pipe", "inherit"]
        }
    );

    if (child.error != null) {
        throw child.error;
    } else if (child.status !== 0) {
        throw new Error('Non-Zero return value from kubectl');
    } else {
        const json = JSON.parse(child.output.join('\r\n'));
        if (json.data instanceof Object) {
            return Object.fromEntries(
                Object.entries(
                    json.data
                ).map(
                    ([key, val]: [string, string]) => [key, Buffer.from(val, 'base64').toString('utf8')]
                )
            );
        } else {
            throw new Error('Invalid response')
        }
    }
}