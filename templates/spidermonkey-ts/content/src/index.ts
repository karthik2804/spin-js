import { HttpComponent, ResponseBuilder } from 'spin-js/sdk/http'

const component = new HttpComponent()

async function handleEvent(req: Request, res: ResponseBuilder) {
    console.log(await req.text())
    res.set("content-type", "text-plain")
    res.write("hello fromm spidermonkey")
    res.end()
}

component.init(handleEvent)

