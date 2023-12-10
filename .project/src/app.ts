import { Component } from '../../lib/@themit/common/ComponentDecorator';

console.log('hello themit');

@Component
export class AppComponent {
    constructor(public name: string) {
        console.log('App component named: ' + name);
    }
}

let swag = new AppComponent('swag');
