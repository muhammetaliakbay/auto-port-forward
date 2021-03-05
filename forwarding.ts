import { spawn } from "child_process";

import { promisify } from "util";

import { createServer } from "net";


export function forward(
    selector: string, port: number, localPort: number
) {
    const create = () => {
        const child = spawn(
            'kubectl', [
                'port-forward', selector, `${localPort}:${port}`
            ], {
                stdio: ["ignore", "inherit", "inherit"]
            }
        )

        child.once(
            'exit',
            (code, signal) => {
                setTimeout(
                    () => create(),
                    3500
                );
            }
        )
    }

    create();
}

export function randomPort() {
    return new Promise<number>(
        (resolve, reject) => {
            var srv = createServer(function(sock) {
                sock.end();
            });
            srv.once('error', (err) => {
                reject(err);
            })
            srv.listen(0, function() {
                const addr = srv.address();
                if (addr instanceof Object && 'port' in addr) {
                    const port = addr.port;
                    srv.close();
                    resolve(port);
                } else {
                    srv.close();
                    reject(new Error('Invalid address object'));
                }
            });
        }
    );
}