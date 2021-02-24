const {
    spawn
} = require("child_process");

const {
    promisify
} = require("util");

const {
    createServer
} = require("net");


exports.forward = function(
    selector, port, localPort
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

exports.randomPort = function() {
    return new Promise(
        (resolve, reject) => {
            var srv = createServer(function(sock) {
                sock.end();
            });
            srv.once('error', (err) => {
                reject(err);
            })
            srv.listen(0, function() {
                const port = srv.address().port;
                srv.close();
                resolve(port);
            });
        }
    );
}