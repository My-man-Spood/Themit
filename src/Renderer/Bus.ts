import { Observable, Subject, filter } from 'rxjs';

export interface Action {
    type: string;
    payload?: any;
}

export class Bus {
    private eventsSubject = new Subject<Action>();
    public eventSubject$ = this.eventsSubject.asObservable();

    constructor() {}

    public on(action): Observable<Action> {
        return this.eventSubject$.pipe(filter((e) => e.type === action));
    }

    public push(type: string, payload?: any): void {
        console.log('%c=>' + type, 'background-color: #ADD8E6; color: white; font-size: 16px;');
        this.eventsSubject.next({ type, payload });
    }
}
