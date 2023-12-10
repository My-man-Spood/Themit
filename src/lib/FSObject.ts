export class FSObject {
    constructor(public name: string, public path: string, public isDirectory: boolean, public children: FSObject[]) {}

    public get baseName(): string {
        return this.name.split('.').shift()!;
    }

    public get ext(): string {
        console.log(this.name);
        return this.name.split('.').pop()!;
    }

    public get dotExt(): string {
        return '.' + this.ext;
    }
}
