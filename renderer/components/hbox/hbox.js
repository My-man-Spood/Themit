class Hbox extends HtmlElement {
    constructor() {
        super();
        this._template = `
            <div class="hbox">
                <slot></slot>
            </div>
        `;
    }
}
