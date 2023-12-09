export class FSObject {
    constructor(public name: string, public path: string, public isDirectory: boolean, public children: FSObject[]) {}
}
