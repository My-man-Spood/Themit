export class Type<T> extends Function {
    constructor(...args: any[]): T {
        super();
        return new (this as any)(...args);
    }
}
