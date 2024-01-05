var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class HttpComponent {
    constructor() {
        this.responsePromise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
    addHandler(handlerFunction) {
        if (this.handler) {
            throw new Error("Handler function already registered");
        }
        this.handler = handlerFunction;
    }
    handleEvent(event) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                event.respondWith(this.responsePromise);
                if (!this.handler) {
                    throw new Error("No Handler function registered");
                }
                let res = new ResponseBuilder(this.writeResponse.bind(this), this.sendHandler.bind(this), this.endResponse.bind(this));
                // Invoke user-provided handler function and validate the response
                yield this.handler(event.request, res);
                if (!this.response) {
                    throw new Error('User-provided handler must return a Response object');
                }
                // Check if readable stream is closed?
            }
            catch (e) {
                console.error(`Error: ${e}`);
            }
        });
    }
    sendHandler(value) {
        if (!value) {
            this.endResponse;
            return;
        }
        if (value instanceof Response) {
            this.response = value;
            this.resolve(this.response);
        }
        else {
            this.writeResponse(value);
            this.endResponse();
        }
    }
    writeResponse(value, headers = new Headers()) {
        var _a;
        if (!this.readableStream) {
            headers.set("Transfer-Encoding", "chunked");
            let temp;
            this.readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(convertToUint8Array(value));
                    let streamController = {
                        pump: (value) => {
                            controller.enqueue(convertToUint8Array(value));
                        },
                        close: () => {
                            controller.close();
                        }
                    };
                    temp = streamController;
                },
            });
            console.log("before - 2 -  ", (_a = this.readableStream) === null || _a === void 0 ? void 0 : _a.locked);
            this.streamController = temp;
            this.response = new Response(this.readableStream, {
                headers: headers
            });
            this.resolve(this.response);
        }
        else {
            this.streamController.pump(value);
        }
    }
    endResponse() {
        var _a, _b;
        console.log("before - ", (_a = this.readableStream) === null || _a === void 0 ? void 0 : _a.locked);
        this.streamController.close();
        console.log("after - ", (_b = this.readableStream) === null || _b === void 0 ? void 0 : _b.locked);
    }
    init(handlerFunction) {
        if (this.handler) {
            throw new Error("component already initialized");
        }
        this.addHandler(handlerFunction);
        addEventListener('fetch', (event) => this.handleEvent(event));
    }
}
class ResponseBuilder {
    constructor(writeHandler, sendHandler, endHandler) {
        this.statusCode = 200;
        this.headers = new Headers();
        this.writeHandler = writeHandler;
        this.sendHandler = sendHandler;
        this.endHandler = endHandler;
        this.isStreamingResponse = false;
        this.hasWrittenHeaders = false;
        this.hasSentResponse = false;
    }
    status(code) {
        this.statusCode = code;
        return this;
    }
    set(arg1, arg2) {
        if (this.hasWrittenHeaders) {
            throw new Error("Headers already sent");
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'string') {
            this.headers.set(arg1, arg2);
        }
        else if (typeof arg1 === 'object' && arg2 === undefined) {
            for (const key in arg1) {
                this.headers.set(key, arg1[key]);
            }
        }
        else {
            throw new Error('Invalid arguments');
        }
        return this;
    }
    send(value) {
        if (this.hasSentResponse) {
            throw new Error("Response has already been sent");
        }
        if (!this.isStreamingResponse) {
            if (value) {
                this.sendHandler(new Response(value, { headers: this.headers, status: this.statusCode }));
            }
            else {
                this.sendHandler(new Response(null, { headers: this.headers, status: this.statusCode }));
            }
        }
        else {
            this.sendHandler(value);
        }
        this.hasSentResponse = true;
    }
    write(value) {
        if (this.hasSentResponse) {
            throw new Error("Response has already been sent");
        }
        if (!this.hasWrittenHeaders) {
            this.writeHandler(value, this.headers);
            this.hasWrittenHeaders = true;
        }
        else {
            this.writeHandler(value);
        }
    }
    end() {
        this.endHandler();
        this.hasSentResponse = true;
    }
}
export { HttpComponent, ResponseBuilder };
function convertToUint8Array(body) {
    // if (body instanceof Blob) {
    //     // If it's a Blob, read its content into a Uint8Array
    //     return new Promise((resolve) => {
    //         const reader = new FileReader();
    //         reader.onloadend = () => {
    //             const resultArray = new Uint8Array(reader.result as ArrayBuffer);
    //             resolve(resultArray);
    //         };
    //         reader.readAsArrayBuffer(body);
    //     });
    // } else
    if (body instanceof ArrayBuffer) {
        // If it's already an ArrayBuffer, create a Uint8Array directly
        return new Uint8Array(body);
    }
    else if (ArrayBuffer.isView(body)) {
        // If it's an ArrayBufferView (e.g., TypedArray), create a Uint8Array directly
        return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    }
    else if (typeof body === 'string') {
        // If it's a string, encode it as UTF-8 and create a Uint8Array
        const encoder = new TextEncoder();
        const utf8Array = encoder.encode(body);
        return utf8Array;
    }
    else if (body instanceof URLSearchParams) {
        // If it's FormData or URLSearchParams, convert it to a Uint8Array
        const encoder = new TextEncoder();
        const bodyString = body.toString();
        const utf8Array = encoder.encode(bodyString);
        return utf8Array;
    }
    else {
        // For other types, return a rejected promise
        throw new Error('Unsupported body type');
    }
}
