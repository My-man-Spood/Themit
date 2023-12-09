export class HierarchyNode {
    private name: string;
    private children: HierarchyNode[];

    constructor(name: string) {
        this.name = name;
        this.children = [];
    }

    public addChild(child: HierarchyNode): void {
        this.children.push(child);
    }

    public getChildren(): HierarchyNode[] {
        return this.children;
    }

    public getName(): string {
        return this.name;
    }
}
