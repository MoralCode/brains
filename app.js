const cssApi = (function () {
const ACTIVE_CSS = 'active';
const INACTIVE_CSS = 'inactive';
return {
    activate(element) {
        element.classList.add(ACTIVE_CSS);
        element.classList.remove(INACTIVE_CSS);
    },
    deactivate(element) {
        element.classList.add(INACTIVE_CSS);
        element.classList.remove(ACTIVE_CSS);
    }
};
})();

const overlayApi = (function () {
const state = Object.freeze({
    LOADING: 0,
    PREVIEW: 1,
    EXIT_BTN: 2
});
let currentState = state.LOADING;
const HASH = 'overlay';
const loading = document.getElementById('loading');
const overlay = loading.parentElement;
let mainElement = null;

window.onkeyup = (e) => {
    if (e.keyCode === 27) {
        overlayApi.hide();
    }
};

window.onload = () => {
    currentState = null;
    overlayApi.hide();
};

window.onhashchange = (e) => {
    if (e.oldURL.split('#')[1] === HASH) {
        overlayApi.hide();
        e.preventDefault();
        return false;
    }
};

return {
    showPreview() {
        show(state.PREVIEW);
    },
    showModalForElement(element) {
        show(state.EXIT_BTN);
        mainElement = element;
        cssApi.activate(mainElement);
        mainElement.focus();
    },
    hide() {
        if (currentState !== state.LOADING) {
            cssApi.deactivate(overlay);
            cancelDisplaying();
            if (mainElement) {
                mainElement.blur();
                cssApi.deactivate(mainElement);
                mainElement = null;
            }
            location.hash = '';
        }
    }
};

function show(element) {
    currentState = element;
    cssApi.activate(overlay.children[element]);
    cssApi.activate(overlay);
    location.hash = HASH;
}

function cancelDisplaying() {
    for (let i = 0; i < overlay.children.length; ++i) {
        cssApi.deactivate(overlay.children[i]);
    }
}
})();

const canvasApi = (function () {
const WIDTH = 600;
const FILENAME = 'meme.png';

const brainsContainer = document.getElementById('brains');
const mirrorCanvas = document.getElementById('mirror');
const mirrorCtx = mirrorCanvas.getContext('2d');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const innerCanvasContainer = canvas.parentElement;

canvas.width = WIDTH;
canvas.style.maxWidth = WIDTH + 'px';
mirrorCanvas.width = WIDTH;
mirrorCanvas.style.maxWidth = WIDTH + 'px';
innerCanvasContainer.style.maxWidth = WIDTH + 'px';


return {
    preview() {
        mirrorCanvas.height = canvas.height;
        mirrorCtx.putImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), 0, 0);
        overlayApi.showPreview();
    },
    redrawBrains() {
        const oldTop = innerCanvasContainer.scrollTop;
        canvasApi.clear();
        drawRecurrently(0, 0, () => {
            innerCanvasContainer.scrollTop = oldTop;
        });
    },
    resize(newSize) {
        const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
        canvas.height = newSize;
        canvasApi.clear();
        ctx.putImageData(temp, 0, 0);
    },
    clear() {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    },
    download(link) {
        link.href = canvas.toDataURL();
        link.download = FILENAME;
    }
};

async function drawRecurrently(heightProm, i, callback = () => {
}) {
    if (i < brainsContainer.children.length) {
        const child = brainsContainer.children[i];

        if (heightProm instanceof Promise) {
            const availableHeight = await heightProm;
            await drawRecurrently(drawRowAtHeight(child, availableHeight), ++i, callback);
        } else {
            await drawRecurrently(drawRowAtHeight(child, heightProm), ++i, callback);
        }
    } else {
        await heightProm;
        canvasApi.resize(canvas.height - 5);
        ctx.fillStyle = 'rgba(220,220,220,.8)';
        ctx.font = '15px Arial';
        ctx.fillText('mat3e.github.io/brains', 10, 20);
        callback();
    }
}

function drawRowAtHeight(source, y) {
    const lineHeight = 3;

    const imageObj = new Image();
    imageObj.src = source.lastChild.src;

    return new Promise((resolve) => {
        imageObj.onload = () => {
            const ratio = imageObj.height / imageObj.width;
            const height = (WIDTH / 2) * ratio;
            const linePosY = y + height;
            canvasApi.resize(linePosY + lineHeight + 1);
            ctx.drawImage(imageObj, (WIDTH / 2), y, (WIDTH / 2), height);
            ctx.fillStyle = '#000';
            ctx.fillRect(0, linePosY, canvas.width, lineHeight);

            drawCenteredMultilineText(source, y, height);

            resolve(linePosY + lineHeight);
        }
    });
}

function drawCenteredMultilineText(source, y, availableHeight) {
    if (source.firstChild && source.firstChild.value) {
        const textArray = source.firstChild.value.split('\n');
        const fontSize = 25;
        const fontType = 'Arial';
        const centered = document.getElementById('center').checked;
        ctx.font = fontSize + 'px ' + fontType;

        const starter = -10;
        let i = textArray.length / 2;
        textArray.forEach((line) => {
            let x = 10;
            if (centered) {
                ctx.textAlign = 'center';
                x = WIDTH / 4;
            } else {
                ctx.textAlign = 'start';
            }
            ctx.fillText(line, x, y + availableHeight / 2 - starter - i * fontSize);
            --i;
        });
    }
}
})();

(function () {
const BRAIN_START = 0, BRAIN_END = 10;
const BACKUP_START = 0, BACKUP_END = 14;

const brainsContainer = document.getElementById('brains');
generateBrains();
const backupContainer = document.getElementById('backup');
generateBackup();
canvasApi.redrawBrains();

const drake = dragula([brainsContainer, backupContainer]);
drake.on('drop', (el, target, source) => {
    if (source !== target || target === brainsContainer) {
        canvasApi.redrawBrains();
    }
});

function generateBrains() {
    generateImgs('img/', BRAIN_START, BRAIN_END, brainsContainer);
}

function generateBackup() {
    generateImgs('img/bonus/', BACKUP_START, BACKUP_END, backupContainer);
}

function generateImgs(prefix, from, to, parent) {
    for (let i = from; i <= to; ++i) {
        const div = document.createElement('div');
        div.id = parent.id + ':' + i;
        div.className = 'brain-wrapper';

        const input = document.createElement('textarea');
        input.onchange = canvasApi.redrawBrains;
        input.className = 'text';
        input.placeholder = 'Enter text with new lines...';

        const image = document.createElement('img');
        image.src = prefix + i + '.jpg';
        image.className = 'thumbnail';
        image.onclick = function () {
            const currInput = this.previousElementSibling;
            overlayApi.showModalForElement(currInput);
            currInput.style.backgroundImage = 'url(' + this.src + ')';
        };

        div.appendChild(input);
        div.appendChild(image);
        parent.appendChild(div);
    }
}
})();