type HttpHandlerFunc = (req: Request, res: any) => Promise<void>

// FormData and Blob need to be added
type BodyInit = BufferSource | URLSearchParams | ReadableStream<Uint8Array> | USVString;

type USVString = string | ArrayBuffer | ArrayBufferView;

class HttpComponent {
    response: Response | undefined
    handler: HttpHandlerFunc | undefined
    resolve!: (value: Response | PromiseLike<Response>) => void;
    reject!: (reason: any) => void;
    responsePromise: PromiseLike<Response> = new Promise((res, rej) => {
        this.resolve = res;
        this.reject = rej;
    });
    readableStream: ReadableStream | undefined
    streamController: any

    constructor() { }

    addHandler(handlerFunction: HttpHandlerFunc) {
        if (this.handler) {
            throw new Error("Handler function already registered")
        }
        this.handler = handlerFunction;
    }

    async handleEvent(event: FetchEvent) {
        try {
            event.respondWith(this.responsePromise);

            if (!this.handler) {
                throw new Error("No Handler function registered")
            }


            let res = new ResponseBuilder(
                this.writeResponse.bind(this),
                this.sendHandler.bind(this),
                this.endResponse.bind(this)
            )

            // Invoke user-provided handler function and validate the response
            await this.handler(event.request, res);

            if (!this.response) {
                throw new Error('User-provided handler must return a Response object');
            }
            // Check if readable stream is closed?

        } catch (e) {
            console.error(`Error: ${e}`);
        }
    }
    sendHandler(value: Response | BodyInit) {
        if (!value) {
            this.endResponse
            return
        }
        if (value instanceof Response) {
            this.response = value
            this.resolve(this.response)
        } else {
            this.writeResponse(value)
            this.endResponse()
        }
    }
    writeResponse(value: BodyInit, headers: Headers = new Headers()) {
        if (!this.readableStream) {
            headers.set("Transfer-Encoding", "chunked")

            let temp
            this.readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(convertToUint8Array(value));
                    let streamController = {
                        pump: (value: BodyInit) => {
                            controller.enqueue(convertToUint8Array(value));
                        },
                        close: () => {
                            controller.close()
                        }

                    }
                    temp = streamController
                },
            });
            this.streamController = temp
            this.response = new Response(this.readableStream, {
                headers: headers
            });
            this.resolve(this.response)
        } else {
            this.streamController.pump(value)
        }
    }
    endResponse() {
        this.streamController.close()
    }

    init(handlerFunction: HttpHandlerFunc) {
        if (this.handler) {
            throw new Error("component already initialized")
        }
        this.addHandler(handlerFunction)
        addEventListener('fetch', (event) => this.handleEvent(event));
    }
}

class ResponseBuilder {
    headers: Headers
    statusCode: number
    private isStreamingResponse: boolean
    private hasWrittenHeaders: boolean
    private hasSentResponse: boolean
    private writeHandler: (value: BodyInit, headers?: Headers) => void
    private sendHandler: (value?: Response | BodyInit) => void
    private endHandler: () => void

    constructor(writeHandler: any, sendHandler: any, endHandler: any) {
        this.statusCode = 200
        this.headers = new Headers()
        this.writeHandler = writeHandler
        this.sendHandler = sendHandler
        this.endHandler = endHandler
        this.isStreamingResponse = false
        this.hasWrittenHeaders = false
        this.hasSentResponse = false
    }
    status(code: number): this {
        this.statusCode = code
        return this
    }
    set(header: string, value: string): this;
    set(headers: { [key: string]: string }): this;
    set(arg1: string | { [key: string]: string }, arg2?: string): this {
        if (this.hasWrittenHeaders) {
            throw new Error("Headers already sent")
        }
        if (typeof arg1 === 'string' && typeof arg2 === 'string') {
            this.headers.set(arg1, arg2);
        } else if (typeof arg1 === 'object' && arg2 === undefined) {
            for (const key in arg1) {
                this.headers.set(key, arg1[key]);
            }
        } else {
            throw new Error('Invalid arguments');
        }
        return this
    }
    send(value?: BodyInit) {
        if (this.hasSentResponse) {
            throw new Error("Response has already been sent")
        }
        if (!this.isStreamingResponse) {
            if (value) {
                this.sendHandler(new Response(value, { headers: this.headers, status: this.statusCode }));
            } else {
                this.sendHandler(new Response(null, { headers: this.headers, status: this.statusCode }));
            }
        } else {
            this.sendHandler(value)
        }
        this.hasSentResponse = true
    }
    write(value: BodyInit) {
        if (this.hasSentResponse) {
            throw new Error("Response has already been sent")
        }
        if (!this.hasWrittenHeaders) {
            this.writeHandler(value, this.headers)
            this.hasWrittenHeaders = true
        } else {
            this.writeHandler(value)
        }
    }
    end() {
        this.endHandler()
        this.hasSentResponse = true
    }

}

export { HttpComponent, ResponseBuilder }

function convertToUint8Array(body: BodyInit): Uint8Array {
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
        return new Uint8Array(body);
    } else if (ArrayBuffer.isView(body)) {
        return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
    } else if (typeof body === 'string') {
        const encoder = new TextEncoder();
        const utf8Array = encoder.encode(body);
        return utf8Array;
    } else if (body instanceof URLSearchParams) {
        const encoder = new TextEncoder();
        const bodyString = body.toString();
        const utf8Array = encoder.encode(bodyString);
        return utf8Array;
    } else {
        throw new Error('Unsupported body type');
    }
}

type EventHandler = (event: FetchEvent) => void

declare global {
    function addEventListener(event: 'fetch', handler: EventHandler): void
}