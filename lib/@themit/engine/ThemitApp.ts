import { HBox } from '../common/HBox/hbox';

export class ThemitApp {
    constructor() {
        customElements.define('th-hbox', HBox);
        console.log('ThemitApp');
    }
}
