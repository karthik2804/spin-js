type HttpHandlerFunc = (req: Request, res: any) => Promise<void>;
type BodyInit = BufferSource | URLSearchParams | ReadableStream<Uint8Array> | USVString;
type USVString = string | ArrayBuffer | ArrayBufferView;
declare class HttpComponent {
    response: Response | undefined;
    handler: HttpHandlerFunc | undefined;
    resolve: (value: Response | PromiseLike<Response>) => void;
    reject: (reason: any) => void;
    responsePromise: PromiseLike<Response>;
    readableStream: ReadableStream | undefined;
    streamController: any;
    constructor();
    addHandler(handlerFunction: HttpHandlerFunc): void;
    handleEvent(event: FetchEvent): Promise<void>;
    sendHandler(value: Response | BodyInit): void;
    writeResponse(value: BodyInit, headers?: Headers): void;
    endResponse(): void;
    init(handlerFunction: HttpHandlerFunc): void;
}
declare class ResponseBuilder {
    headers: Headers;
    statusCode: number;
    private isStreamingResponse;
    private hasWrittenHeaders;
    private hasSentResponse;
    private writeHandler;
    private sendHandler;
    private endHandler;
    constructor(writeHandler: any, sendHandler: any, endHandler: any);
    status(code: number): this;
    set(header: string, value: string): this;
    set(headers: {
        [key: string]: string;
    }): this;
    send(value?: BodyInit): void;
    write(value: BodyInit): void;
    end(): void;
}
export { HttpComponent, ResponseBuilder };
type EventHandler = (event: FetchEvent) => void;
declare global {
    function addEventListener(event: 'fetch', handler: EventHandler): void;
}
