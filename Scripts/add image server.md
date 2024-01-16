/*
```javascript
*/
const http = require('http');
const url = require('url');
// async function generateIdFromFile(file) {
//   let id;
//   try {
//     const hashBuffer = await window.crypto.subtle.digest("SHA-1", file);
//     id = Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
//   } catch (error) {
//     id = ExcalidrawAutomate.tools.fileid();
//   }
//   return id;
// };
function setTimer() {
    if (window.excalidrawHttpServer.timer) {
        clearTimeout(window.excalidrawHttpServer.timer);
    }
    const timeoutId = setTimeout(function() {
        window.excalidrawHttpServer.server.close()
        console.log('Timeout close server');
    }, 30*60*1000);
    window.excalidrawHttpServer.timer = timeoutId
}
window.excalidrawHttpServer = {server: undefined, x: ea.targetView.currentPosition.x, y: ea.targetView.currentPosition.y, timer: undefined}

window.excalidrawHttpServer.server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const path = parsedUrl.pathname;

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    if (path === '/addImage') {
        if (req.method === 'POST') {
            let body = '';
            const contentType = req.headers["content-type"].match(/(.*);/)[1]
            req.on('data', (chunk) => {
                body += chunk;
            });

            req.on('end', async () => {
                ea.clear()
                const base64 = JSON.parse(body).img
                const file = await ea.targetView.excalidrawData.saveDataURLtoVault(base64, contentType, "")
                const id = await ea.addImage(window.excalidrawHttpServer.x, window.excalidrawHttpServer.y, file);
                const el = ea.getElement(id)
                await ea.addElementsToView(false);
                ea.selectElementsInView([el]);
                window.excalidrawHttpServer.y += el.height + 10
                res.end('ok');
            });
        }
        setTimer()
        return
    } else if (path === '/setLink') {
        const element = ea.getViewSelectedElement();
        if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });

            req.on('end', async () => {
                const link = JSON.parse(body).link
                element.link = link
                ea.copyViewElementsToEAforEditing([element]);
                ea.addElementsToView();
                res.end('ok');
            });
        }
        setTimer()
        return
    } else if (path === '/close') {
        setTimeout(() => {
            window.excalidrawHttpServer.server.close()
        }, 100);
        res.end('ok');
    }else {
        res.end('Not found');
    }
});

const port = 3456;
window.excalidrawHttpServer.server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
setTimer()